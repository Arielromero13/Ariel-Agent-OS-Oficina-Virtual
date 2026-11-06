import { test } from "node:test";
import assert from "node:assert/strict";
import { derivarOrquestador, type BuzonEscena } from "../lib/escena";
import { urlDelAlmacen, validarMensaje } from "../lib/buzon";

const AHORA = "2026-11-06T15:00:00.000Z";
const hace = (s: number) => new Date(new Date(AHORA).getTime() - s * 1000).toISOString();
const vacio: BuzonEscena = { sinLeer: 0, ultimoAriel: null, ultimoOrquestador: null, leido: null, latido: hace(60) };

test("el Orquestador muestra el inicio de su respuesta solo mientras es reciente", () => {
  const b = { ...vacio, ultimoOrquestador: { id: "m2", texto: "Aquí está el informe en Word con las tablas revisadas", creado: hace(10) } };
  const r = derivarOrquestador("Coordinando", b, AHORA, true);
  assert.equal(r.estado, "Te respondió");
  assert.match(r.dice ?? "", /^Aquí está el informe/);
  const viejo = derivarOrquestador("Coordinando", { ...b, ultimoOrquestador: { ...b.ultimoOrquestador, creado: hace(600) } }, AHORA, true);
  assert.equal(viejo.estado, "Coordinando");
  assert.equal(viejo.dice, null);
});

test("un mensaje sin leer se ve en la mesa y la carta vuela solo justo después de enviarlo", () => {
  const b = { ...vacio, sinLeer: 1, ultimoAriel: { id: "m1", creado: hace(2) } };
  const r = derivarOrquestador("En reposo", b, AHORA, false);
  assert.equal(r.estado, "Mensaje sin leer");
  assert.equal(r.cartaEnVuelo, "m1");
  assert.equal(derivarOrquestador("En reposo", { ...b, ultimoAriel: { id: "m1", creado: hace(30) } }, AHORA, false).cartaEnVuelo, null);
});

test("sin contacto reciente y sin encargo, la oficina dice que no hay sesión abierta", () => {
  const r = derivarOrquestador("En reposo", { ...vacio, latido: hace(3600) }, AHORA, false);
  assert.equal(r.estado, "Sin sesión abierta");
  assert.equal(r.sesion, "sin_contacto");
  assert.equal(derivarOrquestador("En reposo", { ...vacio, latido: null }, AHORA, false).estado, "Sin sesión abierta");
});

test("una respuesta anterior a un mensaje nuevo de Ariel no se muestra como respuesta", () => {
  const b: BuzonEscena = {
    ...vacio,
    sinLeer: 1,
    ultimoOrquestador: { id: "m1", texto: "hola", creado: hace(20) },
    ultimoAriel: { id: "m2", creado: hace(5) },
  };
  assert.equal(derivarOrquestador("En reposo", b, AHORA, false).estado, "Mensaje sin leer");
});

test("los adjuntos solo se aceptan si están en el almacén de Vercel Blob", () => {
  assert.equal(urlDelAlmacen("https://abc.private.blob.vercel-storage.com/ariel/x.pdf"), true);
  assert.equal(urlDelAlmacen("https://evil.example.com/x.pdf"), false);
  assert.equal(urlDelAlmacen("http://abc.blob.vercel-storage.com/x.pdf"), false);
  assert.equal(typeof validarMensaje({ texto: "", archivos: [] }), "string");
  assert.equal(typeof validarMensaje({ texto: "hola", archivos: [{ url: "https://evil.example.com/x", nombre: "x", tipo: "a", tamano: 1 }] }), "string");
  const ok = validarMensaje({ texto: " Informe en PDF ", archivos: [] });
  assert.deepEqual(ok, { texto: "Informe en PDF", encargo_id: null, archivos: [] });
});

import { derivarEscena, type EncargoVista, type Evento, type FichaVista } from "../lib/escena";

