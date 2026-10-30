---
name: code-review
description: Checklist y formato de informe para revisar código por calidad, seguridad, rendimiento, accesibilidad y convenciones del stack. Usar en el sub-agente sdd-reviewer.
---
# Revisión de código

ENTRADA: `changes/<id>/input.md` (alcance), `stack.json`. SALIDA: `changes/<id>/review.md`
Carga las skills `stack-*` de `stack.json` para comparar contra sus convenciones.

## Qué revisar
1. **Correctitud**: lógica, casos borde, manejo de errores, nulos, concurrencia.
2. **Seguridad**: validación de entrada, autorización en servidor, SQL parametrizado, secretos, datos sensibles en logs (ver `test-security`).
3. **Diseño**: responsabilidades, acoplamiento, duplicación, nombres.
4. **Rendimiento**: N+1, queries sin índice, renders innecesarios, bundles.
5. **Accesibilidad** (UI): semántica, labels, foco, contraste (ver `stack-html-css`).
6. **Tests**: existen, cubren casos importantes, no son frágiles.
7. **Convenciones**: las del `AGENTS.md` del proyecto y las skills del stack.

## Formato de `review.md`
```markdown
# Revisión: <alcance>
## Resumen (3 líneas) — veredicto: Aprobable | Aprobable con cambios | Requiere cambios
## Hallazgos
| # | Severidad | Archivo:línea | Hallazgo | Sugerencia |
Severidad: 🔴 Crítico (bug/seguridad) · 🟠 Importante · 🟡 Menor · 💡 Sugerencia
## Lo que está bien (máx. 3)
```
Reglas: cada hallazgo con evidencia archivo:línea; nada de opiniones sin fundamento; máximo ~20 hallazgos, priorizados. Ejecuta lint/tests si es rápido y adjunta el resultado.
