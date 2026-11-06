import { join } from "node:path";
import { aplicarMigraciones } from "./esquema.js";
import { urlBase } from "./conexion.js";

/** Interfaz mínima común a `pg` (Postgres alojado) y PGlite (pruebas). */
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<unknown>;
}

export const RAIZ_REPO = join(import.meta.dirname, "..", "..", "..");

/** Conecta al estado compartido (DATABASE_URL o la variable que cree la integración de Neon). */
export async function conectar(url = urlBase()?.url): Promise<Db> {
  if (!url) {
    throw new Error(
      "Falta la cadena de conexión: define DATABASE_URL (o la variable de la integración de Neon). Ver .env.example.",
    );
  }
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 3 });
  return {
    query: async (sql, params) => pool.query(sql, params as unknown[]) as never,
    exec: (sql) => pool.query(sql),
  };
}

/** Aplica las migraciones (idempotentes). */
export async function migrar(db: Db): Promise<string[]> {
  return aplicarMigraciones(db);
}
