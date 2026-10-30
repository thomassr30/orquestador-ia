---
name: sdd-new
description: Desarrolla funcionalidades nuevas con el flujo SDD completo (especificar, diseñar, testear, implementar, verificar). Usar cuando el usuario pida agregar, crear, desarrollar o implementar algo en el proyecto, adjunte un requerimiento, o escriba /sdd-new.
---
# /sdd-new — Cambio nuevo (feature)

Solicitud del usuario: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario que acompaña al comando.)

1. Carga la skill `sdd-orchestrator` y actúa como ORQUESTADOR durante todo el flujo.
2. Crea el cambio (deterministico, sin gastar tokens):
   `node "{{SDD_HOME}}/bin/new-change.js" --type feature "<título corto de la solicitud>"`
   El script imprime el `<id>` y crea `changes/<id>/state.json`.
3. Si hay archivos adjuntos o rutas `@...` → fase `ingest` (skill `sdd-ingest`). Si es solo texto → guarda la solicitud literal en `changes/<id>/input.md`.
4. Ejecuta el flujo `feature` hasta el GATE y espera la aprobación del usuario.
