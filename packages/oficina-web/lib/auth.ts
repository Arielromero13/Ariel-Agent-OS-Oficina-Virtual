import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Acceso provisional por usuario y clave definidos en variables de entorno del servidor
 * (OFICINA_USUARIO, OFICINA_CLAVE). Las credenciales no se guardan en el repositorio.
 */

export const COOKIE = "oficina_sesion";

function credenciales() {
  const usuario = process.env.OFICINA_USUARIO;
  const clave = process.env.OFICINA_CLAVE;
  if (!usuario || !clave) return null;
  return { usuario, clave };
}

export function accesoConfigurado() {
  return credenciales() !== null;
}

function huella(usuario: string, clave: string) {
  return createHash("sha256")
    .update(`${usuario}\u0000${clave}\u0000${process.env.OFICINA_SECRETO ?? ""}`)
    .digest("hex");
}

function iguales(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Devuelve el valor de cookie si las credenciales son correctas. */
export function validar(usuario: string, clave: string): string | null {
  const c = credenciales();
  if (!c) return null;
  if (!iguales(usuario, c.usuario) || !iguales(clave, c.clave)) return null;
  return huella(c.usuario, c.clave);
}

export async function sesionValida(): Promise<boolean> {
  const c = credenciales();
  if (!c) return false;
  const valor = (await cookies()).get(COOKIE)?.value;
  return valor !== undefined && iguales(valor, huella(c.usuario, c.clave));
}
