---
name: sdd-refactor
description: Refactoriza código sin cambiar su comportamiento, protegido por tests de caracterización. Usar cuando el usuario pida mejorar, ordenar, separar, migrar o limpiar código sin cambiar lo que hace, o escriba /sdd-refactor.
---
# /sdd-refactor — Refactorizar sin cambiar comportamiento

Objetivo: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario y sus adjuntos.)

1. Carga `sdd-orchestrator`, flujo `refactor`. Sin archivos de trabajo.
2. Tests de caracterización primero (deben pasar antes de tocar código) → GATE (qué cambia en la estructura, qué no, riesgos) → implementer en tareas pequeñas → verifier tras cada una.
3. Cualquier cambio de comportamiento observable es un bloqueo.
