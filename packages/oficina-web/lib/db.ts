import pg from "pg";

let pool: pg.Pool | null = null;

const NOMBRES_PREFERIDOS = ["DATABASE_URL", "POSTGRES_URL", "STORAGE_DATABASE_URL", "STORAGE_POSTGRES_URL", "STORAGE_URL"];
const ES_POSTGRES = /^postgres(ql)?:\/\//i;

/**
 * Cadena de conexión del estado compartido. La integración de Neon en Vercel nombra las
 * variables según el prefijo elegido al conectarla (DATABASE_URL, STORAGE_DATABASE_URL,
 * POSTGRES_URL...). Se prueban los nombres habituales y, si ninguno existe, se toma cualquier
 * variable cuyo valor sea una cadena postgres://, prefiriendo la conexión con pool
 * (las variantes UNPOOLED / NON_POOLING se usan solo si no hay otra).
 */
export function urlBase(env: NodeJS.ProcessEnv = process.env): { url: string; nombre: string } | undefined {
  for (const nombre of NOMBRES_PREFERIDOS) {
    const v = env[nombre];
    if (v && ES_POSTGRES.test(v)) return { url: v, nombre };
  }
  const candidatas = Object.entries(env)
    .filter(([, v]) => typeof v === "string" && ES_POSTGRES.test(v))
    .map(([nombre, url]) => ({ nombre, url: url as string }))
    .sort((a, b) => Number(/UNPOOLED|NON_POOLING/i.test(a.nombre)) - Number(/UNPOOLED|NON_POOLING/i.test(b.nombre)));
  return candidatas[0];
}

/** Nombres de variables con cadena de Postgres (sin valores). Sirve para diagnosticar. */
export function nombresConPostgres(env: NodeJS.ProcessEnv = process.env): string[] {
  return Object.entries(env)
    .filter(([, v]) => typeof v === "string" && ES_POSTGRES.test(v))
    .map(([n]) => n);
}

/** Conexión al estado compartido. Devuelve null si no hay cadena de conexión. */
export function db(): pg.Pool | null {
  const c = urlBase();
  if (!c) return null;
  pool ??= new pg.Pool({ connectionString: c.url, max: 3 });
  return pool;
}
