---
name: tracker-gitlab-issues
description: Trabajar con GitLab Issues (y épicas/boards) — leer issues, labels con scope, milestones, tareas, comentarios y vínculo con merge requests, vía MCP de GitLab, glab CLI (con aprobación) o texto pegado. Usar cuando el proyecto gestione tareas en GitLab.
---
# GitLab Issues

Carga `tracker-common` (principios y aprobaciones).

## Acceso
- **MCP de GitLab** si está conectado.
- CLI: `glab issue view 123 --comments` (proponer y pedir aprobación).
- Sin integración: el usuario pega el issue.

## Lectura útil
- Título, descripción (plantillas), labels (incluidas las con scope `workflow::en-progreso`, `tipo::bug`), milestone/iteración, peso, épica, tareas hijas, issues relacionados, MRs vinculados.

## Escritura (con aprobación)
- Comentario con resumen y cómo probar; cambio de labels de flujo (`workflow::…`) según el board del equipo.
- Cierre desde el MR con `Closes #123` en la descripción (propuesto en `release-notes`).
- Quick actions en comentarios (`/label`, `/milestone`, `/spend`) solo si el usuario lo aprueba.
