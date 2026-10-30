---
name: sdd-deps
description: Audita y actualiza dependencias o frameworks del proyecto por lotes de riesgo, con aprobación de los lotes y verificación. Usar cuando el usuario pida actualizar dependencias, corregir vulnerabilidades, subir de versión un framework, o escriba /sdd-deps.
---
# /sdd-deps — Dependencias

Solicitud: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario; ej. "corrige vulnerabilidades", "sube Angular a la siguiente versión".)

1. Carga `sdd-orchestrator`. Crea el cambio: `node "{{SDD_HOME}}/bin/new-change.js" --type deps "<título>"`.
2. `explore` (stack y versiones) → delega auditoría en `sdd-deps-maintainer` → `deps-audit.md`.
3. GATE: muestra lotes propuestos (vulnerabilidades, fin de soporte, patch/minor, majors de a uno) con riesgo; el usuario elige cuáles aplicar.
4. Aplicar lote por lote con `sdd-deps-maintainer` → `sdd-verifier` después de cada lote.
5. Cierre normal (memoria, `release-notes`, git solo propuesto).
