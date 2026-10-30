---
name: sdd-apply
description: Implementa una tarea de tasks.md respetando el diseño, las skills del stack y los tests. Usar en la fase apply del flujo SDD (implementers).
---
# Implementar una tarea

1. Lee SOLO: la fila de tu tarea en `tasks.md`, la sección de `design.md` indicada, los tests de la tarea (ya escritos por el test-writer) y `stack.json`.
2. Carga las skills `stack-*` de TU capa listadas en `stack.json`. Lee sus `references/` solo si la tarea lo requiere.
3. Si el proyecto tiene `AGENTS.md`/`CLAUDE.md`, sus convenciones mandan sobre las skills.
4. Implementa lo MÍNIMO para que los tests de la tarea pasen. No toques otras capas ni refactorices fuera de alcance.
5. Ante dudas de API de una versión concreta, consulta la documentación oficial (MCP Context7 si está disponible) con la versión de `stack.json`. No adivines.
6. Ejecuta los tests de la tarea y el lint de los archivos tocados. Si fallan 2 veces seguidas, detente y reporta.
7. Marca la tarea en `tasks.md`: `[x]` + archivos tocados.

Devuelve ≤10 líneas: tarea, archivos (+/−), tests (pasan/fallan), bloqueos. Nunca inventes requisitos: si falta un dato, es un bloqueo.
