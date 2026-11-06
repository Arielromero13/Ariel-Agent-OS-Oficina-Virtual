import type { Ficha } from "oficina-mcp/esquema";
import extractor from "../../../fichas/extractor-datos.json";
import integrador from "../../../fichas/integrador.json";
import investigador from "../../../fichas/investigador-normativo.json";
import redactor from "../../../fichas/redactor-tecnico.json";

/**
 * Fichas incluidas en la compilación para el botón "Preparar base de datos".
 * Al agregar una ficha en fichas/*.json, agrégala aquí también (oficina-mcp las lee del directorio al arrancar).
 */
export const FICHAS: { origen: string; ficha: Ficha }[] = [
  { origen: "extractor-datos.json", ficha: extractor },
  { origen: "investigador-normativo.json", ficha: investigador },
  { origen: "redactor-tecnico.json", ficha: redactor },
  { origen: "integrador.json", ficha: integrador },
];
