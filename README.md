# Orquestador SDD — harness global y multi-IA

Orquestador de agentes para desarrollo guiado por especificaciones (SDD). Se instala **una vez** y queda disponible en **todos tus proyectos** y en **6 herramientas de IA**: Claude Code, Codex, OpenCode, Gemini CLI, Cursor y VS Code Copilot.

Un agente es **modelo + harness**. El modelo lo pone tu herramienta; este repositorio aporta el harness, que tiene dos partes:

- **Guías**, que orientan al agente antes de actuar:
  - 1 orquestador que coordina el trabajo y no programa;
  - 22 sub-agentes cortos;
  - 104 skills con el conocimiento detallado;
  - 19 comandos;
  - memoria por proyecto.
- **Controles por código (hooks)**: scripts locales que la propia herramienta ejecuta antes y después de cada acción. Hacen cumplir las reglas aunque el modelo las olvide:
  - git solo lectura;
  - no editar sin plan aprobado;
  - secretos protegidos;
  - lint, tipos y tests al terminar;
  - memoria tras compactar.

No es una app aparte. No usa claves de API ni red, y no corre ningún proceso propio. Trabajas en tu herramienta de siempre, con su modelo, su sesión y sus permisos.

---

## 1. Requisitos

Funciona en **Windows, macOS y Linux**. Las rutas `~` equivalen a `C:\Users\<tú>` en Windows y a `/Users/<tú>` o `/home/<tú>` en macOS/Linux.

| Herramienta | Para qué | Comprobar |
|---|---|---|
| Node.js 18+ (recomendado 20+) | Instalador, hooks y scripts | `node -v` |
| Git | Revisar y revertir cambios | `git --version` |
| Docker Desktop (opcional) | Tests con PostgreSQL / SQL Server reales | `docker ps` |
| Al menos una IA | Claude Code, Codex, OpenCode, Gemini CLI, Cursor o VS Code con Copilot | — |

## 2. Instalación

En PowerShell (o Terminal):

```powershell
cd C:\dev\orquestador-ia
node install.js                      # instala en las IA detectadas en tu equipo
```

Otras opciones:

```powershell
node install.js --targets=all                 # todas las IA, aunque no estén instaladas aún
node install.js --targets=claude,codex        # solo algunas
node install.js --dry-run                     # simula sin escribir nada
node install.js --no-hooks                    # sin el harness por código (solo guías)
node install.js --no-mcp                      # sin registrar Playwright / Context7 / Chrome DevTools
node install.js --auto-edits                  # Claude Code acepta ediciones sin preguntar
node install.js --no-permissions              # sin permisos preaprobados en Claude Code
node install.js --uninstall                   # desinstala todo (conserva tu harness.json)
```

Reinstalar es limpio, no duplica nada y recuerda en qué herramientas instalaste (`--detect` para volver a detectarlas).

Después de instalar hay pasos que dependen de la herramienta:

- **Codex**: abre Codex y ejecuta `/hooks` para revisar y aprobar los hooks del harness. Codex no ejecuta hooks nuevos sin tu aprobación. Después reinicia Codex para que cargue las reglas.
- **Gemini CLI**: puede avisarte la primera vez que encuentre hooks nuevos. Es esperado.
- **Cursor**: pega `core/rules/global.md` en *Settings → Rules → User Rules*, porque Cursor no guarda esas reglas en un archivo. Los hooks sí se instalan solos.

## 3. Qué se instala y dónde

