# Seguridad

Versión 3.1.0. Este documento describe lo que el código del harness hace y lo que no; cada afirmación tiene su fuente en `harness/src/` o `bin/`.

## Modelo de amenazas

**Contra qué protege:** los errores habituales de un agente de IA que trabaja en tu equipo con tus permisos.

- Acciones que deberías decidir tú: hacer commit, escribir en GitHub/GitLab, borrar, instalar dependencias, tocar infraestructura o bases de datos, cambiar su propia configuración.
- Leer o escribir secretos (`.env`, claves, certificados) y escribir claves o tokens en el código.
- Editar antes de que apruebes el plan.
- Dar un cambio por bueno con controles fallidos u omitidos.
- Instrucciones inyectadas por contenido externo (web, tickets, documentos, MCP) que intentan enviar datos afuera.

**Fuera de alcance:**

- Un agente o un actor que intenta evadir los controles a propósito (ofuscación, scripts o intérpretes que escriben o envían datos por su cuenta).
- Una herramienta de IA que no invoca los hooks o no respeta su respuesta.
- Un equipo ya comprometido, y lo que el proveedor de tu herramienta de IA hace con el contexto que recibe.

## Qué hace en tu equipo

- Es un conjunto de scripts de Node.js que **tu herramienta de IA ejecuta** (hooks) antes y después de cada acción. No es un servicio, no abre puertos y no usa red ni claves de API.
- Lee la entrada del hook (comando, archivo, argumentos o mensaje) y responde permitir, bloquear, pedir confirmación o avisar.
- Ejecuta procesos hijos solo para los sensores (lint, tipos, tests, comandos de aceptación), `git status` y los puntos de restauración, con tiempo límite; al excederlo termina el árbol de procesos (`harness/src/proc.js`).
- Para reconocer tu aprobación cuando la herramienta no la avisa, **lee** (nunca escribe) la conversación que tu herramienta ya guarda en tu equipo.

## Qué guarda y dónde

| Dónde | Qué |
|---|---|
| `.sdd/memoria/sesion.md` del proyecto | Bloque automático: estado del plan, archivos modificados, sensores y el pedido en curso (con secretos redactados). |
| `~/.sdd-orquestador/estado/<proyecto>/sesion-<id>.json` | Estado por sesión: GATE, archivos modificados, huellas de lo cambiado según git, última verificación, excepciones, aprobaciones (solo HMAC y etiqueta sin valores), el pedido en curso redactado (hasta 300 caracteres) y el inicio de tu último mensaje redactado (60 caracteres). En Cursor, además, el final del último mensaje del agente (hasta 2.000 caracteres) hasta que termina el turno. Junto a él: `.bak` (versión válida anterior), `.lock` (candado) y `.corrupto-<fecha>` (cuarentena). Los estados, sus respaldos y cuarentenas se borran a los 14 días. |
| `~/.sdd-orquestador/estado/<proyecto>/eventos.jsonl` | Eventos estructurados: decisión, motivo propio del harness, etiqueta de la acción sin valores, huellas e ids. Sin prompts, argumentos ni contenido de archivos; los textos pasan por la redacción de secretos y se recortan a 300 caracteres. Rota al pasar 1 MB y conserva 5 archivos rotados. |
| `~/.sdd-orquestador/estado/<proyecto>/trabajo.json` | Trabajo verificable: objetivo, requisitos, criterios, tareas, intentos, evidencias y decisiones (textos redactados y recortados). |
| `~/.sdd-orquestador/estado/<proyecto>/linea-base.json` | Errores conocidos de los chequeos de proyecto completo en un commit. |
| `~/.sdd-orquestador/estado/<proyecto>/espacio.json` | Mapa del espacio de trabajo (nombres, rutas y stack de cada proyecto, leídos de sus marcadores). |
| `~/.sdd-orquestador/estado/config-valida/` | Copia de la última versión válida de cada `harness.json` leído, para usarla si el archivo se daña. |
| `~/.sdd-orquestador/clave-aprobaciones` | Clave local aleatoria (32 bytes) para el HMAC de las aprobaciones, creada con modo `0600` (en macOS y Linux, solo tu usuario la lee). Se crea con la primera confirmación en el chat. |
| `~/.sdd-orquestador/observado.json` | Qué eventos envió cada herramienta y cuándo (como máximo un registro por hora y evento), sin contenido. |
| `~/.sdd-orquestador/ultimo-error.json` | Último error interno del hook, con tus rutas de usuario reemplazadas por `~`. |
| `~/.sdd-orquestador/puntos/` | Puntos de restauración: un repositorio git interno por proyecto, separado del `.git` del proyecto, que nunca se toca. No copia secretos (`.env`, claves, certificados) ni lo ignorado por `.gitignore`. Guarda los últimos 30 por proyecto y la etiqueta incluye el inicio de tu mensaje. |
| Carpeta temporal del sistema | Salidas completas de comandos compactados (`sdd-salidas/`) y el proyecto temporal de `doctor` (se borra al terminar). |

