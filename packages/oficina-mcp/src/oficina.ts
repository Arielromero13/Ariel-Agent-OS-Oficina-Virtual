import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Db } from "./db.js";
import { RAIZ_REPO } from "./db.js";
import { PROVEEDORES, claveDe, llamarProveedor, type Fetch, type Mensaje } from "./proveedores.js";

/** Error de regla de negocio: se devuelve al Orquestador como mensaje, no como fallo del servidor. */
export class ReglaOficina extends Error {}

const nuevoId = (prefijo: string) => `${prefijo}_${randomUUID().slice(0, 8)}`;

export interface Ficha {
  id: string;
  nombre: string;
  especialidad: string;
  resumen: string;
  proveedor: string;
  modelo: string;
  instrucciones: string;
  [k: string]: unknown;
}

interface Encargo {
  id: string;
  sensibilidad: "externo" | "interno";
  relevo_nativo: boolean;
  estado: string;
  version_actual: number;
}

export interface OpcionesOficina {
  fetch?: Fetch;
  env?: NodeJS.ProcessEnv;
}

export class Oficina {
  constructor(
    private db: Db,
    private opciones: OpcionesOficina = {},
  ) {}

  private get env() {
    return this.opciones.env ?? process.env;
  }

  private async evento(encargoId: string | null, tipo: string, actor: string, datos: object = {}) {
    await this.db.query("INSERT INTO eventos (encargo_id, tipo, actor, datos) VALUES ($1, $2, $3, $4)", [
      encargoId,
      tipo,
      actor,
      JSON.stringify(datos),
    ]);
  }

  private async encargo(id: string): Promise<Encargo> {
    const { rows } = await this.db.query<Encargo>("SELECT * FROM encargos WHERE id = $1", [id]);
    if (!rows[0]) throw new ReglaOficina(`No existe el encargo ${id}`);
    return rows[0];
  }

  private async ficha(id: string): Promise<Ficha> {
    const { rows } = await this.db.query<{ contenido: Ficha; activa: boolean }>(
      "SELECT contenido, activa FROM fichas WHERE id = $1",
      [id],
    );
    if (!rows[0] || !rows[0].activa) throw new ReglaOficina(`No existe una ficha activa con id ${id}`);
    return rows[0].contenido;
  }

  private async cambiarEstado(encargoId: string, estado: string) {
    await this.db.query("UPDATE encargos SET estado = $2, actualizado = now() WHERE id = $1", [encargoId, estado]);
  }

  // ---------- Arranque ----------

  /** Copia las fichas de fichas/*.json al estado compartido para que la oficina las muestre. */
  async sincronizarFichas(dir = join(RAIZ_REPO, "fichas")): Promise<string[]> {
    const ids: string[] = [];
    for (const archivo of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
      const ficha = JSON.parse(readFileSync(join(dir, archivo), "utf8")) as Ficha & { version?: number };
      for (const campo of ["id", "nombre", "especialidad", "resumen", "proveedor", "modelo", "instrucciones"]) {
        if (typeof ficha[campo] !== "string" || ficha[campo] === "") {
          throw new Error(`La ficha ${archivo} no tiene el campo obligatorio "${campo}"`);
        }
      }
      await this.db.query(
        `INSERT INTO fichas (id, nombre, especialidad, resumen, proveedor, modelo, contenido, version, activa)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
         ON CONFLICT (id) DO UPDATE SET nombre = $2, especialidad = $3, resumen = $4, proveedor = $5,
           modelo = $6, contenido = $7, version = $8, activa = TRUE, actualizado = now()`,
        [ficha.id, ficha.nombre, ficha.especialidad, ficha.resumen, ficha.proveedor, ficha.modelo, JSON.stringify(ficha), ficha.version ?? 1],
      );
      ids.push(ficha.id);
    }
    return ids;
  }

  /** Publica qué proveedores tienen clave configurada. Nunca publica la clave. */
  async reportarProveedores() {
    const estado = Object.keys(PROVEEDORES).map((id) => ({ id, configurado: claveDe(id, this.env) !== undefined }));
    for (const p of estado) {
      await this.db.query(
        `INSERT INTO proveedores (id, configurado) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET configurado = $2, actualizado = now()`,
        [p.id, p.configurado],
      );
    }
    return estado;
  }

  // ---------- Herramientas ----------

