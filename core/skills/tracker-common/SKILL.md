---
name: tracker-common
description: Principios para trabajar con gestores de tareas (Jira, Azure Boards, GitHub Issues, GitLab Issues, Linear) — leer un ticket como entrada de un cambio, mapear tipo a flujo SDD, trazabilidad ticket-cambio y actualizaciones con aprobación. Usar junto con la skill del gestor concreto.
---
# Gestor de tareas — principios

## Carga solo la skill del gestor que usa el proyecto
`tracker-jira` · `tracker-azure-boards` · `tracker-github-issues` · `tracker-gitlab-issues` · `tracker-linear`
El gestor del proyecto se registra en memoria (`MEMORIA.md` → Comandos/Integraciones) la primera vez.

## Cómo acceder (en este orden)
1. **MCP del gestor** conectado en la herramienta de IA (lectura directa del ticket).
2. **CLI oficial** (ej. `gh`, `glab`, `az boards`, `jira`) — los comandos de git/gh/CLIs de nube piden aprobación.
3. **Sin integración**: pide al usuario que pegue el ticket (título, descripción, criterios, adjuntos) o lo exporte.

## Leer un ticket → cambio SDD
1. Toma como entrada del flujo (en el chat, sin guardar): clave, título, tipo, descripción, criterios de aceptación, comentarios relevantes, adjuntos (ingesta), enlaces. Sin datos personales innecesarios.
2. Mapea el tipo: historia/feature/task → `feature`; bug/defect/incidente → `fix`; spike/investigación → `analysis` o `ask`; mejora técnica → `refactor`.
3. Usa la clave en el anuncio del flujo y en el mensaje de commit sugerido (ej. `LAB-123 filtro por fecha`).
4. Si el ticket no tiene criterios de aceptación claros → fase `analysis` y preguntas al cliente/PO.

## Escribir en el gestor (siempre con confirmación — es enviar datos a un servicio externo)
- Comentario de avance o cierre (resumen, enlace a PR, cómo probar), transición de estado, registro de tiempo, creación de sub-tareas o bugs encontrados en QA.
- Muestra el texto exacto y la acción; ejecuta solo con el "sí" del usuario.
- Nunca cambies asignaciones, prioridades ni estados de tickets ajenos al cambio.

## Trazabilidad
- Clave del ticket en: nombre del cambio, mensaje de commit propuesto, título/descripción del PR (`release-notes`), `historial.md` de memoria.
