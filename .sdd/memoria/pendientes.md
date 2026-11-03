# Pendientes (deuda, riesgos, preguntas abiertas)

Resuelto en 3.0.0 (2026-11-03): resultado de evaluaciones, fallo que persiste tras reintentos, vínculo requisitos-evidencias, aprobaciones MCP exactas y conjuntas, modo estricto y concurrencia del estado.

Abierto:
- [x] Compactador en Claude (claude.js:25): resuelto 2026-11-03 con la opción a (adapters/claude-permisos.js). Límite: no ve políticas por registro, perfil de macOS, servidor ni --allowedTools/--disallowedTools.
- [ ] Integración real por cliente (doctor nivel d) sin confirmar: requiere instalar 3.0.0 y usar cada cliente; Cursor no instalado en este equipo.
- [ ] Ejecutar CI en macOS/Linux (solo se probó en Windows localmente).
- [ ] sdd-eval: cliente Codex pendiente (no instalado); modo «flujo» y formato JSON de Claude solo probados con binario falso. No se ejecutaron evaluaciones con modelos.
- [ ] Si el módulo del harness no carga (instalación dañada), el hook falla abierto; queda en ultimo-error.json.
- [ ] Detección de escrituras por Bash es de mejor esfuerzo (intérpretes y scripts pueden escribir sin destino reconocible). No es un sandbox.
- [ ] Límites de eventos (1 MB × 5, 30 días) fijos en código; no configurables.
- [ ] Soporte de «ask» en hooks de Copilot (vista previa) sin verificar en el host.
