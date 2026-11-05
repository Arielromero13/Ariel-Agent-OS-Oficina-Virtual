# Tramos futuros

Ideas aprobadas por Ariel para después del tramo 1. No tienen número ni orden de ejecución fijo; se convierten en tramo numerado cuando el anterior cumpla sus criterios de aceptación. Ninguna de estas ideas entra en el alcance del tramo 1.

## Orquestador por API y servidor siempre activo

Hoy el Orquestador es la sesión nativa (Claude Code o Codex) y solo trabaja mientras Ariel la tiene abierta. En un tramo futuro el Orquestador podrá correr por API (Sonnet, Haiku, Opus u otro modelo equivalente), alojado en un VPS siempre encendido. La oficina web y la app móvil quedarían disponibles desde cualquier lugar, y un encargo enviado desde campo podría procesarse sin que nadie abra una sesión.

El Orquestador por API se paga por uso y no entra en ninguna suscripción. El modo nativo se mantiene: el trabajo ordinario se hace con la suscripción de Ariel sin gasto adicional, y el Orquestador por API queda para cuando Ariel está fuera de la computadora (en casa, en remoto, de camino o ante una solicitud urgente).

En el VPS vivirían `oficina-mcp`, el Orquestador por API, la base de datos y el almacenamiento de archivos. La oficina web puede seguir en Vercel o servirse desde el mismo VPS.

## App Android de captura en campo

Una app Android, con la misma estética de juego de la oficina, para trabajos de campo con plantilla ya definida: supervisión de obras, mediciones de puesta a tierra y similares. El flujo es punto por punto: Ariel elige la plantilla, toma la foto dentro de la app, indica a qué punto corresponde, registra el valor y su apreciación técnica, y pasa al siguiente. Al terminar, la captura se convierte en un encargo para la oficina, que prepara el informe mientras Ariel regresa.

Requisito obligatorio: funcionamiento sin cobertura. Muchos sitios de trabajo no tienen señal celular, así que la app guarda cada captura en el teléfono (foto, valor, etiqueta del punto, comentario, fecha y hora) y la envía sola, en orden, cuando vuelve la conexión. La app muestra en todo momento qué capturas están pendientes de envío. Una captura no se borra del teléfono hasta que el servidor confirma que la recibió completa.

Esta idea retoma la captura por Telegram explorada en `Ariel_OS_v1.0`, con interfaz propia y modo sin conexión.

## Wizard inicial del Orquestador

Al abrir la oficina por primera vez (web o Android), el Orquestador conduce una guía de inicio: pregunta qué quiere hacer el usuario e indaga de forma dinámica en qué consiste su trabajo. Con esas respuestas propone los agentes fijos de la oficina y los subagentes que probablemente hará falta crear bajo demanda.

El wizard propone; no crea. El equipo solo se da de alta cuando el usuario lo aprueba, igual que cualquier recurso de la biblioteca.

## Conocimiento progresivo del usuario como mecánica de juego

En su etapa inicial, el objetivo explícito del Orquestador y de los agentes iniciales es conocer al usuario y ayudarlo. La oficina lleva una bitácora del trabajo para perfilar al usuario, entender cómo trabaja, anticipar lo que va a necesitar y mejorar los entregables presentes y futuros. El wizard inicial deja de ser un paso aislado y se convierte en el comienzo de un proceso continuo.

La mecánica de juego se apoya en ese aprendizaje real. La oficina y sus agentes suben de nivel cuando el sistema registra conocimiento verificable del usuario (reglas, criterios, plantillas, preferencias de formato), no por puntos decorativos. En la escena puede verse como un expediente del usuario que se va completando y como experiencia acumulada de cada agente. Cumple la regla general de no mostrar métricas que el sistema no mida: cada nivel corresponde a entradas concretas de la bitácora.

Principios de diseño:

1. Aprender del trabajo, no del interrogatorio. El wizard inicial es corto (qué hace el usuario y qué entregables produce). El perfil crece con cada encargo: plantillas usadas, correcciones hechas y criterios aplicados. Cada corrección útil se registra como regla, en línea con lo descrito en "Curva de aprendizaje y métricas".
2. Perfil visible y editable. Toda conclusión del sistema sobre el usuario ("prefiere X", "suele aplicar el criterio Y") se muestra en la oficina con su origen en la bitácora, y el usuario puede confirmarla, corregirla o borrarla. El sistema no actúa sobre suposiciones ocultas.
3. Bitácora barata y perfil compacto. La bitácora es un registro de bajo costo. Cada cierto tiempo (por ejemplo, semanal), el Orquestador la resume en un perfil compacto, y los agentes por API leen solo ese perfil y lo relevante para el encargo actual, nunca la bitácora completa. Así el gasto en APIs no crece con el historial.
4. Gestión de expectativas. Anticipar requiere historial, así que durante los primeros meses la oficina ayuda más a recordar que a prever. El Orquestador lo dice al usuario de forma explícita y repetida al inicio: en el wizard, en los primeros encargos y cuando el usuario corrija algo que la oficina todavía no sabía. Explica que está en fase de aprendizaje, que cada corrección la mejora y qué ha aprendido hasta ese momento, para que el usuario no se decepcione ni se canse.

## Recarga de saldo de las APIs desde la app

