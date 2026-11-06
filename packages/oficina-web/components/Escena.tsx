"use client";

import type { KeyboardEvent, ReactNode } from "react";
import type { EstadoOrquestador, EstadoVisible, EstadosEscena, FichaVista } from "@/lib/escena";

/** Selección en la escena: zona o personaje. */
export type Seleccion =
  | { tipo: "orquestador" }
  | { tipo: "director" }
  | { tipo: "rrhh" }
  | { tipo: "revision" }
  | { tipo: "muro" }
  | { tipo: "agente"; id: string };

// ---------- Proyección isométrica ----------
const TW = 32; // medio ancho de baldosa
const TH = 16; // medio alto de baldosa
const iso = (gx: number, gy: number, z = 0) => ({ x: (gx - gy) * TW, y: (gx + gy) * TH - z });
const pts = (...p: { x: number; y: number }[]) => p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");

const ANCHO = 14;
const FONDO = 12;

function Caja({ gx, gy, w, d, h, arriba, izq, der, z = 0 }: { gx: number; gy: number; w: number; d: number; h: number; arriba: string; izq: string; der: string; z?: number }) {
  const t = h + z;
  return (
    <g>
      <polygon points={pts(iso(gx, gy + d, t), iso(gx + w, gy + d, t), iso(gx + w, gy + d, z), iso(gx, gy + d, z))} fill={izq} />
      <polygon points={pts(iso(gx + w, gy, t), iso(gx + w, gy + d, t), iso(gx + w, gy + d, z), iso(gx + w, gy, z))} fill={der} />
      <polygon points={pts(iso(gx, gy, t), iso(gx + w, gy, t), iso(gx + w, gy + d, t), iso(gx, gy + d, t))} fill={arriba} />
    </g>
  );
}

const MADERA = { arriba: "#e9dcc3", izq: "#d1c2a5", der: "#bfae8e" };
const BLANCO = { arriba: "#ffffff", izq: "#e2e8f0", der: "#cbd5e1" };

function Escritorio({ gx, gy, encendido }: { gx: number; gy: number; encendido: boolean }) {
  const pantalla = iso(gx + 0.55, gy + 0.2, 34);
  return (
    <g>
      <Caja gx={gx} gy={gy} w={1.6} d={0.9} h={22} {...MADERA} />
      <g transform={`translate(${pantalla.x},${pantalla.y})`}>
        <polygon points="-2,0 16,-9 16,6 -2,15" fill="#334155" />
        <polygon
          points="0,1 14,-6 14,4 0,11"
          className={encendido ? "pantalla encendida" : "pantalla"}
          fill={encendido ? "#5eead4" : "#94a3b8"}
        />
      </g>
    </g>
  );
}

function Planta({ gx, gy }: { gx: number; gy: number }) {
  const p = iso(gx, gy);
  return (
    <g transform={`translate(${p.x},${p.y})`} aria-hidden>
      <polygon points="-7,-12 7,-12 5,0 -5,0" fill="#c2410c" />
      <path d="M0,-12 C-14,-26 -10,-40 -2,-44 C-4,-32 0,-24 0,-12 Z" fill="#16a34a" />
      <path d="M0,-12 C12,-24 12,-38 4,-46 C6,-32 2,-24 0,-12 Z" fill="#22c55e" />
      <path d="M0,-12 C-2,-26 2,-36 0,-50 C6,-36 4,-24 0,-12 Z" fill="#15803d" />
    </g>
  );
}

// ---------- Personajes y globos ----------
const COLOR_GLOBO: Record<EstadoVisible, { fondo: string; texto: string }> = {
  "En reposo": { fondo: "#ffffff", texto: "#475569" },
  "Reuniendo equipo": { fondo: "#14b8a6", texto: "#ffffff" },
  Convocado: { fondo: "#14b8a6", texto: "#ffffff" },
  Analizando: { fondo: "#14b8a6", texto: "#ffffff" },
  Coordinando: { fondo: "#14b8a6", texto: "#ffffff" },
  "Esperando a Ariel": { fondo: "#f59e0b", texto: "#ffffff" },
  Completado: { fondo: "#10b981", texto: "#ffffff" },
  "Relevo nativo": { fondo: "#006c49", texto: "#ffffff" },
  Bloqueado: { fondo: "#ef4444", texto: "#ffffff" },
  Error: { fondo: "#ef4444", texto: "#ffffff" },
  "No configurado": { fondo: "#e2e8f0", texto: "#64748b" },
  "Mensaje sin leer": { fondo: "#6366f1", texto: "#ffffff" },
  "Leyó tus mensajes": { fondo: "#14b8a6", texto: "#ffffff" },
  "Te respondió": { fondo: "#0f766e", texto: "#ffffff" },
  "Sin sesión abierta": { fondo: "#e2e8f0", texto: "#64748b" },
};