| | Skills | Sub-agentes | Reglas globales | Harness (hooks) |
|---|---|---|---|---|
| Claude Code | `~/.claude/skills` | `~/.claude/agents` | `~/.claude/CLAUDE.md` | `~/.claude/settings.json` |
| Codex | `~/.agents/skills` | `~/.codex/agents` | `~/.codex/AGENTS.md` | `~/.codex/hooks.json` + `~/.codex/rules/sdd-orquestador.rules` |
| OpenCode | `~/.agents/skills` | `~/.config/opencode/agents` | `~/.config/opencode/AGENTS.md` | `~/.config/opencode/plugins/sdd-harness.js` |
| Gemini CLI | `~/.agents/skills` | `~/.gemini/agents` | `~/.gemini/GEMINI.md` | `~/.gemini/settings.json` |
| Cursor | `~/.agents/skills` | `~/.cursor/agents` | manual (ver arriba) | `~/.cursor/hooks.json` |
| VS Code Copilot | `~/.agents/skills` | `~/.copilot/agents` | `~/.copilot/copilot-instructions.md` | `~/.copilot/hooks/sdd-orquestador.json` |

El código del harness y los scripts quedan en `~/.sdd-orquestador/` (`bin/`, `harness/`, `harness.json`).

Antes de modificar un archivo de configuración tuyo, el instalador guarda una copia `*.bak-sdd`. En los archivos de reglas y de hooks solo agrega lo suyo: lo que ya tenías no se toca, y la desinstalación quita solo lo del orquestador.

## 4. Uso diario

Abre tu IA en la carpeta del proyecto y escribe normal. El sistema detecta qué necesitas y usa los agentes:

```
¿dónde se valida el RUT?                         → [SDD] Flujo: ask
agrega exportación a Excel en el listado          → [SDD] Flujo: new
en /muestras al guardar no aparece la alerta      → [SDD] Flujo: fix
revisa los cambios antes de subir                 → [SDD] Flujo: review
muéstrame cómo se ve /muestras en móvil           → [SDD] Flujo: browser (abre el navegador y captura)
```

- **Pedido de cambio → plan → tu "sí"**: al pedir un cambio, el agente explora y te muestra el plan completo en el chat. El harness **bloquea las ediciones** hasta que respondas que sí (`sí`, `dale`, `apruebo`; también vale `sí, pero…`). Luego trabaja en paralelo hasta terminar.
- **Algo trivial**: agrega **"directo"** al pedido (`cambia el título a "Muestras", directo`) y edita sin plan. Igual pasa por los sensores.
- **Al terminar**: el harness corre lint, tipos y tests **de lo que se modificó**. Si algo falla, el agente tiene que corregirlo o explicarte por qué no corresponde, antes de darte el trabajo por terminado.
- **Sin archivos de trabajo**: análisis, planes y reportes quedan en el chat; si quieres un documento, pídelo. La **memoria del proyecto** sí se mantiene sola.
- **Git solo lectura**: puede usar `git status/diff/log/show/blame` y las consultas de `gh`/`glab`. Commit, push, merge, PR y similares están **bloqueados por código**. Te sugiere el mensaje de commit y tú lo ejecutas.
- **Decisiones críticas con tu confirmación**: comandos contra clusters, nube o bases de datos, borrar archivos, agregar dependencias y cambiar la configuración del propio harness.

Los comandos siguen disponibles si quieres forzar un flujo (en **Codex** se usan con `$`):

