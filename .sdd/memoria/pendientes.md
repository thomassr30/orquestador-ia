# Pendientes (deuda, riesgos, preguntas abiertas)

Resuelto en 3.0.0 (2026-11-03): resultado de evaluaciones, fallo que persiste tras reintentos, vínculo requisitos-evidencias, aprobaciones MCP exactas y conjuntas, modo estricto y concurrencia del estado.

Abierto:
- [x] Compactador en Claude (claude.js:25): resuelto 2026-11-03 con la opción a (adapters/claude-permisos.js). Límite: no ve políticas por registro, perfil de macOS, servidor ni --allowedTools/--disallowedTools.
- [ ] Integración real por cliente (doctor nivel d) sin confirmar: requiere instalar 3.0.0 y usar cada cliente; Cursor no instalado en este equipo.
- [ ] Ejecutar CI en macOS/Linux (solo se probó en Windows localmente). 2026-11-03: corregidos el test que dependía de ~/.claude/settings.json y la lectura de stdin (EAGAIN); falta ver el CI en verde.
- [ ] «sin sdd» se detecta dentro de contenido pegado (un log con el nombre del test 143 apagó el orquestador): la detección debería ignorar el texto pegado, como ya se hace con el contexto antepuesto.
- [ ] sdd-eval: cliente Codex pendiente (no instalado); modo «flujo» y formato JSON de Claude solo probados con binario falso. No se ejecutaron evaluaciones con modelos.
- [ ] Si el módulo del harness no carga (instalación dañada), el hook falla abierto; queda en ultimo-error.json.
- [ ] Detección de escrituras por Bash es de mejor esfuerzo (intérpretes y scripts pueden escribir sin destino reconocible). No es un sandbox.
- [ ] Límites de eventos (1 MB × 5, 30 días) fijos en código; no configurables.
- [ ] Soporte de «ask» en hooks de Copilot (vista previa) sin verificar en el host.
- [ ] MCP de Azure DevOps (2026-11-03): mcp.js:8/38 lo trata como forja y deniega toda escritura, incluso comentar o cambiar estado de work items, que tracker-common/tracker-azure-boards dicen «con confirmación». Además `query` está en WRITE_VERB (mcp.js:9): una lectura WIQL cuyo nombre lleve «query» se denegaría. Sin tests del caso Azure. Nombres reales verificados (MCP oficial @azure-devops/mcp v2.10, herramientas agrupadas con parámetro `action`): lectura `core_list_projects`, `wit_work_item` (get/my/get_batch/list_for_iteration), `wit_backlog`, `wit_query` (wiql, se clasifica mal como escritura); escritura `wit_work_item_write`, `wit_work_item_link_write`. El resultado depende del nombre que se dé al servidor: `azure-devops` → deny; `ado` → ask. Falta además guiar en tracker-azure-boards qué registrar por proyecto (organización, proyecto, equipo, area path, proceso). Mientras tanto se resuelve por configuración: `.sdd/harness.json` → `permisos.mcpBloquear` con las herramientas `_write` y `mcpLibres` con `<servidor>__wit_query` (mcp.js:34-35).
- [ ] GATE con tickets de Azure (2026-11-03): TICKET (gate.js:22) solo reconoce el formato Jira `LAB-123`. Un mensaje con solo «AB#1234», «PBI 1234» o un enlace `dev.azure.com/…/_workitems/edit/1234`, sin verbo, no abre el GATE (el plan queda a criterio del modelo). Con verbo («trabaja», «desarrolla») sí lo abre por WORK/CHANGE.
