# Pendientes (deuda, riesgos, preguntas abiertas)

Propuestas de la revisión del 2026-11-02, sin aprobación de implementación:
- [ ] Fortalecer el resultado de evaluaciones: éxito exige salida válida y proceso correcto, además del verificador; hoy `ok` no exige exit=0/JSON válido. Fuente: bin/sdd-eval.js:39.
- [ ] Mantener fallo de calidad hasta resolución o excepción autorizada; hoy se libera el bloqueo tras maxBloqueos. Fuente: harness/src/core.js:369.
- [ ] Vincular requisitos, tareas, evidencias de aceptación y cierre en el estado persistido. Fuente: harness/src/state.js:15 y bin/sdd-state.js.
- [ ] Endurecer aprobaciones MCP ligándolas a argumentos; revisar aprobación conjunta de pendientes. Fuente: harness/src/core.js:252 y harness/src/gate.js:117.
- [ ] Evaluar modo estricto ante fallas internas y recuperación segura de concurrencia. Fuente: harness/src/core.js:403 y harness/src/state.js:39.
- [ ] Ampliar evaluaciones reproducibles más allá de Claude CLI. Fuente: bin/sdd-eval.js:39.
