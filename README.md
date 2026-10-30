# Orquestador SDD — global y multi-IA

Orquestador de agentes para desarrollo guiado por especificaciones (SDD). Se instala **una vez** y queda disponible en **todos tus proyectos** y en **6 herramientas de IA**: Claude Code, OpenCode, Gemini CLI, Codex CLI, Cursor y VS Code Copilot.

- **1 orquestador**: coordina el trabajo y no programa.
- **15 sub-agentes**, de 20 a 30 líneas cada uno.
- **56 skills** con el conocimiento detallado.
- **10 comandos** para consultar, desarrollar, corregir, testear, refactorizar, revisar y documentar. Se cargan solo cuando se necesitan.

---

## 1. Requisitos

Funciona en **Windows, macOS y Linux** (Node.js 18 o superior). Las rutas `~` equivalen a `C:\Users\<tú>` en Windows y a `/Users/<tú>` o `/home/<tú>` en macOS/Linux.

| Sistema | Instalar | Actualizar |
|---|---|---|
| Windows (PowerShell) | `node install.js` | `git pull` o `npm run update` |
| macOS / Linux (Terminal) | `node install.js` | `git pull` o `npm run update` |

### Requisitos por herramienta

| Herramienta | Para qué | Comprobar |
|---|---|---|
| Node.js 20+ | Instalador y scripts | `node -v` |
| Git | Revisar y revertir cambios | `git --version` |
| Docker Desktop | Tests con PostgreSQL / SQL Server reales | `docker ps` |
| Al menos una IA | Claude Code, OpenCode, Gemini CLI, Codex, Cursor o VS Code | — |

## 2. Instalación

En PowerShell:

```powershell
cd C:\ruta\orquestador-ia
node install.js                      # instala en las IA detectadas en tu equipo
```

Otras opciones:

```powershell
node install.js --targets=all                 # todas las IA, aunque no estén instaladas aún
node install.js --targets=claude,opencode     # solo algunas
node install.js --dry-run                     # simula sin escribir nada
node install.js --no-mcp                      # sin registrar Playwright / Context7
node install.js --auto-edits                  # Claude Code acepta ediciones sin preguntar
node install.js --no-permissions              # sin permisos preaprobados en Claude Code
node install.js --uninstall                   # desinstala todo
```

Para **actualizar** después de editar algo en `core/`, vuelve a ejecutar `node install.js`. La reinstalación es limpia, no duplica nada y recuerda en qué herramientas instalaste (`--detect` para volver a detectarlas).

> **Cursor:** pega el contenido de `core/rules/global.md` en *Settings → Rules → User Rules* (Cursor no guarda esas reglas en un archivo).

## 3. Qué se instala y dónde

| | Skills | Sub-agentes | Comandos | Reglas globales | MCP |
|---|---|---|---|---|---|
| Claude Code | `~/.claude/skills` | `~/.claude/agents/*.md` | las skills `/sdd-*` | `~/.claude/CLAUDE.md` | `claude mcp add -s user` |
| OpenCode | `~/.agents/skills` | `~/.config/opencode/agents/*.md` | `~/.config/opencode/commands` | `~/.config/opencode/AGENTS.md` | `opencode.json` |
| Gemini CLI | `~/.agents/skills` | `~/.gemini/agents/*.md` | `~/.gemini/commands/*.toml` | `~/.gemini/GEMINI.md` | `settings.json` |
| Codex CLI | `~/.agents/skills` | `~/.codex/agents/*.toml` | las skills (`$sdd-*`) | `~/.codex/AGENTS.md` | `config.toml` |
| Cursor | `~/.agents/skills` | `~/.cursor/agents/*.md` | las skills `/sdd-*` | manual (ver arriba) | `~/.cursor/mcp.json` |
| VS Code Copilot | `~/.agents/skills` | `~/.copilot/agents/*.agent.md` | las skills `/sdd-*` | `~/.copilot/copilot-instructions.md` | `%APPDATA%\Code\User\mcp.json` |

`~` es tu carpeta de usuario (`C:\Users\<tú>`). Los scripts quedan en `~/.sdd-orquestador/bin`.

Antes de modificar un archivo de configuración tuyo, el instalador guarda una copia `*.bak-sdd`. En los archivos de reglas solo agrega un bloque delimitado: lo que ya tenías no se toca.

