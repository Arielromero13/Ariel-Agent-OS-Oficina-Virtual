# Instrucciones para agentes de desarrollo

Antes de implementar o cambiar arquitectura, lee `README.md` y los documentos en `docs/`.

## Jerarquía de decisiones

1. La instrucción actual de Ariel.
2. `docs/00-product-philosophy.md` y `docs/04-mvp-scope.md`.
3. Los documentos de experiencia, memoria, modelos y operación.
4. El repositorio anterior `Ariel_OS_v1.0`, como referencia de código, roles, ejemplos y flujos existentes.

El repositorio anterior no sustituye la filosofía de este proyecto. No vuelvas a imponer sus formularios, lista fija de agentes o workflow P.A.T. como estructura obligatoria de toda tarea.

## Reglas de implementación

- Construye una oficina virtual interactiva como experiencia principal. No entregues un dashboard convencional ni una imagen estática con avatares decorativos.
- Separa la lógica de trabajo, el catálogo de agentes, los conectores de modelos y la capa de juego/escena.
- Mantén al Orquestador portable y selecciona su modelo nativo según el entorno de ejecución.
- Mantén los agentes inactivos cuando no trabajan. Guarda perfiles y recursos fuera del contexto activo, y recupera solo lo relevante para el encargo actual.
- Trata los roles del repositorio anterior como capacidades posibles. El Orquestador reúne el equipo según la tarea.
- Usa estructuras de datos y handoffs solo para facilitar continuidad, trazabilidad, almacenamiento o revisión. No hagas que el usuario complete un contrato largo para empezar una tarea.
- No inventes datos, fuentes técnicas, límites normativos ni resultados de llamadas a modelos.
- No muestres una simulación como si fuera una llamada real. Cuando falten credenciales o un proveedor falle, presenta el estado y la acción necesaria.
- Mantén las claves y credenciales en el servidor. No las guardes en el cliente, en Git ni en archivos versionados.
- Ninguna acción externa o emisión final se ejecuta sin la aprobación humana correspondiente.
- Conserva configurables los límites operativos que dependan del tipo de tarea, el riesgo y el costo.

## Qué revisar al terminar cambios

Explica qué cambió, qué capacidades quedaron realmente conectadas, qué secretos o configuración faltan y cómo iniciar la app. No afirmes que una integración funciona si no se verificó en el entorno disponible.
