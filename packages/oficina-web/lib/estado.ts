import type pg from "pg";
import type { EncargoVista, Evento, FichaVista } from "./escena";

export interface Resultado {
  id: string;
  ficha_id: string;
  origen: "api" | "relevo_nativo";
  contenido: string;
  creado: string;
  version: number;
  proveedor: string | null;
  modelo: string | null;
  tokens_entrada: number | null;
  tokens_salida: number | null;
  proveedor_original: string | null;
  motivo_relevo: string | null;
  modelo_nativo: string | null;
}

export interface Decision {
  id: string;
  tipo: string;
  pregunta: string;
  estado: string;
  creado: string;
}

export interface EstadoOficina {
  base: "ok" | "sin_configurar" | "sin_migrar" | "error";
  detalle?: string;
  fichas: FichaVista[];
  encargo: EncargoVista | null;
  plan: string | null;
  equipo: { ficha_id: string; tarea: string }[];
  eventos: Evento[];
  decisiones: Decision[];
  resultados: Resultado[];
  muro: { id: string; titulo: string; estado: string; actualizado: string }[];
}

export const VACIO: Omit<EstadoOficina, "base"> = {
  fichas: [],
  encargo: null,
  plan: null,
  equipo: [],
  eventos: [],
  decisiones: [],
  resultados: [],
  muro: [],
};

export async function leerEstado(db: pg.Pool | null): Promise<EstadoOficina> {
  if (!db) return { base: "sin_configurar", ...VACIO };
  try {
    const existe = await db.query("SELECT to_regclass('public.eventos') AS t");
    if (!existe.rows[0]?.t) return { base: "sin_migrar", ...VACIO };

    const fichas = await db.query<FichaVista>(
      `SELECT f.id, f.nombre, f.especialidad, f.proveedor, f.modelo, COALESCE(p.configurado, FALSE) AS configurado,
              -- to_jsonb tolera una base aún sin la migración 002 (columna ausente = sin respaldo).
              COALESCE((to_jsonb(p) ->> 'respaldo_nativo')::boolean, FALSE) AS respaldo_nativo
       FROM fichas f LEFT JOIN proveedores p ON p.id = f.proveedor WHERE f.activa ORDER BY f.id`,
    );
    // Encargo activo: el más reciente sin cerrar; si no hay, el último que se tocó.
    const enc = await db.query<EncargoVista>(
      `SELECT id, titulo, descripcion, estado, sensibilidad, version_actual FROM encargos
       ORDER BY (estado IN ('emitido', 'cerrado')), actualizado DESC LIMIT 1`,
    );
    const encargo = enc.rows[0] ?? null;
    const muro = await db.query(
      "SELECT id, titulo, estado, actualizado FROM encargos ORDER BY actualizado DESC LIMIT 12",
    );
    if (!encargo) return { base: "ok", ...VACIO, fichas: fichas.rows, muro: muro.rows as EstadoOficina["muro"] };

    const version = await db.query<{ plan: { texto?: string } | null; equipo: { ficha_id: string; tarea: string }[] | null }>(
      "SELECT plan, equipo FROM encargo_versiones WHERE encargo_id = $1 AND version = $2",
      [encargo.id, encargo.version_actual],
    );
    const eventos = await db.query<Evento>(
      `SELECT id::int AS id, encargo_id, tipo, actor, datos, creado FROM eventos
       WHERE encargo_id = $1 ORDER BY id DESC LIMIT 80`,
      [encargo.id],
    );
    const decisiones = await db.query<Decision>(
      "SELECT id, tipo, pregunta, estado, creado FROM decisiones WHERE encargo_id = $1 AND estado = 'pendiente' ORDER BY creado",
      [encargo.id],
    );
    const resultados = await db.query<Resultado>(
      `SELECT r.id, r.ficha_id, r.origen, r.contenido, r.creado, r.version, l.proveedor, l.modelo,
              l.tokens_entrada, l.tokens_salida, r.proveedor_original, r.motivo_relevo, r.modelo_nativo
       FROM resultados r LEFT JOIN llamadas l ON l.id = r.llamada_id
       WHERE r.encargo_id = $1 ORDER BY r.creado`,
      [encargo.id],
    );
    return {
      base: "ok",
      fichas: fichas.rows,
      encargo,
      plan: version.rows[0]?.plan?.texto ?? null,
      equipo: version.rows[0]?.equipo ?? [],
      eventos: eventos.rows.reverse(),
      decisiones: decisiones.rows,
      resultados: resultados.rows,
      muro: muro.rows as EstadoOficina["muro"],
    };
  } catch (e) {
    return { base: "error", detalle: (e as Error).message, ...VACIO };
  }
}
