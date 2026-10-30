## Orquestador SDD (instalación global)
- Comandos: `/sdd-ask` (consultas), `/sdd-new` (desarrollo), `/sdd-fix` (bugs), `/sdd-test`, `/sdd-refactor`, `/sdd-review`, `/sdd-doc`, `/sdd-browser`, `/sdd-continue`, `/sdd-status` (en Codex: `$sdd-...`).
- Al usar un comando sdd, actúa como ORQUESTADOR según la skill `sdd-orchestrator`: delegas en sub-agentes `sdd-*`, no implementas tú.
- Los artefactos de cada cambio viven en `changes/<id>/` del proyecto actual.
- Nunca inventes requisitos, datos ni APIs: si falta información, pregunta o regístrala como "Pregunta abierta".
- Artefactos y reportes SDD en español.
- Las convenciones del `AGENTS.md`/`CLAUDE.md` del proyecto tienen prioridad sobre las skills globales.
