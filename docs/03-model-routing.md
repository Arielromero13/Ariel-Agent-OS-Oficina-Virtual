# Selección de modelos y conectores

## El Orquestador sigue el entorno

La lógica del Orquestador y los workflows permanece portable. El entorno entrega el modelo que lo ejecuta:

| Entorno | Modelo del Orquestador |
|---|---|
| Google AI Studio | Gemini nativo de la plataforma. |
| Codex | ChatGPT mediante el adaptador nativo de Codex CLI o Codex Cloud, cuando el runtime lo proporcione. |
| Web app independiente | Proveedor configurado explícitamente por el usuario. |

La app no puede asumir que una instalación web externa hereda credenciales de Codex o que ChatGPT Plus incluye acceso a la API de OpenAI. La detección del runtime debe usar configuración confiable, no el navegador o el nombre de la marca.

## Qwen y DeepSeek

Qwen y DeepSeek estarán disponibles como proveedores configurables para especialistas. El Orquestador puede elegir uno por tarea, perfil o costo/beneficio; una revisión independiente puede usar el otro cuando el riesgo lo justifique.

Las claves y llamadas se gestionan en el servidor. Cada invocación registra proveedor, modelo, estado, hora y consumo reportado cuando esté disponible. El usuario puede cambiar el modelo sin reescribir las instrucciones del agente.

## Fallos y configuración

- Un proveedor no configurado aparece como No configurado.
- Un error, límite de cuota o timeout aparece como Error o Pendiente, con una acción clara.
- No cambiar de proveedor sin mostrarlo y obtener autorización cuando implique enviar datos a otro servicio.
- No devolver textos de simulación como si fueran resultados reales.
- El modo de demostración, si existe, se identifica permanentemente como Demo y usa datos ficticios.

## Protección de datos

El navegador nunca recibe ni persiste las claves API. Las claves viven en secretos del backend. Antes de enviar archivos o contenido a un modelo externo, la interfaz indica a qué servicio se enviarán y solicita la autorización que Ariel defina para ese encargo.

Los conectores no escriben expedientes reales en GitHub ni los adjuntan automáticamente a correo, Drive o servicios externos. Cualquier distribución externa requiere una aprobación explícita.