| Necesito… | Comando | ¿Modifica código? |
|---|---|---|
| **Analizar** un requerimiento (historias, criterios, preguntas, estimación) | `/sdd-analyze <texto o @archivo>` | ❌ |
| **Consultar** el código | `/sdd-ask <pregunta>` | ❌ Nunca |
| **Desarrollar** algo nuevo (texto o `@archivo.pdf`) | `/sdd-new <descripción>` | ✅ tras tu aprobación |
| **Corregir** un bug | `/sdd-fix <qué pasa, dónde, qué debería pasar>` | ✅ tras tu aprobación |
| **Agregar tests** a código existente | `/sdd-test <qué probar>` | Solo tests, tras tu aprobación |
| **Refactorizar** sin cambiar el comportamiento | `/sdd-refactor <objetivo>` | ✅ tras tu aprobación |
| **Revisar** código, una rama o los cambios sin commit | `/sdd-review [alcance]` | ❌ |
| **Documentar** (arquitectura, API, modelo de datos) | `/sdd-doc <tema>` | Solo documentación |
| **Navegador**: ver, inspeccionar, verificar visualmente o hacer tareas web | `/sdd-browser <qué>` | ❌ |
| **QA funcional / UAT** | `/sdd-qa <qué probar>` | ❌ |
| **Diseño** de una pantalla (criticar, auditar, pulir, textos, adaptar) | `/sdd-ux <pedido>` | Revisiones no; mejoras con GATE |
| **Trabajar un ticket** (Jira, Azure Boards, GitHub, GitLab, Linear) | `/sdd-ticket LAB-123` | ✅ tras tu aprobación |
| **Prototipo** visual antes de implementar | `/sdd-prototype <pantalla o flujo>` | Solo el prototipo |
| **Dependencias**: auditar y actualizar por lotes | `/sdd-deps [objetivo]` | ✅ lotes aprobados |
| **Verificar un despliegue** (pods, logs, config, smoke) | `/sdd-deploy-check <servicio> <entorno>` | ❌ |
| **Memoria** del proyecto: ver, guardar, compactar, olvidar | `/sdd-memory [acción]` | Solo `.sdd/memoria/` |
| **Retomar** algo a medias / ver el **estado** (incluido el del harness) | `/sdd-continue` · `/sdd-status` | — |
| **Mejorar el orquestador** con evidencia | `/sdd-improve` | Solo con tu aprobación |

## 5. Harness: reglas que se cumplen por código

Las reglas en texto dependen de que el modelo las siga. El harness agrega **controles deterministas**: hooks que tu herramienta ejecuta en momentos fijos y que responden permitir, bloquear o avisar.

| Momento | Qué hace |
|---|---|
| Al iniciar y tras compactar | Inyecta la memoria **de este proyecto** (índice, sesión de trabajo, temas disponibles). |
| Cada mensaje tuyo | Detecta pedidos de cambio, que abren el GATE, y tus aprobaciones (`sí`, `dale`, `apruebo`, `directo`). |
| Antes de cada comando | **Bloquea**: escritura en git, GitHub o GitLab, comandos destructivos y lectura de secretos (`.env`, claves). **Pide confirmación** para: infraestructura (kubectl, terraform, nube, Consul, Vault), clientes de base de datos, borrar archivos, instalar dependencias y `sudo`. **Antes de que apruebes el plan**, solo deja correr lectura, tests y lint. |
| Antes de cada edición | No deja editar código sin plan aprobado, ni tocar `.git`, secretos, la configuración del harness o de los hooks, ni el estado del harness. Si la memoria del proyecto trae algo con aspecto de secreto, la escritura se rechaza. |
| Después de cada edición | Chequeo instantáneo del archivo: JSON y YAML válidos, marcadores de conflicto de merge, sintaxis de Go. Si hay error, se lo devuelve al agente. |
| Al terminar el turno | Si cambió código, corre lint, tipos y tests relacionados **solo sobre lo modificado** y por módulo (sirve en monorepos). Si fallan, el agente debe corregir: se insiste hasta 2 veces y después solo avisa. Además actualiza un bloque automático en `.sdd/memoria/sesion.md`. |

**Sensores detectados automáticamente:**

- **Node/TS**: eslint sobre los archivos cambiados, `tsc --noEmit` (en Angular, con `tsconfig.app.json`), y `vitest related` o `jest --findRelatedTests`. Karma y los modos watch se omiten.
- **Go**: `go vet` y `go test` de los paquetes tocados, y `golangci-lint` si está configurado.
- **Gradle, Xcode y otros**: se configuran a mano (ver más abajo).

### Por herramienta

