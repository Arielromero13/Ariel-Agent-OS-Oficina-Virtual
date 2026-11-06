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
