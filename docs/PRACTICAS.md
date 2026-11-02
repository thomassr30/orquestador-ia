# Prácticas profesionales de harness engineering aplicadas

Cada fila es una práctica publicada por equipos que construyen agentes en producción y dónde está implementada aquí.

| Práctica | Fuente | Dónde |
|---|---|---|
| **Agente = modelo + harness**: el valor está en lo que rodea al modelo (guías, herramientas, controles, memoria) | OpenAI, *Harness engineering*; Anthropic | Todo el repositorio |
| **Guías y sensores**: orientar antes de actuar y verificar después, con controles deterministas | Martin Fowler, *Harness engineering* | `core/` (guías) · `harness/src/sensors.js` (sensores) |
| **Mapa, no manual**: instrucciones globales cortas; el detalle en skills que se cargan solo cuando hacen falta | OpenAI (AGENTS.md como índice); Anthropic (*progressive disclosure*, CLAUDE.md < 200 líneas) | `core/rules/global.md` + 104 skills |
| **Controles por código, no por instrucciones** | OpenAI; Anthropic (hooks) | `harness/src/policy.js`, `gate.js`, adaptadores por herramienta |
| **Linters con mensaje de corrección**: cada error que no debe repetirse se vuelve una regla que dice cómo hacerlo bien | OpenAI | `harness/src/project-rules.js` → `harness.json` → `reglas` |
| **Verificar de punta a punta antes de terminar** | Anthropic (*long-running agents*); OpenAI | Sensores al terminar el turno (`core.js` → `onStop`) |
| **El contexto es un recurso finito**: el conjunto más chico de tokens de alta señal | Anthropic, *Effective context engineering* | Presupuesto de contexto en `sdd-orchestrator`; salidas compactadas |
| **Escalar el esfuerzo a la complejidad**; multi-agente ≈ 15× tokens, no siempre conviene en código | Anthropic, *Multi-agent research system* | Tamaños en `sdd-orchestrator` + tope por código (`harness/src/budget.js`) |
| **Sub-agentes devuelven resúmenes (1.000–2.000 tokens) y referencias**, no contenido | Anthropic | Reglas comunes de los 22 agentes; plantilla de delegación |
| **Recortar salidas de herramientas** (observation masking: −50 % de costo sin bajar la tasa de éxito) | JetBrains Research, *The Complexity Trap* | `harness/src/output.js` + `bin/sdd-salida.js` |
| **Compresión restaurable**: sacar el contenido del contexto pero dejar cómo recuperarlo | Manus | La salida completa queda en un archivo temporal con su ruta |
| **Notas fuera del contexto** (NOTES.md / to-do) y compactación con instrucciones | Anthropic; Manus (recitación) | `.sdd/memoria/`, bloque automático en `sesion.md`, *Compact Instructions* |
| **Instrucciones estables para aprovechar la caché** (sin marcas de tiempo al inicio) | Manus (KV-cache) | Reglas globales fijas; el contexto variable va al final (en el mensaje) |
| **Mantener los errores a la vista** para que el modelo se corrija | Manus | Los bloqueos y fallas de sensores se devuelven a la IA con su motivo |
| **El agente no modifica sus propias protecciones** | Práctica de seguridad general | `policy.js` → configuración protegida; estado fuera del proyecto |
| **Medir antes de optimizar**: consumo por sesión y evaluaciones con tareas reales | Anthropic; OpenAI | `sdd-harness.js consumo` · `bin/sdd-eval.js` |
| **Puntos de restauración**: poder volver a un estado que funciona | Anthropic (*long-running agents*: commits como checkpoints) | `harness/src/checkpoints.js`: almacén interno fuera del repo, porque el agente nunca hace commits |
| **Arquitectura aplicada mecánicamente**: tests estructurales y linters de capas con mensaje de corrección | OpenAI, *Harness engineering* | `project-rules.js` → `noImportar`, `nombreArchivo`, `maxLineas` |
| **"Lethal trifecta"**: datos privados + contenido no confiable + canal de salida | Simon Willison | `harness/src/external.js`: tras leer contenido externo, los envíos de datos piden confirmación |
| **Arreglar el harness, no "esforzarse más"**: cada falla recurrente se corrige en el sistema | OpenAI | Registro de mejora (`/sdd-improve`), reglas propias, pruebas automáticas |

## Límites conocidos

- Los hooks son una barrera fuerte contra errores normales, no un aislamiento de seguridad: para código sensible usa el sandbox de Codex o un contenedor (devcontainer).
- La defensa contra contenido externo reconoce los canales habituales (curl, wget, scp, ssh, nc, URLs con datos); un script que arme su propia conexión puede no detectarse.
- Las reglas de arquitectura revisan lo que escriben las herramientas de edición; lo que genera un comando de shell se revisa con `sdd-harness.js reglas`.
- El primer punto de restauración de un proyecto muy grande puede no caber en el tiempo de un hook: se prepara una vez con `sdd-harness.js puntos --iniciar`.
- La verificación de que se cumplió el requerimiento (no solo que compile y pase tests) la hace el agente verificador.
- Cursor y Copilot exponen menos hooks: no hay compactación de salidas y la memoria tras compactar depende de la IA.
