/**
 * Qué mostrar mientras Ariel espera una respuesta. Todo sale de filas registradas: cuándo se
 * envió el mensaje, cuándo lo leyó el Orquestador, sus notas de progreso y su último contacto.
 * No hay porcentajes ni estimaciones de cuánto falta: eso el sistema no lo mide.
 */
import type { Buzon } from "./estado";

export type FaseEspera = "ninguna" | "cola" | "trabajando" | "sin_actividad";

export interface Espera {
  fase: FaseEspera;
  /** Segundos desde el último hito: el envío (cola) o la lectura (trabajando). */
  segundos: number;
  notas: string[];
  /** Id del mensaje de Ariel que se espera responder. */
  mensajeId: string | null;
  /** El Orquestador ya leyó el mensaje. */
  leido: boolean;
}

/** Con el vigilante activo el contacto se renueva cada ~10 s; pasado esto se considera sin sesión. */
export const SEGUNDOS_CONTACTO_VIVO = 45;
/** Sin notas ni contacto en este tiempo, se avisa que no hay actividad registrada. */
export const SEGUNDOS_SIN_ACTIVIDAD = 180;
/** Pasado este tiempo, un mensaje sin respuesta deja de mostrarse como espera. */
export const SEGUNDOS_ESPERA_MAXIMA = 2 * 60 * 60;

const seg = (desde: string | null, ahora: number) => (desde ? (ahora - new Date(desde).getTime()) / 1000 : Infinity);

export function derivarEspera(b: Pick<Buzon, "mensajes" | "latido" | "progreso">, ahoraIso: string): Espera {
  const ahora = new Date(ahoraIso).getTime();
  const ninguna: Espera = { fase: "ninguna", segundos: 0, notas: [], mensajeId: null, leido: false };
  const ultimo = [...b.mensajes].reverse().find((m) => m.autor === "ariel");
  if (!ultimo) return ninguna;
  const respondido = b.mensajes.some((m) => m.autor === "orquestador" && m.creado >= ultimo.creado);
  if (respondido || seg(ultimo.creado, ahora) > SEGUNDOS_ESPERA_MAXIMA) return ninguna;

  const notas = b.progreso.filter((n) => n.creado >= ultimo.creado).map((n) => n.texto);
  const ultimaNota = b.progreso.at(-1)?.creado ?? null;
  const contactoVivo = seg(b.latido, ahora) <= SEGUNDOS_CONTACTO_VIVO;

  if (!ultimo.leido_en) {
    // Sin leer: si hay contacto reciente lo leerá en segundos; si no, lo dice el aviso de sesión del chat.
    return { fase: contactoVivo ? "cola" : "sin_actividad", segundos: Math.round(seg(ultimo.creado, ahora)), notas: [], mensajeId: ultimo.id, leido: false };
  }
  const desdeActividad = Math.min(seg(ultimo.leido_en, ahora), seg(ultimaNota, ahora), seg(b.latido, ahora));
  const sinActividad = desdeActividad > SEGUNDOS_SIN_ACTIVIDAD;
  return {
    fase: sinActividad ? "sin_actividad" : "trabajando",
    segundos: Math.round(seg(ultimo.leido_en, ahora)),
    notas: notas.slice(-3),
    mensajeId: ultimo.id,
    leido: true,
  };
}

/** «45 s», «2 min 10 s». */
export function duracion(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return s % 60 === 0 || m >= 10 ? `${m} min` : `${m} min ${s % 60} s`;
}
