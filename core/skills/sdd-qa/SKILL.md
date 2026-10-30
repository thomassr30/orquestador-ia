---
name: sdd-qa
description: Ejecuta QA funcional y de aceptación de un cambio o funcionalidad (web en el navegador o mobile con Maestro/emulador) contra sus criterios de aceptación y entrega un reporte con bugs y veredicto. Usar cuando el usuario pida probar funcionalmente, hacer QA o UAT, o escriba /sdd-qa.
---
# /sdd-qa — QA funcional

Qué probar: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario.)

1. Carga `sdd-orchestrator`. Usa el cambio relacionado si existe; si no: `node "{{SDD_HOME}}/bin/new-change.js" --type qa "<qué se prueba>"` y escribe en `input.md` el alcance y los criterios de aceptación disponibles (si no hay, pídelos o derívalos de la funcionalidad y confírmalos con el usuario).
2. Confirma entorno (local/dev/QA), URL o build, y usuario de prueba. Producción solo lectura y con autorización explícita.
3. Delega en `sdd-qa-functional`.
4. Reporta: veredicto, matriz resumida, bugs por severidad y pendientes manuales. Para cada bug crítico/alto ofrece `/sdd-fix`.
