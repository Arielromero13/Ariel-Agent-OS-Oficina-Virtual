import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Interfaz mínima común a `pg` (Postgres alojado) y PGlite (pruebas). */
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<unknown>;
}

export const RAIZ_REPO = join(import.meta.dirname, "..", "..", "..");

/** Conecta al estado compartido definido en DATABASE_URL. */
export async function conectar(url = process.env.DATABASE_URL): Promise<Db> {
  if (!url) {
    throw new Error(
      "Falta DATABASE_URL. oficina-mcp necesita la base de datos del estado compartido (ver .env.example).",
    );
  }
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 3 });
  return {
    query: async (sql, params) => pool.query(sql, params as unknown[]) as never,
    exec: (sql) => pool.query(sql),
  };
}

/** Aplica en orden todas las migraciones de db/migraciones. Son idempotentes. */
export async function migrar(db: Db, dir = join(RAIZ_REPO, "db", "migraciones")): Promise<string[]> {
  const archivos = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const archivo of archivos) {
    await db.exec(readFileSync(join(dir, archivo), "utf8"));
  }
  return archivos;
}
