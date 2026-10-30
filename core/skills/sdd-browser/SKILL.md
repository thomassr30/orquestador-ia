---
name: sdd-browser
description: Ejecuta una tarea en el navegador (navegar, formularios, descargas, capturas) mediante el sub-agente browser-operator. Usar cuando el usuario escriba /sdd-browser o $sdd-browser.
disable-model-invocation: true
---
# /sdd-browser — Tarea de navegador

Tarea: $ARGUMENTS

1. Carga la skill `sdd-orchestrator`.
2. Si la tarea no pertenece a un cambio existente: `node "{{SDD_HOME}}/bin/new-change.js" --type browser "<título>"`.
3. Escribe los pasos y datos en `changes/<id>/browser-task.md` (pregunta los datos que falten; NUNCA pidas contraseñas por chat).
4. Delega a `sdd-browser-operator`. Reporta el resultado y la ruta de `evidencia/`.
