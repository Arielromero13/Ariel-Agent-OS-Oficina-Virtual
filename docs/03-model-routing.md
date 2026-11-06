# Selección de modelos y conectores

## El Orquestador es la sesión nativa

El Orquestador no es un servicio que la app llama. Es la sesión de agente de codificación donde Ariel abre este repositorio. Sus instrucciones viven en `AGENTS.md` (leído por Codex) y `CLAUDE.md` (leído por Claude Code, que remite a `AGENTS.md`), y sus herramientas las expone el servidor `oficina-mcp` (ver `07-arquitectura.md`).

| Entorno de ejecución | Modelo del Orquestador | Autenticación |
|---|---|---|
| Claude Code (terminal o nube) | Claude | Sesión oficial de Claude Code de Ariel. |
| Codex (CLI o nube) | ChatGPT | Sesión oficial de Codex con la cuenta ChatGPT de Ariel. |

Las instrucciones y herramientas son las mismas en ambos entornos. Cambiar de orquestador significa abrir el repositorio en el otro entorno, no modificar código.

Restricciones:

- La app no extrae, copia ni reutiliza tokens de sesión de Claude Code ni de Codex. Las suscripciones se usan solo a través de sus herramientas oficiales.
- Una suscripción de chat (ChatGPT Plus, plan de Claude) no equivale a acceso por API. La app no lo asume.
- El modelo que se muestra en la oficina es el que la sesión reporta, no un valor fijo en la interfaz.

Google AI Studio y Gemini quedaron fuera del alcance del proyecto.

## Agentes por API

Los agentes de tarea se ejecutan mediante APIs de pago con modelos capaces, normalmente de un nivel inferior al del Orquestador. El diseño parte de que un Orquestador fuerte compensa esa diferencia con instrucciones específicas y con revisión de cada resultado.

El servidor `oficina-mcp` implementa un adaptador por tipo de API. El primero es compatible con el formato de OpenAI, que cubre Qwen (DashScope), DeepSeek y la mayoría de los proveedores disponibles. Cada ficha de agente indica proveedor y modelo; cambiar el cerebro de un agente es cambiar ese campo.

Cada invocación registra proveedor, modelo, estado, hora, tokens reportados por el proveedor y el agente que la pidió.

## Relevo nativo

Cuando una llamada por API falla por cuota agotada, saldo, límite de tasa o proveedor no configurado, `oficina-mcp` no cambia de proveedor por su cuenta. Devuelve al Orquestador un estado explícito (`sin_cuota`, `no_configurado`, `error`, `timeout`).

El Orquestador puede entonces ejecutar la subtarea con un subagente propio de la sesión nativa. Ese resultado queda registrado como `relevo_nativo`, con el proveedor original y el motivo. La oficina lo muestra como tal.

El relevo nativo está permitido por defecto porque mantiene los datos en el proveedor que ya atiende el encargo. Puede desactivarse por encargo.

## Respaldo nativo por falta de clave

Si un proveedor no tiene clave configurada, sus fichas no quedan inactivas: se ejecutan como subagentes de la sesión nativa (Claude en Claude Code; el agente de Codex si el Orquestador es Codex). Es una configuración declarada, no un cambio de proveedor ante un fallo:

- Está activo por defecto. `OFICINA_RESPALDO_NATIVO=0` en el entorno de `oficina-mcp` lo apaga y el proveedor sin clave vuelve a quedar No configurado.
- Solo cubre la falta de clave. Con clave, un fallo (`sin_cuota`, `error`, `timeout`) sigue devolviendo el estado como antes.
- `oficina-mcp` no llama a ningún modelo: `despachar` devuelve `resolver_en_sesion` con las instrucciones de la ficha y la tarea. El Orquestador lanza el subagente con las herramientas oficiales de su sesión y registra la respuesta con `registrar_resultado` (motivo `sin_clave`). No se usan tokens de sesión fuera de esas herramientas.
- Respeta la marca del encargo: si el relevo nativo está desactivado, la ficha sin clave no se acepta en el plan.
- Como el subagente no sale de la sesión nativa, puede trabajar en un encargo `interno`; las fichas por API siguen excluidas de esos encargos.
- El resultado queda registrado como relevo nativo y marcado para revisión de Ariel.

## Reparto de trabajo

- Cálculos numéricos: scripts deterministas, nunca un modelo de lenguaje.
- Agentes por API: extracción, borradores, consulta de normas públicas, tareas de volumen.
- Orquestador (nativo): plan, instrucciones a cada agente, revisión de resultados e integración final.
- Un agente no revisa su propio trabajo. Si el Orquestador produjo una parte por relevo nativo, la revisión de esa parte queda marcada para Ariel.

## Fallos y configuración

- Un proveedor sin clave se cubre con respaldo nativo (ver arriba). Solo con el respaldo apagado aparece como No configurado y el Orquestador no le asigna tareas.
- Un error, límite de cuota o timeout aparece como tal, con la acción necesaria.
- Ningún texto de resultado se genera sin una llamada real detrás. No existen textos de respaldo prefabricados.
- Un modo demostración, si existe, se identifica permanentemente como Demo y usa datos ficticios.

## Protección de datos

En la fase de validación se trabaja con datos sin información identificable (anonimizados o, como en el encargo de calidad de energía, numéricos sin planta, propietario ni ubicación). Cada encargo tiene una marca de sensibilidad; los encargos marcados como internos no se envían a APIs externas y se resuelven en la sesión nativa.

Las claves de API viven en variables de entorno del servidor `oficina-mcp` o en los secretos del entorno de ejecución. Nunca en el cliente web ni en Git.
