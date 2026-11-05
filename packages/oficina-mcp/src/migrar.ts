import { conectar, migrar } from "./db.js";
import { Oficina } from "./oficina.js";

const db = await conectar();
const aplicadas = await migrar(db);
const oficina = new Oficina(db);
const fichas = await oficina.sincronizarFichas();
const proveedores = await oficina.reportarProveedores();
console.log({ migraciones: aplicadas, fichas, proveedores });
process.exit(0);
