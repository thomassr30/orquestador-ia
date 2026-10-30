---
name: sdd-analyze
description: Analiza un requerimiento de negocio (documento, correo, acta o texto) y produce historias de usuario con criterios de aceptación, reglas de negocio, diagramas, preguntas para el cliente y, si se pide, estimación. Usar cuando el usuario pida analizar un requerimiento, levantar historias, preparar preguntas para el cliente o estimar, o escriba /sdd-analyze.
---
# /sdd-analyze — Análisis funcional

Solicitud: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario y sus adjuntos.)

1. Carga `sdd-orchestrator`. Lee adjuntos con `sdd-ingest` (sin guardar).
2. En paralelo: `sdd-explorer` (si toca un sistema existente) ∥ `sdd-business-analyst`.
3. Presenta en el chat, explicado y ordenado: objetivo, alcance, historias con criterios de aceptación, reglas de negocio, supuestos, **preguntas para el cliente listas para copiar** y estimación si se pidió.
4. Si el usuario quiere el análisis en un documento, recién ahí créalo (modo registro o `sdd-doc`).
