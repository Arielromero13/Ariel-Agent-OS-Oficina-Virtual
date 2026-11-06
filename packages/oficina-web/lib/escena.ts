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
  | "No configurado"
  | "Mensaje sin leer"
  | "Leyó tus mensajes"
  | "Trabajando en tu mensaje"
  | "Te respondió"
  | "Sin sesión abierta";

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
  /** Sin clave, pero cubierta por subagentes de la sesión nativa. */
  respaldo_nativo: boolean;
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
  /** Agentes que acaban de entregar un resultado y llevan su carpeta a la Mesa de revisión. */
  entregando: string[];
}

/** Segundos que el agente permanece en la Mesa de revisión tras entregar. */
export const SEGUNDOS_ENTREGA = 8;

export function derivarEscena(
  fichas: FichaVista[],
  encargo: EncargoVista | null,
  eventos: Evento[],
  decisionesPendientes: number,
  ahoraIso?: string,
): EstadosEscena {
  const agentes: Record<string, EstadoVisible> = {};
  for (const f of fichas) agentes[f.id] = f.configurado || f.respaldo_nativo ? "En reposo" : "No configurado";

  if (!encargo) {
    return { orquestador: "En reposo", rrhh: "En reposo", agentes, carpetasEnRevision: 0, entregando: [] };
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

  // Solo se anima una entrega registrada hace pocos segundos; la hora sale del servidor.
  const entregando: string[] = [];
  if (ahoraIso && abierto) {
    const ahora = new Date(ahoraIso).getTime();
    for (const e of propios) {
      if (e.tipo === "resultado_entregado" && e.actor in agentes && (ahora - new Date(e.creado).getTime()) / 1000 <= SEGUNDOS_ENTREGA) {
        if (!entregando.includes(e.actor)) entregando.push(e.actor);
      }
    }
  }

  return { orquestador, rrhh, agentes, carpetasEnRevision: decisionesPendientes, entregando };
}

/** Datos del buzón que animan al Orquestador. Todos salen de filas registradas. */
export interface BuzonEscena {
  sinLeer: number;
  /** Último mensaje de cada autor. */
  ultimoAriel: { id: string; creado: string } | null;
  ultimoOrquestador: { id: string; texto: string; creado: string } | null;
  leido: string | null;
  latido: string | null;
}

export interface EstadoOrquestador {
  estado: EstadoVisible;
  /** Texto para el globo de diálogo, solo mientras la respuesta es reciente. */
  dice: string | null;
  /** Id del mensaje de Ariel que vuela hacia la mesa (animación de envío). */
  cartaEnVuelo: string | null;
  sesion: "reciente" | "sin_contacto";
}

export const SEGUNDOS_RESPUESTA_VISIBLE = 90;
export const SEGUNDOS_LECTURA_VISIBLE = 120;
export const SEGUNDOS_CARTA = 4;
/** Sin llamadas a oficina-mcp en este tiempo, la web dice que no hay sesión abierta (es lo único que puede saber). */
export const MINUTOS_SESION = 20;

const seg = (desde: string | null, ahora: number) => (desde ? (ahora - new Date(desde).getTime()) / 1000 : Infinity);

/**
 * Estado visible del Orquestador combinando el encargo y el buzón. Prioridad: respuesta reciente,
 * mensaje sin leer, lectura reciente, estado del encargo, y por último la falta de sesión.
 */
export function derivarOrquestador(
  base: EstadoVisible,
  b: BuzonEscena,
  ahoraIso: string,
  hayEncargoAbierto: boolean,
  trabajandoEnMensaje = false,
): EstadoOrquestador {
  const ahora = new Date(ahoraIso).getTime();
  const sesion = seg(b.latido, ahora) <= MINUTOS_SESION * 60 ? "reciente" : "sin_contacto";
  const cartaEnVuelo = b.ultimoAriel && seg(b.ultimoAriel.creado, ahora) <= SEGUNDOS_CARTA ? b.ultimoAriel.id : null;
  const respuestaReciente =
    b.ultimoOrquestador &&
    seg(b.ultimoOrquestador.creado, ahora) <= SEGUNDOS_RESPUESTA_VISIBLE &&
    (!b.ultimoAriel || b.ultimoOrquestador.creado >= b.ultimoAriel.creado);
  if (respuestaReciente) {
    const t = b.ultimoOrquestador!.texto.replace(/\s+/g, " ").trim();
    return { estado: "Te respondió", dice: t.length > 70 ? `${t.slice(0, 67)}…` : t, cartaEnVuelo, sesion };
  }
  if (b.sinLeer > 0) return { estado: "Mensaje sin leer", dice: null, cartaEnVuelo, sesion };
  if (trabajandoEnMensaje) return { estado: "Trabajando en tu mensaje", dice: null, cartaEnVuelo, sesion };
  if (seg(b.leido, ahora) <= SEGUNDOS_LECTURA_VISIBLE) return { estado: "Leyó tus mensajes", dice: null, cartaEnVuelo, sesion };
  if (!hayEncargoAbierto && sesion === "sin_contacto") return { estado: "Sin sesión abierta", dice: null, cartaEnVuelo, sesion };
  return { estado: base, dice: null, cartaEnVuelo, sesion };
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
      return e.datos.ejecucion === "sesion_nativa"
        ? `${n(e.actor)} trabajando como subagente de la sesión nativa (sin clave de ${e.datos.proveedor_original})`
        : `${n(e.actor)} trabajando con ${e.datos.proveedor} (${e.datos.modelo})`;
    case "resultado_entregado":
      if (e.datos.origen === "relevo_nativo" && e.datos.motivo === "sin_clave") {
        return `${n(e.actor)}: resultado del subagente de la sesión nativa (sin clave de ${e.datos.proveedor_original}). Revisión para Ariel.`;
      }
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
    case "mensaje_ariel":
      return `Ariel dejó un mensaje en el buzón${Number(e.datos.archivos) ? ` con ${e.datos.archivos} archivo(s)` : ""}`;
    case "buzon_leido":
      return `El Orquestador leyó ${e.datos.mensajes} mensaje(s) del buzón`;
    case "orquestador_respondio":
      return `El Orquestador respondió${Number(e.datos.archivos) ? ` y entregó ${e.datos.archivos} archivo(s)` : ""}`;
    default:
      return e.tipo;
  }
}
