import { NextResponse } from "next/server";
import { ReglaOficina, responderDecision } from "oficina-mcp/decisiones";
import { sesionValida } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await sesionValida())) return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  const pool = db();
  if (!pool) return NextResponse.json({ error: "Estado compartido no configurado" }, { status: 503 });
  const { id } = await ctx.params;
  const cuerpo = (await req.json().catch(() => ({}))) as { estado?: string; comentario?: string };
  if (cuerpo.estado !== "aprobada" && cuerpo.estado !== "devuelta") {
    return NextResponse.json({ error: "estado debe ser 'aprobada' o 'devuelta'" }, { status: 400 });
  }
  if (cuerpo.estado === "devuelta" && !cuerpo.comentario?.trim()) {
    return NextResponse.json({ error: "Para devolver hace falta un comentario" }, { status: 400 });
  }
  try {
    const r = await responderDecision(pool, {
      decision_id: id,
      estado: cuerpo.estado,
      comentario: cuerpo.comentario?.trim() || undefined,
      via: "web",
    });
    return NextResponse.json(r);
  } catch (e) {
    if (e instanceof ReglaOficina) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
