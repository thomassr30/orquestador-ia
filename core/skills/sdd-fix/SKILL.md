---
name: sdd-fix
description: Corrige bugs con el flujo SDD corto (explorar, test que reproduce, aprobar, implementar, verificar). Usar cuando el usuario reporte un error, algo que no funciona o se ve mal, pida arreglar o corregir algo, o escriba /sdd-fix.
---
# /sdd-fix — Corrección de bug

Descripción: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario y sus adjuntos.)

1. Carga `sdd-orchestrator`, flujo `fix`. Sin archivos de trabajo: todo en el chat.
2. Si no se sabe dónde ocurre, qué pasa o qué debería pasar, pregunta solo eso (máx. 3 preguntas).
3. Explorer encuentra la causa con evidencia → GATE con causa, corrección propuesta y test que reproduce el bug → implementer ∥ test-writer → verifier.
4. Si es trivial (texto, color, espaciado sin lógica) propón hacerlo directo con verificación rápida.
