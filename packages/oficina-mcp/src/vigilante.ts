/**
 * Vigilancia del buzón: detecta mensajes nuevos de Ariel sin leerlos ni marcarlos. Pensada para
 * un proceso que despierta al Orquestador (Monitor de Claude Code); el Orquestador lee después
 * con leer_buzon. Solo se informa el id y el tamaño, nunca el texto del mensaje.
 */
import type { Db } from "./db.js";

export interface Aviso {
  id: string;
  caracteres: number;
  archivos: number;
}

/** Mensajes de Ariel sin leer que todavía no se avisaron. Actualiza `vistos`. */
export async function mensajesNuevos(db: Db, vistos: Set<string>): Promise<Aviso[]> {
  const { rows } = await db.query<{ id: string; caracteres: number; archivos: number }>(
    `SELECT m.id, length(m.texto)::int AS caracteres, (SELECT count(*) FROM archivos a WHERE a.mensaje_id = m.id)::int AS archivos
     FROM mensajes m WHERE m.autor = 'ariel' AND m.leido_en IS NULL ORDER BY m.creado`,
  );
  const sinLeer = new Set(rows.map((r) => r.id));
  // Lo que ya se leyó deja de ocupar memoria.
  for (const id of vistos) if (!sinLeer.has(id)) vistos.delete(id);
  const nuevos = rows.filter((r) => !vistos.has(r.id));
  for (const r of nuevos) vistos.add(r.id);
  return nuevos;
}

/** Marca que hay una sesión vigilando: la web muestra «último contacto» con honestidad. */
export async function latido(db: Db) {
  await db.query(
    `INSERT INTO presencia (id, latido) VALUES ('orquestador', now())
     ON CONFLICT (id) DO UPDATE SET latido = now()`,
  );
}
