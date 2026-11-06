import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RAIZ_REPO } from "../src/db.js";

// Evita que AGENTS.md y el servidor se desalineen: toda herramienta registrada debe estar
// descrita en las instrucciones del Orquestador.
test("AGENTS.md menciona todas las herramientas registradas en oficina-mcp", () => {
  const fuente = readFileSync(join(RAIZ_REPO, "packages", "oficina-mcp", "src", "index.ts"), "utf8");
  const herramientas = [...fuente.matchAll(/^herramienta\(\s*"([a-z_]+)"/gm)].map((m) => m[1]);
  assert.ok(herramientas.length >= 12, `se esperaban al menos 12 herramientas, hay ${herramientas.length}`);
  const agents = readFileSync(join(RAIZ_REPO, "AGENTS.md"), "utf8");
  const faltan = herramientas.filter((h) => !agents.includes(`\`${h}\``));
  assert.deepEqual(faltan, [], `AGENTS.md no menciona: ${faltan.join(", ")}`);
});
