/**
 * Traduce el estado compartido a estados visibles de la escena. Función pura: cada estado
 * sale de un evento o fila registrada; la escena no inventa actividad.
 */

export type EstadoVisible =
  | "En reposo"
  | "Reuniendo equipo"
  | "Convocado"
  | "Analizando"
  | "Coordinando"
  | "Esperando a Ariel"
  | "Completado"
  | "Relevo nativo"
  | "Bloqueado"
  | "Error"
  | "No configurado";

export interface Evento {
  id: number;
  encargo_id: string | null;
  tipo: string;
  actor: string;
  datos: Record<string, unknown>;
  creado: string;
}

export interface FichaVista {
  id: string;
  nombre: string;
  especialidad: string;
  proveedor: string;
  modelo: string;
  configurado: boolean;
}

export interface EncargoVista {
  id: string;
  titulo: string;
  descripcion: string;
  estado: "abierto" | "en_curso" | "en_revision" | "emitido" | "cerrado";
  sensibilidad: string;
  version_actual: number;
}

export interface EstadosEscena {
  orquestador: EstadoVisible;
  rrhh: EstadoVisible;
  agentes: Record<string, EstadoVisible>;
  carpetasEnRevision: number;
}

export function derivarEscena(
  fichas: FichaVista[],
  encargo: EncargoVista | null,
  eventos: Evento[],
  decisionesPendientes: number,
): EstadosEscena {
  const agentes: Record<string, EstadoVisible> = {};
  for (const f of fichas) agentes[f.id] = f.configurado ? "En reposo" : "No configurado";

  if (!encargo) {
    return { orquestador: "En reposo", rrhh: "En reposo", agentes, carpetasEnRevision: 0 };
  }

  const propios = eventos.filter((e) => e.encargo_id === encargo.id).sort((a, b) => a.id - b.id);
  const abierto = encargo.estado !== "emitido" && encargo.estado !== "cerrado";

  for (const e of propios) {
    if (!(e.actor in agentes) && e.tipo !== "agente_convocado") continue;
    switch (e.tipo) {
      case "agente_convocado": {
        const id = String(e.datos.ficha_id ?? "");
        if (id in agentes && agentes[id] !== "No configurado") agentes[id] = "Convocado";
        break;
      }
      case "agente_trabajando":
        agentes[e.actor] = "Analizando";
        break;
      case "resultado_entregado":
        agentes[e.actor] = e.datos.origen === "relevo_nativo" ? "Relevo nativo" : "Completado";
        break;
      case "agente_fallo":
        agentes[e.actor] = e.datos.estado === "sin_cuota" || e.datos.estado === "no_configurado" ? "Bloqueado" : "Error";
        break;
    }
  }
  // Al cerrar el encargo los agentes vuelven a reposo; los no configurados conservan su estado.
  if (!abierto) {
    for (const id of Object.keys(agentes)) if (agentes[id] !== "No configurado") agentes[id] = "En reposo";
  }

  const ultimo = propios.at(-1);
  let rrhh: EstadoVisible = "En reposo";
  if (abierto && ultimo && (ultimo.tipo === "rrhh_busqueda" || ultimo.tipo === "agente_convocado")) rrhh = "Reuniendo equipo";

  let orquestador: EstadoVisible;
  switch (encargo.estado) {
    case "abierto":
      orquestador = "Reuniendo equipo";
      break;
    case "en_curso":
      orquestador = "Coordinando";
      break;
    case "en_revision":
      orquestador = "Esperando a Ariel";
      break;
    default:
      orquestador = "Completado";
  }

  return { orquestador, rrhh, agentes, carpetasEnRevision: decisionesPendientes };
}

/** Frase corta y verificable para el panel de actividad. No describe razonamiento privado. */
export function describirEvento(e: Evento, nombres: Record<string, string>): string {
  const n = (id: unknown) => nombres[String(id)] ?? String(id);
  switch (e.tipo) {
    case "encargo_abierto":
      return `Encargo abierto: ${e.datos.titulo ?? ""}`;
    case "rrhh_busqueda":
      return `RR. HH. buscó perfiles${e.datos.consulta ? ` para «${e.datos.consulta}»` : ""}`;
    case "plan_propuesto":
      return "El Orquestador registró el plan y el equipo";
    case "agente_convocado":
      return `${n(e.datos.ficha_id)} convocado: ${e.datos.tarea ?? ""}`;
    case "agente_trabajando":
      return `${n(e.actor)} trabajando con ${e.datos.proveedor} (${e.datos.modelo})`;
    case "resultado_entregado":
      return e.datos.origen === "relevo_nativo"
        ? `${n(e.actor)}: resultado por relevo nativo (${e.datos.proveedor_original}, ${e.datos.motivo}). Revisión para Ariel.`
        : `${n(e.actor)} entregó su resultado`;
    case "agente_fallo":
      return `${n(e.actor)}: ${e.datos.estado}${e.datos.detalle ? ` — ${e.datos.detalle}` : ""}`;
    case "decision_pendiente":
      return "Decisión pendiente en la Mesa de revisión";
    case "decision_aprobada":
      return `Ariel aprobó (${e.datos.via === "web" ? "desde la oficina" : "en la sesión"})`;
    case "decision_devuelta":
      return `Ariel devolvió con comentarios (${e.datos.via === "web" ? "desde la oficina" : "en la sesión"})`;
    case "encargo_emitido":
      return "Encargo emitido";
    case "encargo_cerrado":
      return "Encargo cerrado sin emisión";
    case "encargo_reabierto":
      return `Encargo reabierto como versión ${e.datos.version}: ${e.datos.motivo ?? ""}`;
    case "rrhh_candidatos":
      return "RR. HH. propuso recursos para la biblioteca";
    case "recurso_guardado":
      return "Recurso guardado en la biblioteca";
    default:
      return e.tipo;
  }
}