  async abrirEncargo(a: {
    titulo: string;
    descripcion: string;
    sensibilidad: "externo" | "interno";
    relevo_nativo?: boolean;
    archivos?: { nombre: string; ubicacion: string }[];
  }) {
    const id = nuevoId("enc");
    await this.db.query(
      `INSERT INTO encargos (id, titulo, descripcion, sensibilidad, relevo_nativo, estado)
       VALUES ($1, $2, $3, $4, $5, 'abierto')`,
      [id, a.titulo, a.descripcion, a.sensibilidad, a.relevo_nativo ?? true],
    );
    await this.db.query(
      "INSERT INTO encargo_versiones (id, encargo_id, version, motivo) VALUES ($1, $2, 1, 'Apertura')",
      [nuevoId("ver"), id],
    );
    for (const archivo of a.archivos ?? []) {
      await this.db.query("INSERT INTO encargo_archivos (id, encargo_id, nombre, ubicacion) VALUES ($1, $2, $3, $4)", [
        nuevoId("arc"),
        id,
        archivo.nombre,
        archivo.ubicacion,
      ]);
    }
    await this.evento(id, "encargo_abierto", "orquestador", { titulo: a.titulo, sensibilidad: a.sensibilidad });
    return { encargo_id: id, version: 1 };
  }

  /** RR. HH.: busca por metadatos y resumen; no devuelve el contenido completo. */
  async buscarPerfiles(a: { consulta?: string; encargo_id?: string }) {
    const patron = `%${(a.consulta ?? "").trim()}%`;
    const fichas = await this.db.query<{ id: string; nombre: string; especialidad: string; resumen: string; proveedor: string; modelo: string }>(
      `SELECT id, nombre, especialidad, resumen, proveedor, modelo FROM fichas
       WHERE activa AND (nombre ILIKE $1 OR especialidad ILIKE $1 OR resumen ILIKE $1) ORDER BY id`,
      [patron],
    );
    const recursos = await this.db.query<{ id: string; tipo: string; titulo: string; resumen: string; version: number }>(
      `SELECT id, tipo, titulo, resumen, version FROM biblioteca
       WHERE estado = 'guardado' AND (titulo ILIKE $1 OR resumen ILIKE $1) ORDER BY creado DESC LIMIT 20`,
      [patron],
    );
    await this.evento(a.encargo_id ?? null, "rrhh_busqueda", "rrhh", { consulta: a.consulta ?? "", fichas: fichas.rows.length });
    return {
      fichas: fichas.rows.map((f) => ({ ...f, proveedor_configurado: claveDe(f.proveedor, this.env) !== undefined })),
      recursos: recursos.rows,
    };
  }

  async proponerPlan(a: { encargo_id: string; plan: string; equipo: { ficha_id: string; tarea: string }[] }) {
    const enc = await this.encargo(a.encargo_id);
    for (const miembro of a.equipo) {
      const ficha = await this.ficha(miembro.ficha_id);
      if (!claveDe(ficha.proveedor, this.env)) {
        throw new ReglaOficina(
          `La ficha ${ficha.id} usa ${ficha.proveedor}, que está No configurado. No se le pueden asignar tareas.`,
        );
      }
      if (enc.sensibilidad === "interno") {
        throw new ReglaOficina(
          `El encargo ${enc.id} es interno: no se envía a APIs externas. Resuélvelo en la sesión nativa.`,
        );
      }
    }
    await this.db.query(
      "UPDATE encargo_versiones SET plan = $3, equipo = $4 WHERE encargo_id = $1 AND version = $2",
      [enc.id, enc.version_actual, JSON.stringify({ texto: a.plan }), JSON.stringify(a.equipo)],
    );
    await this.cambiarEstado(enc.id, "en_curso");
    await this.evento(enc.id, "plan_propuesto", "orquestador", { equipo: a.equipo });
    for (const miembro of a.equipo) {
      await this.evento(enc.id, "agente_convocado", "rrhh", { ficha_id: miembro.ficha_id, tarea: miembro.tarea });
    }
    return { encargo_id: enc.id, version: enc.version_actual, equipo: a.equipo.length };
  }

