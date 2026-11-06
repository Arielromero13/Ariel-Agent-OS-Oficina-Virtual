# Tramo 2: conversación, archivos, entregables y gasto

Pedido por Ariel el 2026-11-06, después de la prueba de humo del tramo 1. Retoma de `07-arquitectura.md` el "buzón que el Orquestador lee con `oficina-mcp`".

## Incluye

- **Buzón.** Ariel escribe al Orquestador y adjunta archivos desde la oficina web. Los mensajes quedan en el estado compartido (`mensajes`, `archivos`); el Orquestador los lee con `leer_buzon`, baja adjuntos con `descargar_archivo` y contesta con `responder_a_ariel`.
- **Entregables.** El Orquestador genera Word, PDF, Excel u otros formatos en su sesión y los entrega como adjuntos; Ariel los descarga desde la conversación.
- **Archivos en Vercel Blob, privados.** El navegador sube directo al almacén (`/api/subir` solo emite el permiso con sesión iniciada); la web sirve las descargas tras comprobar la sesión (`/api/archivos/[id]`). Las fotos se reducen en el navegador antes de subirlas.
- **Presencia.** Cada llamada a `oficina-mcp` registra un latido. La web muestra el último contacto y, si pasaron más de 20 minutos, dice que no hay sesión abierta. No afirma que el Orquestador esté "en línea".
- **Escena.** El Orquestador muestra un sobre con los mensajes sin leer, "Leyó tus mensajes" tras `leer_buzon`, un globo de diálogo con el inicio de su respuesta durante 90 s y documentos sobre la mesa por cada entregable del encargo. Al enviar, una carta vuela del puesto del Director a la mesa. Todo sale de filas registradas.
- **Contador de tokens y gasto.** Tokens por API (tabla `llamadas`) y de la sesión nativa (`resultados.tokens_*`). Muestra lo pagado, el equivalente por API del trabajo de la sesión y, con un desplegable, cuánto habría costado con cualquier modelo de la tabla. Si la sesión solo reporta el total, el costo se muestra como rango.
- **Tabla de precios** (`packages/oficina-mcp/src/precios.ts`): Anthropic, Qwen, DeepSeek, Kimi, MiniMax, Gemini, OpenAI y Mistral, con la página oficial de cada precio y la fecha de consulta. Llama queda sin cifra porque Meta no la vende por API propia. Una tarea programada semanal la revisa y propone cambios por PR.
- **Botón «Copiar "revisa el buzón"»** cuando hay mensajes sin leer y no hay sesión reciente, para pegarlo en Claude Code.
- **Vista previa** de PDF e imágenes dentro de la conversación (en línea y aislada con `sandbox`); el resto de formatos se descarga.
- **Entrega animada:** el agente que entrega un resultado camina a la Mesa de revisión durante 8 s, a partir del evento registrado.
- **Costo por encargo** en el Muro de encargos: tokens y lo pagado, más una nota si hubo trabajo de la sesión nativa.
- **Plantillas en la biblioteca:** `proponer_recurso` (tipo `plantilla`, con su archivo) crea la decisión de Ariel; solo se guarda con su aprobación y el Orquestador las busca antes de generar un entregable. La oficina las lista en RR. HH. con su descarga.
- La web avisa «Actualizar base de datos» si falta una migración, en lugar de fallar.
- Las decisiones de un encargo cerrado o emitido ya no se pueden responder.
- Las fichas de DeepSeek pasan de `deepseek-chat` (que ya no aparece en la página oficial) a `deepseek-flash`.

## No incluye

- Chat en tiempo real sin sesión abierta: llega con el Orquestador por API (`09-tramos-futuros.md`).
- Conectores para Kimi, MiniMax, Gemini, OpenAI o Mistral: por ahora solo están en la tabla de precios. Agregar uno es una entrada en `proveedores.ts`, su clave y una ficha.
- Guardar entregables en Google Drive desde la web. El Orquestador puede copiarlos a Drive desde su sesión si Ariel se lo pide y la sesión tiene el conector.

## Criterios de aceptación

1. Un mensaje enviado desde la tablet aparece en `leer_buzon` una sola vez, con sus adjuntos descargables en la sesión.
2. Un entregable enviado con `responder_a_ariel` se descarga desde la web solo con sesión iniciada.
3. El contador no muestra ningún costo sin tokens registrados ni precio con fuente.
4. Cada animación del Orquestador corresponde a un mensaje, una lectura o una respuesta registrados.