const ACTIVO = new Set<EstadoVisible>(["Analizando", "Coordinando", "Reuniendo equipo", "Leyó tus mensajes", "Te respondió"]);

function Globo({ x, y, estado }: { x: number; y: number; estado: EstadoVisible }) {
  const c = COLOR_GLOBO[estado];
  const w = estado.length * 6.4 + 22;
  return (
    <g transform={`translate(${x},${y})`} className="globo">
      <rect x={-w / 2} y={-22} width={w} height={20} rx={10} fill={c.fondo} stroke="rgba(15,23,42,0.08)" />
      <polygon points="-5,-2 5,-2 0,4" fill={c.fondo} />
      <text y={-8} textAnchor="middle" fill={c.texto} className="texto-globo">
        {estado}
      </text>
    </g>
  );
}

function Etiqueta({ x, y, texto }: { x: number; y: number; texto: string }) {
  const w = texto.length * 6.2 + 20;
  return (
    <g transform={`translate(${x},${y})`} className="etiqueta-zona">
      <rect x={-w / 2} y={0} width={w} height={18} rx={9} fill="#ffffff" stroke="rgba(15,23,42,0.12)" />
      <text y={12.5} textAnchor="middle">
        {texto}
      </text>
    </g>
  );
}

/** Globo de diálogo con el inicio de la última respuesta del Orquestador. */
function Dialogo({ x, y, texto }: { x: number; y: number; texto: string }) {
  const lineas = partir(texto, 30).slice(0, 3);
  const w = Math.max(...lineas.map((l) => l.length)) * 6.3 + 24;
  const h = lineas.length * 14 + 12;
  return (
    <g transform={`translate(${x},${y})`} className="dialogo" key={texto}>
      <rect x={-w / 2} y={-h - 8} width={w} height={h} rx={10} fill="#ffffff" stroke="#0f766e" strokeWidth={1.5} />
      <polygon points="-6,-9 6,-9 0,-1" fill="#ffffff" stroke="#0f766e" strokeWidth={1.5} />
      <rect x={-7} y={-11} width={14} height={4} fill="#ffffff" />
      {lineas.map((l, i) => (
        <text key={i} x={0} y={-h + 6 + i * 14} textAnchor="middle" className="texto-dialogo">
          {l}
        </text>
      ))}
    </g>
  );
}

