# Cambios

## 3.0.0 — Resultados verificables, aprobaciones exactas y estado resistente

Para que los hooks instalados usen esta versión hay que actualizar la instalación (`npm run update` o `node install.js`). Guía en el README → *Migración a 3.0.0*.

### Cambios incompatibles
- **Lo omitido ya no es verde**: un control que excede el tiempo, cuya herramienta no está instalada, que no alcanza a correr o cuyos errores están en archivos no modificados sin línea base queda «no verificado». Antes contaba como aprobado.
- **`tests` es obligatorio** si el proyecto lo tiene (`sensores.obligatorios`). Un obligatorio fallido o sin verificar impide dar el cambio por verificado.
- **Agotar los reintentos no libera el cambio**: tras `sensores.maxBloqueos` el harness deja de insistir, pero el resultado sigue pendiente hasta que cambie el contenido o autorices una excepción.
- **Aprobaciones en el chat por acción exacta**: con varias pendientes, un «sí» solo no aprueba ninguna (`sí 1,3` o `sí a todas`).
- **Estado de sesión v2**: el v1 se migra solo y descarta las aprobaciones sin identidad (se vuelven a pedir).
- **Registro**: `eventos.jsonl` reemplaza a `registro.log`; cambia el texto de `estado` y `registro`.
- **`sdd-eval`**: requiere `--confirmar`; `verificar` pasa a `aceptacion.comando` (lo viejo se acepta con aviso); historial v2 (las corridas anteriores no se comparan).
- **Estado del trabajo**: vive en `sdd-harness.js trabajo`; `changes/` y `sdd-state.js` quedan obsoletos para el estado (`sdd-state.js` avisa).

### Nuevo
- **Contrato de resultados** (`harness/src/resultado.js`): aprobado · fallido · no verificado · bloqueado · excepción, común a sensores, trabajo y evaluaciones.
- **Excepciones del usuario**: «sí» en el chat a la solicitud o `sdd-harness.js excepcion [control…] --motivo "…"` desde tu terminal. Valen solo para ese contenido.
- **Línea base** (`sdd-harness.js linea-base`): sobre el commit actual y sin cambios de código; permite afirmar con evidencia que un error ya existía.
- **Cambios por shell detectados con git** al terminar el turno, y reglas propias (`prohibido`, `noImportar`) revisadas también sobre ellos, sin atribuir lo que ya estaba en el último commit.
- **Trabajo verificable** (`sdd-harness.js trabajo`): plan con requisitos, criterios y tareas fuera del repo; la aprobación lo congela; tarea verificada solo con evidencia vigente del harness; «sin progreso» tras 3 intentos iguales; aviso si el agente dice que terminó sin evidencia; aceptar y descartar solo el usuario.
- **Aprobaciones exactas** (`harness/src/aprobaciones.js`): HMAC con clave local de la acción exacta, un solo uso, vencimiento configurable (`aprobaciones.vigenciaMin`), consumo bajo candado.
- **Bash pasa por las protecciones de rutas** cuando el destino es reconocible; secretos en comandos que escriben, bloqueados; escribir fuera del proyecto pide confirmación (salvo la carpeta temporal del sistema).
- **`modo: "estricto"`**: falla cerrada salvo lecturas; herramientas y comandos no reconocidos piden confirmación. En `normal`, la falla cerrada ante errores internos cubre lo crítico, también si el error ocurre en el adaptador.
- **Eventos estructurados** (`sdd-harness.js eventos [n] [--sesion s] [--explicar <id>] [--json]`), sin prompts, argumentos ni contenido.
- **Presupuestos** `maxMinutosPorPedido` y `maxTokensSesion` (este último solo con medición: hoy Claude Code). Desactivados por defecto.
- **`doctor` por niveles** para las 6 herramientas: configuración, hook ejecutable, prueba sintética, integración confirmada con eventos reales y limitaciones; aislamiento de Claude Code y Codex según su configuración; `--json` con respaldo archivo:línea.
- **Corpus determinista** (`evals/corpus/`, 11 escenarios) y **contrato de adaptadores** con payloads simulados, en `npm test`. CI con Node 18, 20, 22 y 24 en Ubuntu, Windows y macOS.
- **`sdd-eval`**: aceptación independiente del agente (`archivos` restaurados con detección de manipulación, `dir` oculta al agente), estados con causa, códigos de salida 0/1/2/3, límites `--max-tareas`, `--max-costo-usd`, `--max-minutos`, modos `sin-gate` y `flujo`, metadatos por corrida, `--validar` y regresiones contra `--linea-base`.
- Configuración documentada: `modo`, `sensores.obligatorios`, `aprobaciones.vigenciaMin`, `presupuesto.maxMinutosPorPedido`, `presupuesto.maxTokensSesion`, `trabajo.maxIntentosSinProgreso`, `permisos.porDefecto`, `permisos.permitirSecretos` y `salida`.

