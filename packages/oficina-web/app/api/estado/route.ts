import { NextResponse } from "next/server";
import { sesionValida } from "@/lib/auth";
import { db } from "@/lib/db";
import { leerEstado } from "@/lib/estado";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await sesionValida())) return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  return NextResponse.json(await leerEstado(db()), { headers: { "Cache-Control": "no-store" } });
}
