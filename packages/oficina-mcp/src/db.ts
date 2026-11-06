import { join } from "node:path";
import { aplicarMigraciones, sentencias } from "./esquema.js";
import { urlBase } from "./conexion.js";

/** Interfaz mínima común a `pg` (Postgres alojado), Neon por HTTP y PGlite (pruebas). */
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<unknown>;
}

export const RAIZ_REPO = join(import.meta.dirname, "..", "..", "..");

/**
 * Neon por HTTPS cuando la base está en Neon. En las sesiones en la nube solo sale tráfico
 * HTTPS por el proxy, así que la conexión TCP de `pg` al puerto 5432 no llega.
 * OFICINA_DRIVER=pg u OFICINA_DRIVER=neon fuerzan uno u otro.
 */
export function usarNeonHttp(url: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.OFICINA_DRIVER === "pg") return false;
  if (env.OFICINA_DRIVER === "neon") return true;
  try {
    return new URL(url).hostname.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

/** Conecta al estado compartido (DATABASE_URL o la variable que cree la integración de Neon). */
export async function conectar(url = urlBase()?.url): Promise<Db> {
  if (!url) {
    throw new Error(
      "Falta la cadena de conexión: define DATABASE_URL (o la variable de la integración de Neon). Ver .env.example.",
    );
  }
  if (usarNeonHttp(url)) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url, { fullResults: true });
    const query = async (texto: string, params?: unknown[]) => {
      const r = await sql.query(texto, params ?? []);
      return { rows: r.rows } as never;
    };
    return {
      query,
      exec: async (texto) => {
        for (const s of sentencias(texto)) await query(s);
      },
    };
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