  async despachar(a: { encargo_id: string; ficha_id: string; instrucciones: string; contexto?: string }) {
    const enc = await this.encargo(a.encargo_id);
    if (enc.sensibilidad === "interno") {
      throw new ReglaOficina(`El encargo ${enc.id} es interno: no se envía a APIs externas.`);
    }
    const ficha = await this.ficha(a.ficha_id);
    const mensajes: Mensaje[] = [
      { role: "system", content: ficha.instrucciones },
      { role: "user", content: a.contexto ? `${a.instrucciones}\n\n---\nContexto:\n${a.contexto}` : a.instrucciones },
    ];
    await this.evento(enc.id, "agente_trabajando", ficha.id, { proveedor: ficha.proveedor, modelo: ficha.modelo });

    const inicio = new Date();
    const r = await llamarProveedor(ficha.proveedor, ficha.modelo, mensajes, { fetch: this.opciones.fetch, env: this.env });
    const llamadaId = nuevoId("lla");
    await this.db.query(
      `INSERT INTO llamadas (id, encargo_id, ficha_id, proveedor, modelo, estado, detalle, tokens_entrada, tokens_salida, inicio, fin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())`,
      [llamadaId, enc.id, ficha.id, ficha.proveedor, ficha.modelo, r.estado, r.detalle ?? null, r.tokensEntrada ?? null, r.tokensSalida ?? null, inicio],
    );

    if (r.estado !== "ok") {
      await this.evento(enc.id, "agente_fallo", ficha.id, { estado: r.estado, detalle: r.detalle, llamada_id: llamadaId });
      return {
        estado: r.estado,
        detalle: r.detalle,
        llamada_id: llamadaId,
        relevo_nativo_permitido: enc.relevo_nativo,
        accion:
          enc.relevo_nativo
            ? "Puedes resolver la subtarea con un subagente nativo y registrarla con registrar_resultado (origen relevo_nativo)."
            : "El relevo nativo está desactivado para este encargo. Informa a Ariel.",
      };
    }

    const resultadoId = nuevoId("res");
    await this.db.query(
      `INSERT INTO resultados (id, encargo_id, version, ficha_id, origen, llamada_id, contenido)
       VALUES ($1, $2, $3, $4, 'api', $5, $6)`,
      [resultadoId, enc.id, enc.version_actual, ficha.id, llamadaId, r.contenido],
    );
    await this.evento(enc.id, "resultado_entregado", ficha.id, { resultado_id: resultadoId, origen: "api" });
    return {
      estado: "ok",
      resultado_id: resultadoId,
      llamada_id: llamadaId,
      tokens_entrada: r.tokensEntrada,
      tokens_salida: r.tokensSalida,
      contenido: r.contenido,
    };
  }

  /** Registra un resultado de relevo nativo. Los resultados por API los registra despachar. */
  async registrarResultado(a: {
    encargo_id: string;
    ficha_id: string;
    contenido: string;
    proveedor_original: string;
    motivo: string;
    modelo_nativo: string;
  }) {
    const enc = await this.encargo(a.encargo_id);
    if (!enc.relevo_nativo) throw new ReglaOficina(`El relevo nativo está desactivado para el encargo ${enc.id}.`);
    await this.ficha(a.ficha_id);
    const id = nuevoId("res");
    await this.db.query(
      `INSERT INTO resultados (id, encargo_id, version, ficha_id, origen, proveedor_original, motivo_relevo, modelo_nativo, contenido)
       VALUES ($1, $2, $3, $4, 'relevo_nativo', $5, $6, $7, $8)`,
      [id, enc.id, enc.version_actual, a.ficha_id, a.proveedor_original, a.motivo, a.modelo_nativo, a.contenido],
    );
    await this.evento(enc.id, "resultado_entregado", a.ficha_id, {
      resultado_id: id,
      origen: "relevo_nativo",
      proveedor_original: a.proveedor_original,
      motivo: a.motivo,
      // Un agente no revisa su propio trabajo: lo producido por el Orquestador lo revisa Ariel.
      revision_para: "ariel",
    });
    return { resultado_id: id, origen: "relevo_nativo", revision_para: "ariel" };
  }

  async pedirDecision(a: { encargo_id: string; tipo: "plan" | "resultado" | "emision" | "recurso"; pregunta: string }) {
    const enc = await this.encargo(a.encargo_id);
    const id = nuevoId("dec");
    await this.db.query("INSERT INTO decisiones (id, encargo_id, tipo, pregunta) VALUES ($1, $2, $3, $4)", [
      id,
      enc.id,
      a.tipo,
      a.pregunta,
    ]);
    await this.cambiarEstado(enc.id, "en_revision");
    await this.evento(enc.id, "decision_pendiente", "orquestador", { decision_id: id, tipo: a.tipo });
    return { decision_id: id, estado: "pendiente" };
  }

  async consultarDecision(a: { decision_id: string }) {
    const { rows } = await this.db.query("SELECT * FROM decisiones WHERE id = $1", [a.decision_id]);
    if (!rows[0]) throw new ReglaOficina(`No existe la decisión ${a.decision_id}`);
    return rows[0];
  }

  /**
   * Registra la respuesta de Ariel. La usa la oficina web (via 'web') y el Orquestador
   * cuando Ariel responde en la sesión (via 'orquestador'). Solo Ariel decide.
   */
  async responderDecision(a: { decision_id: string; estado: "aprobada" | "devuelta"; comentario?: string; via: "web" | "orquestador" }) {
    const { rows } = await this.db.query<{ encargo_id: string; estado: string }>(
      "SELECT encargo_id, estado FROM decisiones WHERE id = $1",
      [a.decision_id],
    );
    const d = rows[0];
    if (!d) throw new ReglaOficina(`No existe la decisión ${a.decision_id}`);
    if (d.estado !== "pendiente") throw new ReglaOficina(`La decisión ${a.decision_id} ya fue respondida (${d.estado}).`);
    await this.db.query(
      "UPDATE decisiones SET estado = $2, comentario = $3, decidido_via = $4, decidido_en = now() WHERE id = $1",
      [a.decision_id, a.estado, a.comentario ?? null, a.via],
    );
    if (a.estado === "devuelta") await this.cambiarEstado(d.encargo_id, "en_curso");
    await this.evento(d.encargo_id, a.estado === "aprobada" ? "decision_aprobada" : "decision_devuelta", "ariel", {
      decision_id: a.decision_id,
      via: a.via,
    });
    return { decision_id: a.decision_id, estado: a.estado };
  }