test("un agente camina a la Mesa de revisión solo justo después de entregar", () => {
  const fichas: FichaVista[] = [{ id: "a", nombre: "A", especialidad: "", proveedor: "qwen", modelo: "m", configurado: true, respaldo_nativo: false }];
  const encargo: EncargoVista = { id: "e", titulo: "T", descripcion: "", estado: "en_curso", sensibilidad: "externo", version_actual: 1 };
  const ev = (creado: string): Evento[] => [{ id: 1, encargo_id: "e", tipo: "resultado_entregado", actor: "a", datos: { origen: "api" }, creado }];
  assert.deepEqual(derivarEscena(fichas, encargo, ev(hace(3)), 0, AHORA).entregando, ["a"]);
  assert.deepEqual(derivarEscena(fichas, encargo, ev(hace(60)), 0, AHORA).entregando, []);
  assert.deepEqual(derivarEscena(fichas, encargo, ev(hace(3)), 0).entregando, [], "sin hora del servidor no se anima");
});

import { derivarEspera, duracion } from "../lib/espera";

const msg = (id: string, autor: "ariel" | "orquestador", creado: string, leido_en: string | null = null) =>
  ({ id, encargo_id: null, autor, texto: "x", leido_en, creado, archivos: [] }) as never;

test("espera: cola → trabajando → sin actividad → respondido, solo con datos registrados", () => {
  const base = { latido: hace(5), progreso: [] as { id: number; texto: string; creado: string }[] };
  // Enviado, sin leer, con contacto vivo (vigilante): en cola.
  let e = derivarEspera({ ...base, mensajes: [msg("a", "ariel", hace(8))] }, AHORA);
  assert.equal(e.fase, "cola");
  assert.equal(e.segundos, 8);
  // Sin leer y sin contacto: no se promete que lo lea pronto.
  e = derivarEspera({ ...base, latido: hace(600), mensajes: [msg("a", "ariel", hace(8))] }, AHORA);
  assert.equal(e.fase, "sin_actividad");
  assert.equal(e.leido, false);
  // Leído hace 40 s, con dos notas: trabajando, el contador cuenta desde la lectura.
  const notas = [
    { id: 1, texto: "Leyendo el informe", creado: hace(30) },
    { id: 2, texto: "Revisando la tabla", creado: hace(10) },
  ];
  e = derivarEspera({ ...base, progreso: notas, mensajes: [msg("a", "ariel", hace(50), hace(40))] }, AHORA);
  assert.equal(e.fase, "trabajando");
  assert.equal(e.segundos, 40);
  assert.deepEqual(e.notas, ["Leyendo el informe", "Revisando la tabla"]);
  // Las notas de antes del mensaje no cuentan.
  e = derivarEspera({ ...base, progreso: [{ id: 0, texto: "viejo", creado: hace(500) }], mensajes: [msg("a", "ariel", hace(50), hace(40))] }, AHORA);
  assert.deepEqual(e.notas, []);
  // Leído hace 10 min, sin notas ni contacto: sin actividad registrada.
  e = derivarEspera({ latido: hace(900), progreso: [], mensajes: [msg("a", "ariel", hace(620), hace(600))] }, AHORA);
  assert.equal(e.fase, "sin_actividad");
  assert.equal(e.leido, true);
  // Con contacto vivo no se da por colgado aunque tarde.
  e = derivarEspera({ latido: hace(4), progreso: [], mensajes: [msg("a", "ariel", hace(620), hace(600))] }, AHORA);
  assert.equal(e.fase, "trabajando");
  // Respondido: nada que mostrar.
  e = derivarEspera({ ...base, mensajes: [msg("a", "ariel", hace(50), hace(40)), msg("b", "orquestador", hace(5))] }, AHORA);
  assert.equal(e.fase, "ninguna");
  assert.equal(duracion(45), "45 s");
  assert.equal(duracion(130), "2 min 10 s");
});

test("el Orquestador se ve «Trabajando en tu mensaje» mientras la espera sigue, aunque pase la ventana de lectura", () => {
  const b: BuzonEscena = { ...vacio, leido: hace(900), ultimoAriel: { id: "m1", creado: hace(920) } };
  assert.equal(derivarOrquestador("En reposo", b, AHORA, false, true).estado, "Trabajando en tu mensaje");
  assert.equal(derivarOrquestador("En reposo", b, AHORA, false, false).estado, "En reposo");
});
