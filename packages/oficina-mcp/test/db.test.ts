import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { usarNeonHttp } from "../src/db.js";
import { MIGRACIONES, aplicarMigraciones, sentencias } from "../src/esquema.js";

test("las migraciones aplicadas sentencia por sentencia (como en Neon por HTTP) crean el esquema completo", async () => {
  const pg = new PGlite();
  // Sin exec: cada llamada lleva una sola sentencia, igual que Neon por HTTP.
  const unaPorLlamada = {
    query: async (sql: string, params?: unknown[]) => {
      assert.equal(sentencias(sql).length, 1, "una sola sentencia por llamada");
      return pg.query(sql, params) as never;
    },
    exec: async (sql: string) => {
      for (const s of sentencias(sql)) await unaPorLlamada.query(s);
    },
  };
  await aplicarMigraciones(unaPorLlamada);
  await aplicarMigraciones(unaPorLlamada);
  const { rows } = await pg.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'",
  );
  const esperadas = sentencias(MIGRACIONES.map((m) => m.sql).join(";")).filter((s) => /^CREATE TABLE/i.test(s)).length;
  assert.equal(rows[0].n, esperadas);
});

test("los comentarios con ';' no rompen la división en sentencias", () => {
  assert.deepEqual(sentencias("-- uno; dos\nCREATE TABLE a (x INT); -- fin;\nSELECT 1;"), ["CREATE TABLE a (x INT)", "SELECT 1"]);
});

test("Neon usa HTTPS; otros Postgres usan pg; OFICINA_DRIVER fuerza la elección", () => {
  const neon = "postgresql://u:c@ep-abc-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require";
  assert.equal(usarNeonHttp(neon, {}), true);
  assert.equal(usarNeonHttp("postgresql://u:c@localhost:5432/oficina", {}), false);
  assert.equal(usarNeonHttp(neon, { OFICINA_DRIVER: "pg" }), false);
  assert.equal(usarNeonHttp("postgresql://u:c@localhost/x", { OFICINA_DRIVER: "neon" }), true);
});
