---
name: sdd-analyze
description: Analiza un requerimiento de negocio (documento, correo, acta o texto) y produce historias de usuario con criterios de aceptación, reglas de negocio, diagramas, preguntas para el cliente y, si se pide, estimación. Usar cuando el usuario pida analizar un requerimiento, levantar historias, preparar preguntas para el cliente o estimar, o escriba /sdd-analyze.
---
# /sdd-analyze — Análisis funcional

Solicitud: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario y sus adjuntos.)

1. Carga `sdd-orchestrator`. Crea el cambio: `node "{{SDD_HOME}}/bin/new-change.js" --type analysis "<título>"`.
2. `ingest` de los adjuntos (skill `sdd-ingest`) o guarda el texto en `input.md`.
3. Si el requerimiento toca un sistema existente, `explore` breve para entender lo actual (apoyado en memoria).
4. Delega en `sdd-business-analyst`: `requirements.md` + `preguntas-cliente.md` (+ diagramas; + `estimate.md` si el usuario pidió estimar).
5. Muestra al usuario: resumen (≤ 6 líneas), nº de historias/reglas, preguntas para el cliente (listas para enviar) y supuestos que requieren validación.
6. Cuando el usuario responda las preguntas o apruebe: ofrecer continuar con desarrollo (`sdd-new` usando este cambio como base).
