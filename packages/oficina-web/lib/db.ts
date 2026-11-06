import pg from "pg";

let pool: pg.Pool | null = null;

/** Conexión al estado compartido. Devuelve null si DATABASE_URL no está definida. */
export function db(): pg.Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  pool ??= new pg.Pool({ connectionString: url, max: 3 });
  return pool;
}