| | Bloquear comandos y ediciones | Confirmación crítica | Feedback tras editar | No terminar en rojo | Memoria tras compactar |
|---|---|---|---|---|---|
| Claude Code (CLI, VS Code, JetBrains, desktop) | ✅ | diálogo nativo | ✅ | ✅ | ✅ |
| Codex (CLI e IDE) | ✅ Bash, apply_patch, MCP | en el chat | ✅ | ✅ | ✅ |
| Gemini CLI | ✅ | en el chat | ✅ | ✅ (reintento) | ✅ (en el siguiente mensaje) |
| Cursor | ✅ | en el chat | ✅ | ✅ (mensaje de seguimiento) | la IA la relee |
| VS Code Copilot / Copilot CLI | ✅ | diálogo nativo | ✅ | ✅ | la IA la relee |
| OpenCode | ✅ (plugin) | en el chat | ✅ | ✅ (continúa la sesión) | ✅ |

**Confirmación en el chat** se usa en las herramientas cuyos hooks no tienen diálogo de aprobación:

1. El harness bloquea la acción.
2. El agente te muestra el comando exacto.
3. Respondes `sí`.
4. El agente lo reintenta tal cual.

La confirmación vale **una vez** y caduca a los 30 minutos.

### Seguridad: por qué no es una app propia

- **Sin claves, sin red, sin servidor**: son scripts de Node que ejecuta tu herramienta. El modelo, la sesión y los permisos siguen siendo los de tu IA, y nada sale de tu equipo.
- **Falla abierta**: si un hook tiene un error interno no bloquea nada, así que tu herramienta sigue funcionando. Los permisos nativos que el instalador configura en Claude Code y OpenCode, y las reglas de Codex, siguen activos de todas formas.
- **El agente no puede desactivar su harness**: tocar `harness.json`, los hooks o la configuración de tu IA requiere tu confirmación. El estado del harness vive fuera del proyecto (`~/.sdd-orquestador/estado`) y el agente no puede escribirlo.
- **Registro local sin contenido**: guarda qué se bloqueó y por qué, nunca el contenido de archivos ni tus mensajes.

### Configurar

Global: `~/.sdd-orquestador/harness.json`. Por proyecto: `.sdd/harness.json`, que manda sobre el global. Ejemplo:

```json
{
  "gate": "auto",
  "sensores": {
    "alTerminar": ["lint", "tipos", "tests"],
    "comandos": { "tipos": "npx tsc --noEmit -p tsconfig.app.json", "tests": "npx vitest related --run {archivos}" },
    "timeoutSeg": 240,
    "maxBloqueos": 2
  },
  "permisos": { "preguntar": ["node scripts/*"], "denegar": ["make deploy"] }
}
```

`gate` acepta tres valores:

- `auto` (por defecto): los pedidos de cambio requieren plan aprobado.
- `siempre`: toda edición requiere plan aprobado.
- `nunca`: sin GATE por código.

En los comandos, `{archivos}` se reemplaza por los archivos modificados.

### Diagnóstico

```powershell
node ~/.sdd-orquestador/bin/sdd-harness.js doctor     # hooks por herramienta, configuración y sensores que correrían
node ~/.sdd-orquestador/bin/sdd-harness.js estado     # GATE, archivos modificados y últimos sensores de este proyecto
node ~/.sdd-orquestador/bin/sdd-harness.js sensores   # corre ahora los sensores sobre lo modificado (git status)
node ~/.sdd-orquestador/bin/sdd-harness.js registro   # últimas decisiones (qué se bloqueó y por qué)
```

En el chat basta con `/sdd-status` o con preguntar "¿cómo está el harness?".

### Si algo no funciona

- **El agente sigue bloqueado tras tu "sí"**: responde `apruebo`, o agrega `directo` al pedido. Con `estado` ves en qué paso quedó el GATE.
- **Errores tipo "node no se reconoce" al usar la IA**: la herramienta no encuentra Node.js en el PATH. Reiníciala o vuelve a abrir la terminal después de instalar Node.
- **Desactivar los controles por código** sin perder agentes ni skills: `node install.js --no-hooks`. Vuelves a activarlos con `node install.js`.
- **Un sensor no aplica a tu proyecto**: ajusta `sensores.comandos` o `sensores.alTerminar` en `.sdd/harness.json`. `doctor` te muestra qué correría.