  /**
   * Cierra el encargo. 'emitir' exige una decisión de emisión aprobada por Ariel.
   * Los candidatos de RR. HH. quedan como 'candidato' hasta que Ariel apruebe guardarlos.
   */
  async cerrarEncargo(a: {
    encargo_id: string;
    modo: "emitir" | "archivar";
    decision_id?: string;
    candidatos?: { tipo: "ficha" | "script" | "aprendizaje"; titulo: string; resumen: string; contenido: string }[];
  }) {
    const enc = await this.encargo(a.encargo_id);
    if (a.modo === "emitir") {
      if (!a.decision_id) throw new ReglaOficina("Para emitir hace falta la decisión de emisión aprobada por Ariel.");
      const d = (await this.consultarDecision({ decision_id: a.decision_id })) as { encargo_id: string; tipo: string; estado: string };
      if (d.encargo_id !== enc.id || d.tipo !== "emision" || d.estado !== "aprobada") {
        throw new ReglaOficina("La decisión indicada no es una emisión aprobada de este encargo. No se emite.");
      }
    }
    const candidatos = [];
    for (const c of a.candidatos ?? []) {
      const id = nuevoId("rec");
      await this.db.query(
        `INSERT INTO biblioteca (id, tipo, titulo, resumen, contenido, origen_encargo, estado)
         VALUES ($1, $2, $3, $4, $5, $6, 'candidato')`,
        [id, c.tipo, c.titulo, c.resumen, c.contenido, enc.id],
      );
      candidatos.push({ recurso_id: id, tipo: c.tipo, titulo: c.titulo });
    }
    const estado = a.modo === "emitir" ? "emitido" : "cerrado";
    await this.cambiarEstado(enc.id, estado);
    await this.evento(enc.id, a.modo === "emitir" ? "encargo_emitido" : "encargo_cerrado", "orquestador", {
      candidatos: candidatos.length,
    });
    if (candidatos.length) await this.evento(enc.id, "rrhh_candidatos", "rrhh", { candidatos });
    return { encargo_id: enc.id, estado, candidatos };
  }

  /** Reabre un encargo como versión nueva; el historial anterior se conserva. */
  async reabrirEncargo(a: { encargo_id: string; motivo: string }) {
    const enc = await this.encargo(a.encargo_id);
    const version = enc.version_actual + 1;
    await this.db.query("INSERT INTO encargo_versiones (id, encargo_id, version, motivo) VALUES ($1, $2, $3, $4)", [
      nuevoId("ver"),
      enc.id,
      version,
      a.motivo,
    ]);
    await this.db.query("UPDATE encargos SET version_actual = $2, estado = 'abierto', actualizado = now() WHERE id = $1", [enc.id, version]);
    await this.evento(enc.id, "encargo_reabierto", "orquestador", { version, motivo: a.motivo });
    return { encargo_id: enc.id, version };
  }

  async guardarRecurso(a: { recurso_id: string; decision_id: string }) {
    const { rows } = await this.db.query<{ estado: string; origen_encargo: string }>(
      "SELECT estado, origen_encargo FROM biblioteca WHERE id = $1",
      [a.recurso_id],
    );
    const r = rows[0];
    if (!r) throw new ReglaOficina(`No existe el recurso ${a.recurso_id}`);
    if (r.estado !== "candidato") throw new ReglaOficina(`El recurso ${a.recurso_id} no es candidato (${r.estado}).`);
    const d = (await this.consultarDecision({ decision_id: a.decision_id })) as { tipo: string; estado: string };
    if (d.tipo !== "recurso" || d.estado !== "aprobada") {
      throw new ReglaOficina("Guardar un recurso exige una decisión de tipo recurso aprobada por Ariel.");
    }
    await this.db.query("UPDATE biblioteca SET estado = 'guardado', decision_id = $2 WHERE id = $1", [a.recurso_id, a.decision_id]);
    await this.evento(r.origen_encargo, "recurso_guardado", "rrhh", { recurso_id: a.recurso_id });
    return { recurso_id: a.recurso_id, estado: "guardado" };
  }

  async estadoProveedores() {
    return this.reportarProveedores();
  }
}
