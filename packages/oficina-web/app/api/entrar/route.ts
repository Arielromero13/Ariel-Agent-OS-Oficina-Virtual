import { NextResponse } from "next/server";
import { COOKIE, validar } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  const valor = validar(String(form.get("usuario") ?? ""), String(form.get("clave") ?? ""));
  const destino = new URL(valor ? "/" : "/entrar?error=1", req.url);
  const res = NextResponse.redirect(destino, 303);
  if (valor) {
    res.cookies.set(COOKIE, valor, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}
