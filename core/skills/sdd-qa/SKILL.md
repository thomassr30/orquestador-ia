---
name: sdd-qa
description: Ejecuta QA funcional y de aceptación de un cambio o funcionalidad (web en el navegador o mobile con Maestro/emulador) contra sus criterios de aceptación y entrega un reporte con bugs y veredicto. Usar cuando el usuario pida probar funcionalmente, hacer QA o UAT, o escriba /sdd-qa.
---
# /sdd-qa — QA funcional

Qué probar: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario y sus adjuntos.)

1. Carga `sdd-orchestrator`. Confirma entorno (local/dev/QA), URL o build y usuario de prueba; producción solo lectura con autorización explícita.
2. Si no hay criterios de aceptación, derívalos de la funcionalidad y confírmalos con el usuario.
3. Delega en `sdd-qa-functional` (web y mobile en paralelo si aplica).
4. Informa en el chat: veredicto, casos y resultados, bugs con severidad y pasos, pendientes manuales. Para bugs críticos/altos ofrece corregirlos.
