Proyecto: C:/dev/orquestador-ia
<!-- harness:inicio (bloque automático del harness; no editar) -->
Última actividad: 2026-11-03 12:43 (claude) · Plan: aprobado
Pedido en curso: necesito solucionar esos errores
Archivos modificados en la sesión: harness/test/hook.e2e.test.js
Sensores: aprobado — ✓ tests
<!-- harness:fin -->

Objetivo actual: evolucionar el harness hacia resultados verificables, aprobaciones exactas, estado resistente y finalización por evidencia (7 lotes).
Plan aprobado (2026-11-03): lotes 1-7 con las recomendaciones D1-D8 en opción «a»:
- D1 tests obligatorio si el proyecto lo tiene; nada verde sin un control aprobado.
- D2 escribir fuera del proyecto (salvo temporal del sistema) y Bash sobre rutas protegidas = crítico; desconocidos se delegan al cliente salvo modo estricto.
- D3 un «sí» aprueba solo si hay una pendiente; con varias: «sí 1,3» o «sí a todas».
- D4 falla cerrada solo para lo crítico; modo estricto cierra todo salvo lecturas.
- D5 modelo de trabajo en el estado del harness (fuera del repo); changes/ y sdd-state.js obsoletos.
- D6 versión 3.0.0. D7 hasta 3 sub-agentes por lote. D8 sdd-eval con interfaz de cliente; solo Claude, Codex pendiente.
Diagnóstico: 25 fallos reproducidos (EVAL-1..6, SENS-1..7, APR-1..7, EST-1..3, FAIL-1, MEM-1) con scripts aislados; base: 92 tests, 91 ok, 1 omitido.
Estado: TERMINADO (2026-11-03). Lotes 1-7 implementados; npm test 192/192 en Windows (estable en 3 corridas); scripts de diagnóstico ya no reproducen los fallos. Docs actualizadas (README, SECURITY, PRACTICAS, CHANGELOG 3.0.0). Sin commit (lo hace el usuario).
Hecho (2026-11-03): claude.js:25 opción a — compacta en Claude solo si las reglas de permiso del usuario ya permiten el comando original y ninguna ask/deny lo toca (adapters/claude-permisos.js + claude-permisos.test.js; npm test 197/197). No se hizo la mejora del GATE con contenido pegado (no pedida).
Hecho (2026-11-03): CI rojo en los 12 jobs (run #8, 20fa079) por hook.e2e.test.js:27, que dependía de las reglas de ~/.claude/settings.json del equipo; ahora usa HOME temporal y espera null. npm test 197/197 en local y en entorno tipo CI (HOME vacío, sin identidad git); sdd-eval --validar ok. Linux/macOS no verificados en local (WSL sin node): se confirman al hacer push.
Pendientes para el usuario: commit + push del arreglo y revisar el CI; instalar/actualizar 3.0.0 y usar cada cliente para llegar a doctor nivel d. Detalle en pendientes.md.
