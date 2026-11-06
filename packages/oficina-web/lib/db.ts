import pg from "pg";
import { urlBase } from "oficina-mcp/conexion";

export { urlBase };

let pool: pg.Pool | null = null;

/** Conexión al estado compartido. Devuelve null si el servidor no ve ninguna cadena de Postgres. */
export function db(): pg.Pool | null {
  const c = urlBase();
  if (!c) return null;
  pool ??= new pg.Pool({ connectionString: c.url, max: 3 });
  return pool;
}
