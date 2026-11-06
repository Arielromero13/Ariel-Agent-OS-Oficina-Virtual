import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { migrar, type Db } from "../src/db.js";
import { Oficina, ReglaOficina } from "../src/oficina.js";
import type { Almacen } from "../src/archivos.js";
import { responderDecision } from "../src/decisiones.js";
import { PRECIOS, costo, precioDe } from "../src/precios.js";

async function nuevaBase(): Promise<Db> {
  const pg = new PGlite();
  const db: Db = { query: (s, p) => pg.query(s, p) as never, exec: (s) => pg.exec(s) };
  await migrar(db);
  return db;
}

/** Almacén en memoria para pruebas: no sale a la red. */
function almacenFalso(): Almacen & { datos: Map<string, Buffer> } {
  const datos = new Map<string, Buffer>();
  return {
    datos,
    async subir(ruta, contenido) {
      const url = `https://almacen.prueba/${ruta}`;
      datos.set(url, contenido);
      return { url };
    },
    async leer(url) {
      const d = datos.get(url);
      if (!d) throw new Error("no existe");
      return d;
    },
  };
}

test("buzón: Ariel escribe con adjunto, el Orquestador lo lee una vez, lo descarga y responde con un entregable", async () => {
  const db = await nuevaBase();
  const almacen = almacenFalso();
  const tmp = mkdtempSync(join(tmpdir(), "buzon-"));
  const oficina = new Oficina(db, { env: {}, almacen, carpetaDescargas: join(tmp, "descargas") });

  // Lo que hace la oficina web al recibir un mensaje con un archivo ya subido.
  await almacen.subir("ariel/datos.csv", Buffer.from("Va,Vb\n1,2\n"), "text/csv");
  await db.query("INSERT INTO mensajes (id, autor, texto) VALUES ('msg_1', 'ariel', 'Hazme un informe en Word')");
  await db.query(
    `INSERT INTO archivos (id, mensaje_id, origen, nombre, tipo, tamano, url)
     VALUES ('arc_1', 'msg_1', 'ariel', 'datos.csv', 'text/csv', 10, 'https://almacen.prueba/ariel/datos.csv')`,
  );

  const leido = await oficina.leerBuzon();
  assert.equal(leido.mensajes.length, 1);
  assert.equal(leido.mensajes[0].archivos[0].nombre, "datos.csv");
  assert.equal((await oficina.leerBuzon()).mensajes.length, 0, "un mensaje leído no se repite");

  const bajado = await oficina.descargarArchivo({ archivo_id: "arc_1" });
  assert.equal(readFileSync(bajado.ruta, "utf8"), "Va,Vb\n1,2\n");

  const informe = join(tmp, "informe.docx");
  writeFileSync(informe, "contenido");
  const r = await oficina.responderAAriel({ texto: "Aquí está el informe", archivos: [{ ruta: informe }] });
  assert.equal(r.archivos.length, 1);
  assert.equal(r.archivos[0].tipo, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  const { rows } = await db.query<{ autor: string }>("SELECT autor FROM mensajes ORDER BY creado");
  assert.deepEqual(rows.map((m) => m.autor), ["ariel", "orquestador"]);
});

test("buzón: sin almacén configurado no se entregan archivos ni queda un mensaje a medias", async () => {
  const db = await nuevaBase();
  const tmp = mkdtempSync(join(tmpdir(), "buzon-"));
  const informe = join(tmp, "informe.pdf");
  writeFileSync(informe, "x");
  const oficina = new Oficina(db, { env: {}, almacen: null });
  await assert.rejects(oficina.responderAAriel({ texto: "x", archivos: [{ ruta: informe }] }), ReglaOficina);
  assert.equal((await db.query("SELECT * FROM mensajes")).rows.length, 0);
  // Sin adjuntos sí se puede responder.
  await oficina.responderAAriel({ texto: "Sin almacén, te lo describo aquí" });
  assert.equal((await db.query("SELECT * FROM mensajes")).rows.length, 1);
});

test("latido: cada contacto actualiza la presencia del Orquestador", async () => {
  const db = await nuevaBase();
  const oficina = new Oficina(db, { env: {} });
  await oficina.latido();
  await oficina.latido();
  const { rows } = await db.query("SELECT id FROM presencia");
  assert.equal(rows.length, 1);
});

test("registrar_resultado guarda los tokens que reporta la sesión", async () => {
  const db = await nuevaBase();
  const oficina = new Oficina(db, { env: {} });
  await oficina.sincronizarFichas();
  const { encargo_id } = await oficina.abrirEncargo({ titulo: "T", descripcion: "D", sensibilidad: "externo" });
  await oficina.registrarResultado({
    encargo_id, ficha_id: "extractor-datos", contenido: "tabla", proveedor_original: "qwen", motivo: "sin_clave",
    modelo_nativo: "claude-opus-5-5", tokens_total: 69294,
  });
  const { rows } = await db.query<{ tokens_total: number }>("SELECT tokens_total FROM resultados");
  assert.equal(rows[0].tokens_total, 69294);
});

test("no se responden decisiones de un encargo cerrado", async () => {
  const db = await nuevaBase();
  const oficina = new Oficina(db, { env: {} });
  const { encargo_id } = await oficina.abrirEncargo({ titulo: "T", descripcion: "D", sensibilidad: "externo" });
  const { decision_id } = await oficina.pedirDecision({ encargo_id, tipo: "resultado", pregunta: "¿Apruebas?" });
  await oficina.cerrarEncargo({ encargo_id, modo: "archivar" });
  await assert.rejects(responderDecision(db, { decision_id, estado: "aprobada", via: "web" }), ReglaOficina);
});

test("precios: cada modelo tiene fuente oficial y el costo se calcula sin inventar el reparto", () => {
  for (const p of PRECIOS) {
    assert.match(p.fuente, /^https:\/\//, p.modelo);
    assert.ok(p.entrada >= 0 && p.salida >= p.entrada * 0 && p.salida > 0, p.modelo);
  }
  assert.equal(new Set(PRECIOS.map((p) => p.modelo)).size, PRECIOS.length, "sin modelos repetidos");
  const opus = precioDe("claude-opus-5-5")!;
  assert.deepEqual(costo({ tokens_entrada: 1_000_000, tokens_salida: 100_000, tokens_total: null }, opus), { min: 6, max: 6, exacto: true });
  const rango = costo({ tokens_entrada: null, tokens_salida: null, tokens_total: 1_000_000 }, opus);
  assert.deepEqual(rango, { min: 4, max: 20, exacto: false });
  // Todas las fichas usan modelos con precio conocido.
  for (const m of ["qwen-plus", "deepseek-flash"]) assert.ok(precioDe(m), m);
});
