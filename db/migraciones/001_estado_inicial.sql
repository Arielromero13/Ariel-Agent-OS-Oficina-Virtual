-- Estado compartido de la Oficina Virtual (tramo 1).
-- Lo escribe oficina-mcp; la oficina web lo lee y solo escribe decisiones de Ariel.

CREATE TABLE IF NOT EXISTS encargos (
  id              TEXT PRIMARY KEY,
  titulo          TEXT NOT NULL,
  descripcion     TEXT NOT NULL,
  -- 'externo' permite enviar a APIs de terceros; 'interno' solo sesión nativa.
  sensibilidad    TEXT NOT NULL CHECK (sensibilidad IN ('externo', 'interno')),
  relevo_nativo   BOOLEAN NOT NULL DEFAULT TRUE,
  estado          TEXT NOT NULL CHECK (estado IN ('abierto', 'en_curso', 'en_revision', 'emitido', 'cerrado')),
  version_actual  INTEGER NOT NULL DEFAULT 1,
  creado          TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cada cambio de objetivo, evidencia nueva o reapertura crea una versión; el historial no se sobrescribe.
CREATE TABLE IF NOT EXISTS encargo_versiones (
  id          TEXT PRIMARY KEY,
  encargo_id  TEXT NOT NULL REFERENCES encargos(id),
  version     INTEGER NOT NULL,
  motivo      TEXT NOT NULL,
  plan        JSONB,
  equipo      JSONB,
  creado      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (encargo_id, version)
);

CREATE TABLE IF NOT EXISTS encargo_archivos (
  id          TEXT PRIMARY KEY,
  encargo_id  TEXT NOT NULL REFERENCES encargos(id),
  nombre      TEXT NOT NULL,
  ubicacion   TEXT NOT NULL,
  creado      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fichas de agentes. Fuente de verdad: archivos en fichas/*.json; aquí se sincronizan para la oficina.
CREATE TABLE IF NOT EXISTS fichas (
  id            TEXT PRIMARY KEY,
  nombre        TEXT NOT NULL,
  especialidad  TEXT NOT NULL,
  resumen       TEXT NOT NULL,
  proveedor     TEXT NOT NULL,
  modelo        TEXT NOT NULL,
  contenido     JSONB NOT NULL,
  version       INTEGER NOT NULL DEFAULT 1,
  activa        BOOLEAN NOT NULL DEFAULT TRUE,
  actualizado   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Estado de configuración de cada proveedor, reportado por oficina-mcp (las claves nunca salen del servidor).
CREATE TABLE IF NOT EXISTS proveedores (
  id           TEXT PRIMARY KEY,
  configurado  BOOLEAN NOT NULL,
  actualizado  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Registro de cada invocación a un proveedor por API.
CREATE TABLE IF NOT EXISTS llamadas (
  id               TEXT PRIMARY KEY,
  encargo_id       TEXT NOT NULL REFERENCES encargos(id),
  ficha_id         TEXT NOT NULL,
  proveedor        TEXT NOT NULL,
  modelo           TEXT NOT NULL,
  estado           TEXT NOT NULL CHECK (estado IN ('ok', 'sin_cuota', 'no_configurado', 'error', 'timeout')),
  detalle          TEXT,
  tokens_entrada   INTEGER,
  tokens_salida    INTEGER,
  inicio           TIMESTAMPTZ NOT NULL,
  fin              TIMESTAMPTZ NOT NULL
);

-- Resultados visibles en la oficina. Todo resultado tiene una llamada real o es un relevo nativo registrado.
CREATE TABLE IF NOT EXISTS resultados (
  id                  TEXT PRIMARY KEY,
  encargo_id          TEXT NOT NULL REFERENCES encargos(id),
  version             INTEGER NOT NULL,
  ficha_id            TEXT NOT NULL,
  origen              TEXT NOT NULL CHECK (origen IN ('api', 'relevo_nativo')),
  llamada_id          TEXT REFERENCES llamadas(id),
  proveedor_original  TEXT,
  motivo_relevo       TEXT,
  modelo_nativo       TEXT,
  contenido           TEXT NOT NULL,
  creado              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (origen = 'api' AND llamada_id IS NOT NULL) OR
    (origen = 'relevo_nativo' AND proveedor_original IS NOT NULL AND motivo_relevo IS NOT NULL)
  )
);

-- Mesa de revisión.
CREATE TABLE IF NOT EXISTS decisiones (
  id            TEXT PRIMARY KEY,
  encargo_id    TEXT NOT NULL REFERENCES encargos(id),
  tipo          TEXT NOT NULL CHECK (tipo IN ('plan', 'resultado', 'emision', 'recurso')),
  pregunta      TEXT NOT NULL,
  estado        TEXT NOT NULL CHECK (estado IN ('pendiente', 'aprobada', 'devuelta')) DEFAULT 'pendiente',
  comentario    TEXT,
  decidido_en   TIMESTAMPTZ,
  -- 'web' (tablet) u 'orquestador' (Ariel respondió en la sesión nativa).
  decidido_via  TEXT CHECK (decidido_via IN ('web', 'orquestador')),
  creado        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Biblioteca: fichas, scripts y aprendizajes. Los candidatos solo pasan a 'guardado' con aprobación de Ariel.
CREATE TABLE IF NOT EXISTS biblioteca (
  id              TEXT PRIMARY KEY,
  tipo            TEXT NOT NULL CHECK (tipo IN ('ficha', 'script', 'aprendizaje')),
  titulo          TEXT NOT NULL,
  resumen         TEXT NOT NULL,
  contenido       TEXT NOT NULL,
  origen_encargo  TEXT REFERENCES encargos(id),
  estado          TEXT NOT NULL CHECK (estado IN ('candidato', 'guardado', 'descartado', 'desactivado')),
  decision_id     TEXT REFERENCES decisiones(id),
  version         INTEGER NOT NULL DEFAULT 1,
  creado          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Eventos: cada animación de la escena corresponde a una fila aquí.
CREATE TABLE IF NOT EXISTS eventos (
  id          BIGSERIAL PRIMARY KEY,
  encargo_id  TEXT REFERENCES encargos(id),
  tipo        TEXT NOT NULL,
  actor       TEXT NOT NULL,
  datos       JSONB NOT NULL DEFAULT '{}'::jsonb,
  creado      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS eventos_por_encargo ON eventos (encargo_id, id);
CREATE INDEX IF NOT EXISTS decisiones_pendientes ON decisiones (estado) WHERE estado = 'pendiente';
