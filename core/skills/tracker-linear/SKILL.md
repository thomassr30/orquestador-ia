---
name: tracker-linear
description: Trabajar con issues de Linear — leer issues, estados, ciclos, proyectos, sub-issues y comentarios, y vínculo con ramas/PRs, vía MCP de Linear o texto pegado. Usar cuando el proyecto use Linear.
---
# Linear

Carga `tracker-common` (principios y aprobaciones).

## Acceso
- **MCP de Linear** si está conectado; si no, el usuario pega el issue.

## Lectura útil
- Identificador (`ENG-123`), título, descripción, estado (del workflow del equipo), prioridad, estimación, ciclo, proyecto, labels, sub-issues, relaciones (blocks/blocked by), comentarios.

## Escritura (con aprobación)
- Comentario con resumen y cómo probar; cambio de estado según el workflow del equipo.
- Vínculo automático con PRs: usar el identificador en el nombre de rama o en el título/descripción del PR (propuesto, no ejecutado).
