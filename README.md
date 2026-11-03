# Orquestador SDD

**Un harness para tus agentes de IA de programación: reglas que se cumplen por código, menos tokens y memoria por proyecto.**

Funciona dentro de **Claude Code, Codex, GitHub Copilot, Cursor, Gemini CLI y OpenCode**, con tu suscripción de siempre. No es una app aparte: no usa servidores ni claves de API, y tu código no sale de tu equipo.

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
- [Herramientas compatibles](#herramientas-compatibles)
- [Instalación](#instalación)
- [Uso diario](#uso-diario)
- [Cómo funciona el harness](#cómo-funciona-el-harness)
- [Ahorro de tokens](#ahorro-de-tokens)
- [Configuración](#configuración)
- [Memoria del proyecto](#memoria-del-proyecto)
- [Arquitectura](#arquitectura)
- [Diagnóstico y problemas frecuentes](#diagnóstico-y-problemas-frecuentes)
- [Preguntas frecuentes](#preguntas-frecuentes)
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

Una instrucción escrita ("nunca hagas commit") depende de que el modelo la recuerde. Este proyecto agrega dos cosas:

1. **Controles por código (hooks)**: scripts locales que tu herramienta ejecuta antes y después de cada acción. Permiten, bloquean o piden confirmación aunque el modelo olvide las reglas.
2. **Un orquestador con especialistas**: entiende el pedido, ajusta el esfuerzo a su tamaño, presenta un plan, implementa en paralelo y verifica.

Un agente es **modelo + harness**. El modelo lo pone tu herramienta; el harness lo pone este repositorio.

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
           ↳ si algo falla, no puede terminar hasta corregirlo o explicarlo
         Listo. Commit sugerido: "feat(clientes): exportar listado a Excel"
           ↳ sin "Co-Authored-By" ni firmas de IA; el commit lo haces tú
```

Para algo trivial no hace falta plan: `cambia el título a "Clientes", directo`. Para trabajar sin el orquestador el resto de la conversación: `sin sdd`.

## Qué incluye

| | |
|---|---|
| **Permisos por código** | **Commit nunca** (lo haces tú) y nada de PR ni issues en GitHub/GitLab, tampoco por MCP. El resto de git (push, merge, rebase, reset, stash…) con tu confirmación, para resolver problemas de git. Secretos protegidos y comandos destructivos bloqueados. Pide confirmación para infraestructura, bases de datos, borrados, dependencias y configurar servidores MCP. |
| **Commits sin firma de IA** | Los mensajes de commit sugeridos van sin `Co-Authored-By: Claude`, `Generated with…` ni `Made-with: Cursor`: si aparecen, el harness pide reescribirlos. En Claude Code, además, se desactiva la atribución. |
| **Plan antes de editar (GATE)** | En un pedido de cambio, las ediciones quedan bloqueadas hasta que respondas `sí`. |
| **Sensores al terminar** | Lint, tipos y tests relacionados con lo que cambió: Node/TS, Angular y Go automáticos; plantillas para Android, iOS y SCSS. |
| **Memoria por proyecto** | `.sdd/memoria/` se carga al iniciar y tras compactar. Nunca se mezcla entre proyectos. |
| **Varios proyectos a la vez** | En una carpeta con varios proyectos o un workspace de VS Code: mapa de todos los proyectos para que la IA busque en todos, y memoria, reglas, sensores y deshacer de cada uno. |
| **Ahorro de tokens** | Esfuerzo según el tamaño del pedido, tope de sub-agentes, salidas de tests compactadas y reportes cortos. |
| **Especialistas** | 1 orquestador, 22 sub-agentes, 104 skills (backend, frontend, mobile, bases de datos, DevOps, testing, diseño) y 19 comandos. |
| **Deshacer lo que hizo la IA** | Antes de cada turno que modifica archivos se guarda un punto de restauración (fuera del repo, sin commits ni secretos). `deshacer` deja todo como estaba, en cualquier herramienta. |
| **Arquitectura vigilada por código** | Reglas de capas (qué no puede importar qué), nombres de archivo, tamaño máximo y patrones prohibidos, cada una con el mensaje que le enseña a la IA cómo hacerlo bien. |
| **Defensa contra instrucciones inyectadas** | Si la sesión leyó una web, un ticket o un MCP externo, cualquier comando que pueda enviar datos afuera pide tu confirmación. Las claves y tokens escritos en el código se bloquean. |
| **Evaluaciones** | Mide con tareas reales si un cambio al orquestador mejora el éxito y el consumo. |

## Herramientas compatibles

| Herramienta | Bloqueos | Confirmación crítica | Sensores al terminar | Memoria tras compactar | Salidas compactadas |
|---|---|---|---|---|---|
| **Claude Code** (CLI, VS Code, JetBrains, desktop) | ✅ | diálogo nativo | ✅ | ✅ | ✅ |
| **Codex** (CLI, app, IDE) | ✅ | en el chat | ✅ | ✅ | ✅ |
| **GitHub Copilot** (VS Code modo agente, Copilot CLI) | ✅ | diálogo nativo | ✅ | la IA la relee | — |
| **Cursor** | ✅ | en el chat | ✅ | la IA la relee | — |
| **Gemini CLI** | ✅ | en el chat | ✅ | ✅ | ✅ |
| **OpenCode** | ✅ (plugin) | en el chat | ✅ | ✅ | ✅ |

- **Copilot**: funciona con cualquier modelo del selector (también Claude), en sesiones con destino *Copilot*. Sus hooks están en vista previa.
- **"En el chat"**: la herramienta no tiene diálogo de aprobación, así que el agente te muestra el comando exacto y espera tu `sí`. La confirmación vale una vez y caduca a los 30 minutos.

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

Ejecuta cada hook con un `git commit` de prueba y debe mostrar `✓ … prueba en vivo OK` por herramienta. Otra prueba rápida: abre tu IA en cualquier proyecto y pídele *"haz commit de los cambios"* o *"lee el archivo .env"*. Debe responder con un bloqueo `[harness]`.

<details>
<summary><b>Opciones del instalador</b></summary>

```bash
node install.js --targets=all             # todas las herramientas, aunque aún no estén instaladas
node install.js --targets=claude,codex    # solo algunas (claude, codex, copilot, cursor, gemini, opencode)
node install.js --dry-run                 # muestra qué haría, sin escribir nada
node install.js --no-hooks                # solo guías (agentes y skills), sin controles por código
node install.js --no-mcp                  # sin registrar Playwright, Context7 ni Chrome DevTools
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

- **Pedido de cambio → plan → tu "sí"**: el agente explora y te muestra el plan en el chat. Apruébalo como te salga: `sí`, `dale`, `ok`, `ya`, `desarrolla`, `impleméntalo`, `procede con el plan`, `sí, pero…` (con o sin tilde). Antes de tu aprobación la IA puede leer, buscar y correr tests; lo que se frena es modificar archivos.
- **"directo"** para cambios triviales: edita sin plan y pasa igual por los sensores. Vale para ese mensaje.
- **"sin sdd"** apaga el orquestador **para el resto de la conversación**: la IA trabaja como asistente normal, sin flujos, sub-agentes ni plan. **"con sdd"** lo vuelve a encender. Las reglas de git y secretos siguen activas.
- **Al terminar**, el harness revisa lint, tipos y tests de lo modificado. Si algo falla, el agente corrige o te explica por qué no corresponde.
- **Sin archivos de trabajo**: análisis, planes y reportes quedan en el chat. Si quieres un documento, pídelo.
- **Git**: la lectura (`status`, `diff`, `log`, `show`, `blame`) es libre. Push, pull, merge, rebase, reset, stash, checkout y ramas los puede hacer **con tu confirmación**: antes te explica qué hará, y si algo descarta cambios o reescribe el remoto lo dice. **Commit nunca**: te sugiere el mensaje, sin firmas de IA, y tú lo ejecutas.
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

## Cómo funciona el harness

Tu herramienta ejecuta los hooks en momentos fijos, y cada uno responde permitir, bloquear o avisar:

| Momento | Qué hace |
|---|---|
| Al iniciar y tras compactar | Carga la memoria **de este proyecto**: índice, sesión de trabajo y temas disponibles. |
| Cada mensaje tuyo | Detecta pedidos de cambio, que abren el GATE, y tus aprobaciones (`sí`, `dale`, `directo`). Separa tu texto del contexto que agregan algunas herramientas (archivo abierto, navegador). |
| Antes de cada comando | **Bloquea** `git commit` (también disfrazado: alias, `npm version`, `release-it`), escritura en GitHub o GitLab, comandos destructivos y lectura de secretos. **Pide confirmación** para el resto de git, infraestructura (kubectl, terraform, nube, Vault), clientes de base de datos, borrados, dependencias, `sudo` y configurar servidores MCP. Antes de aprobar el plan, el resto solo deja correr lectura, tests y lint. |
| Antes de cada herramienta MCP | Escribir en GitHub o GitLab por MCP se bloquea; lo que escribe en otros servidores pide confirmación. Navegador y documentación quedan libres. |
| Antes de cada edición | Sin plan aprobado no se edita código. Tampoco se tocan `.git`, secretos ni la configuración del harness o de los hooks. Revisa tus reglas de arquitectura y bloquea claves o tokens reales en el código. La primera modificación del turno guarda antes un **punto de restauración**. |
| Después de cada edición | Chequeo instantáneo: JSON y YAML válidos, marcadores de conflicto de merge, sintaxis de Go. |
| Al terminar el turno | Si el mensaje de commit sugerido trae una firma de IA (`Co-Authored-By: Claude`…), pide reescribirlo. Corre lint, tipos y tests **solo de lo modificado**, por módulo (sirve en monorepos). Si fallan, el agente debe corregir; insiste hasta 2 veces y después solo avisa. Guarda el estado del trabajo en `.sdd/memoria/sesion.md`. |

**Sensores detectados automáticamente:**

- **Node/TS**: eslint sobre los archivos cambiados, `tsc --noEmit`, y `vitest related` o `jest --findRelatedTests`.
- **Angular**: `ng build --configuration development` (también revisa las plantillas) y Karma en modo headless.
- **Go**: `go vet`, `go test` de los paquetes tocados y `golangci-lint` si está configurado.
- **Android, iOS, SCSS y otros**: plantillas listas en `~/.sdd-orquestador/harness.json` → `sensores._ejemplos`.

**Deshacer lo que hizo la IA.** Antes de la primera modificación de cada turno, el harness guarda una copia del proyecto en un almacén interno (`~/.sdd-orquestador/puntos`). El `.git` del proyecto no se toca ni se crean commits, y no se copian secretos ni lo ignorado por `.gitignore`.

```bash
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" puntos                 # lista los puntos (el 1 es el más reciente)
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" deshacer               # muestra qué volvería atrás
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" deshacer --confirmar   # lo aplica (deshacer otra vez retrocede otro turno)
```

Antes de aplicar se guarda el estado actual, así que también se puede rehacer. En el chat puedes pedir *"deshaz lo último"*: la IA te muestra la vista previa y aplica solo con tu confirmación.

**Carpetas con varios proyectos y workspaces.** Si abres una carpeta que contiene varios proyectos (repos separados, subcarpetas o un monorepo), o un workspace multi-raíz de VS Code (`*.code-workspace`), el harness detecta cada proyecto por sus archivos (`package.json`, `angular.json`, `go.mod`, `pom.xml`, `.csproj`, `pyproject.toml`, `.git`…) y:

- al iniciar le entrega a la IA un **mapa del espacio** (nombre, ruta, stack y si tiene memoria, una línea por proyecto) con la instrucción de buscar en todos los proyectos involucrados, no solo en el primero;
- carga la **memoria de cada proyecto** cuando lo mencionas o cuando la IA empieza a editar en él (una vez por sesión), y la de la raíz como memoria del espacio, sin mezclarlas;
- aplica las **reglas** y los **sensores** de cada proyecto con su propio `.sdd/harness.json`;
- guarda **puntos de restauración por repo**, incluidos los repos internos, y `deshacer` vuelve atrás todos los que se tocaron en el turno.

```bash
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" workspace             # qué proyectos detectó
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" workspace --aplicar   # workspace multi-raíz: da acceso a las otras carpetas en Claude Code y Codex
```

En un workspace multi-raíz, Claude Code y Codex trabajan sobre la primera carpeta. `workspace --aplicar` agrega las demás (`additionalDirectories` en Claude Code, `writable_roots` en Codex). Copilot y Cursor ya trabajan con todas.

**Contenido externo.** Una página, un ticket, un PDF o una respuesta de un MCP pueden traer instrucciones escondidas para la IA. Desde que la sesión lee algo externo, cualquier comando o URL que pueda enviar datos a otro servidor (`curl` con datos, `scp`, `ssh`, `nc`, parámetros largos en una URL) pide tu confirmación con el motivo. Tu propia app (`localhost`) no cuenta.

**Garantías de diseño:**

- **Falla abierta**: si un hook tiene un error interno no bloquea tu trabajo. `doctor` lo detecta.
- **El agente no puede desactivar su harness**: cambiar `harness.json`, los hooks o la configuración de tu IA requiere tu confirmación, y el estado del harness vive fuera del proyecto.
- **Sin dependencias**: solo Node.js. No hay red, ni telemetría, ni procesos en segundo plano.

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
  "sensores": {
    "alTerminar": ["lint", "tipos", "tests"],
    "comandos": { "tipos": "npx tsc --noEmit -p tsconfig.app.json", "tests": "npx vitest related --run {archivos}" },
    "timeoutSeg": 240,
    "maxBloqueos": 2
  },
  "permisos": { "preguntar": ["node scripts/*"], "denegar": ["make deploy"], "mcpLibres": ["jira"], "mcpBloquear": ["notion"] },
  "presupuesto": { "modo": "ahorro", "maxSubagentes": 3 }
}
```

| Clave | Valores |
|---|---|
| `gate` | `auto` (por defecto: los pedidos de cambio requieren plan) · `siempre` (toda edición) · `nunca` (sin GATE por código) |
| `sensores.comandos` | Comandos propios por sensor; `{archivos}` se reemplaza por los archivos modificados. Vacío = detección automática. |
| `permisos` | Prefijos de comando que se suman a las reglas fijas; `*` al final es comodín. |
| `presupuesto.modo` | `ahorro` (tope 3 sub-agentes) · `normal` (tope 6) · `libre` (sin tope). `maxSubagentes` fija un tope propio. |
| `deshacer` | `activo` (por defecto sí) · `maxPuntos` (30) · `excluir`: patrones extra que no se copian a los puntos. |
| `seguridad` | `contenidoExterno` (confirmar envíos de datos tras leer algo externo) · `secretosEnCodigo` (bloquear claves en el código). Ambos activos por defecto. |

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

`sdd-harness.js reglas` revisa todo el proyecto. Hay más ejemplos por stack (Angular, React, NestJS, Go) en `~/.sdd-orquestador/harness.json` → `_ejemplosReglas`.

**Evaluaciones.** Para medir si un cambio al orquestador mejora o empeora, define 5 a 10 tareas típicas tuyas con un comando que verifique cada resultado (ver [`evals/ejemplo.tareas.json`](evals/ejemplo.tareas.json)) y ejecuta `node bin/sdd-eval.js evals/mis.tareas.json`. Trabaja sobre una copia temporal del proyecto y registra éxito, turnos, tokens y costo. Consume tokens de tu plan.

## Memoria del proyecto

Cada proyecto guarda su memoria en `.sdd/memoria/`. Conviene versionarla para compartirla con el equipo; `sesion.md` es volátil y puedes ignorarlo en git.

| Archivo | Se lee | Contiene |
|---|---|---|
| `MEMORIA.md` | Siempre (lo carga el harness) | Índice: qué es, stack, módulos, convenciones, comandos, temas |
| `sesion.md` | Al iniciar y tras compactar | Trabajo en curso y bloque automático del harness (plan, archivos, sensores) |
| `temas/*.md` | Solo si el índice dice que aplica | Conocimiento por área |
| `decisiones.md` | Al diseñar | Decisiones con motivo y estado |
| `pendientes.md` | Al planificar | Deuda técnica, riesgos, preguntas abiertas |
| `historial.md` | Rara vez | Una línea por cambio cerrado |

- **Sin pérdida al compactar**: el harness recarga la memoria, y el bloque automático de `sesion.md` conserva el estado aunque el modelo olvide actualizarlo.
- **Aislada**: cada proyecto usa solo su memoria. La de un workspace multi-repo se usa solo si ese workspace incluye el repo.
- **Sin secretos**: el harness rechaza escrituras con aspecto de clave o contraseña.

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
       └─ HARNESS (hooks): permisos · GATE · sensores · memoria · presupuesto
```

Si una IA no puede lanzar sub-agentes, el orquestador ejecuta las mismas fases en secuencia.

<details>
<summary><b>Skills por área (104)</b></summary>

- **Backend**: Go, Node.js, NestJS, AdonisJS.
- **Frontend**: Angular, React, Next.js, HTML/CSS, Tailwind, SCSS.
- **Bases de datos**: PostgreSQL, SQL Server.
- **Mobile**: React Native y Expo, iOS y SwiftUI, Android y Compose, hardware de cada plataforma, diseño mobile.
- **Diseño**: `design-quality` y 8 skills de proceso, inspiradas en Impeccable.
- **DevOps** (una skill por plataforma): GitHub Actions, GitLab, Azure Pipelines, Jenkins, Bitbucket, Docker, Kubernetes, OpenShift, Helm, Kustomize, Terraform, Consul, Vault, observabilidad y verificación post-despliegue.
- **Testing**: estrategia, unitarios, integración, BD con Testcontainers, contratos de API, e2e con Playwright, visual, accesibilidad, rendimiento y seguridad.
- **Además**: análisis de requerimientos, QA funcional, gestores de tareas, multi-repo, dependencias, prototipos y mejora continua.

</details>

Qué práctica profesional implementa cada pieza, con fuentes: [`docs/PRACTICAS.md`](docs/PRACTICAS.md).

## Diagnóstico y problemas frecuentes

```bash
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" doctor     # prueba en vivo de cada hook, configuración y sensores
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" estado     # GATE, archivos modificados y sensores de este proyecto
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" registro   # últimas decisiones: qué se bloqueó y por qué
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" sensores   # corre ahora los sensores sobre lo modificado
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" puntos     # puntos de restauración · deshacer [--confirmar] para volver
node "$HOME/.sdd-orquestador/bin/sdd-harness.js" workspace  # proyectos de la carpeta abierta o del workspace
```

En el chat basta con `/sdd-status`.

| Problema | Solución |
|---|---|
| El agente sigue bloqueado tras tu "sí" | El harness acepta `si` o `sí`, aunque la herramienta agregue contexto antes, y si el aviso no le llega lo lee de la conversación guardada. Si aun así no pasa, escribe `directo` o, desde tu terminal, `node "$HOME/.sdd-orquestador/bin/sdd-harness.js" aprobar` (el agente no puede ejecutarlo). `estado` muestra cómo leyó tu último mensaje. |
| "node no se reconoce" al usar la IA | La herramienta no encuentra Node.js. Reiníciala o abre una terminal nueva después de instalar Node. |
| Codex no aplica nada | Aprueba los hooks con `/hooks` dentro de Codex y reinícialo. |
| Copilot no aplica nada | Usa el modo agente con destino *Copilot* y VS Code actualizado. Con la extensión de Claude Code en VS Code aplica el harness de Claude Code. |
| Un sensor no aplica a tu proyecto | Ajusta `sensores.comandos` o `sensores.alTerminar` en `.sdd/harness.json`. `doctor` muestra qué correría. |
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
No. Los commits los haces tú, y PR e issues tampoco los crea, ni por MCP. Sí puede ayudarte con el resto de git (push, merge, rebase, resolver conflictos, stash…), siempre con tu confirmación. El mensaje de commit que sugiere va sin firmas de IA.

**¿Puedo usar la IA sin el orquestador?**
Sí: escribe `sin sdd` y el resto de la conversación trabaja como asistente normal (git y secretos siguen protegidos). `con sdd` lo reactiva. Para un solo mensaje sin plan, usa `directo`.

**¿Gasta más tokens que usar la IA sola?**
En tareas chicas la diferencia es pequeña: no hay sub-agentes y los avisos del harness son breves. En tareas grandes el plan y la verificación cuestan tokens, pero evitan rehacer trabajo. El tope de sub-agentes y la compactación de salidas mantienen el consumo acotado.

**¿Sirve para mi stack?**
Las guías cubren los stacks de la lista de skills. Los controles (git, secretos, GATE, memoria) funcionan con cualquier lenguaje, y los sensores se configuran con tus propios comandos.

**¿Puedo usarlo solo en algunos proyectos?**
Sí. Con `"gate": "nunca"` y `"alTerminar": []` en el `.sdd/harness.json` de un proyecto, ahí solo quedan los permisos básicos.

**¿Funciona si mi equipo usa herramientas distintas?**
Sí. Cada persona lo instala en la suya; la memoria del proyecto (`.sdd/memoria/`) es la misma para todos.

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
| Agregar o quitar servidores MCP | `config/mcp.json` | `node install.js` |
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
npm test                    # pruebas de permisos, GATE, sensores, adaptadores e instalación
node install.js --dry-run   # revisa qué escribiría
```

El repositorio corre las pruebas en Windows, macOS y Linux con Node 18, 20 y 22. Los cambios se anotan en [`CHANGELOG.md`](CHANGELOG.md).

**Mejora continua:** `/sdd-improve` propone ajustes al orquestador solo con evidencia de incidentes reales (`mejora/registro.md`), y nada se aplica sin tu aprobación.

## Seguridad

Qué hace el harness en tu equipo, qué protege y sus límites: [`SECURITY.md`](SECURITY.md). En corto: no es un sandbox. Bloquea los errores habituales de un agente, pero para código muy sensible usa además el sandbox de tu herramienta o un contenedor.

## Licencia

[MIT](LICENSE) © 2026 Thomas Soto ([@thomassr30](https://github.com/thomassr30)).

Las skills de diseño están inspiradas en [Impeccable](https://github.com/pbakaus/impeccable) de Paul Bakaus (Apache 2.0); ver [`NOTICE`](NOTICE). Los conceptos de *harness engineering* (guías y sensores, controles deterministas, verificación de punta a punta) se basan en el trabajo público de OpenAI, Anthropic y Martin Fowler.
