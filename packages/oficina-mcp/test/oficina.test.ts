import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { migrar, type Db } from "../src/db.js";
import { Oficina, ReglaOficina } from "../src/oficina.js";
import type { Fetch } from "../src/proveedores.js";

async function nuevaBase(): Promise<Db> {
  const pg = new PGlite();
  const db: Db = { query: (s, p) => pg.query(s, p) as never, exec: (s) => pg.exec(s) };
  await migrar(db);
  return db;
}

const respuestaOk: Fetch = async () =>
  new Response(
    JSON.stringify({ choices: [{ message: { content: "Columnas: Va, Vb, Vc (V)." } }], usage: { prompt_tokens: 120, completion_tokens: 30 } }),
    { status: 200 },
  );

async function preparar(env: NodeJS.ProcessEnv, f: Fetch = respuestaOk) {
  const db = await nuevaBase();
  const oficina = new Oficina(db, { env, fetch: f });
  await oficina.sincronizarFichas();
  await oficina.reportarProveedores();
  return { db, oficina };
}

test("criterio 1: sin clave de DeepSeek su ficha queda No configurado y el plan no la acepta", async () => {
  const { db, oficina } = await preparar({ QWEN_API_KEY: "q" });
  const { rows } = await db.query<{ id: string; configurado: boolean }>("SELECT id, configurado FROM proveedores ORDER BY id");
  assert.deepEqual(rows, [
    { id: "deepseek", configurado: false },
    { id: "qwen", configurado: true },
  ]);
  const { encargo_id } = await oficina.abrirEncargo({ titulo: "PQ", descripcion: "Prueba", sensibilidad: "externo" });
  await assert.rejects(
    oficina.proponerPlan({ encargo_id, plan: "x", equipo: [{ ficha_id: "redactor-tecnico", tarea: "redactar" }] }),
    ReglaOficina,
  );
  const ok = await oficina.proponerPlan({ encargo_id, plan: "x", equipo: [{ ficha_id: "extractor-datos", tarea: "extraer" }] });
  assert.equal(ok.equipo, 1);
});

test("criterio 2: sin saldo, despachar devuelve sin_cuota y el relevo nativo queda registrado", async () => {
  const sinSaldo: Fetch = async () => new Response('{"error":"Insufficient Balance"}', { status: 402 });
  const { db, oficina } = await preparar({ DEEPSEEK_API_KEY: "d" }, sinSaldo);
  const { encargo_id } = await oficina.abrirEncargo({ titulo: "PQ", descripcion: "Prueba", sensibilidad: "externo" });
  const r = await oficina.despachar({ encargo_id, ficha_id: "redactor-tecnico", instrucciones: "Redacta" });
  assert.equal(r.estado, "sin_cuota");
  assert.equal((await db.query("SELECT * FROM resultados")).rows.length, 0, "un fallo no produce texto de resultado");

  const relevo = await oficina.registrarResultado({
    encargo_id,
    ficha_id: "redactor-tecnico",
    contenido: "Texto del subagente nativo",
    proveedor_original: "deepseek",
    motivo: "sin_cuota",
    modelo_nativo: "claude-opus-5-5",
  });
  assert.equal(relevo.revision_para, "ariel");
  const { rows } = await db.query<{ origen: string; proveedor_original: string }>("SELECT origen, proveedor_original FROM resultados");
  assert.deepEqual(rows, [{ origen: "relevo_nativo", proveedor_original: "deepseek" }]);
});

test("criterio 3: todo resultado visible tiene una llamada registrada o un relevo nativo", async () => {
  const { db, oficina } = await preparar({ QWEN_API_KEY: "q" });
  const { encargo_id } = await oficina.abrirEncargo({ titulo: "PQ", descripcion: "Prueba", sensibilidad: "externo" });
  const r = await oficina.despachar({ encargo_id, ficha_id: "extractor-datos", instrucciones: "Extrae" });
  assert.equal(r.estado, "ok");
  const { rows } = await db.query<{ proveedor: string; modelo: string; tokens_entrada: number }>(
    "SELECT l.proveedor, l.modelo, l.tokens_entrada FROM resultados r JOIN llamadas l ON l.id = r.llamada_id",
  );
  assert.deepEqual(rows, [{ proveedor: "qwen", modelo: "qwen-plus", tokens_entrada: 120 }]);
  // La base rechaza un resultado por API sin llamada.
  await assert.rejects(
    db.query("INSERT INTO resultados (id, encargo_id, version, ficha_id, origen, contenido) VALUES ('x', $1, 1, 'a', 'api', 't')", [encargo_id]),
  );
});

