---
name: sdd-continue
description: Retoma un cambio SDD pendiente desde su última fase. Usar cuando el usuario quiera seguir o continuar un trabajo anterior, o escriba /sdd-continue.
---
# /sdd-continue — Retomar un cambio

Argumentos: $ARGUMENTS (id del cambio, opcional)

1. Carga la skill `sdd-orchestrator`.
2. Ejecuta `node "{{SDD_HOME}}/bin/sdd-status.js"` y elige:
   - el id indicado por el usuario, o
   - si hay un solo cambio abierto, ese; si hay varios, pregunta cuál.
3. Lee `.sdd/memoria/sesion.md` (si existe) y SOLO `changes/<id>/state.json` y continúa desde la primera fase no completada. Si el GATE no está aprobado, vuelve a presentarlo.
