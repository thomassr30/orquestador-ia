---
name: stack-angular
description: Convenciones para desarrollar y testear aplicaciones Angular modernas (standalone, signals). Usar cuando stack.json incluya angular.
---
# Angular

## Reglas
- Versión exacta desde `package.json` (`@angular/core`). Para APIs de versiones recientes (ej. 21, 22) consulta la documentación oficial de esa versión; no asumas desde memoria.
- Sigue el estilo existente del proyecto. En código nuevo, preferir:
  - Componentes standalone, `ChangeDetectionStrategy.OnPush`.
  - `inject()` en lugar de inyección por constructor (si el proyecto ya lo usa).
  - Signals para estado local (`signal`, `computed`); `effect` solo para efectos secundarios reales.
  - `input()` / `output()` / `model()` en componentes nuevos si la versión lo soporta.
  - Control flow `@if`, `@for` (con `track`), `@switch`.
- Formularios reactivos tipados; validaciones en el formulario, mensajes de error accesibles.
- HTTP: servicios por dominio con `HttpClient`; interceptores para auth/errores; tipar respuestas según el contrato de design.md.
- Rutas lazy (`loadComponent`/`loadChildren`). Sin lógica de negocio en templates.
- Si el proyecto es zoneless o usa zone.js, respétalo; no lo cambies.

## Tests
- Usa el runner configurado en `angular.json`/`package.json` (Vitest en proyectos recientes, Karma/Jasmine en antiguos, o Jest). No lo cambies.
- Componentes: Angular Testing Library si está instalada; si no, `TestBed`. Consultar por rol/label, no por clases CSS.
- HTTP: `provideHttpClientTesting` + `HttpTestingController`.

## Comandos
`ng test` (o `npm test`) · `ng lint` · `ng build`
