---
name: sdd-browser
description: Ejecuta tareas en el navegador (navegar, formularios, descargas, capturas) con evidencia y confirmación antes de acciones irreversibles. Usar cuando el usuario pida hacer algo en una página web, o escriba /sdd-browser.
---
# /sdd-browser — Tarea de navegador

Tarea: $ARGUMENTS

1. Carga la skill `sdd-orchestrator`.
2. Si la tarea no pertenece a un cambio existente: `node "{{SDD_HOME}}/bin/new-change.js" --type browser "<título>"`.
3. Escribe los pasos y datos en `changes/<id>/browser-task.md` (pregunta los datos que falten; NUNCA pidas contraseñas por chat).
4. Delega a `sdd-browser-operator`. Reporta el resultado y la ruta de `evidencia/`.
