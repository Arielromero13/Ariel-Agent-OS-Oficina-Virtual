import { NextResponse } from "next/server";
import { sesionValida } from "@/lib/auth";
import { guardarMensajeDeAriel, validarMensaje } from "@/lib/buzon";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Ariel deja un mensaje en el buzón del Orquestador. Lo lee la sesión nativa con leer_buzon. */
export async function POST(req: Request) {
  if (!(await sesionValida())) return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  const pool = db();
  if (!pool) return NextResponse.json({ error: "Estado compartido no configurado" }, { status: 503 });
  const m = validarMensaje(await req.json().catch(() => null));
  if (typeof m === "string") return NextResponse.json({ error: m }, { status: 400 });
  if (m.encargo_id) {
    const e = await pool.query("SELECT 1 FROM encargos WHERE id = $1", [m.encargo_id]);
    if (!e.rows[0]) return NextResponse.json({ error: "El encargo no existe" }, { status: 400 });
  }
  return NextResponse.json(await guardarMensajeDeAriel(pool, m));
}
