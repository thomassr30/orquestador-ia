---
name: sdd-fix
description: Corrige bugs con el flujo SDD corto (explorar, test que reproduce, aprobar, implementar, verificar). Usar cuando el usuario reporte un error, algo que no funciona o se ve mal, pida arreglar o corregir algo, o escriba /sdd-fix.
---
# /sdd-fix — Corrección de bug

Descripción del bug: $ARGUMENTS
(Si no ves la descripción arriba, usa el mensaje del usuario que acompaña al comando.)

1. Carga la skill `sdd-orchestrator` y actúa como ORQUESTADOR.
2. Si la descripción NO indica dónde ocurre, qué pasa o qué debería pasar → pregunta SOLO lo que falte (máx. 3 preguntas) antes de seguir.
3. Crea el cambio: `node "{{SDD_HOME}}/bin/new-change.js" --type fix "<título corto>"`
4. Guarda la descripción en `changes/<id>/input.md` (o `ingest` si hay capturas/archivos).
5. Ejecuta el flujo `fix`. El test-plan debe incluir al menos un test que REPRODUZCA el bug (debe fallar antes del arreglo).
6. Si el cambio es trivial (texto, color, espaciado sin lógica) propón al usuario el flujo `trivial`.
