"use client";

import { useState } from "react";
import { PRECIOS, PRECIOS_CONSULTADOS, SIN_PRECIO_PUBLICO, costo, precioDe, type PrecioModelo } from "oficina-mcp/precios";
import type { FilaConsumo } from "@/lib/estado";

type Rango = { min: number; max: number; exacto: boolean };
const CERO: Rango = { min: 0, max: 0, exacto: true };
const sumar = (a: Rango, b: Rango): Rango => ({ min: a.min + b.min, max: a.max + b.max, exacto: a.exacto && b.exacto });

export function usd(v: number): string {
  if (v === 0) return "$0";
  if (v < 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(2)}`;
}
const verRango = (r: Rango) => (r.exacto || r.min === r.max ? usd(r.min) : `${usd(r.min)} – ${usd(r.max)}`);
const miles = (n: number) => n.toLocaleString("es-DO");

export function tokensDe(f: FilaConsumo): number {
  return (f.tokens_entrada ?? 0) + (f.tokens_salida ?? 0) + (f.tokens_total ?? 0);
}

/** Lo realmente pagado: solo llamadas por API con precio conocido. La sesión nativa la cubre la suscripción. */
export function gastoReal(filas: FilaConsumo[]): { rango: Rango; sinPrecio: string[] } {
  let rango = CERO;
  const sinPrecio: string[] = [];
  for (const f of filas) {
    if (f.origen !== "api") continue;
    const p = precioDe(f.modelo);
    if (!p) sinPrecio.push(f.modelo);
    else rango = sumar(rango, costo(f, p));
  }
  return { rango, sinPrecio };
}

const PROVEEDOR: Record<string, string> = {
  anthropic: "Anthropic (Claude)",
  qwen: "Qwen",
  deepseek: "DeepSeek",
  kimi: "Kimi",
  minimax: "MiniMax",
  gemini: "Google Gemini",
  openai: "OpenAI",
  mistral: "Mistral",
};

export default function Gasto({ encargo, total, hayEncargo }: { encargo: FilaConsumo[]; total: FilaConsumo[]; hayEncargo: boolean }) {
  const [ambito, setAmbito] = useState<"encargo" | "total">(hayEncargo ? "encargo" : "total");
  const [comparar, setComparar] = useState<string>("");
  const filas = ambito === "encargo" ? encargo : total;
  const alternativo: PrecioModelo | undefined = comparar ? precioDe(comparar) : undefined;

  let real = CERO;
  let equivalente = CERO;
  let hipotetico = CERO;
  const proveedores = [...new Set(PRECIOS.map((p) => p.proveedor))];

  return (
    <div className="gasto">
      <div className="segmentos" role="tablist">
        {hayEncargo && (
          <button role="tab" aria-selected={ambito === "encargo"} className={ambito === "encargo" ? "activo" : ""} onClick={() => setAmbito("encargo")}>
            Este encargo
          </button>
        )}
        <button role="tab" aria-selected={ambito === "total"} className={ambito === "total" ? "activo" : ""} onClick={() => setAmbito("total")}>
          Todo
        </button>
      </div>

      <label className="comparar">
        <span>¿Cuánto habría costado con…?</span>
        <select value={comparar} onChange={(e) => setComparar(e.target.value)}>
          <option value="">— el modelo que se usó —</option>
          {proveedores.map((prov) => (
            <optgroup key={prov} label={PROVEEDOR[prov] ?? prov}>
              {PRECIOS.filter((p) => p.proveedor === prov).map((p) => (
                <option key={p.modelo} value={p.modelo}>
                  {p.nombre} · {usd(p.entrada)} / {usd(p.salida)} por M
                </option>
              ))}
            </optgroup>
          ))}
          {SIN_PRECIO_PUBLICO.map((s) => (
            <option key={s.proveedor} disabled>
              {s.nombre} · sin precio público verificado
            </option>
          ))}
        </select>
      </label>

      {filas.length === 0 ? (
        <p className="vacio">Todavía no hay tokens registrados{ambito === "encargo" ? " en este encargo" : ""}.</p>
      ) : (
        <table className="tabla-gasto">
          <thead>
            <tr>
              <th>Quién</th>
              <th>Tokens</th>
              <th>Pagado</th>
              <th>{alternativo ? alternativo.nombre : "Equivalente API"}</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const propio = precioDe(f.modelo);
              const pagado = f.origen === "api" && propio ? costo(f, propio) : CERO;
              const eq = propio ? costo(f, propio) : null;
              const alt = alternativo ? costo(f, alternativo) : eq;
              real = sumar(real, pagado);
              if (eq) equivalente = sumar(equivalente, eq);
              if (alt) hipotetico = sumar(hipotetico, alt);
              return (
                <tr key={`${f.origen}-${f.modelo}`}>
                  <td>
                    <strong>{f.origen === "api" ? `${PROVEEDOR[f.proveedor] ?? f.proveedor} por API` : "Sesión nativa"}</strong>
                    <span className="detalle">
                      {propio?.nombre ?? f.modelo} · {f.llamadas} {f.origen === "api" ? "llamada(s)" : "resultado(s)"}
                      {f.sin_tokens > 0 && ` · ${f.sin_tokens} sin tokens reportados`}
                    </span>
                  </td>
                  <td>
                    {f.tokens_total != null && f.tokens_entrada == null ? (
                      <>
                        {miles(f.tokens_total)}
                        <span className="detalle">total (sin separar)</span>
                      </>
                    ) : (
                      <>
                        {miles(f.tokens_entrada ?? 0)} + {miles(f.tokens_salida ?? 0)}
                        <span className="detalle">entrada + salida</span>
                      </>
                    )}
                  </td>
                  <td>{f.origen === "api" ? (propio ? verRango(pagado) : "sin precio") : <span className="detalle">Suscripción</span>}</td>
                  <td>{alt ? verRango(alt) : "sin precio"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th>Total</th>
              <th>{miles(filas.reduce((n, f) => n + tokensDe(f), 0))}</th>
              <th>{verRango(real)}</th>
              <th>{verRango(alternativo ? hipotetico : equivalente)}</th>
            </tr>
          </tfoot>
        </table>
      )}

      <p className="detalle nota-gasto">
        «Pagado» es lo cobrado por las APIs. El trabajo de la sesión nativa lo cubre tu suscripción; su «equivalente» es lo que habría
        costado por API. Cuando la sesión solo reporta el total de tokens, se muestra un rango (todo a precio de entrada – todo a precio
        de salida). Precios en USD por millón de tokens, consultados el {PRECIOS_CONSULTADOS} en las páginas oficiales y revisados cada
        semana. DeepSeek se calcula a precio de hora pico.
      </p>
    </div>
  );
}
