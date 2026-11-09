# Orquestador SDD

**Un harness para tus agentes de IA de programación: controles por código (hooks), verificación de resultados, menos tokens y memoria por proyecto.**

Funciona dentro de **Claude Code, Codex, GitHub Copilot, Cursor, Gemini CLI y OpenCode**, con tu suscripción de siempre. No es una app aparte: el harness son scripts locales de Node.js, sin servidores, red ni claves de API. Tu herramienta de IA sigue enviando el contexto a su proveedor como siempre.

[![Pruebas](https://github.com/thomassr30/orquestador-ia/actions/workflows/pruebas.yml/badge.svg)](https://github.com/thomassr30/orquestador-ia/actions/workflows/pruebas.yml)
[![Licencia MIT](https://img.shields.io/badge/licencia-MIT-blue.svg)](LICENSE)
[![Node.js 18+](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
![Windows · macOS · Linux](https://img.shields.io/badge/Windows%20%C2%B7%20macOS%20%C2%B7%20Linux-lightgrey.svg)

Se instala **una vez** y queda activo en **todos tus proyectos**.

---

## Índice

- [¿Por qué?](#por-qué)
- [Así se ve](#así-se-ve)
- [Qué incluye](#qué-incluye)
- [Qué garantiza y qué no](#qué-garantiza-y-qué-no)
- [Herramientas compatibles](#herramientas-compatibles)
- [Instalación](#instalación)
- [Uso diario](#uso-diario)
- [Servidores MCP](#servidores-mcp) · [Azure DevOps](#azure-devops) · [Del work item al plan](#del-work-item-al-plan)
- [Cuánto cuestan las skills](#cuánto-cuestan-las-skills) · [Varias tareas a la vez (worktrees)](#varias-tareas-a-la-vez-worktrees)
- [Cómo funciona el harness](#cómo-funciona-el-harness)
- [Verificación de resultados](#verificación-de-resultados)
- [Trabajo verificable](#trabajo-verificable)
- [Aprobaciones en el chat](#aprobaciones-en-el-chat)
- [Modo estricto y fallas internas](#modo-estricto-y-fallas-internas)
- [Eventos y presupuestos](#eventos-y-presupuestos)
- [Ahorro de tokens](#ahorro-de-tokens)
- [Configuración](#configuración)
- [Evaluaciones](#evaluaciones)
- [Memoria del proyecto](#memoria-del-proyecto)
- [Arquitectura](#arquitectura)
- [Diagnóstico y problemas frecuentes](#diagnóstico-y-problemas-frecuentes)
- [Preguntas frecuentes](#preguntas-frecuentes)
- [Migración a 3.1.0](#migración-a-310) · [Migración a 3.0.0](#migración-a-300)
- [Actualizar, personalizar y desinstalar](#actualizar-personalizar-y-desinstalar)
- [Contribuir](#contribuir) · [Seguridad](#seguridad) · [Licencia](#licencia)

---

## ¿Por qué?

Los agentes de IA son muy capaces, pero en el trabajo diario a veces:

- hacen commit o push sin que lo pidas, o leen tu `.env`;
- empiezan a editar antes de que revises qué van a hacer;
- dicen "listo" con los tests en rojo;
- pierden el hilo cuando la conversación se compacta;
- gastan medio plan en una tarea chica.

Una instrucción escrita ("no hagas commit sin preguntarme") depende de que el modelo la recuerde. Este proyecto agrega dos cosas:

1. **Controles por código (hooks)**: scripts locales que tu herramienta ejecuta antes y después de cada acción. Permiten, bloquean o piden confirmación aunque el modelo olvide las reglas, siempre que la herramienta invoque el hook y respete su respuesta.
2. **Un orquestador con especialistas**: entiende el pedido, ajusta el esfuerzo a su tamaño, presenta un plan, implementa en paralelo y verifica.

Un agente es **modelo + harness**. El modelo lo pone tu herramienta; el harness lo pone este repositorio. Los hooks no son un sandbox: qué controla el código, qué queda en manos de la herramienta y qué depende solo de las instrucciones está en [Qué garantiza y qué no](#qué-garantiza-y-qué-no).

> **SDD** (*Spec-Driven Development*, desarrollo guiado por especificaciones): entender → especificar → planificar → **aprobar** → construir → verificar.

## Así se ve

```text
Tú:      agrega exportación a Excel en el listado de clientes

Agente:  [SDD] Flujo: new · tamaño mediano
         Plan: qué y por qué · archivos por capa · tests · riesgos
         ¿Apruebo la implementación? (sí / no / ajustes)
           ↳ si intenta editar antes, el harness lo bloquea

Tú:      si

Agente:  implementa → el harness corre lint, tipos y tests de lo modificado
           ↳ si algo falla o no se pudo verificar, se le pide corregir; lo omitido
             queda «no verificado», nunca como aprobado
         Listo. Commit sugerido: "feat(clientes): exportar listado a Excel"
           ↳ sin "Co-Authored-By" ni firmas de IA; lo hace solo si confirmas
```

Para algo trivial no hace falta plan: `cambia el título a "Clientes", directo`. Para trabajar sin el orquestador el resto de la conversación: `sin sdd`.

## Qué incluye

| | |
|---|---|
| **Permisos por código** | Nada de PR ni issues en GitHub/GitLab/Azure Repos, tampoco por MCP (los work items de Azure Boards se escriben con tu confirmación: son tickets, no código). Commit y el resto de git (push, merge, rebase, reset, stash…) solo con tu confirmación, para ese comando exacto. Secretos protegidos y comandos destructivos bloqueados. Pide confirmación para infraestructura, bases de datos, borrados, dependencias y configurar servidores MCP. |
| **Commits sin firma de IA** | Los mensajes de commit sugeridos van sin `Co-Authored-By: Claude`, `Generated with…` ni `Made-with: Cursor`: si aparecen, el harness pide reescribirlos, y un `git commit` que los trae se bloquea. En Claude Code, además, se desactiva la atribución. |
| **Plan antes de editar (GATE)** | Las ediciones y los comandos que el harness reconoce como escritura quedan bloqueados hasta que respondas `sí`. Se exceptúa lo que el harness reconoce como consulta, saludo, aprobación o pedido directo. |
| **Verificación al terminar** | Lint, tipos, tests y reglas propias sobre lo que cambió, también por comandos de shell. Cada control queda aprobado, fallido o **no verificado**; lo que no corrió nunca cuenta como aprobado. Node/TS, Angular y Go automáticos; plantillas para Android, iOS y SCSS. |
| **Trabajo verificable** | Plan con requisitos, criterios y tareas guardado fuera del repo. Una tarea se da por hecha solo con evidencia del harness sobre el contenido actual; la aceptación funcional la marcas tú. |
| **Aprobaciones exactas** | En las herramientas que confirman en el chat, cada «sí» vale para esa acción exacta, una vez y por 30 minutos. |
| **Memoria por proyecto** | `.sdd/memoria/` se carga al iniciar y, según la herramienta, tras compactar. Cada proyecto tiene la suya; no mezclarlas es una regla para la IA (ver [Memoria](#memoria-del-proyecto)). |
| **Varios proyectos a la vez** | En una carpeta con varios proyectos o un workspace de VS Code: mapa de todos los proyectos para que la IA busque en todos, y memoria, reglas, sensores y deshacer de cada uno. |
| **Ahorro de tokens** | Esfuerzo según el tamaño del pedido, tope de sub-agentes, salidas de tests compactadas y reportes cortos. |
| **Especialistas** | 1 orquestador, 22 sub-agentes, 105 skills (backend, frontend, mobile, bases de datos, DevOps, testing, diseño) y 19 comandos. |
| **Deshacer lo que hizo la IA** | Antes de cada turno que modifica archivos se guarda un punto de restauración (fuera del repo, sin commits ni secretos). `deshacer` vuelve los archivos a ese punto, en cualquier herramienta. |
| **Arquitectura vigilada por código** | Reglas de capas (qué no puede importar qué), nombres de archivo, tamaño máximo y patrones prohibidos, cada una con el mensaje que le enseña a la IA cómo hacerlo bien. |
| **Defensa contra instrucciones inyectadas** | Si la sesión leyó una web, un ticket o un MCP externo, los comandos y URLs que el harness reconoce como envío de datos afuera piden tu confirmación (detección por patrones, no exhaustiva). Las claves y tokens con formato conocido escritos en el código se bloquean. |
| **Evaluaciones** | Pruebas deterministas sin modelos en cada `npm test`, y evaluaciones con modelos (manuales, con `--confirmar`) para comparar corridas compatibles y detectar regresiones. |

## Qué garantiza y qué no

Cada protección cae en una de cuatro categorías. Lo que figura como implementado por el harness tiene pruebas deterministas en `harness/test/`; aun así, solo actúa cuando la herramienta invoca el hook y respeta su respuesta.

**Implementado por el harness (código):**

- Decisión sobre cada acción que la herramienta le pasa al hook: escritura en el repositorio de GitHub/GitLab/Azure Repos bloqueada (los work items de Azure Boards piden confirmación); archivos con secretos, comandos destructivos y commits con atribución de IA bloqueados; confirmación para `git commit` (con aviso en `--amend`), el resto de git, infraestructura, bases de datos, borrados, dependencias, MCP que escriben, configuración del harness o de los hooks y escrituras fuera del proyecto (salvo la carpeta temporal del sistema).
- Las mismas protecciones de rutas para los comandos de shell cuando el destino es reconocible (redirecciones, `sed -i`, `cp`/`mv`, `tee`, cmdlets de PowerShell…). Es de mejor esfuerzo.
- GATE: sin plan aprobado se bloquean las ediciones y los comandos reconocidos como escritura.
- Verificación al terminar el turno con resultados explícitos (aprobado, fallido, no verificado, bloqueado, excepción). Lo omitido nunca cuenta como aprobado. Los cambios hechos por shell se detectan con git.
- Aprobaciones en el chat ligadas a la acción exacta, de un solo uso y con vencimiento.
- Estado con candado, escritura atómica y recuperación restrictiva si se daña.
- Trabajo verificable: la aprobación congela el plan y una tarea solo queda verificada con evidencia del harness.
- Eventos estructurados sin contenido, puntos de restauración y tope de sub-agentes.

**Delegado a la herramienta de IA:**

- Invocar el hook en cada acción y respetar `deny` o `ask`. `doctor` puede confirmar que la herramienta invoca los hooks (nivel d), no que respete cada respuesta.
- El diálogo de confirmación nativo (Claude Code y Copilot).
- La confirmación de git que escribe en Codex (reglas `prompt`) y OpenCode (permiso `ask`).
- Los comandos que el harness no reconoce como seguros en modo `normal`: los decide la herramienta con sus propios permisos.
- Las lecturas fuera del proyecto (salvo archivos con secretos, que se bloquean).
- El aislamiento de archivos, procesos y red: sandbox de la herramienta o un contenedor.

**Recomendado por instrucciones (depende de que el modelo las siga):**

- Clasificar el pedido, presentar el plan y escalar el esfuerzo. El GATE se activa por defecto y solo se abstiene con lo que reconoce como consulta, saludo, aprobación o pedido directo: así una redacción que no usa los verbos habituales («pon el logo arriba», «necesito que el botón quede a la derecha») exige plan igual.
- Registrar el plan verificable (`trabajo plan`) en pedidos medianos y grandes. Sin ese registro no hay modelo de trabajo que congelar.
- Mostrar el comando o cambio exacto antes de pedir un «sí» en el chat.
- Usar solo la memoria del proyecto en curso y guardar ahí lo durable.

**No disponible:**

- Sandbox o aislamiento propio. Los hooks no son un sandbox.
- Garantía de éxito funcional: «técnicamente completo» significa que los controles automáticos tienen evidencia vigente; la aceptación la marcas tú.
- Detección completa de escrituras por shell: scripts e intérpretes pueden escribir sin que se reconozca el destino.
- Medición de tokens fuera de Claude Code y costo por sesión en cualquier herramienta (solo las evaluaciones con modelos registran el costo que informa el cliente).
- Prueba automática de la integración con cada herramienta real: las pruebas usan payloads simulados.

Los riesgos residuales conocidos están en [`SECURITY.md`](SECURITY.md#límites-y-riesgos-residuales).

## Herramientas compatibles

Capacidades que declara cada adaptador según su código (`harness/src/adapters/*.js`, `harness/src/capacidades.js`). Ninguna está confirmada en la herramienta real hasta que `doctor` registra eventos reales de ella (nivel d).

| Herramienta | Bloqueo previo | Confirmación | Al terminar el turno | Tras compactar | Resultados observados | Consumo de tokens | Evidencia |
|---|---|---|---|---|---|---|---|
| **Claude Code** (CLI, VS Code, JetBrains, desktop) | sí | diálogo nativo | bloquea | reinyecta el contexto | ediciones | medido | declarado, sin confirmar en el cliente real |
| **Codex** (CLI, app, IDE) | parcial: Bash, `apply_patch` y MCP; hay que aprobar los hooks con `/hooks` | en el chat; git por reglas `prompt` | bloquea | reinyecta el contexto | ediciones | no disponible | declarado, sin confirmar en el cliente real |
| **Gemini CLI** | sí | en el chat | pide reintentar | reinyecta en el siguiente mensaje | ediciones | no disponible | declarado, sin confirmar en el cliente real |
| **Cursor** | sí (comandos, lecturas, MCP; en `preToolUse` solo ediciones, tareas y web) | en el chat | pide reintentar (mensaje de seguimiento, máx. 3) | solo guarda la sesión antes; la IA relee la memoria | ediciones | no disponible | declarado, sin confirmar en el cliente real |
| **GitHub Copilot** (VS Code modo agente, Copilot CLI) | sí (hooks en vista previa) | nativa: pasa `ask`; que el host muestre el diálogo no está verificado | bloquea | solo guarda la sesión antes; la IA relee la memoria | todas las herramientas | no disponible | declarado, sin confirmar en el cliente real |
| **OpenCode** (plugin) | sí | en el chat; git por permiso `ask` | pide reintentar (mensaje tras `session.idle`) | reinyecta el contexto | todas las herramientas | no disponible | declarado, sin confirmar en el cliente real |

- **Salidas compactadas** (errores y resumen en vez de miles de líneas): Claude Code, Codex, Gemini CLI y OpenCode. Cursor y Copilot no permiten reescribir el comando. En Claude Code solo se compacta un comando que tus reglas de permiso ya permiten y que ninguna regla de preguntar o denegar toca: compactar nunca concede un permiso (detalle en [`SECURITY.md`](SECURITY.md)).
- **Copilot**: funciona con cualquier modelo del selector (también Claude), en sesiones con destino *Copilot*.
- **"En el chat"**: la herramienta no tiene diálogo de aprobación; el harness rechaza la acción, el agente te muestra el comando exacto y espera tu `sí`. Detalle en [Aprobaciones en el chat](#aprobaciones-en-el-chat).
- **Aislamiento**: `doctor` informa `sandbox.enabled` de Claude Code (aísla los comandos Bash, no las herramientas de edición) y `sandbox_mode` de Codex cuando están en su configuración de usuario. En las demás herramientas figura como desconocido.

## Instalación

**Requisitos:** [Node.js](https://nodejs.org) 18 o superior, Git y al menos una de las herramientas de arriba. Docker es opcional (tests contra PostgreSQL o SQL Server reales).

```bash
git clone https://github.com/thomassr30/orquestador-ia.git
cd orquestador-ia
node install.js
```

El instalador detecta qué herramientas tienes y configura cada una. Antes de tocar un archivo tuyo guarda una copia `*.bak-sdd`, y solo agrega lo suyo: lo que ya tenías no se modifica.

**Pasos extra según la herramienta:**

- **Codex**: ejecuta `/hooks` dentro de Codex para aprobar los hooks (Codex no ejecuta hooks nuevos sin tu aprobación) y reinícialo.
- **Cursor**: pega `core/rules/global.md` en *Settings → Rules → User Rules*. Los hooks sí se instalan solos.
- **Gemini CLI**: puede avisarte la primera vez que encuentre hooks nuevos. Es esperado.

**Comprueba que quedó activo:**

```bash
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" doctor
```

Por cada herramienta muestra hasta qué nivel llega la evidencia:

| Nivel | Qué significa |
|---|---|
| (a) configuración encontrada | Los hooks del harness están registrados en la configuración de la herramienta. |
| (b) hook ejecutable | El comando registrado responde. |
| (c) prueba sintética aprobada | Con payloads simulados (`SDD_DOCTOR=1`, en un proyecto y estado temporales): bloquea `gh pr create`, pide confirmación para una decisión crítica y actúa al terminar el turno. No es una integración confirmada. |
| (d) integración confirmada | El harness recibió eventos reales de esa herramienta (`~/.sdd-orquestador/observado.json`). Confirma que la herramienta invoca los hooks, **no** que respete cada respuesta. |
| (e) limitaciones | Capacidades no disponibles o degradadas según la tabla de arriba. |

También muestra el modo, configuraciones ilegibles, sesiones dañadas o recuperadas, la clave de aprobaciones, la línea base y el último error interno del hook. `doctor --json` da el detalle con respaldo archivo:línea.

Para llegar al nivel (d), abre tu IA en cualquier proyecto y pídele *"lee el archivo .env"*: debe responder con un bloqueo `[harness]`. Desde entonces `doctor` muestra esa herramienta en (d).

<details>
<summary><b>Opciones del instalador</b></summary>

```bash
node install.js --targets=all             # todas las herramientas, aunque aún no estén instaladas
node install.js --targets=claude,codex    # solo algunas (claude, codex, copilot, cursor, gemini, opencode)
node install.js --dry-run                 # muestra qué haría, sin escribir nada
node install.js --no-hooks                # solo guías (agentes y skills), sin controles por código
node install.js --no-mcp                  # sin registrar Playwright, Context7 ni Chrome DevTools
node install.js --mcp=figma              # registra también Figma (apagado por defecto; ver «Servidores MCP»)
node install.js --auto-edits              # Claude Code acepta ediciones sin preguntar
node install.js --no-permissions          # sin permisos preaprobados en Claude Code
node install.js --detect                  # vuelve a detectar las herramientas instaladas
node install.js --uninstall               # desinstala todo (conserva tu harness.json)
```

Reinstalar es seguro: no duplica nada y recuerda dónde instalaste.

</details>

<details>
<summary><b>Qué se instala y dónde</b></summary>

`~` es tu carpeta de usuario (`C:\Users\<tú>` en Windows).

| | Skills | Sub-agentes | Reglas globales | Harness (hooks) |
|---|---|---|---|---|
| Claude Code | `~/.claude/skills` | `~/.claude/agents` | `~/.claude/CLAUDE.md` | `~/.claude/settings.json` |
| Codex | `~/.agents/skills` | `~/.codex/agents` | `~/.codex/AGENTS.md` | `~/.codex/hooks.json` + `~/.codex/rules/sdd-orquestador.rules` |
| Copilot | `~/.agents/skills` | `~/.copilot/agents` | `~/.copilot/copilot-instructions.md` | `~/.copilot/hooks/sdd-orquestador.json` |
| Cursor | `~/.agents/skills` | `~/.cursor/agents` | manual (ver arriba) | `~/.cursor/hooks.json` |
| Gemini CLI | `~/.agents/skills` | `~/.gemini/agents` | `~/.gemini/GEMINI.md` | `~/.gemini/settings.json` |
| OpenCode | `~/.agents/skills` | `~/.config/opencode/agents` | `~/.config/opencode/AGENTS.md` | `~/.config/opencode/plugins/sdd-harness.js` |

El código del harness, los scripts y tu configuración quedan en `~/.sdd-orquestador/`.

</details>

## Uso diario

Abre tu IA en la carpeta del proyecto y escribe normal. El orquestador detecta qué necesitas:

```text
¿dónde se valida el correo del usuario?          → [SDD] Flujo: ask
agrega exportación a Excel en el listado         → [SDD] Flujo: new
al guardar el formulario no aparece la alerta    → [SDD] Flujo: fix
revisa los cambios antes de subir                → [SDD] Flujo: review
muéstrame cómo se ve /clientes en móvil          → [SDD] Flujo: browser
```

- **Pedido de cambio → plan → tu "sí"**: el agente explora y te muestra el plan en el chat. Apruébalo como te salga: `sí`, `dale`, `ok`, `ya`, `desarrolla`, `impleméntalo`, `procede con el plan`, `sí, pero…` (con o sin tilde). Antes de tu aprobación la IA puede leer, buscar y correr tests; lo que se frena son las ediciones y los comandos que el harness reconoce como escritura. Un comando que escribe sin que se reconozca (por ejemplo, dentro de un script) no lo frena el GATE.
- **"directo"** para cambios triviales: edita sin plan y pasa igual por los sensores. Vale para ese mensaje.
- **"sin sdd"** apaga el orquestador **para el resto de la conversación**: la IA trabaja como asistente normal, sin flujos, sub-agentes ni plan. **"con sdd"** lo vuelve a encender. Las reglas de git y secretos siguen activas.
- **Al terminar**, el harness revisa lint, tipos, tests y reglas propias de lo modificado. Si algo falla o un control obligatorio no se pudo verificar, el agente debe corregirlo; no puede presentarlo como verificado. Ver [Verificación de resultados](#verificación-de-resultados).
- **Sin archivos de trabajo**: análisis, planes y reportes quedan en el chat. Si quieres un documento, pídelo.
- **Git**: la lectura (`status`, `diff`, `log`, `show`, `blame`) es libre. Commit, push, pull, merge, rebase, reset, stash, checkout y ramas los puede hacer **con tu confirmación**: antes te explica qué hará (en un commit, te muestra el mensaje, sin firmas de IA), y si algo descarta cambios o reescribe la historia o el remoto lo dice.
- **MCP**: puede conectar o configurar servidores MCP (`codex mcp add`, `claude mcp add`, `.mcp.json`…) mostrándote antes el cambio; tú lo confirmas.

<details>
<summary><b>Comandos para forzar un flujo</b> (en Codex se escriben con <code>$</code> en vez de <code>/</code>)</summary>

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
| **Navegador**: ver, inspeccionar o verificar visualmente | `/sdd-browser <qué>` | ❌ |
| **QA funcional / UAT** | `/sdd-qa <qué probar>` | ❌ |
| **Diseño** de una pantalla (criticar, auditar, pulir, textos) | `/sdd-ux <pedido>` | Revisiones no; mejoras con plan |
| **Trabajar un ticket** (Jira, Azure Boards, GitHub, GitLab, Linear) | `/sdd-ticket ABC-123` | ✅ tras tu aprobación |
| **Prototipo** visual antes de implementar | `/sdd-prototype <pantalla o flujo>` | Solo el prototipo |
| **Dependencias**: auditar y actualizar por lotes | `/sdd-deps [objetivo]` | ✅ lotes aprobados |
| **Verificar un despliegue** (pods, logs, config, smoke) | `/sdd-deploy-check <servicio> <entorno>` | ❌ |
| **Memoria** del proyecto: ver, guardar, compactar, olvidar | `/sdd-memory [acción]` | Solo `.sdd/memoria/` |
| **Retomar** algo a medias / ver el **estado** | `/sdd-continue` · `/sdd-status` | — |
| **Mejorar el orquestador** con evidencia | `/sdd-improve` | Solo con tu aprobación |

</details>

## Servidores MCP

Los servidores MCP dan a la IA herramientas externas: navegador, documentación, diseños. El instalador los registra en cada herramienta (Claude Code, Codex, Gemini CLI, Cursor, Copilot y OpenCode) con el formato de cada una, sin duplicar los que ya existen. La lista está en `config/mcp.json`.

| Servidor | Para qué | Tipo | Por defecto |
|---|---|---|---|
| `playwright` | Abrir páginas, capturar pantallas, probar flujos (QA, revisión visual) | local (`npx`) | activo |
| `chrome-devtools` | Consola, red, rendimiento y Lighthouse | local (`npx`) | activo |
| `context7` | Documentación actualizada de librerías y frameworks | local (`npx`) | activo |
| `figma` | Leer los diseños de Figma que debes implementar | remoto (`https://mcp.figma.com/mcp`) | apagado |
| `azure-devops` | Leer work items (HU, PBI, task), wikis, backlog y WIQL de Azure DevOps | remoto, uno por organización | apagado |

`node install.js --no-mcp` no registra ninguno. Desinstalar el orquestador no los quita (pueden usarlos otras herramientas).

### Figma

1. **Registrar**: `node install.js --mcp=figma` (una vez; las reinstalaciones siguientes lo mantienen). Para que se registre siempre, pon `"enabled": true` en `figma` dentro de `config/mcp.json`. Es el servidor remoto: sirve con Figma en la web y no necesita la app abierta.
2. **Iniciar sesión una vez en cada herramienta** (el instalador lo recuerda al final):

   | Herramienta | Cómo |
   |---|---|
   | Claude Code (terminal o VS Code) | `/mcp` → **figma** (no «claude.ai Figma») → *Authenticate* |
   | Codex | `codex mcp login figma` |
   | Gemini CLI | `/mcp auth figma` |
   | OpenCode | `opencode mcp auth figma` |
   | Cursor | *Settings → MCP* → figma → *Login* |
   | VS Code Copilot | en `mcp.json`, *Start* sobre figma y aceptar |

   Se abre una página de figma.com: acepta con la cuenta que tiene acceso a los diseños.
3. **Comprobar**: `claude mcp list` debe mostrar `figma … ✔ Connected`. Dentro de la conversación, «¿con qué cuenta de Figma estás conectado?» usa `whoami` (cuenta, plan y asiento).
4. **Usar**: en el proyecto, pega el enlace del frame (clic derecho → *Copy link to selection*): «implementa esta pantalla: <enlace>». La skill `figma-design` lee el diseño, muestra el inventario (componentes, variables, medidas, assets), lo traduce a los tokens y componentes del proyecto, compara el resultado con la captura de Figma en el navegador y guarda el enlace del archivo en la memoria del proyecto (`diseno.md` → «Fuente de diseño»); después basta con «según el Figma».

La conexión es a tu **cuenta**, no a un proyecto: ve los archivos a los que tu cuenta tiene acceso. Si un cliente usa otra cuenta, pide que te invite con el correo que conectaste.

**Límites según plan y asiento de Figma**

| Asiento | Leer diseños | Modificar diseños | Lecturas por MCP |
|---|---|---|---|
| View / Collab, o plan Starter | sí | no | pocas al mes |
| Dev (plan de pago) | sí | no | uso diario |
| Full (plan de pago) | sí | sí, con confirmación de cada acción | uso diario |

**Alternativa con la app de escritorio**: en Figma de escritorio, Dev Mode → *Enable desktop MCP server*, y agrega a `config/mcp.json` un servidor `{ "enabled": true, "url": "http://127.0.0.1:3845/mcp" }` con otro nombre (por ejemplo `figma-desktop`). Trabaja sobre lo seleccionado en la app; requiere asiento Dev o Full.

### Azure DevOps

Sirve para que el orquestador lea tus HU, PBI, task y wikis, y arme el plan de desarrollo a partir de eso (ver [Del work item al plan](#del-work-item-al-plan)).

La URL del servidor incluye tu organización, la de `dev.azure.com/<organización>`, así que hay que indicarla:

```bash
node install.js --mcp=azure-devops --org=siigsa
```

Después inicia sesión una vez en cada herramienta (en Claude Code: `/mcp` → `azure-devops-siigsa` → Authenticate). Sin `--org` el instalador avisa y no lo registra, porque no puede armar la URL.

**El nombre del servidor lleva la organización** (`azure-devops-siigsa`). Eso no es un detalle: dos organizaciones son dos cuentas distintas, y si los dos servidores se llamaran igual, el inicio de sesión de una pisaría el de la otra.

#### Varios proyectos en organizaciones distintas

Es el caso normal cuando trabajas para más de un cliente: un repositorio cuyos work items están en la organización de tu empresa y otro en la del cliente. Registra el servidor **dentro de cada repositorio** con `--proyecto`:

```bash
cd C:/dev/proyecto-a && node install.js --mcp=azure-devops --org=miempresa --proyecto
cd C:/dev/proyecto-b && node install.js --mcp=azure-devops --org=cliente   --proyecto
```

Así cada ventana de tu herramienta de IA ve **solo** la organización de su repositorio. No tienes que aclararle de cuál leer: le dices «lee el PBI 4521» y esa ventana solo puede buscarlo donde corresponde. Y el contexto de cada sesión no carga las herramientas de las demás organizaciones.

Detalles del modo `--proyecto`:

- Registra **solo** lo que pides con `--mcp`. Los servidores de siempre (`playwright`, `context7`, `chrome-devtools`) ya están a nivel de usuario y duplicarlos en el repositorio solo sumaría herramientas al contexto.
- Escribe en el archivo de MCP **por proyecto** de cada herramienta: `.mcp.json` en Claude Code (el que se usa por defecto), y con `--targets=cursor,copilot,opencode,gemini` en las demás. Codex no admite MCP por proyecto: solo globales.
- Ese archivo queda **dentro del repositorio**, así que si haces commit lo comparten tus compañeros. Si no quieres eso, agrégalo al `.gitignore`.
- Anota la organización en la memoria del proyecto (`.sdd/memoria`), que es lo que pide la skill `tracker-azure-boards`, junto con el proyecto, el equipo, el area path y el proceso (Agile, Scrum o CMMI), porque de eso dependen los estados válidos de un work item.

#### Qué puede y qué no puede hacer en Azure

| Acción | Qué pasa |
|---|---|
| Leer work items, wiki, backlog, WIQL, pipelines, planes de prueba | pasa libre |
| Comentar un work item, cambiar su estado, vincularlo | **pide tu confirmación** |
| Editar una página de wiki, crear un plan de prueba, lanzar un pipeline | **pide tu confirmación** |
| Crear o actualizar un pull request, crear una rama | **bloqueado** (es código: se propone como texto) |

El harness reconoce la escritura también cuando viene en el argumento `action` de una herramienta agrupada: `wit_backlog` es lectura con `list` y escritura con `reorder`, con el mismo nombre.

### Agregar o quitar un servidor

- **Local** (se lanza en tu equipo): `"nombre": { "enabled": true, "command": "npx", "args": ["-y", "paquete@versión"] }`.
- **Remoto** (por URL): `"nombre": { "enabled": true, "url": "https://…/mcp" }`. Si pide inicio de sesión, se hace como en Figma.
- Luego `node install.js`. Sin secretos en `config/mcp.json`: las claves van en variables de entorno o en el inicio de sesión del servidor.
- Para quitar uno: `claude mcp remove <nombre> -s user` en Claude Code, o borra su entrada en el archivo de cada herramienta (`~/.codex/config.toml`, `~/.gemini/settings.json`, `~/.cursor/mcp.json`, `mcp.json` de VS Code, `~/.config/opencode/opencode.json`).

### Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| El panel de MCP de VS Code no muestra el servidor recién instalado | La lista se carga al abrir la conversación: *Developer: Reload Window* o conversación nueva |
| «Server not found» en una URL `claude.ai/api/organizations/…/mcp/start-auth/…` | Es el conector de claude.ai, no el servidor instalado (o el conector es de otra cuenta). Autentica la entrada **figma** de *User* |
| Figma aparece dos veces | Conector de claude.ai y servidor instalado a la vez: usa uno solo |
| «MCP server figma already exists» | Estás en el formulario de agregar: vuelve a la lista y autentica el existente |
| Figma responde con límite de uso | Plan Starter o asiento View/Collab: espera al mes siguiente o pide asiento Dev |
| Figma no encuentra el archivo | La cuenta conectada no tiene acceso: pide invitación con ese correo |
| Un servidor local no arranca en Windows | Verifica `npx` en el PATH; el instalador ya lo envuelve con `cmd /c` |

## Cómo funciona el harness

Tu herramienta ejecuta los hooks en momentos fijos, y cada uno responde permitir, bloquear o avisar:

| Momento | Qué hace |
|---|---|
| Al iniciar y tras compactar | Carga la memoria **de este proyecto** (índice, sesión de trabajo y temas disponibles) y el resumen del trabajo verificable. Tras compactar depende de la herramienta (ver [Herramientas compatibles](#herramientas-compatibles)). |
| Cada mensaje tuyo | Detecta pedidos de cambio, que abren el GATE, y tus aprobaciones (`sí`, `dale`, `directo`). Separa tu texto del contexto que agregan algunas herramientas (archivo abierto, navegador). |
| Antes de cada comando | **Bloquea** escritura en GitHub o GitLab, commits con una línea de atribución de IA en el mensaje, comandos destructivos, comandos que usan archivos con secretos y comandos que escriben archivos con claves o tokens. **Pide confirmación** para `git commit` (también disfrazado: alias, `npm version`, `release-it`; en `--amend` avisa que reescribe la historia), el resto de git, infraestructura (kubectl, terraform, nube, Vault), clientes de base de datos, borrados, dependencias, `sudo` y configurar servidores MCP. Si el destino de una escritura es reconocible, aplica las mismas protecciones de rutas que a una edición. Antes de aprobar el plan, frena los comandos que reconoce como escritura; lo demás (lectura, tests, lint) corre. Un comando que no reconoce como seguro lo decide la herramienta (en modo `estricto`, pide confirmación). |
| Antes de cada herramienta MCP | Escribir en GitHub o GitLab por MCP se bloquea; lo que escribe en otros servidores pide confirmación. Navegador y documentación quedan libres. |
| Antes de cada edición | Sin plan aprobado no se edita código. No se edita `.git` ni archivos con secretos; cambiar la configuración del harness o de los hooks y escribir fuera del proyecto (salvo la carpeta temporal del sistema) piden confirmación. Revisa tus reglas de arquitectura y bloquea claves o tokens reales en el código. La primera modificación del turno guarda antes un **punto de restauración**. |
| Después de cada edición | Chequeo instantáneo: JSON y YAML válidos, marcadores de conflicto de merge, sintaxis de Go. |
| Al terminar el turno | Si el mensaje de commit sugerido trae una firma de IA (`Co-Authored-By: Claude`…), pide reescribirlo una vez. Detecta con git lo que cambió por comandos de shell. Corre lint, tipos, tests y reglas propias **solo de lo modificado**, por módulo (sirve en monorepos), y clasifica el resultado (ver [Verificación de resultados](#verificación-de-resultados)). Con un trabajo registrado, guarda la evidencia y avisa si el agente dice que terminó sin evidencia. Guarda el estado del trabajo en `.sdd/memoria/sesion.md`. |

**Sensores detectados automáticamente:**

- **Node/TS**: eslint sobre los archivos cambiados, `tsc --noEmit`, y `vitest related` o `jest --findRelatedTests`.
- **Angular**: `ng build --configuration development` (también revisa las plantillas) y Karma en modo headless.
- **Go**: `go vet`, `go test` de los paquetes tocados y `golangci-lint` si está configurado.
- **Android, iOS, SCSS y otros**: plantillas listas en `~/.sdd-orquestador/harness.json` → `sensores._ejemplos`.

**Qué runner de tests usa.** Lo decide el script `test` de tu `package.json`, y siempre lo corre en una sola pasada: el modo observación no termina solo y el harness lo cortaría por tiempo.

| Tu script `test` | Qué corre | Sobre qué |
|---|---|---|
| `ng test` (con la CLI instalada) | `ng test --watch=false --browsers=ChromeHeadless` | la suite completa |
| `karma start` (con o sin Angular) | `karma start --single-run --browsers=ChromeHeadless` | la suite completa |
| `vitest` | `vitest related --run` | solo lo relacionado con lo cambiado |
| `jest`, también con `--watch` | `jest --ci --findRelatedTests` | solo lo relacionado con lo cambiado |
| `mocha` o `jasmine` | el runner sin modo observación | la suite completa |
| otro script propio | `npm test` | la suite completa |
| `nodemon`, o `ng test` sin la CLI | nada: queda **sin verificar** | — |

Cuando corre la suite completa, un test que ya fallaba antes de tu cambio **no se te atribuye**: el resultado queda «no verificado» y te pide tomar la línea base (`sdd-harness linea-base`) sobre el último commit. `sdd-harness doctor` y `sdd-harness sensores` te muestran qué runner detectó en cada proyecto. Si prefieres fijarlo a mano, `sensores.comandos.tests` en `.sdd/harness.json` manda sobre la detección.

**Deshacer lo que hizo la IA.** Antes de la primera modificación de cada turno, el harness guarda una copia del proyecto en un almacén interno (`~/.sdd-orquestador/puntos`). El `.git` del proyecto no se toca ni se crean commits, y no se copian secretos ni lo ignorado por `.gitignore`.

```bash
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" puntos                 # lista los puntos (el 1 es el más reciente)
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" deshacer               # muestra qué volvería atrás
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" deshacer --confirmar   # lo aplica (deshacer otra vez retrocede otro turno)
```

Antes de aplicar se intenta guardar el estado actual para poder rehacer: si se guardó, el comando muestra `Para rehacer: sdd-harness.js deshacer <id> --confirmar`; si no se pudo guardar, no hay rehacer. En el chat puedes pedir *"deshaz lo último"*: la IA te muestra la vista previa y `deshacer --confirmar` pide tu confirmación.

**Carpetas con varios proyectos y workspaces.** Si abres una carpeta que contiene varios proyectos (repos separados, subcarpetas o un monorepo), o un workspace multi-raíz de VS Code (`*.code-workspace`), el harness detecta cada proyecto por sus archivos (`package.json`, `angular.json`, `go.mod`, `pom.xml`, `.csproj`, `pyproject.toml`, `.git`…), en todos los niveles de carpetas, y:

- al iniciar le entrega a la IA un **mapa del espacio** (nombre, ruta, stack y si tiene memoria, una línea por proyecto) con la instrucción de buscar en todos los proyectos involucrados, no solo en el primero;
- carga la **memoria de cada proyecto** cuando lo mencionas o cuando la IA empieza a editar en él (una vez por sesión), y la de la raíz como memoria del espacio, sin mezclarlas;
- aplica las **reglas** y los **sensores** de cada proyecto con su propio `.sdd/harness.json`;
- guarda **puntos de restauración por repo**, incluidos los repos internos, y `deshacer` vuelve atrás todos los que se tocaron en el turno.

```bash
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" workspace             # qué proyectos detectó
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" workspace --aplicar   # workspace multi-raíz: da acceso a las otras carpetas en Claude Code y Codex
```

En un workspace multi-raíz, Claude Code y Codex trabajan sobre la primera carpeta. `workspace --aplicar` agrega las demás (`additionalDirectories` en Claude Code, `writable_roots` en Codex). Copilot y Cursor ya trabajan con todas.

La búsqueda va por niveles y, por defecto, sin límite de profundidad: se detiene al revisar 20.000 carpetas entre todos los niveles; las que se saltan (`node_modules`, `dist`, `.git`, ocultas…) no cuentan. Si el tope se agota, lo más profundo queda sin revisar y el mapa lo avisa. Ambos topes se ajustan con la clave `espacio` de `.sdd/harness.json` (`profundidad`: `null` = sin límite):

```json
{ "espacio": { "profundidad": 6, "maxCarpetas": 40000 } }
```

**Contenido externo.** Una página, un ticket, un PDF o una respuesta de un MCP pueden traer instrucciones escondidas para la IA. Desde que la sesión lee algo externo, los comandos y URLs que el harness reconoce como envío de datos a otro servidor (`curl` con datos, `scp`, `ssh`, `nc`, parámetros largos en una URL) piden tu confirmación con el motivo. La detección es por patrones: un script que arme su propia conexión puede no reconocerse. Tu propia app (`localhost`) no cuenta.

**Comportamiento de diseño:**

- **Ante un error interno**: lo crítico no pasa sin confirmación y lo demás sigue (ver [Modo estricto y fallas internas](#modo-estricto-y-fallas-internas)). Si el módulo del harness no llega a cargar (instalación dañada), el hook no decide nada y la acción sigue; `doctor` muestra el último error registrado.
- **Las protecciones del agente piden tu permiso**: cambiar `harness.json`, los hooks o la configuración de tu IA pide confirmación, también por comandos con destino reconocible. El estado del harness vive fuera del proyecto y el agente no puede escribirlo con sus herramientas ni con comandos que lo nombren.
- **Sin dependencias**: solo Node.js. Sin red ni telemetría. Los sensores lanzan procesos hijos con tiempo límite (al excederlo se termina el árbol de procesos); no quedan servicios residentes.

## Verificación de resultados

Al terminar un turno con código modificado, cada control (lint, tipos, tests, reglas propias) queda en uno de estos estados (`harness/src/resultado.js`):

| Estado | Significa |
|---|---|
| **aprobado** | Corrió y pasó. |
| **fallido** | Corrió y falló. |
| **no verificado** | No se pudo verificar: excedió `timeoutSeg`, la herramienta no está instalada, se agotó `presupuestoSeg`, hubo errores solo en archivos no modificados sin línea base que los explique, o no hay controles aplicables. |
| **bloqueado** | No se ejecutó por una decisión explícita (presupuesto agotado, falta una confirmación). |
| **excepción** | Falló o no se verificó, pero tú autorizaste una excepción para ese mismo contenido. |

- **Lo omitido nunca es verde.** El resultado global es aprobado solo si al menos un control se aprobó y todos los obligatorios están aprobados o con excepción. Un control opcional que no corrió solo se informa.
- **Obligatorios**: `sensores.obligatorios` (por defecto `["tests"]`). Si el proyecto tiene ese control, debe correr y pasar; si falla o queda sin verificar, el cambio no se da por verificado.
- **Reintentos**: si algo falló o un obligatorio quedó sin verificar, el harness impide terminar el turno o pide reintentar (según la herramienta) hasta `sensores.maxBloqueos` veces seguidas (2). Después deja de insistir, pero el resultado sigue pendiente hasta que cambie el contenido de los archivos o autorices una excepción. Agotar los reintentos no aprueba nada.
- **Excepciones**: responde `sí` en el chat a la solicitud que aparece tras los reintentos, o ejecuta desde tu terminal `node "$HOME/.sdd-orquestador/bin/sdd-harness.js" excepcion [control…] --motivo "por qué"`. El agente no puede ejecutar ese comando. La excepción vale solo para el contenido actual: si los archivos cambian, deja de valer.
- **Cambios por shell**: al terminar el turno el harness compara `git status` con la foto anterior, así que lo que se modificó por comandos o scripts también se verifica. Fuera de un repositorio git solo cuentan las ediciones que pasan por los hooks.
- **Reglas propias**: `prohibido` y `noImportar` se revisan también sobre lo cambiado por shell. Una violación que ya estaba en el último commit no se atribuye al cambio.
- **Línea base**: para afirmar con evidencia que un error ya existía, toma la línea base con `sdd-harness.js linea-base`. Requiere que no haya cambios sin commitear en archivos de código; corre los chequeos de proyecto completo sobre el commit actual y guarda sus errores. Vale mientras no cambie el commit. Con ella, un chequeo que solo repite errores conocidos queda aprobado y uno con errores nuevos, fallido.

## Trabajo verificable

En pedidos medianos y grandes, el orquestador registra el plan con `sdd-harness.js trabajo plan` antes de pedirte aprobación: objetivo, requisitos con criterios de aceptación (cada uno ligado a un control como `tests`, a un comando de aceptación o marcado como manual) y tareas con archivos y dependencias. El registro vive en el estado del harness, fuera del repo (`~/.sdd-orquestador/estado/<proyecto>/trabajo.json`).

- **Tu «sí» congela el plan.** Si el agente registra otro plan después, queda como propuesta hasta tu siguiente aprobación: no puede rebajar los criterios por su cuenta. Revisa los criterios antes de aprobar: los comandos de aceptación los propone el agente.
- **Una tarea queda verificada solo con evidencia del harness** (`trabajo verificar <tarea>` corre sus controles y comandos de aceptación) sobre el contenido actual de sus archivos. Si el contenido cambia, la evidencia vence y la tarea vuelve a «por reverificar».
- **Sin progreso**: tres intentos seguidos con el mismo resultado fallido (`trabajo.maxIntentosSinProgreso`) dejan la tarea bloqueada.
- **"Terminé" sin evidencia**: si el agente dice que terminó y el estado verificable dice que falta algo, el hook de fin de turno le muestra qué falta (una vez por situación).
- **Técnicamente completo no es aceptado**: lo primero significa que todo lo automático tiene evidencia vigente; la aceptación funcional la marcas tú.
- El resumen del trabajo se entrega a la IA al iniciar y tras compactar.

```bash
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" trabajo                       # estado: qué falta y por qué
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" trabajo aceptar --motivo "…"  # (solo tú) aceptación funcional
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" trabajo descartar             # (solo tú) descarta el trabajo
```

### Preguntas abiertas

Cuando el agente topa con una duda que no puede resolver (una regla de negocio que nadie definió, un estado que aparece en la wiki pero no en la HU, un campo que cambió de nombre), no la responde suponiendo ni la deja solo en el chat, donde se perdería al compactar la conversación. La registra en el trabajo:

```bash
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" trabajo preguntas   # las abiertas, listas para copiar
```

- Cada pregunta lleva **a quién va dirigida** y **dónde se publica** (un work item, una página). `trabajo preguntas` te las muestra con esos dos datos para que **tú** las publiques y etiquetes a quien corresponda: el harness no escribe en el gestor.
- Si la pregunta bloquea una tarea, esa tarea queda **bloqueada** con su motivo y el resto del trabajo sigue avanzando.
- Una pregunta abierta impide el «técnicamente completo» y aparece en lo que falta: «terminé» no pasa con dudas sin resolver.
- Las preguntas abiertas y las últimas respondidas **se reinyectan tras compactar**, así que no hay que volver a plantearlas.
- Cuando llega la respuesta: `trabajo responder <id> --respuesta "…"`. El agente te informa qué cambió y retoma las tareas que la esperaban.

El agente usa además `trabajo plan | iniciar | bloquear | verificar | decision | preguntar | responder | descartar-pregunta | cerrar` (`cerrar` solo cierra un trabajo aceptado). La carpeta `changes/` y `sdd-state.js` ya no guardan el estado del trabajo: `sdd-state.js` sigue por compatibilidad y avisa que está obsoleto.

## Del work item al plan

Si tu trabajo llega como una HU, un PBI, una task o una página de wiki, dale la clave o el enlace y el orquestador hace esto (skill `sdd-ticket`):

1. **Lee todo el contexto**, no solo la descripción: el work item con su padre y sus hijos, los comentarios (donde suele estar lo que se acordó después de escribirlo), los adjuntos y los enlaces a la wiki y a Figma. Si el punto de partida es una wiki, parte de ahí y busca el work item vinculado.
2. **Lo cruza con tu proyecto**: qué de lo pedido ya existe, qué hay que construir y dónde va según tu arquitectura y tus reglas, con archivos y capas concretas.
3. **Separa lo claro de lo dudoso**, y las dudas van a dos lugares distintos:
   - **Técnicas** (dónde crear el módulo, qué patrón seguir): te las pregunta en el chat, una a la vez.
   - **De negocio o de alcance** (un estado que está en la wiki pero no en la HU, un campo que cambió de nombre, una regla que nadie definió): las registra como [preguntas abiertas](#preguntas-abiertas) y te las entrega listas, con dónde van y a quién etiquetar. **Las publicas tú**: el harness no escribe en Azure.
4. **Registra el plan** y te lo presenta con sus tres partes: lo que está claro y se va a hacer, lo que queda bloqueado esperando respuesta, y lo que queda fuera del alcance.
5. **Desarrolla solo con tu aprobación**, y solo lo que no depende de una pregunta abierta. No hay desarrollo automático.
6. **Cuando llega una respuesta**, te informa qué cambió y qué tareas quedan listas. Si la respuesta cambia el alcance, el plan nuevo queda como propuesta hasta que lo apruebes otra vez.

Para que el agente sepa a quién etiquetar y qué estados son válidos, registra una vez en la memoria del proyecto la organización, el proyecto, el equipo, el area path y el proceso (Agile, Scrum o CMMI tienen estados distintos). Lo pide la skill `tracker-azure-boards`.

## Aprobaciones en el chat

En Codex, Gemini CLI, Cursor y OpenCode no hay diálogo de aprobación por llamada, así que el harness rechaza la acción crítica, el agente te muestra el comando exacto y espera tu `sí` (`harness/src/aprobaciones.js`):

- **Acción exacta**: la confirmación queda ligada al comando normalizado, a los argumentos de la herramienta MCP o al contenido de la edición, además del proyecto y la sesión. Si el agente cambia algo, hace falta una confirmación nueva.
- **Una vez y con vencimiento**: se consume en el primer uso y vence a los 30 minutos (`aprobaciones.vigenciaMin`), tanto pendiente como aprobada. El consumo ocurre bajo el candado del estado: dos llamadas en paralelo no pueden usar la misma aprobación.
- **Varias pendientes**: responde `sí 1,3` o `sí a todas`. Un `sí` solo no aprueba ninguna; el agente debe mostrártelas numeradas.
- **Qué se guarda**: un HMAC de la acción con una clave local aleatoria (`~/.sdd-orquestador/clave-aprobaciones`) y una etiqueta sin valores; nunca el comando ni los argumentos.
- **Claude Code y Copilot** usan su diálogo nativo, que pregunta en cada llamada: ahí la confirmación la gestiona la herramienta.
- **Git en Codex y OpenCode**: el git que escribe lo confirma la propia herramienta (reglas `prompt` en Codex, permiso `ask` en OpenCode), sin doble pregunta.

Decisiones que solo tomas tú: aprobar el plan (`sdd-harness.js aprobar`), autorizar excepciones (`excepcion`), aceptar o descartar el trabajo (`trabajo aceptar | descartar`) y `sdd-state.js --approve | --accept-exception`. La política le niega esos comandos al agente; ejecútalos desde tu terminal o responde en el chat.

## Modo estricto y fallas internas

`modo` en `harness.json`:

| Modo | Ante un error interno del harness | Comandos y herramientas no reconocidos |
|---|---|---|
| `normal` (por defecto) | Falla cerrada solo para lo crítico (git que escribe, dependencias, infraestructura, MCP que escribe, rutas protegidas): se deniega o, con diálogo nativo, se pide confirmación. Lo demás sigue y queda registrado. | Los decide la herramienta con sus propios permisos (`permisos.porDefecto: "deny"` los bloquea). |
| `estricto` | Falla cerrada para todo salvo lecturas. | Piden confirmación, igual que las herramientas que el harness no sabe clasificar. |

- La falla cerrada aplica también si el error ocurre en el adaptador, antes de llegar al núcleo (`bin/sdd-hook.js`).
- Si el estado no se puede bloquear o escribir, el harness no sigue sin candado: lo crítico se deniega con un error explícito.
- Ninguno de los dos modos es un sandbox. Si el módulo del harness no carga en absoluto, el hook no decide y la acción sigue.

## Eventos y presupuestos

**Eventos.** Cada decisión queda en `~/.sdd-orquestador/estado/<proyecto>/eventos.jsonl`, correlacionada por sesión, turno, acción (etiqueta sin valores y huella), aprobación, verificación, reintento, recuperación, presupuesto y motivo de terminación. No guarda prompts, argumentos ni contenido de archivos, y los textos pasan por la redacción de secretos. Rota al pasar 1 MB y conserva 5 archivos rotados.

```bash
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" eventos [n] [--sesion s] [--json]   # últimos eventos
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" eventos --explicar <id>              # cadena de decisiones de un evento
```

`registro` sigue funcionando y muestra los mismos eventos en texto.

**Presupuestos** (`presupuesto` en `harness.json`; los nuevos vienen desactivados):

| Presupuesto | Qué hace | Dónde se aplica |
|---|---|---|
| `maxSubagentes` / `modo` | Tope de sub-agentes por mensaje tuyo; al superarlo pide confirmación. | Todas las herramientas. |
| `maxMinutosPorPedido` | Al agotarse, el harness deja de exigir correcciones en ese turno; lo pendiente sigue sin verificar. | Todas (reloj del harness). |
| `maxTokensSesion` | Al agotarse, se frenan las escrituras y los sub-agentes hasta tu `sí` (otro tramo igual). | Solo donde hay medición: hoy Claude Code, por su transcript («medido»). En el resto figura como no disponible y no se aplica. |

Ninguna herramienta informa el costo por sesión a sus hooks: solo las [evaluaciones con modelos](#evaluaciones) lo limitan (`--max-costo-usd`).

## Ahorro de tokens

Basado en las prácticas publicadas de *context engineering* (Anthropic, Manus, JetBrains Research): darle a la IA el conjunto más chico de información útil.

| Qué hace | Por qué ahorra |
|---|---|
| **Escala el esfuerzo al pedido**: trivial sin sub-agentes, pequeño con 1, mediano con 4 a 5, grande con el flujo completo | Cada sub-agente parte de cero; un sistema multi-agente puede gastar del orden de 15 veces más que un chat |
| **Tope de sub-agentes por código** (modo ahorro: 3 por mensaje tuyo); si quiere más, te pregunta | Una tarea no escala a 10 agentes sin tu "sí" |
| **Compacta las salidas** de tests, lint y build: errores con contexto y resumen; la salida completa queda en un archivo temporal | Las salidas de comandos suelen ser lo más pesado de una tarea |
| **Referencias, no contenido**: rutas y líneas, y reportes de ≤ ~1.500 tokens por sub-agente | Evita copiar archivos de agente en agente |
| **Tests relacionados** durante el trabajo y la suite completa una vez al final | No repite cientos de tests en cada vuelta |
| **Memoria + una tarea por sesión** | El historial no se arrastra; el contexto vuelve con ~2.000 tokens |

**Lo que te toca a ti:**

- Una tarea por sesión: al terminar, `/clear` o una conversación nueva.
- `directo` para los cambios chicos.
- Un modelo intermedio para el día a día (por ejemplo, Sonnet) y el más potente solo para diseño difícil. Los sub-agentes heredan el modelo de la sesión.
- Un esfuerzo de razonamiento medio o alto, no el máximo, salvo que la tarea lo pida.
- Desactiva los servidores MCP que no uses.

En planes que cobran por tokens (por ejemplo, los créditos de GitHub Copilot) esto pesa todavía más. Para ver en qué se fueron los tokens de la última sesión de Claude Code:

```bash
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" consumo
```

## Configuración

Hay una configuración global en `~/.sdd-orquestador/harness.json` y otra por proyecto en `.sdd/harness.json`, que manda sobre la global. Los cambios aplican de inmediato.

```json
{
  "gate": "auto",
  "modo": "normal",
  "sensores": {
    "alTerminar": ["lint", "tipos", "tests"],
    "obligatorios": ["tests"],
    "comandos": { "tipos": "npx tsc --noEmit -p tsconfig.app.json", "tests": "npx vitest related --run {archivos}" },
    "timeoutSeg": 240,
    "maxBloqueos": 2
  },
  "permisos": { "preguntar": ["node scripts/*"], "denegar": ["make deploy"], "mcpLibres": ["jira"], "mcpBloquear": ["notion"] },
  "aprobaciones": { "vigenciaMin": 30 },
  "presupuesto": { "modo": "ahorro", "maxSubagentes": 3, "maxMinutosPorPedido": null, "maxTokensSesion": null }
}
```

| Clave | Valores |
|---|---|
| `gate` | `auto` (por defecto: exige plan salvo consulta, saludo, aprobación o pedido directo) · `pedido` (solo con un pedido de cambio reconocido por su texto, como hasta 3.0.0) · `siempre` (toda edición, también tras una consulta) · `nunca` (sin GATE por código) |
| `modo` | `normal` (por defecto) · `estricto`. Ver [Modo estricto y fallas internas](#modo-estricto-y-fallas-internas). |
| `sensores.alEditar` | Chequeo instantáneo de cada archivo editado (por defecto sí). |
| `sensores.alTerminar` | Controles al terminar el turno (`lint`, `tipos`, `tests`). Vacío = sin sensores; lo modificado queda «no verificado». |
| `sensores.obligatorios` | Controles que, si el proyecto los tiene, deben correr y pasar. Por defecto `["tests"]`. |
| `sensores.comandos` | Comandos propios por sensor; `{archivos}` se reemplaza por los archivos modificados. Vacío = detección automática. |
| `sensores.timeoutSeg` · `presupuestoSeg` · `maxBloqueos` | Tiempo por comando (240 s) · tiempo total al terminar el turno (600 s) · veces seguidas que se impide terminar (2). Lo que no alcanza a correr queda «no verificado». |
| `permisos` | `permitir`, `preguntar`, `denegar`: prefijos de comando que se suman a las reglas fijas (`*` al final es comodín). `mcpLibres`, `mcpBloquear`: servidores MCP. `porDefecto`: `ask` (por defecto: lo no reconocido lo decide la herramienta) o `deny`. `permitirSecretos`: `true` desactiva el bloqueo de archivos con secretos (no recomendado). |
| `aprobaciones.vigenciaMin` | Minutos que vale una confirmación en el chat, pendiente o aprobada (30). |
| `presupuesto` | `modo`: `ahorro` (tope 3 sub-agentes) · `normal` (tope 6) · `libre` (sin tope). `maxSubagentes` fija un tope propio. `maxMinutosPorPedido` y `maxTokensSesion`: `null` = desactivados. |
| `trabajo.maxIntentosSinProgreso` | Intentos seguidos con el mismo resultado fallido que dejan una tarea bloqueada (3). |
| `salida` | `compactar` (por defecto sí): las salidas largas de tests, lint y build llegan como errores y resumen de hasta `maxCaracteres` (4000). |
| `deshacer` | `activo` (por defecto sí) · `maxPuntos` (30) · `excluir`: patrones extra que no se copian a los puntos. |
| `seguridad` | `contenidoExterno` (confirmar envíos de datos reconocidos tras leer algo externo) · `secretosEnCodigo` (bloquear claves con formato conocido en el código, por ediciones o comandos que escriben). Ambos activos por defecto. |

Si un `harness.json` (global o del proyecto) tiene JSON inválido, el harness usa su última versión válida guardada (o los valores por defecto si no hay) y lo avisa al iniciar la sesión y en `doctor`.

**Reglas propias y arquitectura.** Cuando corriges un error que no debe repetirse, o quieres que se respete la arquitectura, conviértelo en regla. El harness la revisa al escribir y el `mensaje` le dice a la IA cómo hacerlo bien:

```json
{
  "reglas": [
    { "nombre": "dominio-sin-infraestructura", "archivos": "src/domain/**",
      "noImportar": ["src/infrastructure/**", "axios", "typeorm"],
      "mensaje": "El dominio no depende de infraestructura: define una interfaz en src/domain y su implementación en src/infrastructure." },
    { "nombre": "componentes-sin-http", "archivos": "src/app/**/*.component.ts", "noImportar": ["@angular/common/http"],
      "mensaje": "Los componentes no llaman HTTP directo: usa un servicio." },
    { "nombre": "sin-innerhtml", "archivos": "src/**/*.{ts,html}", "prohibido": "innerHTML|outerHTML", "excepto": "**/*.spec.ts",
      "mensaje": "La política Trusted Types lo bloquea: usa el componente de íconos del proyecto." },
    { "nombre": "nombres-de-componentes", "archivos": "src/app/**/components/**/*.ts", "nombreArchivo": "\\.component(\\.spec)?\\.ts$",
      "mensaje": "Los componentes se nombran <nombre>.component.ts." },
    { "nombre": "archivos-cortos", "archivos": "src/**/*.ts", "maxLineas": 400, "mensaje": "Separa responsabilidades en archivos más chicos." }
  ]
}
```

| Tipo | Qué revisa | Cuándo |
|---|---|---|
| `noImportar` | Módulos o rutas que esos archivos no pueden importar (JS/TS, Go, Python, Java/Kotlin, C#, SCSS) | Antes de escribir: bloquea |
| `prohibido` | Una expresión regular que no puede aparecer en el contenido nuevo | Antes de escribir: bloquea |
| `nombreArchivo` | El nombre que debe tener un archivo nuevo | Al crearlo: bloquea |
| `maxLineas` | El tamaño máximo del archivo | Después de editar: avisa |

`noImportar`, `prohibido` y `nombreArchivo` se revisan antes de escribir con las herramientas de edición. Lo que cambia un comando de shell se revisa al terminar el turno (`prohibido` y `noImportar`, sin atribuir lo que ya estaba en el último commit). `sdd-harness.js reglas` revisa todo el proyecto. Hay más ejemplos por stack (Angular, React, NestJS, Go) en `~/.sdd-orquestador/harness.json` → `_ejemplosReglas`.

## Evaluaciones

Hay cuatro niveles de prueba, separados a propósito:

| Nivel | Qué prueba | Cómo corre |
|---|---|---|
| **Pruebas deterministas** | Política, GATE, sensores, estado, aprobaciones, trabajo y el corpus de escenarios (`evals/corpus/*.json`: cambio sencillo, corrección con regresión, acción crítica, argumentos cambiados, sensor fallido u omitido, compactación y reanudación, concurrencia, estado corrupto, herramienta desconocida, fallo de hook, recuperación de checkpoint). Sin modelos. | `npm test`; en CI, Ubuntu, Windows y macOS con Node 18, 20, 22 y 24. |
| **Contrato de adaptadores** | Que cada adaptador traduzca un payload nativo al evento normalizado y responda en el formato de su herramienta. Usa payloads simulados: no prueba la herramienta real. | `npm test` (`harness/test/contrato-adaptadores.test.js`). |
| **Evaluaciones con modelos** | Si un cambio al orquestador mejora o empeora el resultado de tareas reales. | Manual con `bin/sdd-eval.js` y `--confirmar`. Consume tokens. En CI solo se valida el archivo de ejemplo. |
| **Integración en herramientas reales** | Que la herramienta invoque los hooks. | `doctor`, nivel (d). |

**Evaluaciones con modelos** (`bin/sdd-eval.js`; formato en [`evals/ejemplo.tareas.json`](evals/ejemplo.tareas.json)):

```bash
node bin/sdd-eval.js evals/mis.tareas.json --validar                 # solo valida el archivo (sale 0 o 2)
node bin/sdd-eval.js evals/mis.tareas.json                           # muestra qué correría, no ejecuta nada (sale 2)
node bin/sdd-eval.js evals/mis.tareas.json --confirmar --linea-base  # corre y fija la referencia para regresiones
node bin/sdd-eval.js evals/mis.tareas.json --confirmar --max-tareas=10 --max-costo-usd=2 --max-minutos=60
```

- **Qué evalúa**: una copia temporal de lo commiteado del proyecto (tu carpeta no se toca; los cambios sin commitear no se evalúan).
- **Aceptación independiente del agente**: `aceptacion.comando` es obligatorio. `aceptacion.archivos` se guardan antes del agente y se restauran antes del comando: si el agente los tocó, la tarea falla. `aceptacion.dir` (fuera del proyecto) se copia recién cuando el agente terminó, así que nunca la ve.
- **Estados con causa**: aprobado · fallido (causa `agente`, `aceptacion` o `infraestructura`) · no verificado (la aceptación no pudo correr) · bloqueado (causa `presupuesto`: las ejecuciones que no caben en `--max-*` no se lanzan; una tarea en curso no se interrumpe).
- **Salida**: 0 todo aprobado y sin regresiones · 1 alguna tarea no aprobada o regresiones sobre `umbrales.maxRegresiones` · 2 uso o archivo inválido, o falta `--confirmar` · 3 falla de infraestructura. Precedencia 2 > 3 > 1 > 0.
- **Modo**: `sin-gate` (por defecto) apaga el GATE en la copia; `flujo` lo respeta y, si el agente deja la pregunta del GATE, responde `sí` una vez (`--resume`) y lo registra como intervención guionada.
- **Metadatos por corrida** (`<tareas>.resultados.json`, formato v2): versión y hash del dataset, commit del proyecto y si el árbol estaba limpio, versión del harness y hash del `.sdd/harness.json` commiteado, cliente, su versión y modelo, y tokens y costo como «medido» o «no_disponible».
- **Comparación**: solo con corridas compatibles (mismo dataset, cliente, modelo, modo y configuración). Regresión = tarea aprobada en la línea base compatible que ahora no se aprueba. No se calculan porcentajes de mejora.
- **Límites actuales**: solo el cliente `claude` está implementado; Codex está pendiente. El modo `flujo` y la lectura del JSON del cliente están probados con un ejecutable falso, no contra Claude Code real.

## Cuánto cuestan las skills

El nombre y la descripción de **cada skill instalada** entran en el contexto de todas tus sesiones. Las 105 suman unos **6.400 tokens**. El contenido completo de una skill (~47.700 tokens entre todas) **no** entra: tu cliente lo lee recién cuando el agente la usa.

Así que lo que baja ese costo fijo es no instalar las de tecnologías que no usas. Se declara en `config/skills.json`:

```json
{ "excluir": ["tracker-jira", "tracker-linear", "ci-jenkins", "deploy-*"] }
```

Acepta nombres y patrones con `*` al final, y el archivo trae ejemplos listos para copiar. Por línea de comandos: `--sin-skills=ci-*,tracker-jira` se suma a la lista, y `--skills=sdd-*,stack-angular` instala **solo** esas. Las skills del flujo (`sdd-*` y `tracker-common`) nunca se excluyen: son el orquestador, no una tecnología.

Al instalar verás cuántas quedaron y cuánto cuestan, y `sdd-harness.js doctor` lo repite para lo que tienes puesto:

```
Skills (77 de 105, ~4675 tokens de descripciones en cada sesión) → ~/.claude/skills
```

Reinstalar limpia las que quedaron fuera, así que para cambiar la selección basta editar la lista y correr `node install.js` de nuevo.

## Varias tareas a la vez (worktrees)

El problema: tienes dos ventanas de tu herramienta de IA en el mismo proyecto, cada una en algo distinto, y te llega una tarea urgente. Cambiar de rama en la carpeta obliga a revertir o guardar lo que está en curso, y al volver hay que empezar de nuevo.

La solución de git es un **worktree**: una carpeta más del mismo repositorio, con su propia rama, que comparte el historial. Lo que commiteas en una existe al instante para las demás, sin copiar archivos entre carpetas.

```bash
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" worktree listar                     # qué worktrees hay y cómo están
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" worktree nuevo fix/urgente          # carpeta hermana con esa rama
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" worktree sincronizar                # qué entraría de la base y qué choca
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" worktree sincronizar --confirmar     # lo mezcla
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" worktree cerrar fix/urgente --confirmar
```

- **`nuevo <rama>`** crea `../<proyecto>-<rama>` con la rama nacida de la base **actualizada** (`develop`, o `main`/`master` si no hay; `--desde <rama>` para otra, `--ruta` para elegir la carpeta). No toca lo que tengas en curso en la carpeta actual. Abre tu herramienta de IA en la carpeta nueva y listo.
- **`sincronizar`** trae la base y, sin `--confirmar`, **solo muestra**: qué commits entran, qué archivos cambian y en cuáles habría conflicto. Si tienes cambios sin commitear se niega y te dice cuáles: traer cambios encima es la forma típica de perder trabajo.
- **`cerrar`** avisa primero si el worktree tiene cambios sin commitear o commits sin subir, y con `--confirmar` no lo quita mientras los tenga. La rama sigue existiendo: solo se va la carpeta.

El flujo de entrega: cada rama nace de la base; cuando la primera entra a la base, en la otra carpeta corres `sincronizar` y resuelves ahí los conflictos. Así nunca llegas a `develop` con cambios desfasados, y si algo choca, choca en tu rama.

Dos cosas a tener en cuenta:

- **El estado del harness ya queda separado por worktree**, porque se guarda según la ruta del proyecto: cada carpeta tiene su propio GATE, sus sensores y sus puntos de restauración.
- **La memoria (`.sdd/memoria`) vive dentro del repositorio**, así que la carpeta nueva nace con la de la rama base y cada rama tendrá su versión hasta el merge. `sesion.md` es volátil y conviene ignorarlo en git para que no choque; `worktree nuevo` te lo avisa si está versionado.

**La IA te lo propone, no lo hace por su cuenta.** Crear, mezclar y quitar piden tu confirmación cuando los pide la IA, igual que el `git` equivalente, y el harness le exige anunciarlo antes en una o dos líneas: qué va a hacer y por qué ahora. Algo así:

> Voy a crear el worktree `fix/login-500` en `../api-fix-login-500`, desde `develop`, para atender esto sin tocar lo que tienes a medias en `feature/reportes`. ¿Lo hago?

Lo mismo vale para `deshacer --confirmar` y `workspace --aplicar`: el harness no acepta un permiso a secas, sin decirte de qué se trata. `listar` y las vistas previas no molestan, así que la IA puede mirar antes de proponerte algo.

## Memoria del proyecto

Cada proyecto guarda su memoria en `.sdd/memoria/`. Conviene versionarla para compartirla con el equipo; `sesion.md` es volátil y puedes ignorarlo en git.

| Archivo | Se lee | Contiene |
|---|---|---|
| `MEMORIA.md` | Siempre (lo carga el harness) | Índice: qué es, stack, módulos, convenciones, comandos, temas |
| `sesion.md` | Al iniciar y tras compactar | **Solo lo actual**: objetivo en curso, decisiones vigentes, próximo paso, y el bloque automático del harness (plan, archivos, sensores) |
| `temas/*.md` | Solo si el índice dice que aplica | Conocimiento por área |
| `decisiones.md` | Al diseñar | Decisiones con motivo y estado |
| `pendientes.md` | Al planificar | Deuda técnica, riesgos, preguntas abiertas |
| `historial.md` | Rara vez | Una línea por cambio cerrado |

**El contexto tiene un tope** (unos 9.000 caracteres) y antes se recortaba en silencio: la IA recibía memoria incompleta sin saberlo y se ponía a releer el proyecto, que cuesta el doble de tokens. Ahora `sdd-harness doctor` te dice cuántos caracteres se reinyectan sobre el tope y avisa cuando `MEMORIA.md` o `sesion.md` superan las líneas que se leen:

```
Contexto que se reinyecta: 9178 de 9000 caracteres · ⚠ RECORTADO: el agente no recibe todo
```

Si lo ves, lo primero que hay que acortar es `sesion.md`: mueve la bitácora de los trabajos terminados a `temas/sesiones-anteriores.md`, que no se inyecta. Y si la memoria no se puede leer por algún error, la IA recibe la instrucción de abrir `MEMORIA.md` y `sesion.md` en vez de reconstruir el contexto explorando todo el proyecto.

- **Sin pérdida al compactar**: el harness recarga la memoria, y el bloque automático de `sesion.md` conserva el estado aunque el modelo olvide actualizarlo.
- **Por proyecto**: el harness carga la memoria del proyecto en el que trabajas (y, en un espacio con varios proyectos, la de cada uno cuando corresponde). Que la IA no traspase información de un proyecto a otro es una regla de sus instrucciones. Por código, escribir fuera del proyecto pide confirmación, pero las carpetas de un mismo espacio de trabajo cuentan como parte del proyecto.
- **Sin secretos**: el harness rechaza escrituras en la memoria con aspecto de clave o contraseña, y el pedido en curso se guarda con los secretos redactados.

## Arquitectura

```text
TÚ → tu IA (Claude Code, Codex, Copilot, Cursor, Gemini CLI, OpenCode)
       │  guías: reglas globales + skill sdd-orchestrator
       ├─ ORQUESTADOR: clasifica el pedido, delega en paralelo, informa en el chat
       │    ├─ Entender:  sdd-explorer ∥ sdd-business-analyst
       │    ├─ Plan:      sdd-proposer → sdd-spec-writer ∥ sdd-designer → sdd-test-planner ∥ sdd-task-planner
       │    ├─ ⏸ GATE:    tu aprobación (el harness bloquea ediciones hasta tu "sí")
       │    ├─ Construir: implementers (backend, frontend, db, mobile) ∥ sdd-test-writer
       │    ├─ Verificar: sdd-verifier ∥ sdd-ui-reviewer (+ sensores del harness)
       │    └─ Cerrar:    sdd-memory-curator → .sdd/memoria
       └─ HARNESS (hooks): permisos · GATE · aprobaciones · verificación · trabajo · memoria · presupuesto · eventos
```

Si una IA no puede lanzar sub-agentes, el orquestador ejecuta las mismas fases en secuencia.

<details>
<summary><b>Skills por área (105)</b></summary>

- **Backend**: Go, Node.js, NestJS, AdonisJS.
- **Frontend**: Angular, React, Next.js, HTML/CSS, Tailwind, SCSS.
- **Bases de datos**: PostgreSQL, SQL Server.
- **Mobile**: React Native y Expo, iOS y SwiftUI, Android y Compose, hardware de cada plataforma, diseño mobile.
- **Diseño**: `design-quality` y 8 skills de proceso, inspiradas en Impeccable; `figma-design` implementa diseños de Figma por MCP con comparación visual.
- **DevOps** (una skill por plataforma): GitHub Actions, GitLab, Azure Pipelines, Jenkins, Bitbucket, Docker, Kubernetes, OpenShift, Helm, Kustomize, Terraform, Consul, Vault, observabilidad y verificación post-despliegue.
- **Testing**: estrategia, unitarios, integración, BD con Testcontainers, contratos de API, e2e con Playwright, visual, accesibilidad, rendimiento y seguridad.
- **Además**: análisis de requerimientos, QA funcional, gestores de tareas, multi-repo, dependencias, prototipos y mejora continua.

</details>

Qué práctica profesional implementa cada pieza, con fuentes: [`docs/PRACTICAS.md`](docs/PRACTICAS.md).

## Diagnóstico y problemas frecuentes

```bash
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" doctor [--json]  # evidencia por herramienta (niveles a–e), configuración y sensores
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" hooks            # solo la parte de herramientas de doctor
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" estado           # GATE, archivos modificados y verificación de este proyecto
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" trabajo          # estado verificable del trabajo: qué falta y por qué
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" eventos          # últimas decisiones (--sesion, --explicar <id>, --json)
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" registro         # lo mismo en texto
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" sensores         # corre ahora los sensores sobre lo modificado
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" linea-base       # línea base de errores sobre el último commit
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" consumo          # tokens de la última sesión (Claude Code)
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" reglas           # revisa todo el proyecto contra las reglas propias
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" puntos           # puntos de restauración · deshacer [--confirmar] para volver
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" workspace        # proyectos de la carpeta abierta o del workspace
```

Solo tú, desde tu terminal: `aprobar`, `excepcion [control…] --motivo "…"`, `trabajo aceptar` y `trabajo descartar`.

En el chat basta con `/sdd-status`.

| Problema | Solución |
|---|---|
| El agente sigue bloqueado tras tu "sí" | El harness acepta `si` o `sí`, aunque la herramienta agregue contexto antes, y si el aviso no le llega lo lee de la conversación guardada. Si aun así no pasa, escribe `directo` o, desde tu terminal, `node "$HOME/.sdd-orquestador/bin/sdd-harness.js" aprobar` (el agente no puede ejecutarlo). `estado` muestra cómo leyó tu último mensaje. |
| "node no se reconoce" al usar la IA | La herramienta no encuentra Node.js. Reiníciala o abre una terminal nueva después de instalar Node. |
| Codex no aplica nada | Aprueba los hooks con `/hooks` dentro de Codex y reinícialo. |
| Copilot no aplica nada | Usa el modo agente con destino *Copilot* y VS Code actualizado. Con la extensión de Claude Code en VS Code aplica el harness de Claude Code. |
| Un sensor no aplica a tu proyecto | Ajusta `sensores.comandos` o `sensores.alTerminar` en `.sdd/harness.json`. `doctor` muestra qué correría. |
| El cambio queda «no verificado» por errores que ya existían | Con el árbol sin cambios de código, toma la línea base (`sdd-harness.js linea-base`). Si aun así quieres seguir, autoriza una excepción para ese contenido (`sí` en el chat o `excepcion --motivo "…"`). |
| `doctor` dice «prueba sintética aprobada» pero no «integración confirmada» | La herramienta todavía no envió eventos reales a los hooks. Úsala en un proyecto (en Codex, aprueba antes los hooks con `/hooks`) y vuelve a ejecutar `doctor`. |
| Aviso de «estado recuperado» o configuración ilegible | El estado de la sesión estaba dañado: quedó en cuarentena (`.corrupto-<fecha>`) y la sesión sigue en modo restrictivo (hay que volver a aprobar el plan y las confirmaciones). Si es la configuración, corrige el JSON; mientras tanto se usa su última versión válida. |
| La IA no busca en todos los proyectos de la carpeta o del workspace | `sdd-harness.js workspace` muestra qué detectó. En un workspace multi-raíz, ejecuta `workspace --aplicar` y reinicia la herramienta. Si los repos están en carpetas sin relación, decláralos en `.sdd/workspace.json` (skill `multi-repo`). |
| La IA rompió algo y quieres volver atrás | `sdd-harness.js deshacer` (vista previa) y luego `deshacer --confirmar`. En proyectos muy grandes, la primera vez ejecuta `sdd-harness.js puntos --iniciar`. |
| Una confirmación por "contenido externo" no corresponde | Revisa que el comando sea el que pediste y apruébalo. Para desactivar la defensa: `"seguridad": { "contenidoExterno": false }`. |
| Quieres trabajar sin el orquestador | En el chat: `sin sdd` (hasta `con sdd`). En un proyecto: `"gate": "nunca"` en `.sdd/harness.json`. En todo el equipo: `node install.js --no-hooks` (conserva agentes y skills, pero quita también las protecciones de git y secretos). |

## Preguntas frecuentes

**¿Necesito una clave de API o pagar algo más?**
No. Usa la herramienta y el plan que ya tienes. El harness son scripts locales.

**¿Mi código sale de mi equipo?**
No por el harness: no usa red ni telemetría. Tu herramienta de IA sigue funcionando como siempre.

**¿Puede hacer commits o abrir PR?**
Commits sí, con tu confirmación: te muestra el mensaje y el «sí» vale para ese comando, una vez. PR e issues no los crea, ni por MCP. También puede ayudarte con el resto de git (push, merge, rebase, resolver conflictos, stash…), siempre con tu confirmación. El mensaje de commit va sin firmas de IA; si trae una, el commit se bloquea.

**¿Puedo usar la IA sin el orquestador?**
Sí: escribe `sin sdd` y el resto de la conversación trabaja como asistente normal (git y secretos siguen protegidos). `con sdd` lo reactiva. Para un solo mensaje sin plan, usa `directo`.

**¿Gasta más tokens que usar la IA sola?**
En tareas chicas la diferencia es pequeña: no hay sub-agentes y los avisos del harness son breves. En tareas grandes el plan y la verificación cuestan tokens, pero evitan rehacer trabajo. El tope de sub-agentes y la compactación de salidas mantienen el consumo acotado.

**¿Sirve para mi stack?**
Las guías cubren los stacks de la lista de skills. Los controles (git, secretos, GATE, memoria) funcionan con cualquier lenguaje, y los sensores se configuran con tus propios comandos.

**¿Puedo usarlo solo en algunos proyectos?**
Sí. Con `"gate": "nunca"` y `"alTerminar": []` en el `.sdd/harness.json` de un proyecto, ahí solo quedan los permisos básicos (y un aviso de que los cambios quedan sin verificar).

**¿El harness garantiza que el cambio funciona?**
No. Garantiza que lo que informa como verificado corrió y pasó sobre el contenido actual (o tiene una excepción que autorizaste), y que lo omitido no se presenta como aprobado. Si el requerimiento se cumple lo decide la aceptación funcional, que marcas tú.

**¿Funciona si mi equipo usa herramientas distintas?**
Sí. Cada persona lo instala en la suya; la memoria del proyecto (`.sdd/memoria/`) es la misma para todos.

## Migración a 3.1.0

Actualiza la instalación (`npm run update` o `node install.js`). No cambia el estado ni tu `harness.json`.

| Qué cambia | Qué hacer |
|---|---|
| **El GATE se abre por defecto** y solo se abstiene con lo que reconoce como consulta, saludo, aprobación o pedido directo. Antes se abría únicamente al reconocer un pedido de cambio por su texto, y el 59,5% de los pedidos redactados de forma natural pasaban sin plan (medido en `evals/gate/frases.json`). | Nada, salvo que notes que pide plan donde no corresponde. Si prefieres el criterio anterior: `"gate": "pedido"`. Para un pedido puntual sigue valiendo «directo». |
| **`~` y las variables de home en comandos** pasan por las mismas protecciones que una edición, y un destino que no se puede resolver pide tu confirmación. | Nada. Puede aparecer alguna confirmación nueva en comandos que escriben con una variable en la ruta. |
| **«sin sdd» dentro de contenido pegado** ya no apaga el orquestador. | Nada. Para apagarlo, escribe la instrucción sola. |
## Migración a 3.0.0

El repositorio en 3.0.0 no cambia lo instalado en tu equipo: para que los hooks usen esta versión, actualiza la instalación (`npm run update` o `node install.js`).

| Qué cambia | Qué hacer |
|---|---|
| **Estado de las sesiones** (v1 → v2): se migra solo la primera vez que se usa. El GATE se conserva; las confirmaciones pendientes o aprobadas se descartan porque no tienen identidad exacta, y el aviso aparece una vez. | Nada. Si había una acción esperando tu `sí`, se volverá a pedir. |
| **Verificación**: lo que no corrió (timeout, herramienta ausente, sin tiempo, errores previos sin línea base) ahora es «no verificado», no verde. `tests` es obligatorio si el proyecto lo tiene. Agotar los reintentos ya no libera el cambio. | Revisa `sensores.obligatorios`. Si tu proyecto arrastra errores conocidos, toma la línea base (`linea-base`). |
| **Aprobaciones en el chat**: valen para la acción exacta; con varias pendientes, `sí 1,3` o `sí a todas`. | Responder con el número cuando haya más de una. |
| **Registro**: `eventos.jsonl` reemplaza a `registro.log`. Cambia el texto de `estado` y de `registro`. | Usa `eventos`. El `registro.log` anterior se sigue leyendo mientras no haya eventos y se borra solo cuando tiene más de 30 días (al iniciar sesión). |
| **Estado del trabajo**: vive en `sdd-harness.js trabajo`; `changes/` y `sdd-state.js` ya no lo guardan. | Nada; `sdd-state.js` avisa que está obsoleto. |
| **`sdd-eval`**: requiere `--confirmar`; `verificar` pasa a `aceptacion.comando` (el formato viejo se acepta con aviso); el historial pasa a v2 y las corridas anteriores no se comparan. | Actualiza tu archivo de tareas y marca una corrida nueva con `--linea-base`. |
| **Configuración nueva**: `modo`, `sensores.obligatorios`, `aprobaciones.vigenciaMin`, `presupuesto.maxMinutosPorPedido`, `presupuesto.maxTokensSesion`, `trabajo.maxIntentosSinProgreso`. Ahora documentadas: `permisos.porDefecto`, `permisos.permitirSecretos`, `salida`. | Opcional: los valores por defecto mantienen el comportamiento descrito arriba. |

## Actualizar, personalizar y desinstalar

```bash
cd orquestador-ia
git pull          # el hook de git reinstala solo lo que cambió
npm run update    # alternativa en un paso, con validaciones
```

**Para tu equipo:** haz un fork, ajusta `core/` a sus convenciones y que cada persona lo instale desde ese fork.

| Quiero… | Edito | Luego |
|---|---|---|
| Cambiar una regla de un framework | `core/skills/stack-<x>/SKILL.md` | `node install.js` |
| Agregar detalle sin agrandar la skill | `core/skills/<x>/references/<tema>.md` | `node install.js` |
| Elegir modelo por agente | `config/models.json` | `node install.js` |
| Agregar o quitar servidores MCP (locales con `command`, remotos con `url`) | `config/mcp.json` | `node install.js` |
| Ajustar GATE, sensores o permisos | `~/.sdd-orquestador/harness.json` o `.sdd/harness.json` | inmediato |
| Reglas de un solo proyecto | `AGENTS.md` o `CLAUDE.md` en la raíz del proyecto | tienen prioridad |

No edites los archivos instalados en `~/.claude`, `~/.agents` o `~/.sdd-orquestador/harness`: se regeneran desde el repositorio.

**Desinstalar:** `node install.js --uninstall`. Quita solo lo del orquestador y conserva tu `harness.json`.

<details>
<summary><b>Notas por herramienta</b></summary>

- OpenCode, Cursor y Copilot leen tanto `~/.claude/skills` como `~/.agents/skills`. Si ves skills duplicadas, el contenido es idéntico.
- En Codex, si tienes `~/.codex/AGENTS.override.md`, ese archivo tiene prioridad: copia ahí el bloque `sdd-orquestador`.
- Los hooks dependen de la versión de cada herramienta. Mantenlas actualizadas y revisa con `doctor`.

</details>

## Contribuir

Las contribuciones son bienvenidas: soporte para otra herramienta, sensores para otro stack, skills nuevas o correcciones. Lee [`CONTRIBUTING.md`](CONTRIBUTING.md); en resumen:

```bash
npm test                    # pruebas deterministas: permisos, GATE, sensores, estado, contrato de adaptadores, corpus e instalación
node install.js --dry-run   # revisa qué escribiría
```

El repositorio corre las pruebas en Windows, macOS y Linux con Node 18, 20, 22 y 24. Los cambios se anotan en [`CHANGELOG.md`](CHANGELOG.md).

**Mejora continua:** `/sdd-improve` propone ajustes al orquestador solo con evidencia de incidentes reales (`mejora/registro.md`), y nada se aplica sin tu aprobación.

## Seguridad

Qué hace el harness en tu equipo, qué guarda, qué protege y sus límites: [`SECURITY.md`](SECURITY.md). En corto: no es un sandbox. Frena los errores habituales de un agente cuando la herramienta invoca los hooks, pero para código muy sensible usa además el sandbox de tu herramienta o un contenedor.

## Licencia

[MIT](LICENSE) © 2026 Thomas Soto ([@thomassr30](https://github.com/thomassr30)).

Las skills de diseño están inspiradas en [Impeccable](https://github.com/pbakaus/impeccable) de Paul Bakaus (Apache 2.0); ver [`NOTICE`](NOTICE). Los conceptos de *harness engineering* (guías y sensores, controles deterministas, verificación de punta a punta) se basan en el trabajo público de OpenAI, Anthropic y Martin Fowler.