### Corregido
Se reprodujeron 25 fallos con scripts aislados antes de corregirlos; cada grupo tiene pruebas en `harness/test/`.
- **Evaluaciones (6)**: un agente que no arrancaba contaba como éxito si la tarea no tenía verificador; una salida no JSON con código de error contaba como éxito si el verificador pasaba; una corrida vacía terminaba con «Éxito: 0%» y código 0; `"tareas": "texto"` se recorría letra por letra como tareas «exitosas» sin lanzar al agente; con todas las tareas fallidas el código de salida era 0; un archivo de tareas no JSON terminaba en una traza de Node. Además (por inspección): timeout ignorado, temporales sin borrar en retornos tempranos, verificador sobre la copia que el agente pudo modificar y corridas comparadas sin metadatos.
- **Sensores (7)**: timeout, herramienta ausente y presupuesto agotado contaban como aprobados; los errores previos se asumían sin evidencia; el código sin controles aplicables quedaba limpio; tras los reintentos el fallo se liberaba; lo modificado por shell no se verificaba.
- **Aprobaciones (7)**: una aprobación MCP valía para otros argumentos; un «sí» aprobaba varias pendientes a la vez; escribir fuera del proyecto no pedía confirmación; dos procesos podían consumir la misma aprobación; Bash podía saltarse las protecciones de las ediciones y las decisiones del usuario.
- **Estado y fallas internas (4)**: un estado corrupto podía conceder permisos; sin candado se seguía escribiendo; un `harness.json` corrupto se ignoraba en silencio; un error interno dejaba pasar acciones críticas.
- **Memoria (1)**: un secreto en el pedido llegaba al estado y a `sesion.md`.
- **Compactador en Claude Code**: respondía `allow` sobre el comando envuelto, así que concedía permiso aunque el usuario no lo hubiera dado y sus reglas de preguntar o denegar sobre el comando original dejaban de aplicar. Ahora solo compacta lo que las reglas del usuario ya permiten y ninguna regla de preguntar o denegar toca (`harness/src/adapters/claude-permisos.js`).

### Limitaciones conocidas
- Los hooks no son un sandbox: la detección de escrituras por shell es por patrones y un comando no reconocido en modo `normal` lo decide la herramienta.
- El GATE depende de reconocer el pedido por su texto.
- La integración con cada herramienta real no se prueba automáticamente; las capacidades son declaradas por el adaptador hasta el nivel (d) de `doctor`, que no comprueba que la herramienta respete cada respuesta. El nivel (d) cuenta cualquier ejecución del hook fuera de `doctor`.
- En Claude Code, el compactador lee las reglas de permiso en archivo; no ve las políticas por registro de Windows, perfil de macOS o servidor, ni `--allowedTools`/`--disallowedTools` (si se usan para denegar comandos de test, `salida.compactar: false`).
- Si el módulo del harness no carga (instalación dañada), el hook falla abierto.
- `sdd-eval` solo implementa el cliente `claude` (Codex pendiente); el modo `flujo` y el formato JSON del cliente están probados con un ejecutable falso.
- Los límites del registro de eventos (1 MB × 5 archivos, 30 días para lo rotado, aplicado al iniciar sesión) son fijos en el código: no se configuran.

## 2.8.1 — El GATE entiende cómo apruebas y no frena la exploración
- **Aprobación en lenguaje natural**: además de "sí", "dale", "ok" o "apruebo", ahora aprueban el plan "desarrolla", "desarrollar", "impleméntalo", "implementa todo", "procede con el plan", "hazlo", "avanza", "manos a la obra", "ya po", "bueno, desarrolla"… (con o sin tilde). Antes, "desarrollar" se tomaba como un pedido nuevo y volvía a bloquear. Lo que no aprueba: negar o pedir esperar ("todavía no", "espera", "pero antes…"), preguntar, o pedir algo nuevo ("desarrolla el módulo de pagos").
- **Explorar antes de aprobar**: el GATE ya no frena comandos de lectura que no estaban en la lista (jq, fd, tree, `Get-ChildItem | Select-String`, `xargs grep`…). Solo frena lo que puede escribir archivos: redirecciones, `sed -i`, copiar o mover, scripts e intérpretes, generadores y formateadores (`--fix`, `--write`, `-u`).
- La IA ya no le pide al usuario una palabra exacta para aprobar.

