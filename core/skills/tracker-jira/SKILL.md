---
name: tracker-jira
description: Trabajar con tickets de Jira (Atlassian) — leer issues, JQL, campos, sub-tareas, transiciones, comentarios y enlaces a desarrollo, vía MCP de Atlassian, CLI o texto pegado. Usar cuando el proyecto use Jira.
---
# Jira

Carga `tracker-common` (principios y aprobaciones).

## Acceso
- **MCP de Atlassian** (remoto oficial u otro configurado): obtener issue por clave, buscar con JQL, comentar, transicionar.
- CLI (`jira` de go-jira / ankitpokhrel u otra del equipo) si está instalada.
- Sin integración: el usuario pega el issue o exporta (Word/PDF → ingesta).

## Lectura útil
- Campos: `summary`, `issuetype`, `description` (ADF/markdown), `priority`, `status`, `labels`, `components`, `fixVersions`, `parent`/épica, sub-tareas, criterios de aceptación (a menudo campo personalizado: pregunta su nombre si no aparece), adjuntos, issues enlazados.
- JQL frecuentes: `key = LAB-123` · `project = LAB AND sprint in openSprints() AND assignee = currentUser()` · `project = LAB AND type = Bug AND status != Done ORDER BY priority DESC`.

## Escritura (con aprobación)
- Comentario en markdown/ADF con resumen del cambio y cómo probar.
- Transición: consulta las transiciones disponibles del issue (los flujos varían por proyecto); no asumas nombres de estados.
- Smart commits (`LAB-123 #comment ...`) solo si el equipo los usa; se proponen en el mensaje de commit, no se ejecutan.
