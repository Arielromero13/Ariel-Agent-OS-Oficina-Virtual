import pg from "pg";

let pool: pg.Pool | null = null;

/**
 * Cadena de conexión del estado compartido. Acepta DATABASE_URL y los nombres que crea la
 * integración de Neon en Vercel según el prefijo elegido al conectarla (STORAGE_URL, POSTGRES_URL).
 */
export function urlBase(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.DATABASE_URL || env.STORAGE_URL || env.POSTGRES_URL || undefined;
}

/** Conexión al estado compartido. Devuelve null si no hay cadena de conexión. */
export function db(): pg.Pool | null {
  const url = urlBase();
  if (!url) return null;
  pool ??= new pg.Pool({ connectionString: url, max: 3 });
  return pool;
}
