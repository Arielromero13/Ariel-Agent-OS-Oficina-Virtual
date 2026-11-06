/**
 * Tabla de precios por API (USD por millón de tokens). Sin dependencias, para que la use la
 * oficina web. La revisa una tarea programada semanal contra las páginas oficiales y propone los
 * cambios por PR; no se edita de memoria.
 *
 * Reglas:
 * - Solo precios leídos en la página oficial del proveedor, con la fecha de consulta.
 * - `cache` es el precio de lectura de caché (null si la página no lo publica).
 * - Si un proveedor tiene tramos (por largo del prompt u hora), se toma el tramo base y se anota.
 */

export interface PrecioModelo {
  proveedor: string;
  /** Identificador del modelo en la API del proveedor. */
  modelo: string;
  nombre: string;
  entrada: number;
  salida: number;
  cache: number | null;
  fuente: string;
  nota?: string;
}

export const PRECIOS_CONSULTADOS = "2026-11-06";

export const PRECIOS: PrecioModelo[] = [
  // ---- Anthropic (la sesión nativa corre sobre estos modelos) ----
  { proveedor: "anthropic", modelo: "claude-fable-5-1", nombre: "Claude Fable 5.1", entrada: 10, salida: 50, cache: 0.25, fuente: "https://platform.claude.com/docs/en/about-claude/pricing" },
  { proveedor: "anthropic", modelo: "claude-opus-5-5", nombre: "Claude Opus 5.5", entrada: 4, salida: 20, cache: 0.2, fuente: "https://platform.claude.com/docs/en/about-claude/pricing" },
  { proveedor: "anthropic", modelo: "claude-sonnet-5-5", nombre: "Claude Sonnet 5.5", entrada: 2, salida: 10, cache: 0.1, fuente: "https://platform.claude.com/docs/en/about-claude/pricing" },
  { proveedor: "anthropic", modelo: "claude-haiku-5-5", nombre: "Claude Haiku 5.5", entrada: 0.1, salida: 0.5, cache: 0.01, fuente: "https://platform.claude.com/docs/en/about-claude/pricing", nota: "Prompts de hasta 100 000 tokens; por encima, 0,50 / 2,50." },

  // ---- Qwen (Alibaba Cloud Model Studio, internacional) ----
  { proveedor: "qwen", modelo: "qwen-plus", nombre: "Qwen Plus", entrada: 0.4, salida: 1.2, cache: null, fuente: "https://www.alibabacloud.com/help/en/model-studio/model-pricing", nota: "Internacional (Singapur), hasta 256K tokens, sin modo de razonamiento (con razonamiento la salida cuesta 4)." },

  // ---- DeepSeek (precio en hora pico; fuera de pico cuesta la mitad) ----
  { proveedor: "deepseek", modelo: "deepseek-flash", nombre: "DeepSeek V4.1 Flash", entrada: 0.3, salida: 1.2, cache: 0.006, fuente: "https://api-docs.deepseek.com/quick_start/pricing", nota: "Hora pico. Fuera de pico: 0,15 / 0,60 / caché 0,003." },
  { proveedor: "deepseek", modelo: "deepseek-v4-pro", nombre: "DeepSeek V4 Pro", entrada: 1.32, salida: 3.96, cache: 0.044, fuente: "https://api-docs.deepseek.com/quick_start/pricing", nota: "Hora pico. Fuera de pico: 0,66 / 1,98 / caché 0,022." },

  // ---- Kimi (Moonshot AI) ----
  { proveedor: "kimi", modelo: "kimi-k3.1-pro", nombre: "Kimi K3.1 Pro", entrada: 2, salida: 10, cache: 0.2, fuente: "https://platform.kimi.ai/docs/pricing/chat" },
  { proveedor: "kimi", modelo: "kimi-k3", nombre: "Kimi K3", entrada: 3, salida: 15, cache: 0.3, fuente: "https://platform.kimi.ai/docs/pricing/chat" },

  // ---- MiniMax ----
  { proveedor: "minimax", modelo: "MiniMax-M3", nombre: "MiniMax M3", entrada: 0.3, salida: 1.2, cache: 0.06, fuente: "https://platform.minimax.io/docs/guides/pricing", nota: "Estándar, hasta 512K tokens de entrada." },
  { proveedor: "minimax", modelo: "MiniMax-M3.1-Flash", nombre: "MiniMax M3.1 Flash", entrada: 0.15, salida: 0.6, cache: 0.015, fuente: "https://platform.minimax.io/docs/guides/pricing" },

  // ---- Google Gemini ----
  { proveedor: "gemini", modelo: "gemini-3.1-pro-preview", nombre: "Gemini 3.1 Pro (preview)", entrada: 2, salida: 12, cache: 0.2, fuente: "https://aistudio.google.com/docs/pricing", nota: "Prompts hasta 200K tokens." },
  { proveedor: "gemini", modelo: "gemini-3.8-flash", nombre: "Gemini 3.8 Flash", entrada: 0.75, salida: 3.75, cache: 0.075, fuente: "https://aistudio.google.com/docs/pricing", nota: "Precio vigente hasta el 31/12/2026; desde el 1/1/2027: 1,50 / 7,50 / caché 0,15." },
  { proveedor: "gemini", modelo: "gemini-3.5-flash-lite", nombre: "Gemini 3.5 Flash-Lite", entrada: 0.3, salida: 2.5, cache: 0.03, fuente: "https://aistudio.google.com/docs/pricing" },

  // ---- OpenAI ----
  { proveedor: "openai", modelo: "gpt-6.1-sol", nombre: "GPT-6.1 Sol", entrada: 2, salida: 10, cache: 0.1, fuente: "https://developers.openai.com/api/docs/pricing", nota: "Estándar, hasta 272K tokens." },
  { proveedor: "openai", modelo: "gpt-6.1-terra", nombre: "GPT-6.1 Terra", entrada: 1, salida: 5, cache: 0.05, fuente: "https://developers.openai.com/api/docs/pricing", nota: "Estándar, hasta 272K tokens." },
  { proveedor: "openai", modelo: "gpt-6-luna", nombre: "GPT-6 Luna", entrada: 0.1, salida: 0.5, cache: 0.01, fuente: "https://developers.openai.com/api/docs/pricing", nota: "Estándar, hasta 272K tokens." },

  // ---- Mistral ----
  { proveedor: "mistral", modelo: "mistral-large", nombre: "Mistral Large 4", entrada: 0.5, salida: 1.5, cache: null, fuente: "https://mistral.ai/pricing", nota: "La página de precios no publica el identificador exacto del modelo en la API." },
];

