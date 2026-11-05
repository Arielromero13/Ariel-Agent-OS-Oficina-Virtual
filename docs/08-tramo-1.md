# Tramo 1: ciclo esencial funcionando

## Objetivo

Demostrar con un encargo real de datos anonimizados que el ciclo completo funciona: encargo → plan → equipo → ejecución por API → revisión nativa → decisión de Ariel → cierre y guardado. La oficina muestra todo el ciclo a partir de eventos reales.

## Incluye

- `oficina-mcp` con las herramientas de `07-arquitectura.md` y un adaptador compatible con OpenAI (Qwen y DeepSeek como primeros proveedores).
- Esquema del estado compartido: encargos, versiones, eventos, agentes, fichas, biblioteca, decisiones, llamadas.
- Catálogo inicial de RR. HH. con 3 a 5 fichas tomadas de los roles de `Ariel_OS_v1.0` como capacidades.
- Relevo nativo con registro explícito.
- `CLAUDE.md` y `AGENTS.md` con las instrucciones operativas del Orquestador: cómo planificar, cómo instruir a un agente de nivel inferior, cuándo pedir decisión, cómo revisar.
- Oficina web con la escena de `docs/design/oficina-diurna/` conectada a eventos: zonas, personajes con globos de estado, Mesa de revisión y panel lateral único con plan, conversación y acciones Aprobar / Devolver.
- Aprobación desde la oficina web o desde la sesión del Orquestador.

## No incluye

- Enviar instrucciones nuevas al Orquestador desde la web.
- Edición de fichas desde la interfaz (se editan como archivos en el repositorio).
- Multiusuario, notificaciones, integración con correo o Drive.
- Animaciones de desplazamiento libre de los personajes más allá de los traslados entre zonas.

## Criterios de aceptación

1. Sin clave de DeepSeek configurada, su ficha aparece como No configurado en la oficina y el plan no le asigna tareas.
2. Con una clave inválida o sin saldo, `despachar` devuelve el estado de fallo; si el Orquestador usa relevo nativo, la oficina lo muestra como Relevo nativo con el proveedor original y el motivo.
3. Cada texto de resultado visible en la oficina tiene una llamada registrada (proveedor, modelo, tokens, hora) o un registro de relevo nativo. No existe ningún texto de resultado prefabricado en el código.
4. Ningún encargo pasa a Emitido sin una decisión de Ariel registrada.
5. Un encargo cerrado puede reabrirse y conserva su historial y versiones.
6. Al cerrar, RR. HH. propone al menos un recurso candidato y solo se guarda si Ariel lo aprueba.
7. La escena refleja el estado real en menos de 3 segundos tras cada evento, en una tablet Android en horizontal.
8. Un mismo encargo de prueba completa el ciclo con Claude Code y con Codex como Orquestador, sin cambios de código.

## Ajustes sobre el diseño de referencia

- Los globos de estado son siempre visibles; los nombres de zona y de agente se muestran al tocar o al acercar.
- La Oficina de RR. HH. se desarrolla como zona completa (archivadores y fichas) y se anima cuando arma el equipo.
- "Devolver con comentarios" devuelve al Orquestador, que decide quién corrige.
- El chip del Orquestador muestra el modelo que reporta la sesión.
- No se muestran porcentajes de avance, latencias ni métricas que el sistema no mida.

## Encargo de prueba

Pendiente de definir por Ariel. Debe usar datos anonimizados, requerir al menos dos agentes y producir un entregable revisable.
