import { test } from "node:test";
import assert from "node:assert/strict";
import { urlBase } from "../lib/db";

test("usa DATABASE_URL si existe", () => {
  assert.equal(urlBase({ DATABASE_URL: "postgres://a", STORAGE_URL: "postgres://b" } as never)?.nombre, "DATABASE_URL");
});

test("detecta cualquier variable con prefijo elegido en la integración", () => {
  const r = urlBase({ NEON_X_DATABASE_URL: "postgresql://u:p@h/db", OTRA: "hola" } as never);
  assert.equal(r?.nombre, "NEON_X_DATABASE_URL");
});

test("prefiere la conexión con pool a la directa", () => {
  const r = urlBase({ ZZ_DATABASE_URL_UNPOOLED: "postgres://directa", ZZ_DATABASE_URL: "postgres://pool" } as never);
  assert.equal(r?.nombre, "ZZ_DATABASE_URL");
});

test("sin variables de Postgres devuelve undefined", () => {
  assert.equal(urlBase({ PATH: "/bin", FOO: "bar" } as never), undefined);
});
