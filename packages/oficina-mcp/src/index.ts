#!/usr/bin/env node
/**
 * oficina-mcp: única vía por la que el Orquestador nativo (Claude Code o Codex) actúa
 * sobre la oficina. Transporte stdio. Ver docs/07-arquitectura.md.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { conectar, migrar } from "./db.js";
import { Oficina, ReglaOficina } from "./oficina.js";

const db = await conectar();
await migrar(db);
const oficina = new Oficina(db);
await oficina.sincronizarFichas();
await oficina.reportarProveedores();

const server = new McpServer({ name: "oficina-mcp", version: "0.2.0" });

function responder(fn: () => Promise<unknown>) {
  return async () => {
    try {
      const r = await fn();
      return { content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }] };
    } catch (e) {
      if (e instanceof ReglaOficina) {
        return { isError: true, content: [{ type: "text" as const, text: `Regla de la oficina: ${e.message}` }] };
      }
      throw e;
    }
  };
}

function herramienta<S extends z.ZodRawShape>(
  nombre: string,
  descripcion: string,
  esquema: S,
  fn: (a: z.infer<z.ZodObject<S>>) => Promise<unknown>,
) {
  server.registerTool(nombre, { description: descripcion, inputSchema: esquema }, (async (a: z.infer<z.ZodObject<S>>) =>
    responder(async () => {
      // Cada llamada del Orquestador cuenta como contacto; un fallo del latido no bloquea la herramienta.
      await oficina.latido().catch(() => undefined);
      return fn(a);
    })()) as never);
}

const tipoRecurso = z.enum(["ficha", "script", "aprendizaje"]);

herramienta(
  "abrir_encargo",
  "Crea un encargo con descripción, archivos y marca de sensibilidad ('interno' = no sale a APIs externas).",
  {
    titulo: z.string().min(1),
    descripcion: z.string().min(1),
    sensibilidad: z.enum(["externo", "interno"]),
    relevo_nativo: z.boolean().optional().describe("Permite relevo nativo ante fallo de proveedor. Por defecto sí."),
    archivos: z.array(z.object({ nombre: z.string(), ubicacion: z.string() })).optional(),
  },
  (a) => oficina.abrirEncargo(a),
);

herramienta(
  "buscar_perfiles",
  "RR. HH.: busca fichas y recursos guardados por metadatos y resumen. No devuelve contenido completo.",
  { consulta: z.string().optional(), encargo_id: z.string().optional() },
  (a) => oficina.buscarPerfiles(a),
);

herramienta(
  "proponer_plan",
  "Registra el plan y el equipo del encargo. Rechaza fichas cuyo proveedor esté No configurado. Una ficha sin clave con respaldo nativo activo se acepta y se ejecuta como subagente de la sesión.",
  {
    encargo_id: z.string(),
    plan: z.string().min(1),
    equipo: z.array(z.object({ ficha_id: z.string(), tarea: z.string() })),
  },
  (a) => oficina.proponerPlan(a),
);

herramienta(
  "despachar",
  "Envía una subtarea a un agente por API. Devuelve el resultado o el estado de fallo (sin_cuota, no_configurado, error, timeout). Nunca cambia de proveedor. Si el proveedor de la ficha no tiene clave y el respaldo nativo está activo, no llama a ningún modelo: devuelve estado resolver_en_sesion con las instrucciones para un subagente de tu sesión.",
  { encargo_id: z.string(), ficha_id: z.string(), instrucciones: z.string().min(1), contexto: z.string().optional() },
  (a) => oficina.despachar(a),
);

herramienta(
  "registrar_resultado",
  "Registra un resultado de relevo nativo (subagente de la sesión) tras un fallo de proveedor o un despacho resolver_en_sesion (motivo sin_clave). Queda marcado para revisión de Ariel.",
  {
    encargo_id: z.string(),
    ficha_id: z.string(),
    contenido: z.string().min(1),
    proveedor_original: z.string(),
    motivo: z.string(),
    modelo_nativo: z.string().describe("Modelo que reporta la sesión nativa."),
    tokens_entrada: z.number().int().nonnegative().optional().describe("Tokens de entrada, si la sesión los separa."),
    tokens_salida: z.number().int().nonnegative().optional().describe("Tokens de salida, si la sesión los separa."),
    tokens_total: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Total de tokens que reportó la sesión para el subagente (p. ej. subagent_tokens en Claude Code). No lo estimes."),
  },
  (a) => oficina.registrarResultado(a),
);

herramienta(
  "pedir_decision",
  "Deja una decisión pendiente en la Mesa de revisión.",
  { encargo_id: z.string(), tipo: z.enum(["plan", "resultado", "emision", "recurso"]), pregunta: z.string().min(1) },
  (a) => oficina.pedirDecision(a),
);

herramienta(
  "consultar_decision",
  "Lee el estado de una decisión (pendiente, aprobada o devuelta) y el comentario de Ariel.",
  { decision_id: z.string() },
  (a) => oficina.consultarDecision(a),
);

herramienta(
  "registrar_decision_de_ariel",
  "Registra una respuesta que Ariel dio explícitamente en esta sesión. Nunca la uses para decidir en nombre de Ariel.",
  { decision_id: z.string(), estado: z.enum(["aprobada", "devuelta"]), comentario: z.string().optional() },
  (a) => oficina.responderDecision({ ...a, via: "orquestador" }),
);

herramienta(
  "cerrar_encargo",
  "Cierra el encargo. modo 'emitir' exige decisión de emisión aprobada; 'archivar' cierra sin emitir. Registra candidatos de RR. HH.",
  {
    encargo_id: z.string(),
    modo: z.enum(["emitir", "archivar"]),
    decision_id: z.string().optional(),
    candidatos: z
      .array(z.object({ tipo: tipoRecurso, titulo: z.string(), resumen: z.string(), contenido: z.string() }))
      .optional(),
  },
  (a) => oficina.cerrarEncargo(a),
);

herramienta(
  "reabrir_encargo",
  "Reabre un encargo como versión nueva, conservando historial y versiones.",
  { encargo_id: z.string(), motivo: z.string().min(1) },
  (a) => oficina.reabrirEncargo(a),
);

herramienta(
  "guardar_recurso",
  "Guarda en la biblioteca un recurso candidato. Exige decisión de tipo recurso aprobada por Ariel.",
  { recurso_id: z.string(), decision_id: z.string() },
  (a) => oficina.guardarRecurso(a),
);

herramienta(
  "estado_proveedores",
  "Indica qué proveedores por API tienen clave configurada y cómo se ejecutan sus fichas (api, sesion_nativa por respaldo sin clave, o no_configurado).",
  {},
  () => oficina.estadoProveedores(),
);

herramienta(
  "proponer_recurso",
  "Propone a Ariel guardar en la biblioteca una plantilla de entregable (con su archivo), un script, una ficha o un aprendizaje, sin cerrar el encargo. Crea la decisión de tipo recurso; guarda con guardar_recurso solo cuando esté aprobada.",
  {
    encargo_id: z.string(),
    tipo: z.enum(["ficha", "script", "aprendizaje", "plantilla"]),
    titulo: z.string().min(1),
    resumen: z.string().min(1),
    contenido: z.string().min(1).describe("Para una plantilla: cuándo usarla y cómo rellenarla."),
    archivo_id: z.string().optional().describe("Obligatorio para plantillas: archivo del buzón o de un entregable."),
  },
  (a) => oficina.proponerRecurso(a),
);

herramienta(
  "avisar_progreso",
  "Publica una nota corta (máx. 140 caracteres) de lo que estás haciendo ahora, para que Ariel la vea en la oficina mientras espera. Úsala al empezar una tarea que tarde más de unos segundos y al cambiar de etapa. Nunca porcentajes ni tiempos.",
  { texto: z.string().min(1), encargo_id: z.string().optional() },
  (a) => oficina.avisarProgreso(a),
);

herramienta(
  "leer_buzon",
  "Lee los mensajes de Ariel que llegaron desde la oficina web (con sus adjuntos) y los marca como leídos.",
  { marcar_leidos: z.boolean().optional().describe("Por defecto sí.") },
  (a) => oficina.leerBuzon(a),
);

herramienta(
  "descargar_archivo",
  "Descarga a disco un archivo que Ariel subió al buzón y devuelve la ruta local para trabajarlo.",
  { archivo_id: z.string() },
  (a) => oficina.descargarArchivo(a),
);

herramienta(
  "responder_a_ariel",
  "Deja un mensaje para Ariel en la oficina web, con entregables opcionales (rutas locales de archivos .docx, .pdf, .xlsx, etc. que se suben al almacén). No sustituye a pedir_decision: una emisión sigue necesitando su aprobación.",
  {
    texto: z.string().min(1),
    encargo_id: z.string().optional(),
    archivos: z.array(z.object({ ruta: z.string(), nombre: z.string().optional() })).optional(),
  },
  (a) => oficina.responderAAriel(a),
);

await server.connect(new StdioServerTransport());
