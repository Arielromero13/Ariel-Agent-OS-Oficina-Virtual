# Arquitectura

## Componentes

El sistema tiene cuatro piezas. Cada una puede cambiar sin reescribir las demás.

**Orquestador nativo.** Sesión de Claude Code o Codex abierta en este repositorio. Interpreta el encargo, pide equipo a RR. HH., escribe instrucciones para cada agente, revisa resultados y presenta decisiones a Ariel. Su comportamiento se define en `AGENTS.md`; no hay código de orquestación en la app.

**`oficina-mcp`.** Servidor MCP (TypeScript, transporte stdio) declarado en el repositorio para que ambos entornos lo carguen. Es la única vía por la que el Orquestador actúa sobre la oficina. Expone herramientas como:

| Herramienta | Función |
|---|---|
| `abrir_encargo` | Crea el encargo con descripción, archivos y marca de sensibilidad. |
| `buscar_perfiles` | RR. HH.: busca fichas, scripts y aprendizajes por metadatos y resumen. |
| `proponer_plan` | Registra el plan y el equipo; la oficina lo muestra. |
| `despachar` | Envía una subtarea a un agente por API y devuelve el resultado o el estado de fallo. |
| `registrar_resultado` | Registra resultados, incluidos los de relevo nativo. |
| `pedir_decision` | Deja una decisión pendiente en la Mesa de revisión. |
| `consultar_decision` | Lee la respuesta de Ariel cuando se tomó desde la oficina web. |
| `cerrar_encargo` | Cierra el encargo y lista recursos candidatos a guardar. |
| `guardar_recurso` | Guarda en la biblioteca una ficha, script o aprendizaje aprobado por Ariel. |

Las claves de API de los agentes solo existen en el entorno donde corre `oficina-mcp`.

**Estado compartido.** Base de datos alojada (Postgres administrado o equivalente) con encargos, eventos, fichas, biblioteca, decisiones y registro de llamadas. Es alojada porque el Orquestador puede correr en contenedores de nube temporales y la oficina debe verse desde la tablet sin depender de esa sesión. Los archivos de los encargos van a un almacenamiento de objetos asociado.

**Oficina web.** App desplegada (Vercel) que lee el estado compartido y lo representa en la escena isométrica. Se actualiza en vivo a partir de los eventos. Permite aprobar o devolver decisiones; en tramos posteriores, enviar instrucciones a un buzón que el Orquestador lee con `oficina-mcp`.

## Flujo de un evento

1. El Orquestador llama una herramienta de `oficina-mcp`.
2. `oficina-mcp` ejecuta la acción (por ejemplo, la llamada al proveedor) y escribe uno o más eventos en el estado compartido.
3. La oficina web recibe el evento y actualiza la escena: el escritorio se enciende, el personaje cambia de globo, la carpeta va a la Mesa de revisión.

Cada animación de la escena corresponde a un evento registrado. La escena no anima nada por su cuenta.

## Puntos a verificar al inicio del tramo 1

- Que Claude Code en la nube y Codex en la nube carguen el MCP declarado en el repositorio.
- Que esos entornos permitan salida de red hacia las APIs de los agentes y hacia la base de datos; los contenedores de nube restringen la red por defecto.
- Cómo reporta cada sesión el modelo nativo en uso.

Mientras no se verifiquen, el desarrollo local (Claude Code o Codex en la máquina de Ariel) es el entorno de referencia.
