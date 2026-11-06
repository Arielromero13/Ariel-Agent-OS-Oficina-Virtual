import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { tokenBlob } from "oficina-mcp/blobtoken";
import { sesionValida } from "@/lib/auth";
import { MAX_BYTES_SUBIDA, TIPOS_PERMITIDOS } from "@/lib/buzon";

export const dynamic = "force-dynamic";

/**
 * Emite el permiso para que el navegador suba un archivo directo a Vercel Blob (sin pasar por la
 * función, que tiene límite de tamaño). Solo con sesión iniciada. El archivo queda registrado
 * cuando se envía el mensaje (/api/mensajes).
 */
export async function POST(req: Request) {
  const token = tokenBlob();
  if (!token) {
    return NextResponse.json({ error: "Almacén de archivos no configurado (la web no ve ninguna variable *_READ_WRITE_TOKEN de Blob)" }, { status: 503 });
  }
  const body = (await req.json()) as HandleUploadBody;
  try {
    const r = await handleUpload({
      body,
      request: req,
      token,
      onBeforeGenerateToken: async (pathname) => {
        // La subida del navegador pide el permiso con la cookie de sesión.
        if (!(await sesionValida())) throw new Error("Sesión no válida");
        if (!pathname.startsWith("ariel/")) throw new Error("Ruta no permitida");
        return { allowedContentTypes: TIPOS_PERMITIDOS, maximumSizeInBytes: MAX_BYTES_SUBIDA, addRandomSuffix: true };
      },
    });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
