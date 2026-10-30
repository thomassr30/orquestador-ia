---
name: sdd-test
description: Agrega tests a código existente sin cambiar código productivo. Usar cuando el usuario pida tests, cobertura o pruebas para código que ya existe, o escriba /sdd-test.
---
# /sdd-test — Agregar tests a código existente

Qué probar: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario y sus adjuntos.)

1. Carga `sdd-orchestrator`, flujo `test`. Sin archivos de trabajo (solo los archivos de test).
2. Explorer → test-planner → GATE (tipos de test, casos, archivos) → test-writers en paralelo por módulo → verifier.
3. Los tests documentan el comportamiento actual: si revelan un bug, márcalo como pendiente (`skip`/`todo`) y repórtalo; no cambies código productivo.
