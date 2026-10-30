---
name: tracker-github-issues
description: Trabajar con GitHub Issues y Projects — leer issues, labels, milestones, comentarios, sub-issues y vínculo con PRs, vía MCP de GitHub, gh CLI (con aprobación) o texto pegado. Usar cuando el proyecto gestione tareas en GitHub.
---
# GitHub Issues

Carga `tracker-common` (principios y aprobaciones).

## Acceso
- **MCP de GitHub** si está conectado (lectura de issues sin usar la CLI).
- CLI: `gh issue view 123 --comments` / `gh issue list --label bug --assignee @me` — **gh siempre requiere aprobación** del usuario en esta instalación.
- Sin integración: el usuario pega el issue.

## Lectura útil
- Título, cuerpo (plantillas de issue con secciones), labels (`bug`, `enhancement`…), milestone, assignees, sub-issues, issues/PRs enlazados, campos de GitHub Projects (Status, Priority, Iteration) si existen.

## Escritura (con aprobación)
- Comentario con resumen y cómo probar.
- Cierre automático desde el PR con `Closes #123` / `Fixes #123` en la descripción (propuesto en `release-notes`).
- Crear issues de bugs encontrados en QA: mostrar título/cuerpo/labels y esperar el "sí".