function partir(t: string, ancho: number): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of t.split(" ")) {
    if ((actual + " " + palabra).trim().length > ancho && actual) {
      lineas.push(actual);
      actual = palabra;
    } else actual = (actual + " " + palabra).trim();
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/** Sobre: mensajes de Ariel sin leer en la mesa del Orquestador. */
function Sobre({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g transform={`translate(${x},${y})`} className="sobre">
      <rect x={-11} y={-8} width={22} height={15} rx={2} fill="#eef2ff" stroke="#6366f1" strokeWidth={1.5} />
      <polyline points="-11,-8 0,1 11,-8" fill="none" stroke="#6366f1" strokeWidth={1.5} />
      {n > 1 && (
        <g transform="translate(12,-10)">
          <circle r={7} fill="#6366f1" />
          <text y={3} textAnchor="middle" className="contador-sobre">
            {n > 9 ? "9+" : n}
          </text>
        </g>
      )}
    </g>
  );
}

function Personaje({
  gx,
  gy,
  ropa,
  pelo,
  estado,
  destino,
}: {
  gx: number;
  gy: number;
  ropa: string;
  pelo: string;
  estado: EstadoVisible;
  /** Si se indica, el personaje camina hasta esa casilla (entrega en la Mesa de revisión). */
  destino?: { gx: number; gy: number };
}) {
  const p = iso(gx, gy);
  const q = destino ? iso(destino.gx, destino.gy) : p;
  const tenue = estado === "No configurado" || estado === "Sin sesión abierta";
  return (
    <g className="camina" style={{ transform: `translate(${q.x}px, ${q.y}px)` }} opacity={tenue ? 0.45 : 1}>
      <ellipse cx={0} cy={0} rx={11} ry={5} fill="rgba(15,23,42,0.12)" />
      <g className={ACTIVO.has(estado) ? "personaje activo" : "personaje"}>
        <rect x={-8} y={-26} width={16} height={24} rx={7} fill={ropa} />
        <circle cx={0} cy={-34} r={9} fill="#f5d0a9" />
        <path d="M-9,-35 C-9,-46 9,-46 9,-35 C5,-40 -5,-40 -9,-35 Z" fill={pelo} />
        <circle cx={-3} cy={-34} r={1.2} fill="#1e293b" />
        <circle cx={3} cy={-34} r={1.2} fill="#1e293b" />
      </g>
      <Globo x={0} y={-48} estado={estado} />
    </g>
  );
}

function Interactivo({
  nombre,
  seleccionado,
  alSeleccionar,
  etiqueta,
  children,
}: {
  nombre: string;
  seleccionado: boolean;
  alSeleccionar: () => void;
  etiqueta: { x: number; y: number };
  children: ReactNode;
}) {
  const tecla = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      alSeleccionar();
    }
  };
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={nombre}
      aria-pressed={seleccionado}
      className={seleccionado ? "interactivo seleccionado" : "interactivo"}
      onClick={alSeleccionar}
      onKeyDown={tecla}
    >
      {children}
      {seleccionado && <Etiqueta x={etiqueta.x} y={etiqueta.y} texto={nombre} />}
    </g>
  );
}

// ---------- Escena ----------
const PUESTOS = [
  { gx: 4.6, gy: 1.4 },
  { gx: 7.6, gy: 1.4 },
  { gx: 11.2, gy: 3.2 },
  { gx: 11.6, gy: 7.6 },
  { gx: 4.6, gy: 4.2 },
  { gx: 11.2, gy: 9.2 },
];
const ROPA = ["#0f766e", "#7c3aed", "#2563eb", "#b45309", "#be185d", "#4d7c0f"];
const PELO = ["#3f2d20", "#111827", "#7c2d12", "#1f2937", "#57534e", "#292524"];