Además, por pedido explícito tuyo: `workspace --aplicar` agrega carpetas a la configuración local de Claude Code y Codex, y `bin/sdd-eval.js` trabaja en una copia temporal y escribe `<tareas>.resultados.json` junto al archivo de tareas.

## Garantías

Valen cuando la herramienta invoca el hook y respeta su respuesta (`doctor` confirma lo primero en el nivel d, no lo segundo).

- **Bloqueos**: escritura en el repositorio de GitHub/GitLab/Azure Repos (PR, merge, issues, releases), también por MCP; comandos destructivos; un commit cuyo mensaje trae una línea de atribución de IA (`Co-Authored-By: Claude`, `Generated with…`).
- **Confirmación** para `git commit`, también por alias y herramientas que crean commits (con aviso en `--amend`, que reescribe la historia), y para el resto de git (con aviso cuando descarta cambios o reescribe el remoto), infraestructura, bases de datos, borrados, dependencias, publicar paquetes, configurar servidores MCP, herramientas MCP que escriben, escribir en lo que en una forja no es su código (Azure Boards: comentar, cambiar de estado o vincular; la wiki; los planes de prueba; lanzar pipelines, que las skills tratan como decisión del usuario y no como publicación de código, y que se reconoce también por el argumento `action` de las herramientas agrupadas), la configuración del harness y de los hooks, y escribir fuera del proyecto (salvo la carpeta temporal del sistema).
- **Mismas protecciones por shell**: cuando un comando escribe en un destino reconocible (redirecciones, `sed -i`, `cp`/`mv`, `tee`, `dd`, cmdlets de PowerShell…), ese destino pasa por las mismas reglas que una edición (`policy.js`, `writeTargets`). Antes de resolverlo se expanden `~`, `$HOME`, `${HOME}`, `%USERPROFILE%` y `$env:USERPROFILE` (`policy.js`, `expandPath`), y un destino que no se puede resolver (otra variable o un comodín) se trata como escritura fuera del proyecto: decisión del usuario, no se omite. Un comando que escribe archivos con claves o tokens de formato conocido se bloquea.
- **Decisiones solo del usuario**: aprobar el plan, autorizar excepciones, aceptar o descartar el trabajo, y `sdd-state.js --approve | --accept-exception`. La política le niega esos comandos al agente.
- **Estado del harness fuera del alcance del agente**: las ediciones y los comandos que nombran `~/.sdd-orquestador/estado` se deniegan.
- **Aprobaciones exactas** (Codex, Gemini CLI, Cursor, OpenCode): ligadas al comando, los argumentos o el contenido, al proyecto y a la sesión; un solo uso; vencen a los 30 minutos; consumo bajo candado.
- **Estado resistente**: toda escritura usa un candado con dueño y es atómica (temporal, `fsync` y `rename`). Sin candado no se escribe: lo crítico se deniega. Un estado dañado queda en cuarentena y la sesión sigue en modo restrictivo (GATE requerido, sin aprobaciones, contenido externo marcado) con aviso. Un estado de una versión más nueva no se sobrescribe. Una configuración ilegible se reemplaza por su última versión válida, con aviso.
- **Falla cerrada para lo crítico**: ante un error interno, en el núcleo o en el adaptador, lo crítico se deniega (o se pregunta con diálogo nativo). En modo `estricto`, todo salvo lecturas.
- **Contenido externo**: desde que la sesión lee una web, un MCP externo o una descarga, los comandos y URLs que el harness reconoce como envío de datos a otro servidor piden confirmación.

