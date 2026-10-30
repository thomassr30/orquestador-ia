---
name: sdd-deps
description: Audita y actualiza dependencias o frameworks del proyecto por lotes de riesgo, con aprobación de los lotes y verificación. Usar cuando el usuario pida actualizar dependencias, corregir vulnerabilidades, subir de versión un framework, o escriba /sdd-deps.
---
# /sdd-deps — Dependencias

Solicitud: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario y sus adjuntos.)

1. Carga `sdd-orchestrator`, flujo `deps`. Sin archivos de trabajo.
2. Explorer ∥ `sdd-deps-maintainer` (auditoría) → GATE con los lotes propuestos y su riesgo → lotes independientes en paralelo → verifier por lote.
