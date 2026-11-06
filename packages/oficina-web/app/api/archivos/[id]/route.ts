import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { tokenBlob } from "oficina-mcp/blobtoken";
import { sesionValida } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Sirve un archivo del buzón tras comprobar la sesión. Los archivos son privados en el almacén. */
const VISTA_PREVIA = /^(application\/pdf|image\/(jpeg|png|webp))$/;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await sesionValida())) return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  const pool = db();
  if (!pool) return NextResponse.json({ error: "Estado compartido no configurado" }, { status: 503 });
  const { id } = await ctx.params;
  const { rows } = await pool.query<{ nombre: string; tipo: string; url: string }>("SELECT nombre, tipo, url FROM archivos WHERE id = $1", [id]);
  const f = rows[0];
  if (!f) return NextResponse.json({ error: "No existe el archivo" }, { status: 404 });
  const access = process.env.OFICINA_BLOB_ACCESS === "public" ? "public" : "private";
  const r = await get(f.url, { access, token: tokenBlob() });
  if (!r || !r.stream) return NextResponse.json({ error: "El archivo no está en el almacén" }, { status: 404 });
  // ?ver=1 muestra PDF e imágenes dentro de la oficina; todo lo demás se descarga.
  const enLinea = new URL(req.url).searchParams.get("ver") === "1" && VISTA_PREVIA.test(f.tipo);
  return new Response(r.stream, {
    headers: {
      "Content-Type": f.tipo,
      "Content-Disposition": `${enLinea ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(f.nombre)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
}
