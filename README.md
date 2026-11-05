# Ariel Agent OS: Oficina Virtual de Ingeniería

**Una oficina virtual gamificada, flexible y dirigida por Ariel.**

Este repositorio define y construye una web app donde Ariel reúne agentes de IA para trabajos de ingeniería, los supervisa en una oficina interactiva y reutiliza perfiles, herramientas, scripts y aprendizajes de encargos anteriores.

La oficina se inspira en la cercanía visual de Habbo Hotel y Roblox: un espacio isométrico 2D o 2.5D con personajes y recursos originales. No es un dashboard convencional con avatares decorativos. Los escritorios, agentes, salas y expedientes representan actividad real del sistema.

## Cómo funciona

- El **Orquestador** entiende el encargo y reúne un equipo bajo demanda.
- El **Oficial de RR. HH.** mantiene un catálogo de perfiles, capacidades, instrucciones, herramientas y scripts reutilizables.
- Los agentes trabajan por tarea, con contexto acotado. El sistema busca en la memoria guardada solo los recursos pertinentes.
- **Qwen** y **DeepSeek** pueden atender tareas especializadas. El Orquestador es nativo del entorno: Gemini en Google AI Studio y ChatGPT mediante el adaptador de Codex cuando se ejecuta en Codex.
- Ariel conserva las decisiones que requieren criterio, revisión o autorización humana.

## Repositorio técnico de referencia

[Ariel_OS_v1.0](https://github.com/Arielromero13/Ariel_OS_v1.0) contiene trabajo aprovechable: roles, flujos de ingeniería, estructuras de datos, conectores y un prototipo React. Se consulta como referencia técnica. La oficina gamificada y los equipos flexibles definidos aquí guían el nuevo producto; los contratos y roles previos son materiales reutilizables, no una filosofía rígida ni formularios obligatorios.

## Documentos del proyecto

- [Filosofía del producto](docs/00-product-philosophy.md)
- [Experiencia de la oficina](docs/01-office-experience.md)
- [Agentes y memoria selectiva](docs/02-agents-and-memory.md)
- [Selección de modelos](docs/03-model-routing.md)
- [Alcance del MVP](docs/04-mvp-scope.md)
- [Ciclo de trabajo](docs/05-operating-loop.md)
- [Repositorio técnico de referencia](docs/06-source-reference.md)

## Prioridad de implementación

Primero debe funcionar el ciclo esencial: recibir un encargo, formar un equipo, ejecutar y revisar el trabajo, mostrar el avance en la oficina y guardar los recursos que valga la pena reutilizar. La estética debe ayudar a entender y dirigir ese trabajo.
