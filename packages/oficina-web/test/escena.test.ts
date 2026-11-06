import { test } from "node:test";
import assert from "node:assert/strict";
import { derivarEscena, type EncargoVista, type Evento, type FichaVista } from "../lib/escena";

const fichas: FichaVista[] = [
  { id: "extractor-datos", nombre: "Extractor", especialidad: "", proveedor: "qwen", modelo: "qwen-plus", configurado: true, respaldo_nativo: false },
  { id: "redactor-tecnico", nombre: "Redactor", especialidad: "", proveedor: "deepseek", modelo: "deepseek-chat", configurado: false, respaldo_nativo: false },
];
const encargo = (estado: EncargoVista["estado"]): EncargoVista => ({
  id: "enc_1", titulo: "PQ", descripcion: "", estado, sensibilidad: "externo", version_actual: 1,
});
let n = 0;
const ev = (tipo: string, actor: string, datos: Record<string, unknown> = {}): Evento => ({
  id: ++n, encargo_id: "enc_1", tipo, actor, datos, creado: new Date().toISOString(),
});

test("sin encargo todo está en reposo y el proveedor sin clave aparece No configurado", () => {
  const e = derivarEscena(fichas, null, [], 0);
  assert.equal(e.orquestador, "En reposo");
  assert.deepEqual(e.agentes, { "extractor-datos": "En reposo", "redactor-tecnico": "No configurado" });
});

test("los estados de los agentes siguen a los eventos", () => {
  const eventos = [
    ev("plan_propuesto", "orquestador"),
    ev("agente_convocado", "rrhh", { ficha_id: "extractor-datos" }),
  ];
  assert.equal(derivarEscena(fichas, encargo("en_curso"), eventos, 0).agentes["extractor-datos"], "Convocado");
  eventos.push(ev("agente_trabajando", "extractor-datos"));
  assert.equal(derivarEscena(fichas, encargo("en_curso"), eventos, 0).agentes["extractor-datos"], "Analizando");
  eventos.push(ev("agente_fallo", "extractor-datos", { estado: "sin_cuota" }));
  assert.equal(derivarEscena(fichas, encargo("en_curso"), eventos, 0).agentes["extractor-datos"], "Bloqueado");
  eventos.push(ev("resultado_entregado", "extractor-datos", { origen: "relevo_nativo" }));
  assert.equal(derivarEscena(fichas, encargo("en_curso"), eventos, 0).agentes["extractor-datos"], "Relevo nativo");
});

test("con decisión pendiente el Orquestador espera a Ariel y hay carpeta en la Mesa de revisión", () => {
  const e = derivarEscena(fichas, encargo("en_revision"), [], 1);
  assert.equal(e.orquestador, "Esperando a Ariel");
  assert.equal(e.carpetasEnRevision, 1);
});

test("al cerrar el encargo los agentes vuelven a reposo", () => {
  const eventos = [ev("agente_trabajando", "extractor-datos")];
  const e = derivarEscena(fichas, encargo("emitido"), eventos, 0);
  assert.equal(e.agentes["extractor-datos"], "En reposo");
  assert.equal(e.agentes["redactor-tecnico"], "No configurado");
  assert.equal(e.orquestador, "Completado");
});

test("una ficha sin clave con respaldo nativo queda disponible, no No configurado", () => {
  const conRespaldo = fichas.map((f) => (f.configurado ? f : { ...f, respaldo_nativo: true }));
  const e = derivarEscena(conRespaldo, null, [], 0);
  assert.equal(e.agentes["redactor-tecnico"], "En reposo");
});
