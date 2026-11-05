# oficina-mcp

Servidor MCP (stdio) por el que el Orquestador nativo actúa sobre la oficina. Diseño en `docs/07-arquitectura.md`.

## Puesta en marcha

1. `npm install` en la raíz del repositorio.
2. Define `DATABASE_URL` y, si los tienes, `QWEN_API_KEY` y `DEEPSEEK_API_KEY` (ver `.env.example`).
3. `npm run migrar -w oficina-mcp` crea las tablas, sincroniza las fichas de `fichas/` y publica qué proveedores están configurados.
4. Claude Code carga el servidor desde `.mcp.json` al abrir el repositorio. En Codex se declara en `~/.codex/config.toml` con el mismo comando: `npx tsx packages/oficina-mcp/src/index.ts`.

Al arrancar, el servidor aplica las migraciones pendientes, sincroniza fichas y reporta proveedores, así que el paso 3 es opcional.

## Herramientas

`abrir_encargo`, `buscar_perfiles`, `proponer_plan`, `despachar`, `registrar_resultado`, `pedir_decision`, `consultar_decision`, `registrar_decision_de_ariel`, `cerrar_encargo`, `reabrir_encargo`, `guardar_recurso`, `estado_proveedores`.

Reglas aplicadas en el servidor, no en las instrucciones del Orquestador:

- Una ficha cuyo proveedor no tiene clave no entra en un plan.
- `despachar` devuelve el estado de fallo (`sin_cuota`, `no_configurado`, `error`, `timeout`) y nunca cambia de proveedor.
- Todo resultado tiene una llamada registrada o es un relevo nativo con proveedor original y motivo; la base de datos rechaza lo demás.
- Un encargo `interno` no se envía a APIs externas.
- `cerrar_encargo` en modo `emitir` exige una decisión de emisión aprobada por Ariel.
- `guardar_recurso` exige una decisión de recurso aprobada por Ariel.
- `registrar_decision_de_ariel` solo registra respuestas que Ariel dio explícitamente en la sesión.

## Pruebas

`npm test -w oficina-mcp` corre las pruebas contra Postgres en memoria (PGlite), con un proveedor simulado. Cubren los criterios de aceptación 1 a 6 de `docs/08-tramo-1.md`.

## Fichas

Las fichas viven en `fichas/*.json` y se editan como archivos. Campos obligatorios: `id`, `nombre`, `especialidad`, `resumen`, `proveedor` (`qwen` o `deepseek`), `modelo`, `instrucciones`. Cambiar el cerebro de un agente es cambiar `proveedor` y `modelo`.
