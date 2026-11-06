import { NextResponse } from "next/server";
import { aplicarMigraciones, sincronizarFichasEn } from "oficina-mcp/esquema";
import { sesionValida } from "@/lib/auth";
import { db } from "@/lib/db";
import { FICHAS } from "@/lib/fichas";

export const dynamic = "force-dynamic";

/** Crea las tablas del estado compartido y carga las fichas. Idempotente. Solo con sesión iniciada. */
export async function POST() {
  if (!(await sesionValida())) return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  const pool = db();
  if (!pool) return NextResponse.json({ error: "El servidor no ve ninguna cadena de conexión de Postgres" }, { status: 503 });
  try {
    const migraciones = await aplicarMigraciones(pool);
    const fichas = await sincronizarFichasEn(pool, FICHAS);
    return NextResponse.json({ migraciones, fichas });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
