"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import type { Archivo, Buzon, MensajeBuzon } from "@/lib/estado";
import { MINUTOS_SESION } from "@/lib/escena";
import { derivarEspera, duracion } from "@/lib/espera";

const hora = (iso: string) =>
  new Date(iso).toLocaleString("es-DO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });

const tamano = (b: number) => (b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

const ICONO: Record<string, string> = { pdf: "📕", docx: "📘", doc: "📘", xlsx: "📗", xls: "📗", csv: "📗", pptx: "📙", zip: "🗜️", png: "🖼️", jpg: "🖼️", jpeg: "🖼️", webp: "🖼️" };
const icono = (nombre: string) => ICONO[nombre.split(".").pop()?.toLowerCase() ?? ""] ?? "📄";

/**
 * Las fotos se reducen en el navegador antes de subirlas (lado mayor de 2000 px, JPEG 0,82), para
 * no llenar el almacén gratuito. Los documentos se suben tal cual.
 */
async function comprimirSiEsFoto(f: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size < 600 * 1024) return f;
  const bmp = await createImageBitmap(f).catch(() => null);
  if (!bmp) return f;
  const escala = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(bmp.width * escala);
  lienzo.height = Math.round(bmp.height * escala);
  lienzo.getContext("2d")!.drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
  const blob = await new Promise<Blob | null>((r) => lienzo.toBlob(r, "image/jpeg", 0.82));
  if (!blob || blob.size >= f.size) return f;
  return new File([blob], f.name.replace(/\.(png|webp|jpe?g)$/i, "") + ".jpg", { type: "image/jpeg" });
}

function antiguedad(desde: string | null, ahora: string): string {
  if (!desde) return "nunca";
  const min = Math.round((new Date(ahora).getTime() - new Date(desde).getTime()) / 60000);
  if (min < 1) return "hace menos de un minuto";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 48 ? `hace ${h} h` : `hace ${Math.round(h / 24)} días`;
}

export default function Chat({
  buzon,
  ahora,
  encargoId,
  alEnviar,
}: {
  buzon: Buzon;
  ahora: string;
  encargoId: string | null;
  alEnviar: () => Promise<void>;
}) {
  const [texto, setTexto] = useState("");
  const [adjuntos, setAdjuntos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vincular, setVincular] = useState(true);
  const hilo = useRef<HTMLDivElement>(null);
  const selector = useRef<HTMLInputElement>(null);
  const ultimo = buzon.mensajes.at(-1)?.id;
  const espera = derivarEspera(buzon, ahora);

  useEffect(() => {
    // Después del pintado, para que cuente la altura real del indicador y de las notas.
    const r = requestAnimationFrame(() => {
      if (hilo.current) hilo.current.scrollTop = hilo.current.scrollHeight;
    });
    return () => cancelAnimationFrame(r);
  }, [ultimo, espera.fase, espera.notas.length]);

  const sinLeer = buzon.mensajes.filter((m) => m.autor === "ariel" && !m.leido_en).length;
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText("Revisa el buzón de la oficina (leer_buzon) y atiende los mensajes nuevos.");
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setError("No se pudo copiar. Escribe en la sesión: «revisa el buzón».");
    }
  }

  const reciente =
    buzon.latido && (new Date(ahora).getTime() - new Date(buzon.latido).getTime()) / 60000 <= MINUTOS_SESION;

  async function enviar() {
    setError(null);
    try {
      const archivos = [];
      for (const [i, original] of adjuntos.entries()) {
        setEnviando(`Subiendo ${i + 1} de ${adjuntos.length}: ${original.name}`);
        const f = await comprimirSiEsFoto(original);
        const r = await upload(`ariel/${f.name}`, f, { access: buzon.almacen.acceso, handleUploadUrl: "/api/subir", contentType: f.type || undefined });
        archivos.push({ url: r.url, nombre: f.name, tipo: f.type || "application/octet-stream", tamano: f.size });
      }
      setEnviando("Enviando…");
      const r = await fetch("/api/mensajes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, archivos, encargo_id: vincular ? encargoId : null }),
      });
      if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo enviar");
      setTexto("");
      setAdjuntos([]);
      await alEnviar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(null);
    }
  }

  return (
    <div className="chat">
      <p className={reciente ? "presencia activa" : "presencia"}>
        {reciente ? (
          <>Último contacto del Orquestador {antiguedad(buzon.latido, ahora)}.</>
        ) : (
          <>
            Sin sesión abierta (último contacto: {antiguedad(buzon.latido, ahora)}). Tu mensaje queda en el buzón; ábrelo en Claude Code
            y dile «revisa el buzón».
          </>
        )}
        {sinLeer > 0 && !reciente && (
          <button className="boton-secundario copiar" onClick={() => void copiar()}>
            {copiado ? "Copiado ✓" : `Copiar «revisa el buzón» (${sinLeer} sin leer)`}
          </button>
        )}
      </p>

      <div className="hilo" role="log" aria-live="polite" ref={hilo}>
        {buzon.mensajes.length === 0 && (
          <p className="vacio">Escribe lo que necesitas. Puedes adjuntar datos, fotos o documentos y pedir el entregable en Word, PDF o Excel.</p>
        )}
        {buzon.mensajes.map((m) => (
          <Burbuja key={m.id} m={m} />
        ))}
        {espera.fase !== "ninguna" && <Esperando espera={espera} />}
      </div>

      <div className="redactor">
        {adjuntos.length > 0 && (
          <ul className="adjuntos-pendientes">
            {adjuntos.map((f, i) => (
              <li key={`${f.name}-${i}`}>
                {icono(f.name)} {f.name} <span className="detalle">{tamano(f.size)}</span>
                <button className="boton-texto" aria-label={`Quitar ${f.name}`} onClick={() => setAdjuntos(adjuntos.filter((_, j) => j !== i))}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escríbele al Orquestador…"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void enviar();
          }}
        />
        {error && <p className="aviso">{error}</p>}
        <div className="acciones-chat">
          <input
            ref={selector}
            type="file"
            multiple
            hidden
            accept=".pdf,.doc,.docx,.xls,.xlsx,.pptx,.csv,.txt,.md,.json,.zip,image/jpeg,image/png,image/webp"
            onChange={(e) => {
              setAdjuntos([...adjuntos, ...Array.from(e.target.files ?? [])].slice(0, 10));
              e.target.value = "";
            }}
          />
          <button
            className="boton-secundario"
            disabled={!!enviando || !buzon.almacen.configurado}
            title={buzon.almacen.configurado ? "Adjuntar archivos" : "Falta conectar el almacén de archivos (Vercel Blob)"}
            onClick={() => selector.current?.click()}
          >
            📎 Adjuntar
          </button>
          {encargoId && (
            <label className="detalle vincular">
              <input type="checkbox" checked={vincular} onChange={(e) => setVincular(e.target.checked)} /> Sobre el encargo actual
            </label>
          )}
          <button className="boton-primario" disabled={!!enviando || (!texto.trim() && adjuntos.length === 0)} onClick={() => void enviar()}>
            {enviando ?? "Enviar"}
          </button>
        </div>
        {!buzon.almacen.configurado && <p className="detalle">Para adjuntar archivos falta conectar Vercel Blob al proyecto.</p>}
      </div>
    </div>
  );
}

/** Indicador de espera por fases reales. Sin porcentajes: el sistema no mide cuánto falta. */
function Esperando({ espera }: { espera: ReturnType<typeof derivarEspera> }) {
  const sinActividad = espera.fase === "sin_actividad";
  return (
    <div className={sinActividad ? "espera sin-actividad" : "espera"} role="status" aria-live="polite">
      <ol className="pasos">
        <li className="hecho">Enviado</li>
        <li className={espera.leido ? "hecho" : espera.fase === "cola" ? "activo" : ""}>Leído</li>
        <li className={espera.fase === "trabajando" ? "activo" : ""}>Trabajando</li>
      </ol>
      {espera.fase === "cola" && (
        <p className="estado-espera">
          <span className="puntos" aria-hidden><i /><i /><i /></span> En cola: el Orquestador lo lee en segundos · {duracion(espera.segundos)}
        </p>
      )}
      {espera.fase === "trabajando" && (
        <>
          <p className="estado-espera">
            <span className="puntos" aria-hidden><i /><i /><i /></span> El Orquestador está trabajando en tu mensaje · {duracion(espera.segundos)}
          </p>
          {espera.notas.length > 0 && (
            <ul className="notas">
              {espera.notas.map((n, i) => (
                <li key={`${i}-${n}`} className={i === espera.notas.length - 1 ? "ultima" : ""}>
                  {n}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {sinActividad && (
        <p className="estado-espera">
          {espera.leido
            ? `Sin actividad registrada desde hace ${duracion(espera.segundos)}. Puede que la sesión se haya cerrado; tu mensaje queda guardado.`
            : "Esperando a que el Orquestador abra sesión. Tu mensaje queda guardado en el buzón."}
        </p>
      )}
    </div>
  );
}

const VISTA_PREVIA = /\.(pdf|png|jpe?g|webp)$/i;

function Adjunto({ a }: { a: Archivo }) {
  const [abierto, setAbierto] = useState(false);
  const url = `/api/archivos/${encodeURIComponent(a.id)}`;
  const esImagen = /\.(png|jpe?g|webp)$/i.test(a.nombre);
  return (
    <li>
      <a href={url} download={a.nombre}>
        {icono(a.nombre)} {a.nombre}
      </a>
      <span className="detalle"> {tamano(a.tamano)}</span>
      {VISTA_PREVIA.test(a.nombre) && (
        <button className="boton-texto ver" onClick={() => setAbierto(!abierto)}>
          {abierto ? "Ocultar" : "Ver"}
        </button>
      )}
      {abierto &&
        (esImagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="vista-previa" src={`${url}?ver=1`} alt={a.nombre} />
        ) : (
          <iframe className="vista-previa pdf" src={`${url}?ver=1`} title={a.nombre} />
        ))}
    </li>
  );
}

function Burbuja({ m }: { m: MensajeBuzon }) {
  return (
    <article className={`burbuja ${m.autor}`}>
      <p className="texto-burbuja">{m.texto}</p>
      {m.archivos.length > 0 && (
        <ul className="adjuntos">
          {m.archivos.map((a) => (
            <Adjunto key={a.id} a={a} />
          ))}
        </ul>
      )}
      <p className="meta-burbuja">
        {m.autor === "ariel" ? "Tú" : "Orquestador"} · {hora(m.creado)}
        {m.autor === "ariel" && <> · {m.leido_en ? "Leído" : "Sin leer"}</>}
      </p>
    </article>
  );
}