/** Proveedores sin precio público verificable al consultar. Se muestran como pendientes, nunca con cifra inventada. */
export const SIN_PRECIO_PUBLICO: { proveedor: string; nombre: string; motivo: string }[] = [
  {
    proveedor: "llama",
    nombre: "Llama (Meta)",
    motivo: "Meta no vende Llama por API propia; Groq muestra «Contact sales» y Together solo lista Llama 3 8B Lite. Elegir proveedor antes de fijar precio.",
  },
];

export function precioDe(modelo: string): PrecioModelo | undefined {
  return PRECIOS.find((p) => p.modelo === modelo);
}

export interface Consumo {
  tokens_entrada: number | null;
  tokens_salida: number | null;
  /** Total cuando la sesión no separa entrada y salida (subagentes de Claude Code). */
  tokens_total: number | null;
}

/**
 * Costo en USD de un consumo con el precio dado. Si solo se conoce el total, devuelve un rango:
 * mínimo (todo a precio de entrada) y máximo (todo a precio de salida). No se inventa el reparto.
 */
export function costo(c: Consumo, p: Pick<PrecioModelo, "entrada" | "salida">): { min: number; max: number; exacto: boolean } {
  if (c.tokens_entrada != null || c.tokens_salida != null) {
    const v = ((c.tokens_entrada ?? 0) * p.entrada + (c.tokens_salida ?? 0) * p.salida) / 1e6;
    return { min: v, max: v, exacto: true };
  }
  const t = c.tokens_total ?? 0;
  return { min: (t * p.entrada) / 1e6, max: (t * p.salida) / 1e6, exacto: t === 0 };
}
