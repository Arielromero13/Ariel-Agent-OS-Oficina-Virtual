/**
 * Lógica compartida entre oficina-mcp y la oficina web. Sin dependencias de sistema de
 * archivos, para que la web la importe tal cual.
 */

export interface Consultable {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

/** Error de regla de negocio: se devuelve como mensaje, no como fallo del servidor. */
export class ReglaOficina extends Error {}

export async function registrarEvento(db: Consultable, encargoId: string | null, tipo: string, actor: string, datos: object = {}) {
  await db.query("INSERT INTO eventos (encargo_id, tipo, actor, datos) VALUES ($1, $2, $3, $4)", [
    encargoId,
    tipo,
    actor,
    JSON.stringify(datos),
  ]);
}

/**
 * Registra la respuesta de Ariel a una decisión pendiente. 'web' = desde la oficina;
 * 'orquestador' = Ariel respondió en la sesión nativa. Solo Ariel decide.
 */
export async function responderDecision(
  db: Consultable,
  a: { decision_id: string; estado: "aprobada" | "devuelta"; comentario?: string; via: "web" | "orquestador" },
) {
  const { rows } = await db.query<{ encargo_id: string; estado: string }>(
    "SELECT encargo_id, estado FROM decisiones WHERE id = $1",
    [a.decision_id],
  );
  const d = rows[0];
  if (!d) throw new ReglaOficina(`No existe la decisión ${a.decision_id}`);
  if (d.estado !== "pendiente") throw new ReglaOficina(`La decisión ${a.decision_id} ya fue respondida (${d.estado}).`);
  // La condición sobre 'pendiente' evita que dos respuestas simultáneas (tablet y sesión) se pisen.
  const r = await db.query<{ id: string }>(
    `UPDATE decisiones SET estado = $2, comentario = $3, decidido_via = $4, decidido_en = now()
     WHERE id = $1 AND estado = 'pendiente' RETURNING id`,
    [a.decision_id, a.estado, a.comentario ?? null, a.via],
  );
  if (!r.rows[0]) throw new ReglaOficina(`La decisión ${a.decision_id} ya fue respondida.`);
  if (a.estado === "devuelta") {
    await db.query("UPDATE encargos SET estado = 'en_curso', actualizado = now() WHERE id = $1", [d.encargo_id]);
  }
  await registrarEvento(db, d.encargo_id, a.estado === "aprobada" ? "decision_aprobada" : "decision_devuelta", "ariel", {
    decision_id: a.decision_id,
    via: a.via,
  });
  return { decision_id: a.decision_id, estado: a.estado };
}
