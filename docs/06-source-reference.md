# Repositorio técnico de referencia

## Repositorio de origen

**Ariel_OS_v1.0:** https://github.com/Arielromero13/Ariel_OS_v1.0

Los agentes de desarrollo deben inspeccionar la rama principal actual antes de reutilizar código. El repositorio de origen es público y sirve para ver con detalle los avances anteriores.

## Archivos de orientación

- `README.md` describe la arquitectura, los roles, las skills, los workflows y el modelo de gobierno existente.
- `AGENTS.md` contiene instrucciones globales para agentes que trabajan dentro del repositorio.
- `docs/vision.md`, `docs/architecture.md`, `docs/operating-model.md`, `docs/governance.md`, `docs/input-contract.md` y `docs/role-matrix.md` documentan propuestas y reglas del diseño anterior.
- `workflows/grounding-report.yaml` es un ejemplo de receta para informes de P.A.T.; puede reutilizarse como dominio inicial.
- `src/types.ts` contiene tipos para work items, etapas, agentes, findings, handoffs y revisiones.
- `src/App.tsx` y `src/components/` muestran el prototipo React actual, que se reemplazará como experiencia principal.
- `src/harness/` y `adapters/` contienen conectores de modelos y ejecución nativa, útiles como referencia para la capa de proveedores.

## Qué se puede reutilizar

- Roles como capacidades opcionales.
- Contratos como esquemas internos de expediente, resultado y traspaso.
- Workflow P.A.T. como receta de dominio.
- Tipos de ciclos de corrección, estados e historial cuando sirvan a la operación.
- Límite de adaptadores entre modelo, lógica de agente y app.

## Qué se debe replantear para este proyecto

- Reemplazar el tablero de pestañas por una oficina virtual gamificada interactiva.
- Evitar un equipo permanente de siete agentes ejecutado para cada encargo.
- Evitar que el usuario tenga que completar todos los campos del contrato universal.
- Añadir el rol de Oficial de RR. HH. para archivar y recuperar capacidades de agentes.
- Permitir que equipos y workflows se compongan por tarea con memoria selectiva.
- Sustituir cualquier simulación silenciosa de proveedor por estado y error verdaderos.
