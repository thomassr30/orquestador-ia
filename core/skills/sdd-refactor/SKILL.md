---
name: sdd-refactor
description: Refactoriza código sin cambiar su comportamiento, protegido por tests de caracterización. Usar cuando el usuario pida mejorar, ordenar, separar, migrar o limpiar código sin cambiar lo que hace, o escriba /sdd-refactor.
---
# /sdd-refactor — Refactorizar sin cambiar comportamiento

Objetivo: $ARGUMENTS
(Ej.: `separar lógica del controller de muestras en un servicio`, `migrar componente X a signals`.)

1. Carga la skill `sdd-orchestrator`.
2. Crea el cambio: `node "{{SDD_HOME}}/bin/new-change.js" --type refactor "<objetivo>"`
3. Flujo `refactor`: explore → test-plan → tasks → GATE → test-write → apply → verify.
4. Reglas:
   - `test-plan` = tests de **caracterización**: cubren el comportamiento actual de lo que se va a tocar. Deben PASAR antes del refactor.
   - Si no hay tests suficientes, se escriben primero y se verifica que pasen ANTES de tocar código.
   - API pública, contratos y respuestas NO cambian. Cualquier cambio de comportamiento es un bloqueo.
   - Tareas pequeñas; tests en verde después de cada tarea.
5. En el GATE muestra: qué cambia en la estructura, qué NO cambia y los riesgos.
