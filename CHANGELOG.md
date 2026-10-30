# Cambios

## 1.4.0
- **Git y GitHub nunca de forma autónoma:** cualquier comando `git` o `gh` (commit, push, PR, etc.) requiere aprobación del usuario.
  - Claude Code: reglas `ask` para `Bash(git:*)` y `Bash(gh:*)` (tienen prioridad sobre permisos preaprobados y sobre `--auto-edits`).
  - OpenCode: `permission.bash` con `"git *": "ask"` y `"gh *": "ask"`.
  - Todas las IA: regla global + orquestador + cada sub-agente. Al terminar, la IA propone los comandos de commit y espera tu "sí".
- Se quitaron los comandos git de lectura de los permisos preaprobados.

## 1.3.0
- **Modo automático:** ya no es necesario escribir `/sdd-*`. La IA clasifica cada mensaje (consulta, desarrollo, bug, tests, refactor, revisión, documentación, navegador) y aplica el flujo y los agentes correspondientes. Se puede omitir diciendo "directo" o "sin sdd".
- Features pequeñas usan el flujo corto para ahorrar tokens.
- Claude Code: permisos preaprobados para tests, lint, build, git de lectura y scripts del orquestador (`--no-permissions` para omitir).
- Opción `--auto-edits`: Claude Code acepta ediciones de archivos sin preguntar.

## 1.2.0
- Repositorio Git con actualización automática: cada `git pull` reinstala (hook `post-merge`).
- `node update.js` / `npm run update`: descarga y reinstala en un paso.
- El instalador recuerda las herramientas de la instalación anterior (`--detect` para volver a detectar).

## 1.1.0
- Comandos nuevos: `/sdd-ask`, `/sdd-review`, `/sdd-test`, `/sdd-refactor`, `/sdd-doc`.
- Sub-agentes nuevos: `sdd-reviewer`, `sdd-doc-writer`. Skills: `code-review`, `tech-docs`.
- Sin aviso DEP0190 en Node recientes.

## 1.0.0
- Versión inicial: orquestador, 12 sub-agentes, 37 skills, instalador global para 6 herramientas.
