# Brief para llevar la capa de juego al siguiente nivel (Google AI Studio u otro asistente externo)

Ejercicio propuesto por Ariel el 2026-11-06: ¿qué instrucciones y sugerencias se le darían a Google AI Studio para que use este repositorio, mejore el juego y las gráficas y lo lleve al siguiente nivel? Este documento tiene tres partes: cómo usarlo, el **prompt listo para pegar** y las recomendaciones técnicas que lo sustentan. No es un tramo numerado: según `AGENTS.md`, nada de esto se implementa hasta que Ariel lo convierta en tramo.

## 1. Cómo usarlo (para Ariel)

1. Dale a AI Studio el repositorio como permita en ese momento (conexión a GitHub, ZIP o pegando los archivos de la lista del prompt). No asumo qué opciones ofrece hoy; verifícalo en su pantalla.
2. Pega el prompt de la sección 2 y pídele **una etapa por vez**, nunca todo junto. Cada etapa debe volver como archivos o un parche más una lista de pruebas.
3. Trae el resultado a esta sesión. Aquí se revisa, se corren `npm test` y `npm run typecheck`, se compara con capturas y se integra en una rama. El asistente externo no hace merge a `main`.
4. Antes de la etapa 1, decide dos cosas: el motor gráfico (recomiendo PixiJS, ver sección 3) y si la etapa de Python (etapa 5) entra ahora o después.

## 2. Prompt para pegar

> Eres un ingeniero de juegos web senior. Vas a mejorar la capa de juego de un proyecto existente: una **oficina virtual isométrica** desde la que una persona (Ariel, ingeniero eléctrico) dirige a un equipo de agentes de IA. El juego es **simbólico**: la IA hace el trabajo real y la oficina solo lo representa. Tu objetivo es que se sienta como un juego potente y pulido, sin romper las reglas del proyecto ni inflar el gasto en IA.
>
> ### Lee primero (en este orden)
> `AGENTS.md`, `README.md`, `docs/00-product-philosophy.md`, `docs/01-office-experience.md`, `docs/07-arquitectura.md`, `docs/11-tramo-2.md`, `docs/design/DESIGN.md` y `docs/design/oficina-diurna/referencia.html` (más su `.png`). Luego el código de la escena: `packages/oficina-web/lib/escena.ts` (lógica pura que traduce el estado a estados visibles), `packages/oficina-web/lib/estado.ts`, `components/Escena.tsx` (la escena actual, en SVG), `components/Oficina.tsx`, `components/Chat.tsx` y `lib/espera.ts`. Resume lo que entendiste antes de escribir código.
>
> ### Reglas que no se negocian
> 1. **Cada animación corresponde a un evento registrado** en la tabla `eventos` (o a una fila de `mensajes`, `resultados`, `decisiones`). La escena no inventa actividad.
> 2. **No muestres porcentajes de avance, latencias ni métricas que el sistema no mida.** Los tokens y los costos sí se miden (`llamadas`, `resultados`), y se pueden mostrar.
> 3. **No presentes una simulación como si fuera real.** Si falta una credencial o un proveedor falla, la oficina muestra el estado, no un resultado inventado.
> 4. **La IA no vive en el navegador ni en el motor del juego.** El Orquestador es una sesión externa que actúa solo mediante `oficina-mcp`. No agregues llamadas a modelos desde el front ni claves en el cliente. Las claves viven solo en el servidor.
> 5. **Nada se emite sin la decisión de Ariel** (Aprobar / Devolver en la Mesa de revisión).
> 6. **Arte, personajes y mobiliario originales.** No recrees un juego existente (nombre, personajes, arte, música ni niveles), aunque lo renombres. La referencia visual es `docs/design/oficina-diurna/`.
> 7. **Interfaz en español**, accesible por toque, teclado y clic; respeta `prefers-reduced-motion`; nada depende de hover. Dispositivo principal: **tablet Android en horizontal**, 60 fps en un equipo de gama media; vista móvil simplificada.
> 8. **Cambios de base de datos solo con una migración nueva e idempotente** en `packages/oficina-mcp/src/esquema.ts`. No modifiques las existentes.
> 9. Mantén las pruebas en verde (`npm test`, `npm run typecheck`). Toda lógica nueva va en funciones puras con prueba; lo gráfico no debe contener reglas de negocio.
>
> ### Principio rector: más programación, menos IA
> Todo lo que pueda resolverse con código determinista debe hacerlo: máquinas de estado, coreografías, pathfinding, física simple, validadores, parsers, plantillas, cálculos. La IA solo entra donde hay juicio, ambigüedad o redacción, y **solo el Orquestador la invoca**. Tu trabajo es que la capa de juego consuma eventos y nunca dispare llamadas a IA. Si una idea de juego exige IA nueva, propónla por separado, con su costo estimado en tokens, sin implementarla.
>
> ### Qué quiero (por etapas; entrega solo la que te pida)
> **Etapa 1: motor y gráficos.** Reemplaza el renderizado SVG por un motor 2D en canvas/WebGL (recomendado: PixiJS v8; justifica si propones otro). Mantén `derivarEscena` y `derivarOrquestador` como fuente de estados. Atlas de sprites, iluminación diurna con sombras suaves, profundidad correcta (orden z isométrico), cámara con zoom y desplazamiento táctil, y carga diferida. Detrás de un indicador de funcionalidad para poder volver al SVG actual. Reglas de rendimiento: paquete inicial pequeño, presupuesto de dibujo por cuadro y modo de bajo consumo.
>
> **Etapa 2: coreografía por eventos.** Una cola de eventos con *cursor* (`desde_id`): la web pide solo los eventos nuevos, no el estado completo cada 1,5 s. Cada tipo de evento tiene un guion de animación determinista y de duración acotada (caminar con A* sobre una cuadrícula, sentarse, teclear, entregar la carpeta en la Mesa de revisión, sellar al aprobar). Al abrir la oficina tras una ausencia, **avanza rápido hasta el estado actual** en lugar de repetir toda la historia. Los guiones deben ser idempotentes y tener prueba con flujos de eventos de ejemplo.
>
> **Etapa 3: sensación de juego (*game feel*).** Transiciones y rebotes, partículas sobrias, sonido ambiente y efectos con **silencio por defecto** y control visible, vibración opcional en la tablet, retroalimentación táctil clara al tocar un puesto. Nada que distraiga ni que parezca informar de algo que no ocurrió.
>
> **Etapa 4: progresión basada en datos reales.** Lo simbólico se apoya en registros verificables, no en puntos decorativos: un puesto nuevo aparece cuando se configura un proveedor real; la antigüedad de un agente sale de sus resultados aprobados; la oficina muestra el «expediente» de Ariel que se completa con reglas, plantillas y criterios guardados en la biblioteca (ver `docs/09-tramos-futuros.md`). Cada logro apunta a las filas que lo justifican. Propón primero la lista de logros y qué filas los respaldan, antes de implementarlos.
>
> **Etapa 5: herramientas en Python** (carpeta `tools/`, fuera de la app web): (a) canalización de recursos: generar o empaquetar atlas de sprites desde imágenes fuente; (b) generador de **flujos de eventos de prueba** para ensayar coreografías y el modo de avance rápido; (c) **motor de informes determinista**: plantillas de Word/Excel más datos produce el entregable sin gastar tokens (por ejemplo `docxtpl`/`python-docx` y `openpyxl`); la IA solo redacta las secciones narrativas. Cada herramienta con README y una prueba.
>
> ### Cómo trabajar
> - Antes de cada etapa: un plan corto, los archivos que tocarás y cómo verificarás. Después: archivos o parche completos, las pruebas que corriste y qué **no** pudiste verificar.
> - No reescribas lo que funciona sin motivo: el buzón, el chat, el panel de gasto, las decisiones y el indicador de espera ya existen y tienen pruebas.
> - No inventes datos ni resultados. Si algo del repositorio no está claro, pregunta en lugar de suponer.
> - Entrega cambios pequeños y revisables; nunca toques `main`.

