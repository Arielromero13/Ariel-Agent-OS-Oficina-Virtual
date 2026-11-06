"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { derivarEscena, derivarOrquestador, describirEvento, type BuzonEscena, type FichaVista } from "@/lib/escena";
import type { Decision, EstadoOficina, FilaConsumo, Resultado } from "@/lib/estado";
import Chat from "./Chat";
import Escena, { type Seleccion } from "./Escena";
import Gasto, { gastoReal, tokensDe, usd } from "./Gasto";

export type Pestana = "conversacion" | "encargo" | "gasto";

function buzonEscena(e: EstadoOficina | null): BuzonEscena {
  const m = e?.buzon.mensajes ?? [];
  const ultimo = (autor: string) => [...m].reverse().find((x) => x.autor === autor) ?? null;
  return {
    sinLeer: m.filter((x) => x.autor === "ariel" && !x.leido_en).length,
    ultimoAriel: ultimo("ariel"),
    ultimoOrquestador: ultimo("orquestador"),
    leido: e?.buzon.leido ?? null,
    latido: e?.buzon.latido ?? null,
  };
}

const INTERVALO_MS = 1500; // criterio 7: la escena refleja el estado en menos de 3 s

const NOMBRE_ESTADO: Record<string, string> = {
  abierto: "Abierto",
  en_curso: "En curso",
  en_revision: "Esperando a Ariel",
  emitido: "Emitido",
  cerrado: "Cerrado",
};

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

export default function Oficina() {
  const [estado, setEstado] = useState<EstadoOficina | null>(null);
  const [conexion, setConexion] = useState<"ok" | "error">("ok");
  const [seleccion, setSeleccion] = useState<Seleccion | null>({ tipo: "orquestador" });
  const [pestana, setPestana] = useState<Pestana>("conversacion");

  const cargar = useCallback(async () => {
    try {
      const r = await fetch("/api/estado", { cache: "no-store" });
      if (r.status === 401) {
        window.location.href = "/entrar";
        return;
      }
      setEstado((await r.json()) as EstadoOficina);
      setConexion("ok");
    } catch {
      setConexion("error");
    }
  }, []);

  useEffect(() => {
    void cargar();
    const t = setInterval(() => void cargar(), INTERVALO_MS);
    return () => clearInterval(t);
  }, [cargar]);

  const escena = useMemo(
    () =>
      estado
        ? derivarEscena(estado.fichas, estado.encargo, estado.eventos, estado.decisiones.length, estado.ahora)
        : derivarEscena([], null, [], 0),
    [estado],
  );
  const buzon = useMemo(() => buzonEscena(estado), [estado]);
  const orquestador = useMemo(
    () =>
      derivarOrquestador(
        escena.orquestador,
        buzon,
        estado?.ahora ?? new Date().toISOString(),
        !!estado?.encargo && !["emitido", "cerrado"].includes(estado.encargo.estado),
      ),
    [escena.orquestador, buzon, estado?.ahora, estado?.encargo],
  );
  const entregables = useMemo(
    () =>
      (estado?.buzon.mensajes ?? [])
        .filter((m) => m.autor === "orquestador" && estado?.encargo && m.encargo_id === estado.encargo.id)
        .reduce((n, m) => n + m.archivos.length, 0),
    [estado],
  );
  const contador = useMemo(() => {
    const filas = estado?.consumo.total ?? [];
    return { tokens: filas.reduce((n, f) => n + tokensDe(f), 0), pagado: gastoReal(filas).rango.min };
  }, [estado?.consumo.total]);
  const abrir = (p: Pestana) => {
    setSeleccion({ tipo: "orquestador" });
    setPestana(p);
  };
  const nombres = useMemo(
    () => Object.fromEntries((estado?.fichas ?? []).map((f) => [f.id, f.nombre])),
    [estado?.fichas],
  );

  return (
    <div className="oficina">
      <section className="lienzo">
        <header className="cabecera">
          <div className="tarjeta-encargo">
            <span className="icono-encargo" aria-hidden>
              ⚡
            </span>
            <div>
              {estado?.encargo ? (
                <>
                  <p className="titulo-encargo">
                    {estado.encargo.titulo}
                    <span className={`chip estado-${estado.encargo.estado}`}>{NOMBRE_ESTADO[estado.encargo.estado]}</span>
                  </p>
                  <p className="sub-encargo">
                    Versión {estado.encargo.version_actual} · {estado.encargo.sensibilidad === "interno" ? "Interno, solo sesión nativa" : "Permite APIs externas"}
                  </p>
                </>
              ) : (
                <>
                  <p className="titulo-encargo">Sin encargo activo</p>
                  <p className="sub-encargo">Abre un encargo desde la sesión del Orquestador.</p>
                </>
              )}
            </div>
          </div>
          <div className="contadores">
            <button className="chip-contador" onClick={() => abrir("conversacion")} title="Conversación con el Orquestador">
              💬 {buzon.sinLeer > 0 ? `${buzon.sinLeer} sin leer` : "Buzón"}
            </button>
            <button className="chip-contador" onClick={() => abrir("gasto")} title="Tokens registrados y gasto en APIs">
              🪙 {contador.tokens.toLocaleString("es-DO")} tokens · {usd(contador.pagado)} pagado
            </button>
          </div>
          <Aviso estado={estado} conexion={conexion} alPreparar={cargar} />
        </header>

        <Escena
          fichas={estado?.fichas ?? []}
          estados={escena}
          orquestador={orquestador}
          sinLeer={buzon.sinLeer}
          entregables={entregables}
          encargosEnMuro={estado?.muro.length ?? 0}
          seleccion={seleccion}
          alSeleccionar={setSeleccion}
        />

        <div className="pie-lienzo">
          <span className="chip-modo">Vista isométrica diurna</span>
          <form method="post" action="/api/salir">
            <button className="boton-texto" type="submit">
              Salir
            </button>
          </form>
        </div>
      </section>

      <aside className="panel">
        <Panel
          estado={estado}
          seleccion={seleccion}
          nombres={nombres}
          estadosEscena={escena}
          estadoOrquestador={orquestador.estado}
          pestana={pestana}
          alCambiarPestana={setPestana}
          alResponder={cargar}
        />
      </aside>
    </div>
  );
}