## 2.8.0 — Carpetas con varios proyectos y workspaces: la IA no pierde el hilo
- **Espacio de trabajo**: el harness detecta los proyectos dentro de lo que abriste (una carpeta con varios repos o subproyectos, un monorepo, un workspace multi-raíz de VS Code o un `.sdd/workspace.json`) por sus marcadores (`.git`, `package.json`, `angular.json`, `go.mod`, `pom.xml`, `build.gradle`, `.csproj`/`.sln`, `pyproject.toml`, `pubspec.yaml`, Xcode, Helm, Terraform…), hasta 3 niveles, con su stack y si tiene memoria.
- **Mapa al iniciar y tras compactar**: una línea por proyecto y la instrucción de buscar en todos los involucrados antes de concluir. El orquestador lo pasa a cada sub-agente y lanza un explorer por proyecto.
- **Memoria por proyecto bajo demanda**: la de cada proyecto se carga cuando lo mencionas o cuando la IA empieza a editar en él (una vez por sesión, y de nuevo tras compactar). La de la raíz es la memoria del espacio. No se mezclan.
- **Reglas, sensores y protecciones por proyecto**: cada proyecto usa su propio `.sdd/harness.json` (reglas evaluadas con sus rutas, comandos de sensores propios). El `.git` y la configuración del harness de cada proyecto quedan protegidos.
- **Deshacer en varios repos**: un almacén de puntos por repo (antes los repos internos no se copiaban); los puntos de un turno comparten id y `deshacer` vuelve atrás todos los repos tocados.
- **`sdd-harness.js workspace`**: muestra lo detectado y, con `--aplicar`, da acceso a las carpetas extra de un workspace multi-raíz en Claude Code (`additionalDirectories`) y Codex (`writable_roots`), que por defecto solo ven la primera carpeta.
- Las carpetas del workspace ya no cuentan como "fuera del proyecto" (leerlas no pide permiso).

