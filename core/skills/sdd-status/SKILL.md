---
name: sdd-status
description: Muestra el estado del proyecto SDD (cambios y harness) con scripts, sin gastar tokens. Usar cuando el usuario pregunte qué hay pendiente o en curso, por el estado del harness o del GATE, o escriba /sdd-status.
---
# /sdd-status

Ejecuta `node "{{SDD_HOME}}/bin/sdd-harness.js" estado` y muestra la salida tal cual (GATE, archivos modificados, últimos sensores). Si el usuario pide más detalle del harness: `doctor` (hooks por herramienta y sensores detectados) o `registro` (últimas decisiones). No leas otros archivos.

Si el proyecto usa el modo registro (carpeta `changes/`), ejecuta también `node "{{SDD_HOME}}/bin/sdd-status.js" $ARGUMENTS` (`--all` incluye cambios cerrados).