export default function Escena({
  fichas,
  estados,
  orquestador,
  sinLeer,
  entregables,
  encargosEnMuro,
  seleccion,
  alSeleccionar,
}: {
  fichas: FichaVista[];
  estados: EstadosEscena;
  orquestador: EstadoOrquestador;
  sinLeer: number;
  entregables: number;
  encargosEnMuro: number;
  seleccion: Seleccion | null;
  alSeleccionar: (s: Seleccion) => void;
}) {
  const es = (s: Seleccion) =>
    seleccion?.tipo === s.tipo && (s.tipo !== "agente" || (seleccion.tipo === "agente" && seleccion.id === s.id));

  const baldosas = [];
  for (let gx = 0; gx < ANCHO; gx++) {
    for (let gy = 0; gy < FONDO; gy++) {
      baldosas.push(
        <polygon
          key={`${gx}-${gy}`}
          points={pts(iso(gx, gy), iso(gx + 1, gy), iso(gx + 1, gy + 1), iso(gx, gy + 1))}
          fill={(gx + gy) % 2 === 0 ? "#efe4d0" : "#e6d8bf"}
        />,
      );
    }
  }

  const izq = iso(0, FONDO);
  const der = iso(ANCHO, 0);
  const abajo = iso(ANCHO, FONDO);
  const arriba = iso(0, 0);
  const minX = izq.x - 40;
  const anchoVista = der.x - izq.x + 80;
  const minY = arriba.y - 150;
  const altoVista = abajo.y - minY + 40;

  const orq = iso(7, 6);
  const revision = iso(8.5, 10.4);
  const carpetas = Math.min(estados.carpetasEnRevision, 3);

  return (
    <svg className="escena" viewBox={`${minX} ${minY} ${anchoVista} ${altoVista}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Oficina virtual en vista isométrica">
      {/* Losa y bordes */}
      <polygon points={pts(iso(0, FONDO), iso(ANCHO, FONDO), iso(ANCHO, FONDO, -14), iso(0, FONDO, -14))} fill="#d6c6a8" />
      <polygon points={pts(iso(ANCHO, 0), iso(ANCHO, FONDO), iso(ANCHO, FONDO, -14), iso(ANCHO, 0, -14))} fill="#c4b190" />
      {baldosas}

      {/* Paredes del fondo, con ventanales */}
      <polygon points={pts(iso(0, 0), iso(0, FONDO), iso(0, FONDO, 110), iso(0, 0, 110))} fill="#f1f5f9" />
      <polygon points={pts(iso(0, 0), iso(ANCHO, 0), iso(ANCHO, 0, 110), iso(0, 0, 110))} fill="#f8fafc" />
      {[2, 6].map((g) => (
        <polygon key={`vi${g}`} points={pts(iso(0, g, 30), iso(0, g + 3, 30), iso(0, g + 3, 95), iso(0, g, 95))} fill="#dbeafe" opacity={0.8} />
      ))}
      {[1.5, 5].map((g) => (
        <polygon key={`vd${g}`} points={pts(iso(g, 0, 30), iso(g + 2.6, 0, 30), iso(g + 2.6, 0, 95), iso(g, 0, 95))} fill="#dbeafe" opacity={0.8} />
      ))}

      {/* Muro de encargos (pared del fondo) */}
      <Interactivo nombre="Muro de encargos" seleccionado={es({ tipo: "muro" })} alSeleccionar={() => alSeleccionar({ tipo: "muro" })} etiqueta={iso(10.6, 0.4, 20)}>
        <polygon points={pts(iso(9, 0, 30), iso(12.6, 0, 30), iso(12.6, 0, 96), iso(9, 0, 96))} fill="#fef3c7" stroke="#d6b778" strokeWidth={2} />
        {Array.from({ length: Math.min(encargosEnMuro, 8) }).map((_, i) => {
          const g = 9.3 + (i % 4) * 0.82;
          const z = i < 4 ? 82 : 58;
          return <polygon key={i} points={pts(iso(g, 0, z), iso(g + 0.6, 0, z), iso(g + 0.6, 0, z - 18), iso(g, 0, z - 18))} fill="#ffffff" stroke="#e2e8f0" />;
        })}
      </Interactivo>

      {/* Puesto del Director */}
      <Interactivo nombre="Puesto del Director" seleccionado={es({ tipo: "director" })} alSeleccionar={() => alSeleccionar({ tipo: "director" })} etiqueta={iso(2.6, 3.4)}>
        <ellipse cx={iso(2.3, 2.4).x} cy={iso(2.3, 2.4).y} rx={70} ry={34} fill="rgba(20,184,166,0.10)" />
        <Caja gx={1.4} gy={1.6} w={2} d={1} h={24} {...MADERA} />
        <Personaje gx={2.5} gy={3.1} ropa="#0b1c30" pelo="#111827" estado={estados.carpetasEnRevision > 0 ? "Esperando a Ariel" : "En reposo"} />
      </Interactivo>
      <Planta gx={0.6} gy={4.4} />

      {/* Oficina de RR. HH. */}
      <Interactivo nombre="Oficina de RR. HH." seleccionado={es({ tipo: "rrhh" })} alSeleccionar={() => alSeleccionar({ tipo: "rrhh" })} etiqueta={iso(2.6, 9.6)}>
        <Caja gx={0.4} gy={7.2} w={0.8} d={1.6} h={56} arriba="#fbbf24" izq="#d97706" der="#b45309" />
        <Caja gx={1.8} gy={7.6} w={1.6} d={0.9} h={22} {...MADERA} />
        <Personaje gx={2.6} gy={9.2} ropa="#be123c" pelo="#7c2d12" estado={estados.rrhh} />
      </Interactivo>

      {/* Puestos de los agentes */}
      {fichas.slice(0, PUESTOS.length).map((f, i) => {
        const p = PUESTOS[i];
        const estado = estados.agentes[f.id] ?? "En reposo";
        return (
          <Interactivo
            key={f.id}
            nombre={`${f.nombre} · ${f.proveedor}`}
            seleccionado={es({ tipo: "agente", id: f.id })}
            alSeleccionar={() => alSeleccionar({ tipo: "agente", id: f.id })}
            etiqueta={iso(p.gx + 0.8, p.gy + 2.1)}
          >
            <Escritorio gx={p.gx} gy={p.gy} encendido={estado === "Analizando"} />
            <Personaje
              gx={p.gx + 0.8}
              gy={p.gy + 1.5}
              ropa={ROPA[i]}
              pelo={PELO[i]}
              estado={estado}
              destino={estados.entregando.includes(f.id) ? { gx: 7.2 + (i % 3) * 0.8, gy: 9.3 } : undefined}
            />
          </Interactivo>
        );
      })}

      {/* Mesa del Orquestador */}
      <Interactivo nombre="Mesa del Orquestador" seleccionado={es({ tipo: "orquestador" })} alSeleccionar={() => alSeleccionar({ tipo: "orquestador" })} etiqueta={{ x: orq.x, y: orq.y + 44 }}>
        <ellipse cx={orq.x} cy={orq.y} rx={96} ry={48} fill="rgba(20,184,166,0.08)" stroke="#14b8a6" strokeDasharray="6 6" />
        <ellipse cx={orq.x} cy={orq.y + 8} rx={52} ry={26} fill="#bfae8e" />
        <ellipse cx={orq.x} cy={orq.y} rx={52} ry={26} fill="#e9dcc3" />
        <ellipse cx={orq.x} cy={orq.y} rx={18} ry={9} fill="#99f6e4" className={ACTIVO.has(orquestador.estado) ? "nucleo activo" : "nucleo"} />
        {/* Entregables del encargo: un documento por archivo, hasta tres. */}
        {Array.from({ length: Math.min(entregables, 3) }).map((_, i) => (
          <Caja key={`doc${i}`} gx={7.2 + i * 0.12} gy={6.1 - i * 0.12} w={0.5} d={0.65} h={2} z={24 + i * 2} arriba="#ffffff" izq="#cbd5e1" der="#94a3b8" />
        ))}
        {sinLeer > 0 && <Sobre x={orq.x - 30} y={orq.y - 6} n={sinLeer} />}
        <Personaje gx={6.3} gy={5.2} ropa="#0f766e" pelo="#334155" estado={orquestador.estado} />
        {orquestador.dice && <Dialogo x={iso(6.3, 5.2).x} y={iso(6.3, 5.2).y - 74} texto={orquestador.dice} />}
      </Interactivo>

      {/* Carta de Ariel en camino: solo justo después de enviar un mensaje. */}
      {orquestador.cartaEnVuelo && (
        <g key={orquestador.cartaEnVuelo} className="carta" aria-hidden>
          <Sobre x={0} y={0} n={0} />
          <animateMotion
            dur="1.6s"
            fill="freeze"
            path={`M${iso(2.5, 3.1).x},${iso(2.5, 3.1).y - 40} Q${(iso(2.5, 3.1).x + orq.x) / 2},${Math.min(iso(2.5, 3.1).y, orq.y) - 120} ${orq.x - 30},${orq.y - 6}`}
          />
        </g>
      )}

      {/* Mesa de revisión */}
      <Interactivo nombre="Mesa de revisión" seleccionado={es({ tipo: "revision" })} alSeleccionar={() => alSeleccionar({ tipo: "revision" })} etiqueta={{ x: revision.x, y: revision.y + 40 }}>
        <ellipse cx={revision.x} cy={revision.y + 6} rx={110} ry={52} fill={carpetas ? "rgba(245,158,11,0.12)" : "rgba(148,163,184,0.10)"} stroke={carpetas ? "#f59e0b" : "transparent"} />
        <Caja gx={7} gy={9.6} w={3} d={1.4} h={24} {...BLANCO} />
        {Array.from({ length: carpetas }).map((_, i) => (
          <Caja key={i} gx={7.6 + i * 0.7} gy={10} w={0.55} d={0.7} h={4} z={24 + i * 2} arriba="#fcd34d" izq="#f59e0b" der="#d97706" />
        ))}
        {carpetas > 0 && <Globo x={revision.x} y={revision.y - 44} estado="Esperando a Ariel" />}
      </Interactivo>

      <Planta gx={13} gy={11} />
      <Planta gx={3.6} gy={11.4} />
    </svg>
  );
}
