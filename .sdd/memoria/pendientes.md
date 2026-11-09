# Pendientes (deuda, riesgos, preguntas abiertas)

Resuelto en 3.0.0 (2026-11-03): resultado de evaluaciones, fallo que persiste tras reintentos, vínculo requisitos-evidencias, aprobaciones MCP exactas y conjuntas, modo estricto y concurrencia del estado.

Resuelto en 3.1.0 (2026-11-06 y 2026-11-08): GATE invertido con banco de frases, «~» y variables de home en comandos, «sin sdd» en contenido pegado, tickets de Azure Boards en el GATE, clasificación MCP de Azure DevOps y runner de tests por proyecto (Karma fuera de Angular, modo observación, Mocha y Jasmine).

## Abierto (11)

- [ ] Integración real por cliente (doctor nivel d) sin confirmar: requiere instalar 3.0.0 y usar cada cliente; Cursor no instalado en este equipo.
- [ ] Ejecutar CI en macOS/Linux (solo se probó en Windows localmente). 2026-11-03: corregidos el test que dependía de ~/.claude/settings.json y la lectura de stdin (EAGAIN); falta ver el CI en verde. 2026-11-06: la suite completa corre en 65 s en Linux (214 pruebas, 213 pass + 1 skip por disco sensible a mayúsculas); medir sobre una carpeta montada por red o por puente da 19 s por spawn y no sirve de referencia.
- [ ] sdd-eval: cliente Codex pendiente (no instalado); modo «flujo» y formato JSON de Claude solo probados con binario falso. No se ejecutaron evaluaciones con modelos.
- [ ] Si el módulo del harness no carga (instalación dañada), el hook falla abierto; queda en ultimo-error.json.
- [ ] Detección de escrituras por Bash es de mejor esfuerzo (intérpretes y scripts pueden escribir sin destino reconocible). No es un sandbox.
- [ ] Límites de eventos (1 MB × 5, 30 días) fijos en código; no configurables.
- [ ] Soporte de «ask» en hooks de Copilot (vista previa) sin verificar en el host.
- [ ] Decisión del usuario · npm: package.json sigue con `private: true` y sin `bin` ni `files`, y existe la carpeta vacía changes/2026-10-30-publicar-orquestador-sdd-en-npm-sin-depe. Publicar (agregar bin y files, quitar private) o borrar la carpeta.
- [ ] Decisión del usuario · partir README.md (798 líneas: portada, manual, referencia de configuración y seguridad en un solo archivo). Falta definir qué se va a docs/.
- [ ] Decisión del usuario · issues de GitHub/GitLab: siguen denegados. Aplicarles el criterio de «tracker con confirmación, código bloqueado» que ya tiene Azure cambiaría una garantía declarada en SECURITY.md; sus nombres de herramienta (create_issue, add_issue_comment) no distinguen tracker de repositorio.
- [ ] Decisión del usuario · Node 18 está fuera de soporte y sigue en engines y en la matriz de CI (3 SO x 4 versiones). La suite corre en 52 s, así que la matriz completa no es cara: es solo si vale la pena seguir probando 18.

## Resuelto (se conserva por el límite que dejó)

- [x] Compactador en Claude (claude.js:25): resuelto 2026-11-03 con la opción a (adapters/claude-permisos.js). Límite: no ve políticas por registro, perfil de macOS, servidor ni --allowedTools/--disallowedTools.
- [x] «sin sdd» dentro de contenido pegado: resuelto 2026-11-06 (gate.js `switchScope`): la frase solo cuenta en mensajes cortos que no parecen log ni código. Límite: sigue siendo heurística (un mensaje corto que sea solo esa línea pegada la tomaría como instrucción).
- [x] MCP de Azure DevOps: resuelto 2026-11-06 (3.1.0). mcp.js separa el gestor de tickets del repositorio: los work items de Azure Boards (wit_*, work_item*, backlog, wiql, boards, iteration, area path) se escriben con confirmación y Azure Repos sigue bloqueado; «query» sale de WRITE_VERB (wit_query es lectura); FORGE_SERVER reconoce ado, azdo, vsts y tfs, así que el resultado ya no depende del nombre del servidor. Pruebas en harness/test/mcp.test.js. tracker-azure-boards ahora indica qué registrar por proyecto (organización, proyecto, equipo, area path, iteration path y proceso). Ya no hace falta el apaño con permisos.mcpBloquear/mcpLibres. Sin verificar contra el MCP real: no está conectado en este equipo.
- [x] GATE con tickets de Azure: resuelto 2026-11-06. TICKET reconoce `AB#1234`, `PBI 4521` y `…/_workitems/edit/1234` además de `LAB-123`; con el GATE invertido un mensaje sin verbo abre igual. Casos en evals/corpus/12-gate-no-detectado.json.