## 3. Recomendaciones técnicas (para quien revise lo que devuelva AI Studio)

**Motor.** Recomiendo **PixiJS** sobre Phaser, Three.js o un motor nativo (Unity/Godot). La oficina ya es una web instalable en la tablet y se despliega en Vercel; un motor 2D de WebGL da sprites, filtros y rendimiento sin cambiar de plataforma. Phaser incluye más cosas (física, escenas) que aquí no se necesitan. Three.js con cámara ortográfica sirve si se quiere dar el salto a 3D más adelante, y `docs/01-office-experience.md` ya pide que ese salto no obligue a reescribir la lógica, razón por la que `derivarEscena` debe seguir separada del dibujo.

**Python: dónde sí y dónde no.** El juego en el navegador tiene que ser TypeScript. Python rinde fuera del navegador: canalización de recursos, simulación de eventos para pruebas y, sobre todo, **generación determinista de entregables** (Word, Excel, PDF), que es donde más tokens se ahorran. Los cálculos eléctricos ya van por scripts deterministas según `AGENTS.md`; el motor de informes es la extensión natural.

**Menos IA, concretamente.** Orden de preferencia para cualquier función nueva: (1) código y plantillas; (2) código con una regla configurable; (3) un agente por API barato con instrucción cerrada; (4) el Orquestador. El contador de gasto ya muestra los tokens reales, así que se puede medir si una etapa reduce las llamadas.

**Eventos, no sondeo.** Hoy la web pide el estado completo cada 1,5 s. Con un cursor de eventos (`GET /api/eventos?desde=ID`) el tráfico baja y la coreografía se vuelve natural. En Vercel conviene empezar con ese sondeo incremental; pasar a SSE o WebSocket es una mejora posterior si hace falta.

**Honestidad visual.** Una animación puede exagerar el movimiento, pero no la información: el personaje puede caminar a la Mesa de revisión de forma vistosa, y esa animación solo se dispara cuando existe el evento `resultado_entregado`. El panel de actividad muestra notas cortas de lo que hace el Orquestador (herramienta `avisar_progreso`), nunca su razonamiento privado ni porcentajes.

**Riesgos a vigilar al revisar.**
- Que el motor nuevo traiga reglas de negocio dentro del dibujo. Deben quedar en `lib/`.
- Que alguna idea agregue una llamada a IA desde el front.
- Rendimiento en la tablet real: medirlo allí, no en el escritorio.
- Peso de los recursos: el almacén gratuito de archivos tiene 1 GB y las fotos de campo ya lo consumen.
- Logros que no tengan filas que los respalden.
