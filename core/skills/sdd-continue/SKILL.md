---
name: sdd-continue
description: Retoma un cambio SDD pendiente desde su última fase. Usar cuando el usuario quiera seguir o continuar un trabajo anterior, o escriba /sdd-continue.
---
# /sdd-continue — Retomar

Argumentos: $ARGUMENTS

1. Carga `sdd-orchestrator`.
2. Lee `.sdd/memoria/sesion.md` y `MEMORIA.md` (y la conversación actual si sigue disponible). Si el usuario usó el modo registro, también `changes/<id>/state.json`.
3. Resume en pocas líneas dónde quedó el trabajo y continúa.
