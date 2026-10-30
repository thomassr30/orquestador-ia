---
name: sdd-test
description: Agrega tests a código existente sin cobertura (unit, integración, BD, e2e, accesibilidad) sin cambiar código productivo. Usar cuando el usuario escriba /sdd-test o $sdd-test.
disable-model-invocation: true
---
# /sdd-test — Agregar tests a código existente

Qué probar: $ARGUMENTS
(Ej.: `servicio de muestras`, `src/app/muestras/muestra-form.component.ts`, `endpoint GET /muestras`.)

1. Carga la skill `sdd-orchestrator`.
2. Crea el cambio: `node "{{SDD_HOME}}/bin/new-change.js" --type test "<qué probar>"`
3. Flujo `test`: explore → test-plan → GATE → test-write → verify.
4. Reglas:
   - Los tests documentan el comportamiento ACTUAL. Si un test revela un bug, NO lo corrijas: márcalo como `skip`/`todo` con el motivo y repórtalo (sugiere `/sdd-fix`).
   - No se modifica código productivo. Si algo no es testeable sin cambiarlo, repórtalo como bloqueo y sugiere `/sdd-refactor`.
5. En el GATE muestra: tipos de test, nº de casos y archivos a crear.
