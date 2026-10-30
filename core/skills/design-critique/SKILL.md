---
name: design-critique
description: Crítica de diseño de una pantalla o flujo (jerarquía, claridad, calidad de ejecución, usabilidad con puntaje 0–4 por heurística, recorridos desde distintas perspectivas, anti-patrones) con prioridades P0–P3, sin modificar código. Usar al revisar el diseño de UI implementada o cuando algo "se ve genérico o confuso".
---
# Crítica de diseño

Carga `design-quality` (contexto, modo y anti-patrones). Revisa el código **y**, si hay navegador, la pantalla renderizada (capturas en móvil y escritorio con `browser-automation`). **No modifica código.**

## Qué evaluar
1. **Calidad de diseño**: ¿qué es intencional, qué es genérico y qué es inconsistente con el sistema? Anti-patrones encontrados.
2. **Usabilidad** (0–4 cada una; `n/a` si no aplica, el total se ajusta):
   visibilidad del estado · lenguaje del usuario · control y salida (deshacer, cancelar) · consistencia · prevención de errores · reconocer antes que recordar · eficiencia para usuarios frecuentes · diseño mínimo (sin ruido) · recuperación de errores · ayuda en contexto.
3. **Recorridos** (simulados): usuario nuevo, usuario frecuente con apuro, usuario con lector de pantalla/teclado, usuario en móvil con una mano.
4. **Prioridades**: fortalezas a conservar, problemas y preguntas abiertas.

## Severidad
**P0** bloquea la tarea o es inaccesible · **P1** importante antes de entregar · **P2** menor, siguiente pasada · **P3** pulido.

## Salida (en tu respuesta)
```markdown
## Crítica — <pantalla> — puntaje usabilidad: X/Y
### Conservar
### Problemas (P0–P3, con evidencia: captura o archivo:línea, y propuesta)
### Anti-patrones detectados
### Preguntas abiertas
```