## 6. Arquitectura

```
TÚ → tu IA (Claude Code, Codex, OpenCode, Gemini, Cursor, Copilot)
       │  guías: reglas globales + skill sdd-orchestrator
       ├─ ORQUESTADOR: clasifica el pedido, delega en paralelo, informa en el chat
       │    ├─ Entender: sdd-explorer ∥ sdd-business-analyst
       │    ├─ Plan: sdd-proposer → sdd-spec-writer ∥ sdd-designer → sdd-test-planner ∥ sdd-task-planner
       │    ├─ ⏸ GATE (tu aprobación; el harness bloquea ediciones hasta tu "sí")
       │    ├─ Construir: implementers (backend, frontend, db, mobile) ∥ sdd-test-writer
       │    ├─ Verificar: sdd-verifier ∥ sdd-ui-reviewer (+ sensores del harness al terminar)
       │    └─ Cerrar: sdd-memory-curator → .sdd/memoria
       └─ HARNESS (hooks): permisos · GATE · sensores · memoria  ←  ~/.sdd-orquestador/harness
```

El contexto viaja en los mensajes entre agentes. Los sub-agentes leen el código del proyecto, no documentos intermedios. Hay otros sub-agentes para tareas puntuales: reviewer, doc-writer, devops-engineer, deps-maintainer, prototyper, qa-functional y browser-operator.

**Skills por área:**

- **Stack**:
  - backend: Go, Node.js, NestJS, AdonisJS;
  - frontend: Angular, React, Next.js, HTML/CSS, Tailwind, SCSS;
  - bases de datos: PostgreSQL, SQL Server.
- **Mobile**:
  - React Native, Expo y animaciones;
  - iOS, SwiftUI y hardware de iOS;
  - Android, Compose y hardware de Android;
  - diseño mobile.
- **Diseño**: `design-quality` y 8 skills de proceso, inspiradas en Impeccable.
- **DevOps**, una skill por plataforma:
  - CI/CD: GitHub Actions, GitLab, Azure Pipelines, Jenkins, Bitbucket;
  - contenedores y despliegue: Docker, Kubernetes, OpenShift, Helm, Kustomize;
  - infraestructura y configuración: Terraform, Consul, Vault;
  - observabilidad y verificación post-despliegue.
- **Testing**: estrategia, unitarios, integración, BD con Testcontainers, contratos de API, e2e con Playwright, visual, accesibilidad, rendimiento y seguridad.
- **Análisis y QA funcional, gestores de tareas, multi-repo, dependencias, prototipos y mejora continua**: una skill para cada uno.

Si una IA no puede lanzar sub-agentes, el orquestador ejecuta las mismas fases en secuencia.

## 7. Memoria del proyecto

Cada proyecto guarda su memoria en `.sdd/memoria/`. Es recomendable versionarla para compartirla con el equipo. `sesion.md` es volátil, así que puedes ignorarlo en git.

| Archivo | Se lee | Contiene |
|---|---|---|
| `MEMORIA.md` | Siempre (lo inyecta el harness) | Índice: qué es, stack, mapa de módulos, convenciones, comandos, temas |
| `sesion.md` | Al iniciar y tras compactar | Trabajo en curso + bloque automático del harness (plan, archivos modificados, sensores) |
| `temas/*.md` | Solo si el índice dice que aplica | Conocimiento por área |
| `decisiones.md` | Al diseñar | Decisiones con motivo y estado |
| `pendientes.md` | Al planificar | Deuda técnica, riesgos, preguntas abiertas |
| `historial.md` | Rara vez | Una línea por cambio cerrado |

- **Compactación sin pérdida**: la herramienta compacta sola cerca del límite y el harness reinyecta la memoria. El bloque automático de `sesion.md` asegura que el estado del trabajo sobreviva aunque el modelo olvide actualizarlo.
- **Aislada por proyecto**: cada proyecto usa solo su `.sdd/memoria/`. La de un workspace multi-repo se usa solo si ese workspace incluye el repo.
- Nunca guarda secretos, valores de configuración ni datos personales; el harness rechaza escrituras con aspecto de secreto.