## 2.7.0 — Harness avanzado: deshacer, arquitectura vigilada por código y seguridad
- **Deshacer lo que hizo la IA**: antes de la primera modificación de cada turno se guarda un punto de restauración en un almacén interno (`~/.sdd-orquestador/puntos`, git propio del harness). El `.git` del proyecto no se toca, no hay commits, no se copian secretos ni lo ignorado por `.gitignore`. `sdd-harness.js puntos` los lista; `deshacer` muestra la vista previa y `deshacer --confirmar` lo aplica (otra vez retrocede otro turno; también se puede rehacer). Si la IA lo ejecuta, pide tu confirmación. Funciona en las 6 herramientas. Rápido: ~200 ms el primer punto de un proyecto de 3.000 archivos y ~30 ms los siguientes; en proyectos muy grandes, `puntos --iniciar` prepara el primero.
- **Arquitectura vigilada por código** (práctica de OpenAI): nuevos tipos de regla en `reglas` → `noImportar` (capas: módulos o rutas prohibidos, en JS/TS, Go, Python, Java/Kotlin, C# y SCSS), `nombreArchivo` (al crear) y `maxLineas` (aviso tras editar), además de `prohibido`. Cada una con su mensaje de corrección. `sdd-harness.js reglas` revisa todo el proyecto. Ejemplos por stack en `_ejemplosReglas`.
- **Defensa contra instrucciones inyectadas** ("lethal trifecta"): desde que la sesión lee contenido externo (web, MCP, descargas), los comandos y URLs que pueden enviar datos a otro servidor piden confirmación con el motivo. `localhost` y tu app local no cuentan.
- **Secretos en el código**: claves y tokens reales (AWS, GitHub, GitLab, OpenAI/Anthropic, Google, Slack, Stripe, SendGrid, credenciales en URLs) se bloquean al escribir; ejemplos y placeholders no.
- **Publicar paquetes** (`npm publish`, `twine upload`, `cargo publish`…) pasa a ser decisión crítica.
- Configuración nueva: `deshacer` y `seguridad` en `harness.json`.

## 2.5.0 — Git con confirmación (commit nunca), MCP conectables, commits sin firma de IA y "sin sdd"
- **Git**: la lectura sigue libre y el resto (push, pull, fetch, merge, rebase, reset, stash, checkout, ramas, tags…) ahora se puede hacer **con tu confirmación**, también con el plan pendiente, para resolver problemas de git. Si la acción descarta cambios o reescribe el remoto (`reset --hard`, `clean`, `push --force`, borrar ramas), el aviso lo dice. En Codex y OpenCode la confirmación la pide la propia herramienta (reglas `prompt` / permiso `ask`), sin doble pregunta.
- **Commit nunca**, ni aunque lo pidas: `git commit`, `commit-tree`, alias de git que hacen commit y herramientas que crean commits (`npm version`, `release-it`, `semantic-release`, `lerna`…). PR, issues y comentarios en GitHub/GitLab siguen bloqueados.
- **Mensajes de commit sin firma de IA**: si la respuesta trae `Co-Authored-By: Claude…`, `Generated with…`, `Claude-Session`, `Made-with: Cursor` o similares, el harness pide reescribirla (una vez). En Claude Code el instalador configura `attribution` vacío (si no lo tenías configurado) y lo quita al desinstalar.
- **MCP**: el agente puede conectar y configurar servidores (`codex mcp add`, `claude mcp add`, `gemini mcp add`, `code --add-mcp`, `.mcp.json`, `.vscode/mcp.json`, `config.toml`…) con tu confirmación; listar es libre.
- **"sin sdd" para toda la conversación**: apaga el orquestador (sin flujos, sub-agentes ni plan) hasta que escribas "con sdd". El harness se lo recuerda a la IA en cada mensaje. "directo" sigue valiendo para un solo mensaje.
- `doctor` prueba cada hook con un `git commit` (antes `git push`, que ahora pide confirmación).

## 2.4.4 — Listo para más usuarios
- **Licencia MIT** (`LICENSE`) y datos del repositorio en `package.json`.
- **README nuevo**: qué problema resuelve, un ejemplo de uso, instalación en 3 comandos con verificación, tabla de compatibilidad por herramienta, problemas frecuentes y preguntas frecuentes. Rutas genéricas para cualquier equipo; los detalles largos quedan plegados.
- El registro (`registro`) anota el tipo de cada mensaje (aprobación, pedido de cambio…), nunca su texto. `SECURITY.md` detalla qué guarda el estado y que la conversación de la herramienta solo se lee.

## 2.4.3 — GATE: el "sí" cuenta aunque la herramienta no le avise al harness
- **Respaldo desde la conversación**: si el agente quedó bloqueado pero en la conversación guardada por la herramienta (Codex, Claude Code, Copilot CLI) la pregunta del GATE va seguida solo de tu aprobación, el harness la reconoce y deja editar. Cubre hooks de mensaje que no llegan, sesiones retomadas horas después y contexto antepuesto en formatos nuevos. Es seguro: un "sí" junto a un pedido nuevo, o antes de que el agente presente el plan, no aprueba. El agente no puede escribir en esas conversaciones (requiere tu permiso).
- **Pregunta del GATE = plan pendiente**: si el agente termina con «¿Apruebo la implementación?», tu siguiente "sí" aprueba aunque el harness no hubiera detectado un pedido de cambio (gate `siempre`, pedido redactado de otra forma).
- Corrección de 2.4.2: el mensaje del usuario se guardaba en el mismo campo que el último mensaje del agente.
- `registro` anota cada mensaje tuyo y cómo quedó el GATE, para diagnosticar.
- La tilde nunca fue el problema: `si`, `Si`, `SI`, `sí` y `Sí` se reconocen igual.

## 2.4.2 — GATE: el "sí" funciona aunque la herramienta agregue contexto
- Codex (con el navegador integrado o en VS Code) y Claude Code en VS Code anteponen un bloque de contexto a tu mensaje (archivo abierto, pestañas, página del navegador). El GATE solo miraba el inicio del mensaje, así que tu "sí" no se registraba. Ahora el harness separa tu texto de ese contexto (`## My request for Codex:`, etiquetas como `<ide_opened_file>`, encabezados de contexto del navegador o del IDE) y evalúa solo lo que escribiste.
- Seguridad: el texto de la página o del IDE ya no puede activar "directo" ni abrir un pedido de cambio, y no se guarda como "pedido en curso".
- Si el agente queda bloqueado, el motivo muestra cómo leyó el harness tu último mensaje; `sdd-harness.js estado` también lo muestra.
- Copilot en VS Code: el tope de sub-agentes ahora reconoce su herramienta `runSubagent`, que antes no contaba.

## 2.4.1 — Corrección de una prueba en CI
- La prueba de `sdd-salida` usaba `process.exit(3)` justo después de imprimir 1.500 líneas; en Linux/macOS la salida a una tubería es asíncrona y se cortaba, así que la prueba fallaba en GitHub Actions (en Windows no). Ahora usa `process.exitCode = 3`. El harness no cambia.

## 2.4.0 — Harness completo: reglas propias, evaluaciones y repositorio listo para compartir
- **Reglas propias por proyecto** (linters con mensaje de corrección, práctica de OpenAI): en `harness.json` → `reglas` defines un patrón prohibido, en qué archivos y cómo hacerlo bien. El harness lo revisa antes de escribir, solo sobre el contenido nuevo. `sdd-harness.js reglas` revisa todo el proyecto. El orquestador propone reglas cuando corriges un error que no debe repetirse.
- **Evaluaciones con tareas reales** (`bin/sdd-eval.js`): corre tareas típicas con la IA sobre una copia temporal del proyecto, las verifica con un comando y registra éxito, turnos, tokens y costo; compara con la corrida anterior. Ejemplo en `evals/`.
- **Pedido en curso en la memoria**: `sesion.md` guarda el pedido que se está trabajando, para retomar tras `/clear` sin perder el objetivo.
- **Para compartir el repositorio**: pruebas en CI (Windows, macOS y Linux; Node 18, 20 y 22), `CONTRIBUTING.md`, `SECURITY.md` y `docs/PRACTICAS.md` (qué práctica profesional implementa cada pieza, con fuentes).

## 2.3.0 — Presupuesto de sub-agentes por código y modo ahorro
- **Tope de sub-agentes por mensaje del usuario**, aplicado por el harness (no por instrucción): cada sub-agente parte de cero y multiplica el consumo. Al superar el tope, Claude Code y Copilot muestran su diálogo ("¿permitir uno más?"); en Codex, Cursor y OpenCode el agente pide un "sí" en el chat, que libera el resto del pedido. Cada mensaje tuyo reinicia la cuenta. Los lanzamientos en paralelo se cuentan de forma atómica.
- **Modo ahorro (por defecto)**: máximo 3 sub-agentes por mensaje y, en pedidos de cambio, el harness le indica al orquestador que los trate como pequeños o medianos, anuncie el tamaño y pida aprobación para el flujo completo. `presupuesto.modo`: `ahorro` (3), `normal` (6) o `libre` (sin tope); `maxSubagentes` para un tope propio, global o por proyecto.
- `doctor` muestra el modo y el tope; `estado`, los sub-agentes usados en el último pedido.

## 2.2.0 — Ahorro de tokens sin perder contexto (prácticas de context engineering)
- **Salidas compactadas**: los comandos de verificación ruidosos (tests, lint, build, typecheck) se envuelven con `sdd-salida.js`. La IA recibe los errores con su contexto y el resumen final, no cientos de líneas; la salida completa queda en un archivo temporal ("compresión restaurable") y el código de salida se conserva. Claude Code, Codex, Gemini CLI y OpenCode. Configurable en `salida`.
- **Escalado de esfuerzo** en el orquestador: trivial → sin sub-agentes; pequeño → 1 implementer + sensores; mediano → explorer, plan corto, implementers, verifier; grande → flujo completo. Se anuncia el tamaño junto al flujo.
- **Referencias, no contenido**: al delegar se pasan rutas y líneas; los sub-agentes entregan reportes de ≤ ~1.500 tokens con archivo:línea, sin pegar archivos ni salidas largas.
- **Tests relacionados durante el trabajo** y suite completa una vez al final; **una tarea por sesión** con `/clear` (la memoria devuelve el contexto).
- **`sdd-harness.js consumo`**: en qué se fueron los tokens de la última sesión de Claude Code (conversación, caché, sub-agentes y las salidas de herramientas más pesadas).

## 2.1.2 — GATE: el "sí" del usuario ya no se pierde
- Si el agente termina su turno con las ediciones bloqueadas, el harness entiende que espera al usuario aunque no lo haya escrito como pregunta («Responda sí…»). El siguiente "sí" (con o sin tilde) aprueba. Antes se perdía y el agente quedaba bloqueado.
- Con el plan aprobado, mensajes de continuación ("continúa", "sigue", "falta", "también…") ya no reabren el bloqueo; un pedido nuevo sí.
- Escape manual: `node "$HOME/.sdd-orquestador/bin/sdd-harness.js" aprobar`, desde TU terminal, aprueba el plan pendiente. El agente no puede ejecutarlo.

## 2.1.1 — Corrección
- `/sdd-status` (y los demás scripts del orquestador: memoria, diagnóstico, conversión de PDF) quedaba bloqueado por el GATE mientras había un plan pendiente. Ahora los scripts propios de `~/.sdd-orquestador/bin` siempre están permitidos.

## 2.1.0 — Cierre de huecos del harness
- **Herramientas MCP bajo control**: escribir en GitHub/GitLab por MCP (crear PR, merge, push, comentar) se bloquea igual que git; en otros servidores (bases de datos, Jira, etc.), lo que escribe o ejecuta pide confirmación. Playwright, Chrome DevTools y Context7 quedan libres para el flujo browser. Configurable con `permisos.mcpLibres` y `permisos.mcpBloquear`. Cubre Claude Code, Codex, Gemini CLI, Cursor (`beforeMCPExecution`), Copilot y OpenCode.
- **GATE más estricto**: en las herramientas que entregan el último mensaje del agente, tu "sí" solo aprueba el plan si el agente terminó preguntando; un "sí" suelto o a un comando ya no abre las ediciones.
- **`doctor` con prueba en vivo**: ejecuta el comando exacto registrado en cada herramienta con un "git push" simulado y confirma que lo bloquee. Así detecta Node fuera del PATH, rutas mal citadas o formatos que cambiaron.
- **Sensores para Angular**: `ng build --configuration development` (revisa también las plantillas HTML) y Karma sin modo watch con Chrome headless. Plantillas listas para Android (Gradle), iOS (xcodebuild) y SCSS (stylelint) en `harness.json`.

## 2.0.0 — Harness: las reglas se cumplen por código, dentro de tu herramienta
Sin app propia, sin claves de API y sin red. El harness se enchufa en los hooks que ofrece cada herramienta (Claude Code, Codex, Gemini CLI, Cursor, VS Code Copilot) y como plugin local en OpenCode. Un núcleo común y un adaptador delgado por herramienta.
- **Permisos por código** (antes de cada comando y edición):
  - **Bloquea**: escritura en git, GitHub o GitLab, incluso si viene disfrazada (`cd x && git push`, `git -C x commit`, `cmd /c`, `bash -lc`, `$(…)`); comandos destructivos; y lectura o escritura de secretos (`.env`, claves, credenciales).
  - **Pide confirmación**: infraestructura, clientes de base de datos, borrar archivos, instalar dependencias y `sudo`. Usa el diálogo nativo en Claude Code y Copilot; en el resto la confirmación es en el chat, de un solo uso y válida por 30 minutos.
- **GATE por código**: un pedido de cambio bloquea las ediciones hasta que el usuario aprueba el plan («¿Apruebo la implementación?»). Mientras tanto solo se permiten lectura, tests y lint. Para algo trivial basta con decir "directo".
- **Sensores**: chequeo instantáneo tras cada edición (JSON y YAML, conflictos de merge, sintaxis Go). Al terminar el turno corren lint, tipos y tests relacionados de lo modificado, por módulo, con detección automática para Node/TS (eslint, tsc, vitest, jest) y Go (vet, test, golangci-lint). Con errores, el agente no puede dar el trabajo por terminado: se insiste hasta 2 veces.
- **Memoria y compactación**:
  - La memoria del proyecto se inyecta al iniciar y tras compactar en Claude Code, Codex, Gemini CLI y OpenCode.
  - `sesion.md` lleva un bloque automático con el estado del plan, los archivos modificados y los sensores, para retomar sin pérdida.
  - La memoria rechaza contenido con aspecto de secreto.
- **El agente no desactiva su harness**: editar `harness.json`, los hooks o la configuración de la IA requiere confirmación. El estado vive fuera del proyecto (`~/.sdd-orquestador/estado`) y el agente no puede escribirlo.
- **Configuración**: `~/.sdd-orquestador/harness.json` y `.sdd/harness.json` (GATE `auto`/`siempre`/`nunca`, sensores, permisos extra).
- **Diagnóstico**: `sdd-harness.js doctor | estado | sensores | registro`; `/sdd-status` muestra el estado del harness.
- **Codex**: reglas nativas `~/.codex/rules/sdd-orquestador.rules` (escritura en git y GitHub/GitLab prohibida) como red de seguridad mientras apruebas los hooks.
- `harness/src/rules.js` es la fuente única de reglas: la usan los hooks y los permisos nativos que instala `install.js`. Se agregaron psql, sqlcmd, mysql, mongosh, redis-cli y `docker login` a "con confirmación".
- **Pruebas automáticas** (`npm test`): política, GATE, sensores, adaptadores de las 6 herramientas, hook de punta a punta, plugin de OpenCode e instalación, reinstalación y desinstalación en un HOME simulado.
- `sdd-context.js` queda como script manual (el hook de memoria ahora es parte del harness). La desinstalación conserva tu `harness.json`.

## 1.13.0 — Compactación sin pérdida y aislada por proyecto
- **Hook SessionStart de Claude Code** (`sdd-context.js`): al iniciar, reanudar, limpiar o **después de compactar**, inyecta automáticamente la memoria del proyecto actual (índice + sesión de trabajo + lista de temas), con tope de 9.000 caracteres.
- **Compact Instructions** en las reglas globales: qué conservar al compactar (proyecto, objetivo, plan aprobado, decisiones, estado de tareas, errores y soluciones, pedidos del usuario, próximos pasos).
- `sesion.md` con la ruta del proyecto en la primera línea, actualizado al aprobar el plan, al terminar tareas importantes y al cerrar.
- **Aislamiento por proyecto**: la memoria se busca solo en la raíz git del proyecto; la del workspace multi-repo solo si ese workspace incluye el repo; nunca información de un proyecto en archivos globales ni en otro proyecto.
- `install.js --no-hooks` para omitir el hook; la desinstalación conserva los hooks propios del usuario.

## 1.12.0 — Memoria y contexto siempre activos
- La memoria del proyecto vuelve a ser automática (no es un archivo de trabajo): se lee el índice y la sesión al empezar, se cargan solo los temas relevantes, `sesion.md` se actualiza al aprobar el plan, al terminar y antes de compactar, y lo durable se guarda al cerrar informándolo en el chat ("Recordé: …").
- Optimización de contexto: no re-explorar ni re-leer lo que ya está en la conversación; a cada sub-agente solo lo necesario; el explorer parte de la memoria.
- Compactar u olvidar memoria sigue requiriendo confirmación. Los archivos de trabajo (análisis, planes, reportes) siguen sin crearse.

## 1.11.0 — Paralelo, todo en el chat y git de solo lectura
- **Ejecución en paralelo**: el orquestador lanza a la vez los agentes sin dependencias y encadena automáticamente lo que depende (pipeline: construir y verificar por tarea apenas termina). Se mantienen todos los agentes.
- **Nada guardado**: sin carpeta `changes/` ni archivos `.md`/`.json` intermedios; el contexto viaja en los mensajes entre agentes y todos los resultados se informan en el chat. Archivos solo cuando son el objetivo (código, tests, infra, documentación, prototipo) o si el usuario lo pide ("modo registro").
- **Respuestas**: explican lo necesario (hallazgos, motivo, evidencia, riesgos, próximos pasos), ni telegráficas ni con relleno.
- **Memoria y registro de mejora**: solo se escriben cuando el usuario lo pide.
- **Git**: lectura libre (status, diff, log, show, blame, ramas…, `gh`/`glab` de consulta); escritura **bloqueada** (commit, push, pull, merge, rebase, reset, checkout, stash, tag, PR, issues…) mediante reglas `deny` en Claude Code y OpenCode, y regla global en todas las IA.

## 1.10.0 — Diseño profesional (inspirado en Impeccable)
- `design-quality` reescrita: contexto de producto y sistema visual, **modos** (Persuadir, Operar, Leer, Experimentar), proceso por tarea y referencias por área (tipografía, color, espacio, movimiento, interacción, adaptar, simplificar, primer uso) + catálogo de anti-patrones ampliado.
- Skills nuevas: `design-context` (producto.md y diseno.md en memoria), `design-shape` (brief y dirección evaluada antes de codificar), `design-critique` (usabilidad 0–4, P0–P3), `design-audit` (5 áreas, /20, detector de Impeccable opcional sin telemetría), `design-polish`, `design-harden`, `ux-writing`, `sdd-ux` (pedidos de diseño en lenguaje natural).
- Sub-agente `sdd-ui-reviewer`; fase automática `ui-review` en `feature` y `fix` cuando hay cambios de UI (P0/P1 bloquean).
- Designer, implementers (web y mobile) y prototyper usan el nuevo proceso automáticamente.

## 1.9.0 — Entrega 3: gestor de tareas, multi-repo, mejora continua, dependencias y prototipos
- **Gestor de tareas** (una skill por herramienta): `tracker-common`, `tracker-jira`, `tracker-azure-boards`, `tracker-github-issues`, `tracker-gitlab-issues`, `tracker-linear`; comando `/sdd-ticket` (o mencionar la clave del ticket). Escribir en el gestor siempre con aprobación.
- **Entrega**: skill `release-notes` (commit Conventional Commits, descripción de PR/MR, CHANGELOG, SemVer) — solo borradores en `entrega.md`, git nunca automático.
- **Multi-repo**: skill `multi-repo` + `sdd-workspace.js` (workspace.json, contrato primero, columna Repo, orden de despliegue).
- **Mejora continua conservadora**: skill `sdd-improve` + `sdd-improve.js` (registro de incidentes en `mejora/registro.md` del repo del orquestador; umbral ≥ 2 ocurrencias o 1 alta; preferir reforzar/editar antes que crear; máx. 3 propuestas; poda).
- **Dependencias**: skill `deps-update` (referencias Node, Go, mobile, frameworks), sub-agente `sdd-deps-maintainer`, comando `/sdd-deps` (auditoría → lotes → GATE → verificación).
- **Prototipos**: skill `prototype`, sub-agente `sdd-prototyper`, comando `/sdd-prototype` (HTML autocontenido con tokens y contenido real, estados, marcos mobile, capturas).

## 1.8.0 — Skills por plataforma + Entrega 2 (QA funcional y analista funcional)
- **DevOps separado por plataforma** (una skill cada una, se carga solo la del proyecto): `ci-github-actions`, `ci-gitlab`, `ci-azure-pipelines`, `ci-jenkins`, `ci-bitbucket`, `container-docker`, `deploy-kubernetes`, `deploy-openshift`, `deploy-helm`, `deploy-kustomize`, `iac-terraform`, `config-consul`, `config-vault`, `ops-observability`. `devops-cicd` queda como principios y mapa.
- **Analista funcional**: sub-agente `sdd-business-analyst`, skills `analysis-requirements`, `analysis-modeling`, `analysis-estimation`, comando `/sdd-analyze` (historias, criterios de aceptación, reglas, diagramas, preguntas al cliente, estimación). Fase `analysis` opcional en `feature`.
- **QA funcional**: sub-agente `sdd-qa-functional`, skills `qa-acceptance`, `qa-web`, `qa-mobile`, comando `/sdd-qa` (casos de aceptación, negativos, borde, regresión, exploratorio, bugs con severidad y veredicto). Fase `qa` opcional al final de `feature` y `fix`.
- La spec traza historias → requisitos (`HU-01 → REQ-01`).

## 1.7.0 — Entrega 1: memoria, DevOps y post-despliegue
- **Memoria del proyecto** (`.sdd/memoria/`): índice compacto que se lee en cada flujo, temas que se leen solo si aplican, decisiones, pendientes, historial y contexto de sesión. Solo guarda conocimiento durable; presupuestos de tamaño; compactación sin perder decisiones vigentes (con confirmación). Script `sdd-memory.js` (init, stats, history, backup) y sub-agente `sdd-memory-curator`.
- Guardar contexto antes de compactar la conversación y retomarlo con `/sdd-continue`.
- **DevOps**: skill `devops-cicd` (Docker, pipelines, Kubernetes/OpenShift, Helm/Kustomize, Consul/Vault, observabilidad) y sub-agente `sdd-devops-engineer`; capa `infra` en tareas.
- **Post-despliegue**: skill `post-deploy-check` + comando `/sdd-deploy-check` (pods, logs, config, health, smoke en navegador, recomendación de rollback sin ejecutarlo).
- **Decisiones críticas** definidas en reglas globales; kubectl, oc, helm, terraform, docker push, consul, vault y CLIs de nube siempre piden aprobación (Claude Code y OpenCode).

## 1.6.0
- **Control del navegador mejorado**: modos Ver, Inspeccionar (consola/red/rendimiento), Verificación visual (UI propia en 4 tamaños + estados + diseño) y Tarea. "Ver" no crea carpeta `changes/`.
- Nuevo MCP `chrome-devtools` (consola, red, trazas de rendimiento) junto a Playwright.
- Detección automática: "muéstrame / abre / cómo se ve…" activa el navegador sin comandos.
- El frontend implementer y el verifier hacen verificación visual cuando la app corre en local.
- Skill `browser-automation` con referencias: herramientas, verificación visual, sesiones/login.

## 1.5.0
- **Mobile**: skills `stack-react-native`, `stack-expo`, `rn-animations` (Animated, Reanimated 4/3, Gesture Handler), `stack-ios`, `stack-swiftui`, `ios-hardware`, `stack-android`, `stack-compose`, `android-hardware`, `mobile-design`, `test-mobile`. Cada una con `references/` por tema (se cargan solo si la tarea lo requiere).
- **Diseño**: nueva skill `design-quality` (anti diseño genérico "de IA") aplicada a web y mobile; el designer define la "Dirección de diseño".
- Nuevo sub-agente `sdd-mobile-implementer` y capa `mobile` en tareas.
- Explorer detecta proyectos RN/Expo, iOS y Android.

## 1.4.2
- El orquestador ya no puede anular un RECHAZADO del verifier: debe ofrecer al usuario cumplir el gate o aceptar la excepción. Nuevo `sdd-state.js --accept-exception` (queda registrado como aprobado por el usuario).
- El GATE debe mostrar explícitamente decisiones que afecten quality gates (ej. no habrá test de reproducción).
- Test planner: propone la mínima extracción para hacer testeable código que lee configuración al cargar; las pruebas manuales se listan aparte.
- Verifier: intenta build, audit y cobertura antes de marcarlos "no medido" e indica el motivo.

## 1.4.1
- macOS/Linux: el instalador marca el hook de git como ejecutable (necesario si el repo se publicó desde Windows).

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
