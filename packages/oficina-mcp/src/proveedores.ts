/**
 * Adaptador para APIs compatibles con el formato de OpenAI (chat/completions).
 * Cubre Qwen (DashScope, modo compatible) y DeepSeek.
 *
 * Regla: ante un fallo se devuelve el estado. Nunca se cambia de proveedor ni se
 * fabrica un texto de respaldo.
 */

export type EstadoLlamada = "ok" | "sin_cuota" | "no_configurado" | "error" | "timeout";

export interface Proveedor {
  id: string;
  baseUrl: string;
  variableClave: string;
}

export const PROVEEDORES: Record<string, Proveedor> = {
  deepseek: {
    id: "deepseek",
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
    variableClave: "DEEPSEEK_API_KEY",
  },
  qwen: {
    id: "qwen",
    baseUrl: process.env.QWEN_BASE_URL ?? "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    variableClave: "QWEN_API_KEY",
  },
};

export function claveDe(proveedor: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const p = PROVEEDORES[proveedor];
  const clave = p ? env[p.variableClave] : undefined;
  return clave && clave.trim() !== "" ? clave : undefined;
}

export interface Mensaje {
  role: "system" | "user";
  content: string;
}

export interface RespuestaProveedor {
  estado: EstadoLlamada;
  detalle?: string;
  contenido?: string;
  tokensEntrada?: number;
  tokensSalida?: number;
}

export type Fetch = typeof fetch;

export async function llamarProveedor(
  proveedor: string,
  modelo: string,
  mensajes: Mensaje[],
  opciones: { fetch?: Fetch; env?: NodeJS.ProcessEnv; timeoutMs?: number } = {},
): Promise<RespuestaProveedor> {
  const p = PROVEEDORES[proveedor];
  if (!p) return { estado: "no_configurado", detalle: `Proveedor desconocido: ${proveedor}` };
  const clave = claveDe(proveedor, opciones.env);
  if (!clave) return { estado: "no_configurado", detalle: `Falta ${p.variableClave} en el entorno de oficina-mcp` };

  const f = opciones.fetch ?? fetch;
  const timeoutMs = opciones.timeoutMs ?? Number(process.env.OFICINA_TIMEOUT_MS ?? 120_000);
  let respuesta: Response;
  try {
    respuesta = await f(`${p.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${clave}` },
      body: JSON.stringify({ model: modelo, messages: mensajes }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const err = e as Error;
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return { estado: "timeout", detalle: `Sin respuesta en ${timeoutMs} ms` };
    }
    return { estado: "error", detalle: `Fallo de red: ${err.message}` };
  }

  if (!respuesta.ok) {
    const cuerpo = (await respuesta.text().catch(() => "")).slice(0, 500);
    // 402: saldo insuficiente (DeepSeek). 429: cuota o límite de tasa.
    if (respuesta.status === 402 || respuesta.status === 429) {
      return { estado: "sin_cuota", detalle: `HTTP ${respuesta.status}: ${cuerpo}` };
    }
    if (respuesta.status === 401 || respuesta.status === 403) {
      return { estado: "error", detalle: `Clave inválida o sin permiso (HTTP ${respuesta.status}): ${cuerpo}` };
    }
    return { estado: "error", detalle: `HTTP ${respuesta.status}: ${cuerpo}` };
  }

  const datos = (await respuesta.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const contenido = datos.choices?.[0]?.message?.content;
  if (typeof contenido !== "string" || contenido.trim() === "") {
    return { estado: "error", detalle: "El proveedor respondió sin contenido" };
  }
  return {
    estado: "ok",
    contenido,
    tokensEntrada: datos.usage?.prompt_tokens,
    tokensSalida: datos.usage?.completion_tokens,
  };
}