## 4. Uso diario

**Modo automático:** abre tu IA en la carpeta del proyecto y escribe normal. El sistema detecta qué necesitas y usa los agentes:

```
¿dónde se valida el RUT?                         → [SDD] Flujo: ask
agrega exportación a Excel en el listado          → [SDD] Flujo: new
en /muestras al guardar no aparece la alerta      → [SDD] Flujo: fix
revisa los cambios antes de subir                 → [SDD] Flujo: review
muéstrame cómo se ve /muestras en móvil           → [SDD] Flujo: browser (abre el navegador y captura)
```

- Para una respuesta sin flujo, di **"directo"** o **"sin sdd"**.
- La IA siempre se detiene a pedir tu aprobación antes de modificar código.
- **Git y GitHub nunca son automáticos:** ningún `git` ni `gh` (commit, push, PR…) se ejecuta sin tu aprobación. Al terminar, la IA te propone los comandos y espera tu "sí".

Los comandos siguen disponibles si quieres forzar un flujo:

| Necesito… | Comando | ¿Modifica código? |
|---|---|---|
| **Consultar** el código ("¿dónde se valida el RUT?") | `/sdd-ask <pregunta>` | ❌ Nunca |
| **Desarrollar** algo nuevo (texto o `@archivo.pdf`) | `/sdd-new <descripción>` | ✅ tras tu aprobación |
| **Corregir** un bug | `/sdd-fix <qué pasa, dónde, qué debería pasar>` | ✅ tras tu aprobación |
| **Agregar tests** a código existente | `/sdd-test <qué probar>` | Solo crea tests |
| **Refactorizar** sin cambiar el comportamiento | `/sdd-refactor <objetivo>` | ✅ tras tu aprobación |
| **Revisar** código, una rama o los cambios sin commit | `/sdd-review [alcance]` | ❌ (entrega `review.md`) |
| **Documentar** (arquitectura, API, modelo de datos) | `/sdd-doc <tema>` | Solo documentos en `docs/` |
| **Navegador**: ver, inspeccionar (consola/red), verificar visualmente o hacer tareas web | `/sdd-browser <qué>` | ❌ |
| **Retomar** un cambio a medias | `/sdd-continue [id]` | — |
| Ver el **estado** de los cambios | `/sdd-status [--all]` | — (script, sin tokens) |

En **Codex** se usan con `$`: `$sdd-fix ...`.

### Ejemplo

```
/sdd-fix En /muestras/nueva, al guardar no aparece la alerta "Muestra guardada"
y en error muestra "undefined" en vez del mensaje del backend. @inbox/captura.png
```

1. El orquestador explora, crea un test que reproduce el bug y te muestra la causa y la propuesta.
2. Respondes `s`, `n` o un ajuste (por ejemplo: `sí, pero el mensaje por defecto es "No fue posible guardar"`).
3. Implementa, verifica (tests, lint, seguridad, accesibilidad) y te entrega los archivos tocados.
4. Revisas `git diff` y haces el commit tú.

Todo queda trazado en `changes/<id>/` dentro del proyecto: `input.md`, `explore.md`, `spec.md`, `design.md`, `test-plan.md`, `tasks.md`, `verify.md` y `state.json`.

## 5. Arquitectura

```
TÚ → ORQUESTADOR (skill sdd-orchestrator: solo lee state.json y resúmenes)
        │ delega con rutas, recibe ≤10 líneas
        ├─ sdd-explorer          → explore.md, stack.json
        ├─ sdd-proposer          → proposal.md
        ├─ sdd-spec-writer       → spec.md (REQ-NN, Dado/Cuando/Entonces)
        ├─ sdd-designer          → design.md (datos, contratos API, ADR)
        ├─ sdd-test-planner      → test-plan.md (REQ → test)
        ├─ sdd-task-planner      → tasks.md (por capa, dependencias)
        ├─ ⏸ TU APROBACIÓN
        ├─ sdd-test-writer       → tests (TDD)
        ├─ sdd-backend-implementer / sdd-frontend-implementer / sdd-db-implementer / sdd-mobile-implementer
        ├─ sdd-verifier          → verify.md (quality gates)
        ├─ sdd-reviewer          → review.md (/sdd-review)
        ├─ sdd-doc-writer        → docs/*.md (/sdd-doc)
        └─ sdd-browser-operator  → evidencia/
```

