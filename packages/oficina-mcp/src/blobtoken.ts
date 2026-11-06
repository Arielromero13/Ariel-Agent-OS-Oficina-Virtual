/**
 * Token del almacén de Vercel Blob. Al conectar el almacén desde Vercel se puede elegir un
 * prefijo para las variables (por ejemplo STORAGE_ → STORAGE_READ_WRITE_TOKEN), igual que pasó con
 * la base de datos. Se acepta BLOB_READ_WRITE_TOKEN y, si no existe, cualquier variable terminada
 * en _READ_WRITE_TOKEN cuyo valor tenga la forma de un token de Blob. Sin dependencias: lo usa la web.
 */
const FORMA_TOKEN = /^vercel_blob_rw_/;

export function tokenBlob(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const directo = env.BLOB_READ_WRITE_TOKEN;
  if (directo && directo.trim() !== "") return directo;
  for (const [nombre, valor] of Object.entries(env)) {
    if (/_READ_WRITE_TOKEN$/.test(nombre) && typeof valor === "string" && FORMA_TOKEN.test(valor)) return valor;
  }
  return undefined;
}
