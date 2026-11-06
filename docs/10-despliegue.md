# Despliegue

## Piezas

| Pieza | Dónde corre | Variables |
|---|---|---|
| Estado compartido | Postgres alojado (Neon, desde el Marketplace de Vercel) | — |
| Oficina web (`packages/oficina-web`) | Vercel, proyecto con directorio raíz `packages/oficina-web` | `DATABASE_URL`, `OFICINA_USUARIO`, `OFICINA_CLAVE`, `OFICINA_SECRETO` (opcional) |
| `oficina-mcp` | Donde corre el Orquestador (Claude Code o Codex) | `DATABASE_URL`, `QWEN_API_KEY`, `DEEPSEEK_API_KEY` |

Si la cadena apunta a Neon (`*.neon.tech`), `oficina-mcp` usa el driver serverless de Neon por HTTPS en lugar de `pg` por TCP: en las sesiones de Claude Code en la nube solo sale tráfico HTTPS por el proxy, y el puerto 5432 no llega. `.mcp.json` activa `NODE_USE_ENV_PROXY=1` para que Node use ese proxy (sin proxy no tiene efecto). `OFICINA_DRIVER=pg` o `OFICINA_DRIVER=neon` fuerzan uno u otro. La oficina web en Vercel sigue con `pg`.

Las claves de Qwen y DeepSeek nunca se configuran en Vercel. La oficina web solo lee el estado y registra las decisiones de Ariel.

## Pasos

1. En Vercel, Marketplace → Neon → crear la base y conectarla al proyecto `oficina-web`. Eso agrega `DATABASE_URL` al proyecto.
2. Copiar esa misma `DATABASE_URL` a los secretos del entorno donde corre el Orquestador (o a `.env` en la máquina local).
3. Crear las tablas: abrir la oficina con tu usuario y tocar **Preparar base de datos** (o `npm run migrar -w oficina-mcp` desde una máquina que llegue a la base). Es idempotente.
4. Definir `OFICINA_USUARIO` y `OFICINA_CLAVE` en las variables del proyecto en Vercel y volver a desplegar.
5. Abrir la URL del proyecto en la tablet y agregarla a la pantalla de inicio.

Cada PR genera una vista previa en Vercel; cada merge a `main` actualiza producción.

## Acceso

El acceso actual es un usuario y clave únicos definidos en variables de entorno. Es provisional: protege la oficina de visitas casuales, no de un atacante decidido. En el plan Hobby de Vercel la URL de producción es pública, así que la clave debe cambiarse por una fuerte antes de cargar datos reales.

## Prueba local

```bash
npm install
export DATABASE_URL=postgresql://...      # cualquier Postgres 14+
npm run migrar -w oficina-mcp
OFICINA_USUARIO=admin OFICINA_CLAVE=... npm run dev -w oficina-web
```
