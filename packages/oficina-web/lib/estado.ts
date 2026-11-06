import type pg from "pg";
import { tokenBlob } from "oficina-mcp/blobtoken";
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
  tokens_total: number | null;
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

export interface Archivo {
  id: string;
  mensaje_id: string | null;
  encargo_id: string | null;
  origen: "ariel" | "orquestador";
  nombre: string;
  tipo: string;
  tamano: number;
  creado: string;
}

export interface MensajeBuzon {
  id: string;
  encargo_id: string | null;
  autor: "ariel" | "orquestador";
  texto: string;
  leido_en: string | null;
  creado: string;
  archivos: Archivo[];
}

/** Consumo agregado por origen y modelo. Solo tokens registrados; nada estimado. */
export interface FilaConsumo {
  origen: "api" | "sesion";
  proveedor: string;
  modelo: string;
  llamadas: number;
  tokens_entrada: number | null;
  tokens_salida: number | null;
  tokens_total: number | null;
  /** Resultados de sesión sin tokens reportados (no entran en el costo). */
  sin_tokens: number;
}

export interface RecursoVista {
  id: string;
  tipo: string;
  titulo: string;
  resumen: string;
  estado: string;
  archivo_id: string | null;
  archivo_nombre: string | null;
}

export interface NotaProgreso {
  id: number;
  texto: string;
  creado: string;
}

export interface Buzon {
  mensajes: MensajeBuzon[];
  /** Último contacto del Orquestador con oficina-mcp. */
  latido: string | null;
  /** Última vez que el Orquestador leyó el buzón. */
  leido: string | null;
  /** Notas recientes de lo que está haciendo el Orquestador (las publica él con avisar_progreso). */
  progreso: NotaProgreso[];
  almacen: { configurado: boolean; acceso: "private" | "public" };
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
  muro: { id: string; titulo: string; estado: string; actualizado: string; consumo: FilaConsumo[] }[];
  biblioteca: RecursoVista[];
  buzon: Buzon;
  consumo: { encargo: FilaConsumo[]; total: FilaConsumo[] };
  /** Hora del servidor, para medir antigüedades sin depender del reloj de la tablet. */
  ahora: string;
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
  biblioteca: [],
  buzon: { mensajes: [], latido: null, leido: null, progreso: [], almacen: { configurado: false, acceso: "private" } },
  consumo: { encargo: [], total: [] },
  ahora: new Date(0).toISOString(),
};

function almacen(): Buzon["almacen"] {
  return {
    configurado: Boolean(tokenBlob()),
    acceso: process.env.OFICINA_BLOB_ACCESS === "public" ? "public" : "private",
  };
}

async function leerBuzon(db: pg.Pool): Promise<Buzon> {
  const mensajes = await db.query<Omit<MensajeBuzon, "archivos">>(
    `SELECT id, encargo_id, autor, texto, leido_en, creado FROM
       (SELECT * FROM mensajes ORDER BY creado DESC LIMIT 60) m ORDER BY creado`,
  );
  const ids = mensajes.rows.map((m) => m.id);
  const archivos = ids.length
    ? await db.query<Archivo>(
        `SELECT id, mensaje_id, encargo_id, origen, nombre, tipo, tamano::float8 AS tamano, creado
         FROM archivos WHERE mensaje_id = ANY($1) ORDER BY creado`,
        [ids],
      )
    : { rows: [] as Archivo[] };
  const latido = await db.query<{ latido: string }>("SELECT latido FROM presencia WHERE id = 'orquestador'");
  const leido = await db.query<{ creado: string }>(
    "SELECT creado FROM eventos WHERE tipo = 'buzon_leido' ORDER BY id DESC LIMIT 1",
  );
  const progreso = await db.query<NotaProgreso>(
    `SELECT id::int AS id, datos->>'texto' AS texto, creado FROM eventos
     WHERE tipo = 'progreso' AND creado > now() - interval '30 minutes' ORDER BY id DESC LIMIT 5`,
  );
  return {
    mensajes: mensajes.rows.map((m) => ({ ...m, archivos: archivos.rows.filter((a) => a.mensaje_id === m.id) })),
    latido: latido.rows[0]?.latido ?? null,
    leido: leido.rows[0]?.creado ?? null,
    progreso: progreso.rows.reverse(),
    almacen: almacen(),
  };
}

async function leerBiblioteca(db: pg.Pool): Promise<RecursoVista[]> {
  const r = await db.query<RecursoVista>(
    `SELECT b.id, b.tipo, b.titulo, b.resumen, b.estado, b.archivo_id, a.nombre AS archivo_nombre
     FROM biblioteca b LEFT JOIN archivos a ON a.id = b.archivo_id
     WHERE b.estado IN ('guardado', 'candidato') ORDER BY b.creado DESC LIMIT 50`,
  );
  return r.rows;
}

