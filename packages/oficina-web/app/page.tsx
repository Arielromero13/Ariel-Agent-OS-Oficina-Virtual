import { redirect } from "next/navigation";
import Oficina from "@/components/Oficina";
import { sesionValida } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  if (!(await sesionValida())) redirect("/entrar");
  return <Oficina />;
}
