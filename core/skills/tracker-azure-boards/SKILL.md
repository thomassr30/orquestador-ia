---
name: tracker-azure-boards
description: Trabajar con work items de Azure Boards (Azure DevOps) — leer User Story/Bug/Task, WIQL, campos, criterios de aceptación, estados, comentarios y vínculo con commits/PR, vía MCP de Azure DevOps, az boards o texto pegado. Usar cuando el proyecto use Azure DevOps Boards.
---
# Azure Boards

Carga `tracker-common` (principios y aprobaciones).

## Acceso
- **MCP de Azure DevOps** si está conectado. El harness deja pasar la lectura (`core_list_projects`, `wit_work_item`,
  `wit_backlog`, `wit_query`) y pide confirmación del usuario para escribir (`wit_work_item_write`,
  `wit_work_item_link_write`). Escribir en Azure **Repos** (pull requests) sigue bloqueado: propónlo como texto.
- CLI: `az boards work-item show --id 123` (extensión azure-devops; requiere aprobación por ser CLI de nube).
- Sin integración: el usuario pega el work item.

## Qué registrar por proyecto
Va en la memoria del proyecto (`.sdd/memoria/`), una vez, para no volver a preguntarlo ni adivinarlo:
- **Organización** y **proyecto** (la URL `dev.azure.com/<organización>/<proyecto>`).
- **Equipo** por defecto, cuando el proyecto tiene más de uno.
- **Area path** e **iteration path** habituales del trabajo.
- **Proceso**: Agile, Scrum, CMMI o uno heredado. Decide los tipos de work item y, sobre todo, los **estados**
  válidos (Agile: New/Active/Resolved/Closed; Scrum: New/Approved/Committed/Done). No supongas la transición:
  si el proceso no está registrado, consulta los estados válidos antes de proponer un cambio.
- Convención de vínculo con el código: `AB#<id>` en el mensaje del commit o en la descripción del PR.

## Lectura útil
- Campos: `System.Title`, `System.WorkItemType`, `System.Description`, `Microsoft.VSTS.Common.AcceptanceCriteria`, `System.State`, `System.AreaPath`, `System.IterationPath`, `Microsoft.VSTS.Common.Priority`, relaciones (Parent, Child, Related).
- Repro steps en bugs: `Microsoft.VSTS.TCM.ReproSteps`.
- WIQL frecuente: `SELECT [System.Id],[System.Title] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.AssignedTo] = @me AND [System.State] <> 'Closed'`.

## Escritura (con aprobación)
- Comentario (discussion) con resumen y cómo probar; cambio de estado según el proceso del proyecto (Agile/Scrum/CMMI tienen estados distintos — consulta los válidos).
- Vincular PR/commit: mención `AB#123` en el commit o PR (se propone, no se ejecuta).