- **Ahorro de tokens:** el orquestador no lee código. Los sub-agentes nacen con contexto limpio. Se comunican por archivos, no por chat. Las skills `stack-*` se cargan según `stack.json`. El estado y la ingesta de PDF/DOCX se manejan con scripts que no usan IA.
- **Stack:** `stack-go`, `stack-nodejs`, `stack-nestjs`, `stack-adonisjs`, `stack-angular`, `stack-react`, `stack-nextjs`, `stack-html-css`, `stack-tailwind`, `stack-scss`, `stack-postgres`, `stack-sqlserver`.
- **Mobile:** `stack-react-native`, `stack-expo`, `rn-animations`, `stack-ios`, `stack-swiftui`, `ios-hardware`, `stack-android`, `stack-compose`, `android-hardware`, `mobile-design`, `test-mobile`.
- **Diseño:** `design-quality` (web y mobile, anti diseño genérico).
- **Revisión y documentación:** `code-review`, `tech-docs`.
- **Testing:** `test-strategy`, `test-unit`, `test-integration`, `test-db` (Testcontainers), `test-api-contract`, `test-e2e` (Playwright), `test-visual`, `test-a11y` (axe), `test-performance` (k6 / Lighthouse), `test-security`.
- **Sin sub-agentes:** si una IA no puede lanzar sub-agentes, el orquestador ejecuta las fases en secuencia cargando cada skill (modo secuencial).

## 6. Personalizar

| Quiero… | Edito | Luego |
|---|---|---|
| Cambiar una regla de un framework | `core/skills/stack-<x>/SKILL.md` | `node install.js` |
| Agregar detalle sin agrandar la skill | `core/skills/<x>/references/<tema>.md` y lo menciono en el SKILL.md | `node install.js` |
| Elegir modelo por agente | `config/models.json` (`fast` / `strong` por herramienta) | `node install.js` |
| Agregar o quitar servidores MCP | `config/mcp.json` | `node install.js` |
| Reglas de UN proyecto | `AGENTS.md` en la raíz de ese proyecto | (tienen prioridad) |

**No edites** los archivos instalados en `~/.claude`, `~/.agents`, etc.: se regeneran desde `core/`. Versiona esta carpeta en Git.

## 7. GitHub y actualizaciones automáticas

### Publicar (una vez)
1. En GitHub crea un repositorio **privado** vacío, por ejemplo `orquestador-sdd` (sin README ni .gitignore).
2. En PowerShell:
```powershell
cd C:\dev\orquestador-ia
git init
git add .
git commit -m "Orquestador SDD v1.2.0"
git branch -M main
git remote add origin https://github.com/<tu-usuario>/orquestador-sdd.git
git push -u origin main
node install.js        # activa la actualización automática (hook de git)
```

### Actualizar
```powershell
cd C:\dev\orquestador-ia
git pull               # el hook reinstala solo lo que corresponda
# o bien, en un paso con validaciones:
npm run update
```

### Otro equipo o compañero
```powershell
git clone https://github.com/<tu-usuario>/orquestador-sdd.git C:\dev\orquestador-ia
cd C:\dev\orquestador-ia
node install.js
```

### Flujo para hacer cambios
Edita en `core/` → `node install.js` (prueba local) → `git commit` → `git push`. Los demás equipos lo reciben con `git pull`.
Sube la versión en `package.json` y anota el cambio en `CHANGELOG.md`.

## 8. Notas

- OpenCode, Cursor y Copilot leen tanto `~/.claude/skills` como `~/.agents/skills`. Si instalas Claude junto con otras IA, pueden aparecer skills duplicadas; el contenido es idéntico.
- Al crear `~/.config/opencode/AGENTS.md`, OpenCode deja de usar `~/.claude/CLAUDE.md` como respaldo.
- En Codex, si tienes `~/.codex/AGENTS.override.md`, ese archivo tiene prioridad: copia ahí el bloque `sdd-orquestador`.
- La compatibilidad con sub-agentes y skills depende de la versión de cada herramienta. Mantenlas actualizadas.
