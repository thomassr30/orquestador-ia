---
name: sdd-verify
description: Verifica el cambio contra spec, diseño y quality gates ejecutando tests, lint, seguridad y accesibilidad. Usar en la fase verify del flujo SDD.
---
# Verificar

ENTRADA: plan aprobado, requisitos y tareas (en el mensaje). SALIDA: informe en tu respuesta (no crees archivo salvo que el usuario lo pida).

## Ejecutar (comandos desde el stack detectado; si no existen, los scripts del proyecto)
1. Tests de todo el proyecto (unit + integración) y los del plan (e2e, a11y, etc.). Mobile: ver `test-mobile` (iOS requiere macOS/Xcode; si no está disponible → "no medido" con motivo).
2. Lint / type-check / build.
3. Seguridad según skill `test-security` (dependencias + SAST rápido).
3b. Si hubo cambios de UI web y la app corre en local: verificación visual con `browser-automation` (`references/visual-check.md`); incluye lo observado en las capturas. Si no se puede levantar la app, "no medido" con motivo.
4. Cobertura del código modificado si el runner la soporta.

## Quality gates (todos deben cumplirse)
- [ ] Todos los tests en verde
- [ ] Cobertura ≥ 80% en código modificado (si es medible)
- [ ] 0 errores de lint / type-check; build OK
- [ ] 0 vulnerabilidades altas/críticas nuevas
- [ ] 0 violaciones graves de accesibilidad (si hubo UI)
- [ ] Cada REQ de los requisitos trazado a ≥1 test que pasa
- [ ] Los archivos modificados son los del plan (revísalo con `git status`/`git diff --stat`, solo lectura)

```
Verificación — APROBADO | RECHAZADO
## Gates (gate | resultado | evidencia)
## Trazabilidad REQ → test → estado
## Fallos (archivo:línea, mensaje, causa probable, tarea responsable)
## Observaciones (no bloqueantes)
```
Gates "no medidos": intenta SIEMPRE build, audit y cobertura con los comandos del proyecto antes de marcarlos "no medido"; si no se pueden, indica el motivo exacto (comando inexistente, herramienta no instalada, error).
NO corrijas código: solo reportas. Entrega veredicto, gates con evidencia, fallos y tareas a corregir, con lo necesario para actuar.
