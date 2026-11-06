import { randomUUID } from "node:crypto";
import type pg from "pg";

/** Límites de lo que Ariel sube desde la oficina (el plan gratuito de Blob tiene 1 GB en total). */
export const MAX_BYTES_SUBIDA = 25 * 1024 * 1024;
export const MAX_ADJUNTOS = 10;
export const TIPOS_PERMITIDOS = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-excel",
  "text/csv",
  "text/plain",
  "text/markdown",
  "application/json",
  "application/zip",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const nuevoId = (prefijo: string) => `${prefijo}_${randomUUID().slice(0, 8)}`;

export interface AdjuntoSubido {
  url: string;
  nombre: string;
  tipo: string;
  tamano: number;
}

/** Solo se aceptan archivos que estén en el almacén de Vercel Blob (subidos por /api/subir). */
export function urlDelAlmacen(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function validarMensaje(cuerpo: unknown): { texto: string; encargo_id: string | null; archivos: AdjuntoSubido[] } | string {
  const c = (cuerpo ?? {}) as { texto?: unknown; encargo_id?: unknown; archivos?: unknown };
  const texto = typeof c.texto === "string" ? c.texto.trim() : "";
  const archivos = Array.isArray(c.archivos) ? (c.archivos as AdjuntoSubido[]) : [];
  if (!texto && archivos.length === 0) return "Escribe un mensaje o adjunta un archivo";
  if (texto.length > 20000) return "El mensaje es demasiado largo (máximo 20 000 caracteres)";
  if (archivos.length > MAX_ADJUNTOS) return `Máximo ${MAX_ADJUNTOS} archivos por mensaje`;
  for (const a of archivos) {
    if (typeof a?.url !== "string" || !urlDelAlmacen(a.url)) return "Un adjunto no está en el almacén de la oficina";
    if (typeof a.nombre !== "string" || !a.nombre.trim()) return "Un adjunto no tiene nombre";
    if (typeof a.tamano !== "number" || a.tamano < 0 || a.tamano > MAX_BYTES_SUBIDA) return `Un adjunto supera ${MAX_BYTES_SUBIDA / 1024 / 1024} MB`;
    if (typeof a.tipo !== "string") return "Un adjunto no tiene tipo";
  }
  const encargo_id = typeof c.encargo_id === "string" && c.encargo_id ? c.encargo_id : null;
  return { texto: texto || "(archivos adjuntos)", encargo_id, archivos };
}

export async function guardarMensajeDeAriel(db: pg.Pool, m: { texto: string; encargo_id: string | null; archivos: AdjuntoSubido[] }) {
  const id = nuevoId("msg");
  const cliente = await db.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query("INSERT INTO mensajes (id, encargo_id, autor, texto) VALUES ($1, $2, 'ariel', $3)", [id, m.encargo_id, m.texto]);
    for (const a of m.archivos) {
      await cliente.query(
        `INSERT INTO archivos (id, encargo_id, mensaje_id, origen, nombre, tipo, tamano, url)
         VALUES ($1, $2, $3, 'ariel', $4, $5, $6, $7)`,
        [nuevoId("arc"), m.encargo_id, id, a.nombre.trim().slice(0, 200), a.tipo, a.tamano, a.url],
      );
    }
    await cliente.query("INSERT INTO eventos (encargo_id, tipo, actor, datos) VALUES ($1, 'mensaje_ariel', 'ariel', $2)", [
      m.encargo_id,
      JSON.stringify({ mensaje_id: id, archivos: m.archivos.length }),
    ]);
    await cliente.query("COMMIT");
  } catch (e) {
    await cliente.query("ROLLBACK");
    throw e;
  } finally {
    cliente.release();
  }
  return { mensaje_id: id };
}
