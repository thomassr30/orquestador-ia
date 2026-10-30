---
name: sdd-review
description: Revisa código (archivos, carpeta, rama o cambios sin commit) y entrega un informe priorizado sin modificar código. Usar cuando el usuario pida revisar, auditar o evaluar código o cambios, o escriba /sdd-review.
---
# /sdd-review — Revisión de código

Alcance: $ARGUMENTS
(Ejemplos: vacío = cambios sin commit; `rama feature/x` = diff contra la rama principal; `src/app/muestras` = carpeta.)

1. Carga la skill `sdd-orchestrator`.
2. Crea el cambio: `node "{{SDD_HOME}}/bin/new-change.js" --type review "<alcance>"`
3. Escribe el alcance en `changes/<id>/input.md`. Para diffs, guarda la lista de archivos: `git diff --name-only <base>` (no el diff completo).
4. Delega `explore` (solo stack.json + archivos del alcance) y luego `review` en `sdd-reviewer`.
5. Muestra al usuario el resumen y la ruta de `review.md`. NO corrijas nada. Ofrece: "¿Corrijo los hallazgos críticos con /sdd-fix?".
