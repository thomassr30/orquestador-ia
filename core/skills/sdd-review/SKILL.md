---
name: sdd-review
description: Revisa código (archivos, carpeta, rama o cambios sin commit) y entrega un informe priorizado sin modificar código. Usar cuando el usuario pida revisar, auditar o evaluar código o cambios, o escriba /sdd-review.
---
# /sdd-review — Revisión de código

Alcance: $ARGUMENTS
(Vacío = cambios sin commit; `rama X` = diff contra la principal; una ruta = esa carpeta.)

1. Carga `sdd-orchestrator`. Obtén el alcance con git de solo lectura (`git status`, `git diff --stat`, `git diff <base>...<rama>`).
2. Explorer (stack) → `sdd-reviewer` ∥ `sdd-ui-reviewer` (si hay UI).
3. Informa en el chat: veredicto, hallazgos por severidad con evidencia y sugerencia, y lo que está bien. No corrijas nada; ofrece corregir los críticos.