## Límites y riesgos residuales

- **Los hooks no son un sandbox.** La detección de escrituras por shell es por patrones: scripts e intérpretes (`node -e`, `python`, un script del proyecto) pueden escribir sin que se reconozca el destino. Un comando que no se reconoce como seguro lo decide la herramienta en modo `normal`. Para código sensible usa el sandbox de tu herramienta (Claude Code `sandbox.enabled` aísla solo los comandos Bash; Codex `sandbox_mode`) o un contenedor.
- **El GATE se abstiene al reconocer una consulta.** Desde 3.1.0 la pregunta es la inversa: el GATE se abre salvo que el mensaje se reconozca como consulta, saludo, aprobación o pedido directo (`gate.js`, `requiresPlan`). El banco `evals/gate/frases.json` mide esa decisión en `npm test`. Un pedido con forma de consulta se cubre con un veto por verbo de cambio, pero sigue siendo detección por patrones: uno redactado enteramente como pregunta informativa puede no activarlo. `gate: "siempre"` elimina esa dependencia; `gate: "pedido"` vuelve al criterio de 3.0.0.
- **Apagar el orquestador por texto.** «sin sdd» y «con sdd» solo cuentan en mensajes cortos que no parecen contenido pegado (`gate.js`, `switchScope`): un log con la frase ya no apaga el orquestador, pero la detección es heurística.
- **La integración con cada herramienta real no se prueba automáticamente.** Las pruebas de contrato usan payloads simulados. El nivel (d) de `doctor` cuenta cualquier ejecución del hook fuera de `doctor` (sin `SDD_DOCTOR=1`), así que una ejecución manual también lo marca.
- **Compactación de salidas en Claude Code.** Claude Code evalúa sus reglas de permiso contra el comando envuelto, no contra el original. Por eso el harness solo compacta un comando (tests, lint, build) si tus reglas de Claude Code ya lo permiten y ninguna regla de preguntar o denegar lo toca (`harness/src/adapters/claude-permisos.js`); si no, no opina y Claude evalúa el comando original con tus reglas. Lee `~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json` y la política en archivo (`managed-settings.json`, `managed-settings.d/`). No puede ver políticas por registro de Windows, perfil de macOS o servidor, ni `--allowedTools`/`--disallowedTools`: si tu organización deniega comandos de test por esas vías, usa `"salida": { "compactar": false }`.
- **Instalación dañada.** Si el módulo del harness no carga en absoluto, el hook no decide y la acción sigue (falla abierta). `doctor` muestra el último error en `ultimo-error.json` si alcanzó a registrarse; también falla abierto si Node no está en el PATH de la herramienta.
- **Contenido externo por patrones.** Un script que arme su propia conexión puede no detectarse.
- **Lecturas fuera del proyecto.** El harness solo bloquea los archivos con secretos; el resto lo decide la herramienta.
- **Retención de eventos.** El tamaño del registro queda acotado por la rotación (1 MB y 5 archivos) y, al iniciar cada sesión, se borran los archivos rotados (y el `registro.log` anterior) de más de 30 días. El archivo de eventos actual no se recorta por antigüedad, solo por tamaño. Estos límites son fijos en el código (no configurables).

## Reportar un problema

Abre un *issue* privado o contacta a quien mantiene el repositorio. No incluyas secretos ni datos de clientes en el reporte.
