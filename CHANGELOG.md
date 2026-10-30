# Cambios

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