function Aviso({ estado, conexion, alPreparar }: { estado: EstadoOficina | null; conexion: "ok" | "error"; alPreparar: () => Promise<void> }) {
  const [preparando, setPreparando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  if (conexion === "error") return <p className="aviso">Sin conexión con el servidor. Reintentando…</p>;
  if (!estado) return null;
  if (estado.base === "sin_configurar")
    return <p className="aviso">Estado compartido no configurado: el servidor no ve ninguna variable con una cadena de conexión de Postgres. Revisa que la base esté conectada a este proyecto en Production y vuelve a desplegar.</p>;
  if (estado.base === "sin_migrar") {
    const preparar = async () => {
      setPreparando(true);
      setFallo(null);
      const r = await fetch("/api/preparar", { method: "POST" });
      setPreparando(false);
      if (!r.ok) setFallo(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo preparar la base");
      await alPreparar();
    };
    return (
      <div className="aviso">
        <p>{estado.detalle === "actualizar" ? "La base de datos necesita las tablas nuevas de esta versión (buzón y archivos)." : "La base de datos está conectada pero todavía no tiene tablas."}</p>
        <button className="boton-primario" disabled={preparando} onClick={() => void preparar()}>
          {preparando ? "Preparando…" : estado.detalle === "actualizar" ? "Actualizar base de datos" : "Preparar base de datos"}
        </button>
        {fallo && <p>{fallo}</p>}
      </div>
    );
  }
  if (estado.base === "error") return <p className="aviso">Error al leer el estado: {estado.detalle}</p>;
  return null;
}

function Panel({
  estado,
  seleccion,
  nombres,
  estadosEscena,
  estadoOrquestador,
  pestana,
  alCambiarPestana,
  alResponder,
}: {
  estado: EstadoOficina | null;
  seleccion: Seleccion | null;
  nombres: Record<string, string>;
  estadosEscena: ReturnType<typeof derivarEscena>;
  estadoOrquestador: string;
  pestana: Pestana;
  alCambiarPestana: (p: Pestana) => void;
  alResponder: () => Promise<void>;
}) {
  if (!estado) return <p className="vacio">Cargando la oficina…</p>;
  const s = seleccion ?? { tipo: "orquestador" as const };

  if (s.tipo === "agente") {
    const f = estado.fichas.find((x) => x.id === s.id);
    if (!f) return null;
    const propios = estado.resultados.filter((r) => r.ficha_id === f.id);
    const fallo = [...estado.eventos].reverse().find((e) => e.actor === f.id && e.tipo === "agente_fallo");
    const vigente = fallo && ["Bloqueado", "Error"].includes(estadosEscena.agentes[f.id]);
    return (
      <>
        <CabeceraPanel titulo={f.nombre} chip={modoFicha(f)} estado={estadosEscena.agentes[f.id]} />
        <Bloque titulo="Ficha">
          <p>{f.especialidad}</p>
          {!f.configurado && f.respaldo_nativo && (
            <p className="aviso">Sin clave de {f.proveedor}: trabaja como subagente de la sesión nativa y su resultado queda para revisión de Ariel.</p>
          )}
          {!f.configurado && !f.respaldo_nativo && <p className="aviso">Proveedor No configurado: el plan no le asigna tareas.</p>}
          {vigente && (
            <p className="aviso">
              Último fallo ({hora(fallo.creado)}): {String(fallo.datos.estado)}
              {fallo.datos.detalle ? ` — ${String(fallo.datos.detalle)}` : ""}
            </p>
          )}
        </Bloque>
        <Bloque titulo="Resultados en este encargo">
          {propios.length === 0 ? <p className="vacio">Sin resultados todavía.</p> : propios.map((r) => <TarjetaResultado key={r.id} r={r} />)}
        </Bloque>
      </>
    );
  }

  if (s.tipo === "rrhh") {
    return (
      <>
        <CabeceraPanel titulo="Oficina de RR. HH." estado={estadosEscena.rrhh} />
        <Bloque titulo="Catálogo de fichas">
          {estado.fichas.length === 0 && <p className="vacio">No hay fichas sincronizadas.</p>}
          <ul className="lista">
            {estado.fichas.map((f) => (
              <li key={f.id}>
                <strong>{f.nombre}</strong>
                <span className="detalle">
                  {modoFicha(f)} · {f.configurado ? "Configurado" : f.respaldo_nativo ? "Respaldo nativo" : "No configurado"}
                </span>
              </li>
            ))}
          </ul>
        </Bloque>
        <Bloque titulo="Biblioteca">
          {estado.biblioteca.length === 0 ? (
            <p className="vacio">Todavía no hay recursos. Las plantillas y aprendizajes aparecen aquí cuando apruebas guardarlos.</p>
          ) : (
            <ul className="lista">
              {estado.biblioteca.map((r) => (
                <li key={r.id}>
                  <strong>
                    {r.tipo === "plantilla" ? "📄 " : ""}
                    {r.titulo}
                  </strong>
                  <span className="detalle">
                    {r.tipo} · {r.estado === "guardado" ? "Guardado" : "Candidato (espera tu aprobación)"} · {r.resumen}
                  </span>
                  {r.archivo_id && (
                    <a className="detalle" href={`/api/archivos/${encodeURIComponent(r.archivo_id)}`} download={r.archivo_nombre ?? undefined}>
                      Descargar {r.archivo_nombre ?? "archivo"}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Bloque>
      </>
    );
  }

  if (s.tipo === "muro") {
    return (
      <>
        <CabeceraPanel titulo="Muro de encargos" />
        <Bloque titulo="Encargos recientes">
          {estado.muro.length === 0 && <p className="vacio">Todavía no hay encargos.</p>}
          <ul className="lista">
            {estado.muro.map((e) => (
              <li key={e.id}>
                <strong>{e.titulo}</strong>
                <span className="detalle">
                  {NOMBRE_ESTADO[e.estado] ?? e.estado} · {new Date(e.actualizado).toLocaleString("es-DO")}
                </span>
                <span className="detalle">{resumenGasto(e.consumo)}</span>
              </li>
            ))}
          </ul>
        </Bloque>
      </>
    );
  }

  const mesa = (
    <Bloque titulo="Mesa de revisión">
      {estado.decisiones.length === 0 ? (
        <p className="vacio">No hay decisiones pendientes.</p>
      ) : (
        estado.decisiones.map((d) => <TarjetaDecision key={d.id} d={d} alResponder={alResponder} />)
      )}
    </Bloque>
  );

  if (s.tipo === "revision" || s.tipo === "director") {
    return (
      <>
        <CabeceraPanel titulo={s.tipo === "director" ? "Puesto del Director" : "Mesa de revisión"} />
        {mesa}
        <Bloque titulo="Resultados del encargo">
          {estado.resultados.length === 0 ? <p className="vacio">Sin resultados todavía.</p> : estado.resultados.map((r) => <TarjetaResultado key={r.id} r={r} nombre={nombres[r.ficha_id]} />)}
        </Bloque>
      </>
    );
  }

  // Mesa del Orquestador (vista por defecto): conversación, encargo y gasto.
  const sinLeer = estado.buzon.mensajes.filter((m) => m.autor === "ariel" && !m.leido_en).length;
  const pestanas = (
    <div className="pestanas" role="tablist">
      {(
        [
          ["conversacion", sinLeer ? `Conversación (${sinLeer})` : "Conversación"],
          ["encargo", "Encargo"],
          ["gasto", "Gasto"],
        ] as const
      ).map(([id, texto]) => (
        <button key={id} role="tab" aria-selected={pestana === id} className={pestana === id ? "activo" : ""} onClick={() => alCambiarPestana(id)}>
          {texto}
        </button>
      ))}
    </div>
  );
  const cabecera = <CabeceraPanel titulo="Mesa del Orquestador" chip="Sesión nativa" estado={estadoOrquestador} />;

  if (pestana === "conversacion") {
    return (
      <>
        {cabecera}
        {pestanas}
        <Chat buzon={estado.buzon} ahora={estado.ahora} encargoId={estado.encargo && !["emitido", "cerrado"].includes(estado.encargo.estado) ? estado.encargo.id : null} alEnviar={alResponder} />
      </>
    );
  }
  if (pestana === "gasto") {
    return (
      <>
        {cabecera}
        {pestanas}
        <Gasto encargo={estado.consumo.encargo} total={estado.consumo.total} hayEncargo={!!estado.encargo} />
      </>
    );
  }
  return (
    <>
      {cabecera}
      {pestanas}
      <Bloque titulo="Plan del encargo">
        {estado.plan ? <p>{estado.plan}</p> : <p className="vacio">El Orquestador aún no registra un plan.</p>}
        {estado.equipo.length > 0 && (
          <ul className="lista">
            {estado.equipo.map((m, i) => (
              <li key={`${m.ficha_id}-${i}`}>
                <strong>{nombres[m.ficha_id] ?? m.ficha_id}</strong>
                <span className="detalle">
                  {m.tarea} · {estadosEscena.agentes[m.ficha_id] ?? "En reposo"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Bloque>
      {mesa}
      <Bloque titulo="Actividad">
        {estado.eventos.length === 0 ? (
          <p className="vacio">Sin actividad registrada.</p>
        ) : (
          <ol className="actividad">
            {[...estado.eventos].reverse().slice(0, 30).map((e) => (
              <li key={e.id}>
                <time>{hora(e.creado)}</time>
                <span>{describirEvento(e, nombres)}</span>
              </li>
            ))}
          </ol>
        )}
      </Bloque>
    </>
  );
}

/** Texto corto de tokens y costo de un encargo. Solo lo registrado; nada estimado. */
function resumenGasto(filas: FilaConsumo[]): string {
  const tokens = filas.reduce((n, f) => n + tokensDe(f), 0);
  if (tokens === 0) return "Sin tokens registrados";
  const { rango } = gastoReal(filas);
  const sesion = filas.some((f) => f.origen === "sesion");
  return `${tokens.toLocaleString("es-DO")} tokens · ${usd(rango.min)} pagado${sesion ? " (+ sesión nativa en tu suscripción)" : ""}`;
}

function modoFicha(f: FichaVista) {
  return f.configurado || !f.respaldo_nativo ? `${f.proveedor} · ${f.modelo}` : "Sesión nativa · subagente";
}

function CabeceraPanel({ titulo, chip, estado }: { titulo: string; chip?: string; estado?: string }) {
  return (
    <header className="cabecera-panel">
      <div>
        <h2>{titulo}</h2>
        {estado && <p className="estado-panel">{estado}</p>}
      </div>
      {chip && <span className="chip-modelo">{chip}</span>}
    </header>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="bloque">
      <h3>{titulo}</h3>
      {children}
    </section>
  );
}

function TarjetaResultado({ r, nombre }: { r: Resultado; nombre?: string }) {
  const procedencia =
    r.origen === "api"
      ? `${r.proveedor} · ${r.modelo} · ${r.tokens_entrada ?? "?"} + ${r.tokens_salida ?? "?"} tokens · ${hora(r.creado)}`
      : `${r.motivo_relevo === "sin_clave" ? "Subagente de la sesión" : "Relevo nativo"} (${r.modelo_nativo ?? "sesión"}) · original: ${r.proveedor_original}, ${r.motivo_relevo}${r.tokens_total != null ? ` · ${r.tokens_total} tokens` : ""} · ${hora(r.creado)}`;
  return (
    <article className={r.origen === "api" ? "resultado" : "resultado relevo"}>
      {nombre && <strong>{nombre}</strong>}
      <p className="detalle">{procedencia}</p>
      <details>
        <summary>Ver contenido</summary>
        <pre>{r.contenido}</pre>
      </details>
    </article>
  );
}

function TarjetaDecision({ d, alResponder }: { d: Decision; alResponder: () => Promise<void> }) {
  const [comentario, setComentario] = useState("");
  const [devolviendo, setDevolviendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function responder(estado: "aprobada" | "devuelta") {
    setEnviando(true);
    setError(null);
    const r = await fetch(`/api/decisiones/${encodeURIComponent(d.id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, comentario }),
    });
    setEnviando(false);
    if (!r.ok) {
      setError(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo registrar la decisión");
      return;
    }
    await alResponder();
  }

  return (
    <article className="decision">
      <p className="etiqueta">{d.tipo}</p>
      <p>{d.pregunta}</p>
      {devolviendo && (
        <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Comentarios para el Orquestador" rows={3} />
      )}
      {error && <p className="aviso">{error}</p>}
      <div className="acciones">
        <button className="boton-primario" disabled={enviando} onClick={() => void responder("aprobada")}>
          Aprobar
        </button>
        {devolviendo ? (
          <button className="boton-secundario" disabled={enviando || !comentario.trim()} onClick={() => void responder("devuelta")}>
            Enviar devolución
          </button>
        ) : (
          <button className="boton-secundario" disabled={enviando} onClick={() => setDevolviendo(true)}>
            Devolver con comentarios
          </button>
        )}
      </div>
    </article>
  );
}
