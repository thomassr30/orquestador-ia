---
name: tracker-azure-boards
description: Trabajar con work items de Azure Boards (Azure DevOps) — leer User Story/Bug/Task, WIQL, campos, criterios de aceptación, estados, comentarios y vínculo con commits/PR, vía MCP de Azure DevOps, az boards o texto pegado. Usar cuando el proyecto use Azure DevOps Boards.
---
# Azure Boards

Carga `tracker-common` (principios y aprobaciones).

## Acceso
- **MCP de Azure DevOps** si está conectado.
- CLI: `az boards work-item show --id 123` (extensión azure-devops; requiere aprobación por ser CLI de nube).
- Sin integración: el usuario pega el work item.

## Lectura útil
- Campos: `System.Title`, `System.WorkItemType`, `System.Description`, `Microsoft.VSTS.Common.AcceptanceCriteria`, `System.State`, `System.AreaPath`, `System.IterationPath`, `Microsoft.VSTS.Common.Priority`, relaciones (Parent, Child, Related).
- Repro steps en bugs: `Microsoft.VSTS.TCM.ReproSteps`.
- WIQL frecuente: `SELECT [System.Id],[System.Title] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.AssignedTo] = @me AND [System.State] <> 'Closed'`.

## Escritura (con aprobación)
- Comentario (discussion) con resumen y cómo probar; cambio de estado según el proceso del proyecto (Agile/Scrum/CMMI tienen estados distintos — consulta los válidos).
- Vincular PR/commit: mención `AB#123` en el commit o PR (se propone, no se ejecuta).
