# Cambios

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
