#!/usr/bin/env node
/**
 * Vigilante del buzón. Imprime una línea por cada mensaje nuevo de Ariel y sigue corriendo.
 * Uso desde Claude Code: Monitor con `npm run vigilar -w oficina-mcp`. Cada línea despierta al
 * Orquestador, que responde con leer_buzon y responder_a_ariel.
 * OFICINA_VIGILAR_SEGUNDOS cambia el intervalo (por defecto 10; mínimo 3).
 */
import { conectar, migrar } from "./db.js";
import { latido, mensajesNuevos } from "./vigilante.js";

const segundos = Math.max(3, Number(process.env.OFICINA_VIGILAR_SEGUNDOS) || 10);
const db = await conectar();
await migrar(db);
const vistos = new Set<string>();

console.log(`vigilando el buzón cada ${segundos} s`);
let fallos = 0;
for (;;) {
  try {
    await latido(db);
    for (const m of await mensajesNuevos(db, vistos)) {
      console.log(`MENSAJE_NUEVO ${m.id} (${m.caracteres} caracteres, ${m.archivos} archivo(s)). Llama a leer_buzon y responde con responder_a_ariel.`);
    }
    fallos = 0;
  } catch (e) {
    fallos += 1;
    // Un fallo aislado no corta la vigilancia; si persiste, se avisa una vez cada 10 intentos.
    if (fallos % 10 === 1) console.log(`VIGILANTE_ERROR ${(e as Error).message}`);
  }
  await new Promise((r) => setTimeout(r, segundos * 1000));
}
