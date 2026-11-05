# Alcance de la primera versión

## Objetivo

Construir una oficina virtual web que permita a Ariel abrir un encargo, ver al Orquestador formar el equipo, enviar trabajo real a Qwen y DeepSeek, supervisar los resultados y guardar recursos seleccionados para reutilizarlos.

## Debe funcionar en el MVP

- Escena de oficina isométrica 2D o 2.5D interactiva y responsive.
- Avatar del Director, mesa del Orquestador, puesto de RR. HH. y estaciones que reflejan actividad real.
- Entrada de encargos en lenguaje natural y carga de documentos, hojas de cálculo, imágenes u otros archivos aceptados.
- Plan breve del Orquestador, editable antes de ejecutar en tareas de mayor impacto.
- Equipo bajo demanda con perfiles predefinidos y capacidad de crear un agente temporal.
- Biblioteca inicial de agentes, herramientas y scripts; búsqueda y recuperación selectiva como colaboradores.
- Gemini nativo como Orquestador en AI Studio; Codex nativo como Orquestador en Codex si el adaptador está disponible.
- Qwen y DeepSeek como conectores reales de agentes especialistas, configurables en servidor.
- Conversación o instrucciones directas al agente del encargo, estado y panel de actividad.
- Persistencia local del usuario, exportación de encargos y continuidad de la biblioteca.
- Entregables descargables y registro del origen de resultados.
- Aprobación humana para acciones externas.

## Primeras recetas de trabajo

El informe P.A.T. de `Ariel_OS_v1.0` puede cargarse como una receta reutilizable. El sistema debe permitir nuevas tareas de ingeniería mediante planes específicos del Orquestador; no limitar el producto a puesta a tierra ni a una secuencia de siete agentes.

Cuando una tarea dependa de un método, criterio o norma que no aparece en el expediente o la biblioteca, el sistema pregunta o marca esa parte pendiente. No inventa un procedimiento para completar una pantalla.

## Posponer

- Mundo 3D completo o multiusuario persistente.
- Agentes siempre activos, memoria de conversación completa o reuniones automáticas en segundo plano.
- Gestión de costos corporativa avanzada, facturación y presupuestos complejos.
- Telegram, voz, correo, Google Drive y sincronización entre múltiples usuarios.
- Ejecución autónoma de scripts sin autorización.
- Automatización completa de todos los dominios eléctricos antes de definir y validar sus métodos.

## Condición de salida

Un usuario puede abrir la app, crear una tarea real, ver el plan y los agentes en la oficina, ejecutar un análisis con proveedores configurados, revisar y descargar resultados, cerrar el encargo y decidir qué perfil o recurso guardar. Si falta una integración, la app la señala con claridad y no simula que se completó.