/** Consumo de cada encargo del muro, para mostrar su costo. */
async function consumoPorEncargo(db: pg.Pool, ids: string[]): Promise<Record<string, FilaConsumo[]>> {
  const salida: Record<string, FilaConsumo[]> = Object.fromEntries(ids.map((i) => [i, []]));
  if (!ids.length) return salida;
  const api = await db.query<FilaConsumo & { encargo_id: string }>(
    `SELECT encargo_id, 'api' AS origen, proveedor, modelo, count(*)::int AS llamadas,
            sum(tokens_entrada)::float8 AS tokens_entrada, sum(tokens_salida)::float8 AS tokens_salida,
            NULL::float8 AS tokens_total, 0 AS sin_tokens
     FROM llamadas WHERE estado = 'ok' AND encargo_id = ANY($1) GROUP BY encargo_id, proveedor, modelo`,
    [ids],
  );
  const sesion = await db.query<FilaConsumo & { encargo_id: string }>(
    `SELECT encargo_id, 'sesion' AS origen, 'anthropic' AS proveedor, COALESCE(modelo_nativo, 'sesión') AS modelo, count(*)::int AS llamadas,
            sum(tokens_entrada)::float8 AS tokens_entrada, sum(tokens_salida)::float8 AS tokens_salida,
            sum(CASE WHEN tokens_entrada IS NULL AND tokens_salida IS NULL THEN tokens_total END)::float8 AS tokens_total,
            count(*) FILTER (WHERE tokens_entrada IS NULL AND tokens_salida IS NULL AND tokens_total IS NULL)::int AS sin_tokens
     FROM resultados WHERE origen = 'relevo_nativo' AND encargo_id = ANY($1) GROUP BY encargo_id, modelo_nativo`,
    [ids],
  );
  for (const f of [...api.rows, ...sesion.rows]) salida[f.encargo_id]?.push(f);
  return salida;
}

/** Tokens por API (tabla llamadas) y por la sesión nativa (resultados de relevo). encargoId null = todos. */
async function leerConsumo(db: pg.Pool, encargoId: string | null): Promise<FilaConsumo[]> {
  const api = await db.query<FilaConsumo>(
    `SELECT 'api' AS origen, proveedor, modelo, count(*)::int AS llamadas,
            sum(tokens_entrada)::float8 AS tokens_entrada, sum(tokens_salida)::float8 AS tokens_salida,
            NULL::float8 AS tokens_total, 0 AS sin_tokens
     FROM llamadas WHERE estado = 'ok' AND ($1::text IS NULL OR encargo_id = $1)
     GROUP BY proveedor, modelo ORDER BY proveedor, modelo`,
    [encargoId],
  );
  const sesion = await db.query<FilaConsumo>(
    `SELECT 'sesion' AS origen, 'anthropic' AS proveedor, COALESCE(modelo_nativo, 'sesión') AS modelo, count(*)::int AS llamadas,
            sum(tokens_entrada)::float8 AS tokens_entrada, sum(tokens_salida)::float8 AS tokens_salida,
            sum(CASE WHEN tokens_entrada IS NULL AND tokens_salida IS NULL THEN tokens_total END)::float8 AS tokens_total,
            count(*) FILTER (WHERE tokens_entrada IS NULL AND tokens_salida IS NULL AND tokens_total IS NULL)::int AS sin_tokens
     FROM resultados WHERE origen = 'relevo_nativo' AND ($1::text IS NULL OR encargo_id = $1)
     GROUP BY modelo_nativo ORDER BY modelo_nativo`,
    [encargoId],
  );
  return [...api.rows, ...sesion.rows];
}

export async function leerEstado(db: pg.Pool | null): Promise<EstadoOficina> {
  if (!db) return { base: "sin_configurar", ...VACIO };
  try {
    const existe = await db.query(
      `SELECT to_regclass('public.eventos') AS t,
              EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'biblioteca' AND column_name = 'archivo_id') AS al_dia`,
    );
    if (!existe.rows[0]?.t) return { base: "sin_migrar", ...VACIO };
    // Base de una versión anterior (falta alguna migración): la oficina-mcp la actualiza al arrancar, o el botón Actualizar.
    if (!existe.rows[0]?.al_dia) return { base: "sin_migrar", detalle: "actualizar", ...VACIO };
    const ahora = new Date().toISOString();
    const buzon = await leerBuzon(db);
    const consumoTotal = await leerConsumo(db, null);

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
    const muroBase = await db.query<{ id: string; titulo: string; estado: string; actualizado: string }>(
      "SELECT id, titulo, estado, actualizado FROM encargos ORDER BY actualizado DESC LIMIT 12",
    );
    const porEncargo = await consumoPorEncargo(db, muroBase.rows.map((e) => e.id));
    const muro = { rows: muroBase.rows.map((e) => ({ ...e, consumo: porEncargo[e.id] ?? [] })) };
    const biblioteca = await leerBiblioteca(db);
    if (!encargo)
      return { base: "ok", ...VACIO, fichas: fichas.rows, muro: muro.rows, biblioteca, buzon, consumo: { encargo: [], total: consumoTotal }, ahora };

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
              COALESCE(l.tokens_entrada, r.tokens_entrada) AS tokens_entrada, COALESCE(l.tokens_salida, r.tokens_salida) AS tokens_salida,
              r.tokens_total, r.proveedor_original, r.motivo_relevo, r.modelo_nativo
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
      muro: muro.rows,
      biblioteca,
      buzon,
      consumo: { encargo: await leerConsumo(db, encargo.id), total: consumoTotal },
      ahora,
    };
  } catch (e) {
    return { base: "error", detalle: (e as Error).message, ...VACIO };
  }
}