Para que la experiencia sea fluida, la oficina web y la app móvil deberían permitir ver el saldo de cada proveedor y recargarlo sin salir a otra página. Punto a verificar antes de diseñarlo: si Qwen (DashScope) y DeepSeek ofrecen consulta de saldo y recarga por API o solo desde su consola web. Si la recarga no es posible por API, la app muestra el saldo cuando el proveedor lo permita y enlaza directamente a la página de recarga.

## Uso personal, no multiusuario

Se descarta el modo multiusuario. Cada persona que instale la app tiene su propia oficina, sus propias claves y su propio estado. No hace falta inicio de sesión compartido, permisos entre usuarios ni separación de encargos por usuario dentro de una misma base de datos.

## Almacenamiento y alojamiento

La oficina sube fotos, comentarios y referencias técnicas a una base de datos con almacenamiento de archivos. Referencias consultadas el 5 de noviembre de 2026, a reconfirmar al momento de decidir:

| Opción | Almacenamiento | Costo mensual | Observaciones |
|---|---|---|---|
| Vercel Hobby (gratis) | 1 GB de Blob, 10 GB de transferencia | 0 USD | Solo uso personal no comercial. Al agotar el límite, la función queda bloqueada hasta el siguiente ciclo de 30 días. |
| VPS económico (Contabo, Hetzner u otro) | 40 a 100 GB | 5 a 7 USD | Aloja servidor, base de datos y archivos. Requiere administración propia (actualizaciones, respaldos, HTTPS). |

Criterio: Vercel gratis durante la validación; migrar al VPS cuando el volumen de fotos lo exija o cuando entre el Orquestador siempre activo. Con fotos de campo, 1 GB se llena rápido, así que la app debe comprimir las imágenes antes de subirlas.

## Costos y análisis económico

Las APIs de los agentes son de pago, no gratuitas. Presupuesto de prueba: 10 USD para Qwen y 10 USD para DeepSeek, para comprobar si alcanzan un mes completo de uso real.

Estimación preliminar, no medida: 10 a 20 USD mensuales en APIs mientras la oficina esté en Vercel gratis; 15 a 27 USD mensuales adicionales con VPS y APIs. La suscripción de Claude ya existente no se cuenta como costo nuevo. El Orquestador por API añadiría un costo variable que se estimará cuando se mida el consumo.

El análisis económico separa tres cosas para no mezclarlas:

1. Horas ahorradas: beneficio para la empresa, que obtiene más trabajo con las mismas horas pagadas, y para Ariel, que recupera tiempo para su familia.
2. Costo en efectivo: lo que Ariel paga cada mes en APIs, VPS y Orquestador por API.
3. Valor de portafolio: el proyecto demuestra capacidad profesional y se evalúa como inversión, no como gasto operativo.

## Curva de aprendizaje y métricas

La calidad de los entregables mejora a medida que los agentes se ajustan y la biblioteca acumula reglas y ejemplos. El primer mes exige una inversión fuerte de corrección (del orden de 25 iteraciones, con ajustes y resubida de plantillas). Para saber cuándo se llega al punto estable:

- Se pule un tipo de entregable a la vez, empezando por el informe de puesta a tierra.
- Cada corrección útil se guarda en el repositorio como regla o ejemplo, para que el mismo error no se repita.
- Cada encargo registra el gasto en APIs y los minutos de corrección que necesitó Ariel.
- Si tras cuatro o cinco entregables del mismo tipo los minutos de corrección no bajan, el problema es de diseño y se revisa la ficha o la plantilla.

## Orden natural sugerido

1. Verificar que Claude Code en la nube cargue `oficina-mcp` y tenga salida de red hacia las APIs y la base de datos.
2. Completar el tramo 1 con el encargo de calidad de energía.
3. Aprobar y devolver encargos desde la oficina web en la tablet.
4. Wizard inicial del Orquestador y conocimiento progresivo del usuario.
5. VPS y Orquestador por API.
6. App Android con captura sin conexión.
7. Saldo y recarga de APIs desde la app.

## Riesgos identificados

- Calidad delegada: si el trabajo técnico de fondo queda en agentes de nivel inferior, el entregable pierde rigor. Se mitiga con cálculos en scripts deterministas y revisión siempre nativa (ver `03-model-routing.md`).
- Sincronización sin conexión: fotos pesadas, envíos interrumpidos y orden de captura. Se mitiga con compresión, reintentos, confirmación del servidor por captura y fecha y hora tomadas en el teléfono.
- Límites del plan gratuito: al agotar el Blob de Vercel la carga se bloquea sin aviso para el usuario de la app. La app debe mostrar el estado del almacenamiento.
- Costo del Orquestador por API: sin medición previa puede superar la estimación. Se mide durante el primer mes antes de dejarlo siempre activo.
- Perfil del usuario: si el perfil se arma con inferencias que el usuario no ve, la oficina actúa sobre supuestos erróneos. Se mitiga con perfil visible y editable, con el origen de cada conclusión en la bitácora.
- Decepción temprana: si la oficina promete anticipar antes de tener historial, el usuario la abandona. Se mitiga con el aviso explícito y repetido del Orquestador sobre la fase de aprendizaje.
- Administración del VPS: actualizaciones de seguridad, respaldos de la base de datos y certificados HTTPS pasan a ser responsabilidad propia.
