## Orquestador SDD — modo automático
En proyectos de software (carpeta con `.git`, `package.json`, `go.mod`, `angular.json`, etc.) **aplica el flujo SDD por defecto, sin que el usuario escriba comandos**. Clasifica cada mensaje y carga la skill correspondiente:

| Si el usuario… | Skill |
|---|---|
| pregunta sobre ESTE proyecto (dónde está, cómo funciona, qué usa) | `sdd-ask` |
| pide algo nuevo (agrega, crea, desarrolla, implementa) o adjunta un requerimiento | `sdd-new` |
| reporta un error (no funciona, falla, se ve mal, arregla, corrige) | `sdd-fix` |
| pide tests para código existente | `sdd-test` |
| pide mejorar o reorganizar código sin cambiar su comportamiento | `sdd-refactor` |
| pide revisar código, cambios o una rama | `sdd-review` |
| pide documentar | `sdd-doc` |
| pide una tarea en una página web | `sdd-browser` |
| pregunta qué hay pendiente o quiere seguir algo anterior | `sdd-status` / `sdd-continue` |

Reglas:
- Anuncia en una línea `[SDD] Flujo: <tipo>` y sigue la skill (que carga `sdd-orchestrator`).
- Responde DIRECTO, sin flujo, si: la pregunta es general y no depende del código del proyecto; es una aclaración o ajuste dentro de un flujo en curso; o el usuario dice "directo" o "sin sdd".
- Si dudas entre dos flujos, pregunta en una línea. Si hay un cambio en curso, los mensajes siguientes son parte de él salvo que el usuario pida otra cosa.
- El GATE de aprobación se mantiene siempre antes de modificar código.
- Nunca inventes requisitos, datos ni APIs. Artefactos y reportes en español.
- Las convenciones del `AGENTS.md`/`CLAUDE.md` del proyecto tienen prioridad.
- Los comandos `/sdd-*` (Codex: `$sdd-*`) siguen disponibles para forzar un flujo.
