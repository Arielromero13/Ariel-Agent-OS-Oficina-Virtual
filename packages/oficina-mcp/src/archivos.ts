/**
 * Almacenamiento de archivos del buzón (Vercel Blob). Los archivos son privados: la oficina web
 * los sirve tras comprobar la sesión y oficina-mcp los lee con el token del almacén.
 * OFICINA_BLOB_ACCESS=public solo si el almacén se creó público.
 */
import { extname } from "node:path";
import { tokenBlob } from "./blobtoken.js";

export type Acceso = "private" | "public";

export function accesoBlob(env: NodeJS.ProcessEnv = process.env): Acceso {
  return env.OFICINA_BLOB_ACCESS === "public" ? "public" : "private";
}

export { tokenBlob };

export interface Almacen {
  subir(ruta: string, contenido: Buffer, tipo: string): Promise<{ url: string }>;
  leer(url: string): Promise<Buffer>;
}

/** Almacén real. Falla con un mensaje claro si no hay token. */
export function almacenBlob(env: NodeJS.ProcessEnv = process.env): Almacen | null {
  const token = tokenBlob(env);
  if (!token) return null;
  const access = accesoBlob(env);
  return {
    async subir(ruta, contenido, tipo) {
      const { put } = await import("@vercel/blob");
      const r = await put(ruta, contenido, { access, token, contentType: tipo, addRandomSuffix: true });
      return { url: r.url };
    },
    async leer(url) {
      const { get } = await import("@vercel/blob");
      const r = await get(url, { access, token });
      if (!r) throw new Error(`El archivo no existe en el almacén: ${url}`);
      return Buffer.from(await new Response(r.stream).arrayBuffer());
    },
  };
}

const TIPOS: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".csv": "text/csv",
  ".md": "text/markdown",
  ".txt": "text/plain",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".zip": "application/zip",
};

export function tipoDe(nombre: string): string {
  return TIPOS[extname(nombre).toLowerCase()] ?? "application/octet-stream";
}

/** Nombre seguro para guardar en disco o en el almacén. */
export function nombreSeguro(nombre: string): string {
  const limpio = nombre.normalize("NFKD").replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "_").replace(/^\.+/, "");
  return limpio.slice(-120) || "archivo";
}
