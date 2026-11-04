# Prácticas profesionales de harness engineering aplicadas

Cada fila es una práctica publicada por equipos que construyen agentes en producción y dónde está implementada aquí.

| Práctica | Fuente | Dónde |
|---|---|---|
| **Agente = modelo + harness**: el valor está en lo que rodea al modelo (guías, herramientas, controles, memoria) | OpenAI, *Harness engineering*; Anthropic | Todo el repositorio |
| **Guías y sensores**: orientar antes de actuar y verificar después, con controles deterministas | Martin Fowler, *Harness engineering* | `core/` (guías) · `harness/src/sensors.js` (sensores) |
| **Mapa, no manual**: instrucciones globales cortas; el detalle en skills que se cargan solo cuando hacen falta | OpenAI (AGENTS.md como índice); Anthropic (*progressive disclosure*, CLAUDE.md < 200 líneas) | `core/rules/global.md` + 104 skills |
| **Controles por código, no por instrucciones** | OpenAI; Anthropic (hooks) | `harness/src/policy.js`, `gate.js`, adaptadores por herramienta |
| **Linters con mensaje de corrección**: cada error que no debe repetirse se vuelve una regla que dice cómo hacerlo bien | OpenAI | `harness/src/project-rules.js` → `harness.json` → `reglas` |
| **Verificar de punta a punta antes de terminar** | Anthropic (*long-running agents*); OpenAI | Sensores al terminar el turno (`core.js` → `onStop`), también sobre lo cambiado por shell (`verificacion.js`) |
| **Lo que no se verificó no cuenta como verificado**: resultados explícitos (aprobado, fallido, no verificado, bloqueado, excepción) | Práctica general de ingeniería de calidad | `harness/src/resultado.js`, usado por sensores, trabajo y `sdd-eval` |
| **Estado del trabajo fuera del contexto y con evidencia**: tareas que se dan por hechas solo con verificación del sistema, no con lo que dice el modelo | Anthropic (*long-running agents*: lista de funcionalidades con estado) | `harness/src/trabajo.js` → `sdd-harness.js trabajo` |
| **El contexto es un recurso finito**: el conjunto más chico de tokens de alta señal | Anthropic, *Effective context engineering* | Presupuesto de contexto en `sdd-orchestrator`; salidas compactadas |
| **Escalar el esfuerzo a la complejidad**; multi-agente ≈ 15× tokens, no siempre conviene en código | Anthropic, *Multi-agent research system* | Tamaños en `sdd-orchestrator` + tope por código (`harness/src/budget.js`) |
| **Sub-agentes devuelven resúmenes (1.000–2.000 tokens) y referencias**, no contenido | Anthropic | Reglas comunes de los 22 agentes; plantilla de delegación |
| **Recortar salidas de herramientas** (observation masking: −50 % de costo sin bajar la tasa de éxito) | JetBrains Research, *The Complexity Trap* | `harness/src/output.js` + `bin/sdd-salida.js` |
| **Compresión restaurable**: sacar el contenido del contexto pero dejar cómo recuperarlo | Manus | La salida completa queda en un archivo temporal con su ruta |
| **Notas fuera del contexto** (NOTES.md / to-do) y compactación con instrucciones | Anthropic; Manus (recitación) | `.sdd/memoria/`, bloque automático en `sesion.md`, *Compact Instructions* |
| **Instrucciones estables para aprovechar la caché** (sin marcas de tiempo al inicio) | Manus (KV-cache) | Reglas globales fijas; el contexto variable va al final (en el mensaje) |
| **Mantener los errores a la vista** para que el modelo se corrija | Manus | Los bloqueos y fallas de sensores se devuelven a la IA con su motivo |
| **El agente no modifica sus propias protecciones** | Práctica de seguridad general | `policy.js` → configuración protegida, también por comandos con destino reconocible; estado fuera del proyecto; decisiones solo del usuario (aprobar, excepciones, aceptar) |
| **Una confirmación autoriza una acción concreta**, no una categoría: ligada a sus argumentos, de un solo uso y con vencimiento | Práctica de seguridad general | `harness/src/aprobaciones.js` |
| **Registro de decisiones correlacionado y sin contenido sensible** | Práctica general de observabilidad | `harness/src/eventos.js` → `sdd-harness.js eventos --explicar <id>` |
| **Medir antes de optimizar**: consumo por sesión, pruebas deterministas y evaluaciones con tareas reales comparadas solo entre corridas compatibles | Anthropic; OpenAI | `sdd-harness.js consumo` · `evals/corpus/` + `harness/test/corpus.test.js` · `bin/sdd-eval.js` |
| **Puntos de restauración**: poder volver a un estado que funciona | Anthropic (*long-running agents*: commits como checkpoints) | `harness/src/checkpoints.js`: almacén interno fuera del repo, para no ensuciar la historia ni depender de commits |
| **Arquitectura aplicada mecánicamente**: tests estructurales y linters de capas con mensaje de corrección | OpenAI, *Harness engineering* | `project-rules.js` → `noImportar`, `nombreArchivo`, `maxLineas` |
| **"Lethal trifecta"**: datos privados + contenido no confiable + canal de salida | Simon Willison | `harness/src/external.js`: tras leer contenido externo, los envíos de datos piden confirmación |
| **Arreglar el harness, no "esforzarse más"**: cada falla recurrente se corrige en el sistema | OpenAI | Registro de mejora (`/sdd-improve`), reglas propias, pruebas automáticas |

## Límites conocidos

- Los hooks son una barrera contra errores normales, no un aislamiento de seguridad: para código sensible usa el sandbox de tu herramienta o un contenedor (devcontainer). Detalle en [`SECURITY.md`](../SECURITY.md#límites-y-riesgos-residuales).
- La defensa contra contenido externo reconoce los canales habituales (curl, wget, scp, ssh, nc, URLs con datos); un script que arme su propia conexión puede no detectarse.
- Las reglas de arquitectura revisan antes de escribir lo que pasa por las herramientas de edición; lo que cambia un comando de shell se revisa al terminar el turno (`prohibido` y `noImportar`) o con `sdd-harness.js reglas`.
- El primer punto de restauración de un proyecto muy grande puede no caber en el tiempo de un hook: se prepara una vez con `sdd-harness.js puntos --iniciar`.
- Que se cumplió el requerimiento (no solo que compile y pase tests) no lo garantiza el harness: los criterios de aceptación los propone el agente y los apruebas tú, y la aceptación funcional la marcas tú.
- Cursor y Copilot exponen menos hooks: no hay compactación de salidas y la memoria tras compactar depende de la IA.
- Las capacidades de cada herramienta las declara su adaptador; solo `doctor` (nivel d) confirma que la herramienta real invoca los hooks, y ninguna prueba automática confirma que respete cada respuesta.
