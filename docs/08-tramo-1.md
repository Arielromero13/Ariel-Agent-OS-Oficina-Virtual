# Tramo 1: ciclo esencial funcionando

## Objetivo

Demostrar con un encargo real, con datos sin información identificable, que el ciclo completo funciona: encargo → plan → equipo → ejecución por API → revisión nativa → decisión de Ariel → cierre y guardado. La oficina muestra todo el ciclo a partir de eventos reales.

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
- Notificaciones, integración con correo o Drive.
- Las ideas de `09-tramos-futuros.md` (Orquestador por API, VPS, app Android, wizard inicial, recarga de saldo).
- Animaciones de desplazamiento libre de los personajes más allá de los traslados entre zonas.

## Criterios de aceptación

1. Sin clave de DeepSeek configurada, su ficha aparece como No configurado en la oficina y no recibe llamadas por API. Si el encargo permite relevo nativo, el plan puede asignarle la tarea en modo relevo nativo: la resuelve la sesión del Orquestador (Claude Code o Codex) y queda registrada como tal. Con el relevo desactivado, el plan no le asigna tareas.
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

Análisis de calidad de energía a partir de datos numéricos medidos (valores eléctricos con encabezados de columna). Los datos no identifican planta, propietario ni ubicación, por lo que no requieren anonimización. Antes de cargarlos se revisa que los encabezados tampoco contengan nombres de equipos o instalaciones.

El encargo requiere al menos dos agentes y produce un informe revisable. Los cálculos (índices, armónicos, desbalance y similares) se hacen en scripts deterministas; los agentes por API extraen, redactan y consultan normas públicas; el Orquestador revisa e integra.

Cada ejecución registra el gasto en APIs y los minutos de corrección que necesitó Ariel, como línea base para el análisis económico de `09-tramos-futuros.md`. Presupuesto de prueba: 10 USD en Qwen y 10 USD en DeepSeek.