test("criterio 4: no se emite sin una decisión de emisión aprobada", async () => {
  const { oficina } = await preparar({});
  const { encargo_id } = await oficina.abrirEncargo({ titulo: "PQ", descripcion: "Prueba", sensibilidad: "externo" });
  await assert.rejects(oficina.cerrarEncargo({ encargo_id, modo: "emitir" }), ReglaOficina);
  const { decision_id } = await oficina.pedirDecision({ encargo_id, tipo: "emision", pregunta: "¿Emitir?" });
  await assert.rejects(oficina.cerrarEncargo({ encargo_id, modo: "emitir", decision_id }), ReglaOficina, "pendiente no basta");
  await oficina.responderDecision({ decision_id, estado: "aprobada", via: "web" });
  const r = await oficina.cerrarEncargo({ encargo_id, modo: "emitir", decision_id });
  assert.equal(r.estado, "emitido");
});

test("criterio 5: reabrir conserva historial y versiones", async () => {
  const { db, oficina } = await preparar({ QWEN_API_KEY: "q" });
  const { encargo_id } = await oficina.abrirEncargo({ titulo: "PQ", descripcion: "Prueba", sensibilidad: "externo" });
  await oficina.despachar({ encargo_id, ficha_id: "extractor-datos", instrucciones: "Extrae" });
  await oficina.cerrarEncargo({ encargo_id, modo: "archivar" });
  const r = await oficina.reabrirEncargo({ encargo_id, motivo: "Datos nuevos" });
  assert.equal(r.version, 2);
  assert.equal((await db.query("SELECT * FROM encargo_versiones WHERE encargo_id = $1", [encargo_id])).rows.length, 2);
  assert.equal((await db.query("SELECT * FROM resultados WHERE version = 1")).rows.length, 1);
});

test("criterio 6: el candidato de RR. HH. solo se guarda con aprobación de Ariel", async () => {
  const { db, oficina } = await preparar({});
  const { encargo_id } = await oficina.abrirEncargo({ titulo: "PQ", descripcion: "Prueba", sensibilidad: "externo" });
  const { candidatos } = await oficina.cerrarEncargo({
    encargo_id,
    modo: "archivar",
    candidatos: [{ tipo: "aprendizaje", titulo: "Encabezados ION", resumen: "Cómo leer el CSV", contenido: "..." }],
  });
  const recurso_id = candidatos[0].recurso_id;
  const { decision_id } = await oficina.pedirDecision({ encargo_id, tipo: "recurso", pregunta: "¿Guardar?" });
  await assert.rejects(oficina.guardarRecurso({ recurso_id, decision_id }), ReglaOficina);
  await oficina.responderDecision({ decision_id, estado: "aprobada", via: "orquestador" });
  await oficina.guardarRecurso({ recurso_id, decision_id });
  const { rows } = await db.query<{ estado: string }>("SELECT estado FROM biblioteca WHERE id = $1", [recurso_id]);
  assert.equal(rows[0].estado, "guardado");
});

test("un encargo interno no sale a APIs externas", async () => {
  let llamado = false;
  const { oficina } = await preparar({ QWEN_API_KEY: "q" }, async () => {
    llamado = true;
    return new Response("{}");
  });
  const { encargo_id } = await oficina.abrirEncargo({ titulo: "Interno", descripcion: "Datos de planta", sensibilidad: "interno" });
  await assert.rejects(oficina.despachar({ encargo_id, ficha_id: "extractor-datos", instrucciones: "x" }), ReglaOficina);
  assert.equal(llamado, false);
});

test("cada acción deja eventos para la escena", async () => {
  const { db, oficina } = await preparar({ QWEN_API_KEY: "q" });
  const { encargo_id } = await oficina.abrirEncargo({ titulo: "PQ", descripcion: "Prueba", sensibilidad: "externo" });
  await oficina.proponerPlan({ encargo_id, plan: "x", equipo: [{ ficha_id: "extractor-datos", tarea: "extraer" }] });
  await oficina.despachar({ encargo_id, ficha_id: "extractor-datos", instrucciones: "Extrae" });
  const { rows } = await db.query<{ tipo: string }>("SELECT tipo FROM eventos WHERE encargo_id = $1 ORDER BY id", [encargo_id]);
  assert.deepEqual(
    rows.map((r) => r.tipo),
    ["encargo_abierto", "plan_propuesto", "agente_convocado", "agente_trabajando", "resultado_entregado"],
  );
});
