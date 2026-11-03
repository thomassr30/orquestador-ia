# Memoria — orquestador-ia
_Actualizada: 2026-11-03_

## Qué es
Harness local de hooks y guías SDD para varios asistentes de programación (Claude Code, Codex, Gemini CLI, Cursor, Copilot, OpenCode). Versión 3.0.0.

## Stack
JavaScript CommonJS en Node.js ≥18, sin dependencias; comandos y pruebas en package.json.

## Mapa de módulos (harness/src)
- `core.js`: decide cada evento (pre/post/stop/prompt/session/compact); falla cerrada para lo crítico (failSafe).
- `policy.js` (permisos, destinos de escritura de Bash), `gate.js` (GATE del plan), `aprobaciones.js` (confirmación exacta por HMAC, un uso).
- `state.js` (estado v2: candado con dueño, escritura atómica, .bak, cuarentena, migración), `eventos.js` (JSONL correlacionado, redacción, rotación).
- `resultado.js` (contrato aprobado/fallido/no_verificado/bloqueado/excepcion), `sensors.js` (controles + línea base), `verificacion.js` (cambios por git, huella, excepciones).
- `trabajo.js`: requisitos, tareas, evidencias; plan congelado al aprobar el GATE.
- `budget.js` (sub-agentes, minutos, tokens medidos), `capacidades.js` + `observado.js` (matriz por cliente, niveles de doctor), `adapters/` (contrato por cliente).
- `bin/sdd-harness.js` (estado, doctor, trabajo, eventos, excepcion, linea-base…), `bin/sdd-eval.js` (evals con modelos, solo con --confirmar), `bin/sdd-hook.js` (entrada de hooks).
- `core/`: agentes, skills y reglas distribuidas (`core/rules/global.md` = CLAUDE.md global instalado).

## Comandos
`npm test` (unitarias + contrato de adaptadores + corpus `evals/corpus`, sin modelos); `node bin/sdd-harness.js doctor|trabajo|eventos`; `node bin/sdd-eval.js <tareas> --validar`.

## Trampas conocidas
- El harness que protege las sesiones es la copia instalada en ~/.sdd-orquestador: los cambios del repo no rigen hasta instalar/actualizar.
- Los tests no deben escribir credenciales literales (el propio harness lo bloquea): armarlas en tiempo de ejecución.
- `claude` real está en C:\nodejs junto a node.exe: los tests de sdd-eval usan SDD_EVAL_CLAUDE_BIN y un PATH sin esa carpeta.
- En Codex/OpenCode el git no destructivo se delega a reglas nativas (nativeGitAsk): usar Gemini/Cursor en pruebas de aprobación por chat de git.
- Tests de hooks de Claude que pasan por la compactación dependen de ~/.claude/settings.json del equipo (claude-permisos.js): en CI no existe. Usar HOME/USERPROFILE y SDD_CLAUDE_MANAGED_DIR temporales (claudeEnv en hook.e2e.test.js). Para simular CI en local: HOME vacío fuera de %TEMP% y ruta de TEMP con las mayúsculas reales (si no, fallan sensors/corpus por artefacto).

## Contexto relevante
Decisiones de diseño 3.0.0 en `decisiones.md`; pendientes y riesgos residuales en `pendientes.md`.
Fuente del mapa: implementación 2026-11-03 (lotes 1-7).
