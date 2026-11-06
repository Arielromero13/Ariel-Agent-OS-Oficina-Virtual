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

const server = new McpServer({ name: "oficina-mcp", version: "0.1.0" });

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
    responder(() => fn(a))()) as never);
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
  "Registra el plan y el equipo del encargo. Una ficha sin clave de proveedor entra en modo relevo_nativo si el encargo lo permite; si no, se rechaza.",
  {
    encargo_id: z.string(),
    plan: z.string().min(1),
    equipo: z.array(z.object({ ficha_id: z.string(), tarea: z.string() })),
  },
  (a) => oficina.proponerPlan(a),
);

herramienta(
  "despachar",
  "Envía una subtarea a un agente por API. Devuelve el resultado o el estado de fallo (sin_cuota, no_configurado, error, timeout). Si el proveedor no tiene clave y el encargo permite relevo, devuelve estado relevo_nativo con las instrucciones de la ficha para que la resuelva la sesión nativa. Nunca cambia de proveedor.",
  { encargo_id: z.string(), ficha_id: z.string(), instrucciones: z.string().min(1), contexto: z.string().optional() },
  (a) => oficina.despachar(a),
);

herramienta(
  "registrar_resultado",
  "Registra un resultado de relevo nativo (subagente de la sesión Claude Code o Codex) tras un fallo de proveedor o por falta de clave. Queda marcado para revisión de Ariel.",
  {
    encargo_id: z.string(),
    ficha_id: z.string(),
    contenido: z.string().min(1),
    proveedor_original: z.string(),
    motivo: z.string(),
    modelo_nativo: z.string().describe("Modelo que reporta la sesión nativa."),
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
  "Indica qué proveedores por API tienen clave configurada.",
  {},
  () => oficina.estadoProveedores(),
);

await server.connect(new StdioServerTransport());