## 8. Mejora continua

- Solo se registran incidentes reales en `mejora/registro.md` de este repo: una regla violada, una corrección tuya, un gate fallido evitable o reintentos agotados.
- `/sdd-improve` propone cambios **solo con evidencia** (≥ 2 ocurrencias, o 1 grave), máximo 3. Prefiere reforzar o editar lo existente antes que crear skills.
- Nada se aplica sin tu aprobación.

## 9. Personalizar

| Quiero… | Edito | Luego |
|---|---|---|
| Cambiar una regla de un framework | `core/skills/stack-<x>/SKILL.md` | `node install.js` |
| Agregar detalle sin agrandar la skill | `core/skills/<x>/references/<tema>.md` | `node install.js` |
| Elegir modelo por agente | `config/models.json` | `node install.js` |
| Agregar o quitar servidores MCP | `config/mcp.json` | `node install.js` |
| Ajustar GATE, sensores o permisos | `~/.sdd-orquestador/harness.json` o `.sdd/harness.json` | (inmediato) |
| Reglas de UN proyecto | `AGENTS.md` / `CLAUDE.md` en la raíz del proyecto | (tienen prioridad) |

No edites los archivos instalados en `~/.claude`, `~/.agents` o `~/.sdd-orquestador/harness`: se regeneran desde este repo.

Para probar el harness tras un cambio, ejecuta `npm test` (pruebas automáticas de permisos, GATE, sensores, adaptadores, plugin de OpenCode e instalación).

## 10. GitHub y actualizaciones automáticas

### Publicar (una vez)
1. Crea un repositorio **privado** vacío en GitHub, por ejemplo `orquestador-sdd`.
2. En PowerShell:
```powershell
cd C:\dev\orquestador-ia
git init
git add .
git commit -m "Orquestador SDD v2.0.0"
git branch -M main
git remote add origin https://github.com/<tu-usuario>/orquestador-sdd.git
git push -u origin main
node install.js        # activa la actualización automática (hook de git)
```

### Actualizar
```powershell
cd C:\dev\orquestador-ia
git pull               # el hook reinstala solo lo que corresponda (skills, agentes y harness)
npm run update         # alternativa en un paso, con validaciones
```

### Otro equipo o compañero
```powershell
git clone https://github.com/<tu-usuario>/orquestador-sdd.git C:\dev\orquestador-ia
cd C:\dev\orquestador-ia
node install.js
```

Flujo para hacer cambios: edita `core/` o `harness/` → `npm test` → `node install.js` → commit y push. Sube la versión en `package.json` y anota el cambio en `CHANGELOG.md`.

## 11. Notas

- OpenCode, Cursor y Copilot leen tanto `~/.claude/skills` como `~/.agents/skills`. Si ves skills duplicadas, el contenido es idéntico.
- En VS Code, el harness que aplica depende del agente que uses:
  - Con la extensión de Claude Code, aplica el de Claude Code.
  - Con Copilot como destino de la sesión, aplica el de Copilot, cuyos hooks están en vista previa.
- En Codex, si tienes `~/.codex/AGENTS.override.md`, ese archivo tiene prioridad: copia ahí el bloque `sdd-orquestador`.
- Los hooks dependen de la versión de cada herramienta. Mantenlas actualizadas y revisa con `sdd-harness.js doctor`.

## Créditos

Las skills de diseño están inspiradas en [Impeccable](https://github.com/pbakaus/impeccable) de Paul Bakaus (Apache 2.0); ver `NOTICE`. Los conceptos de *harness engineering* (guías y sensores, controles deterministas, verificación de punta a punta) se basan en el trabajo público de OpenAI, Anthropic y Martin Fowler sobre el tema.
