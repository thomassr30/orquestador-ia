---
name: stack-adonisjs
description: Convenciones para desarrollar y testear aplicaciones AdonisJS (Lucid, VineJS, Japa). Usar cuando el stack detectado incluya adonisjs.
---
# AdonisJS

## Reglas
- Versión desde `package.json` (`@adonisjs/core`). Las APIs cambian entre versiones mayores: consulta la documentación de esa versión.
- Genera artefactos con `node ace make:<controller|model|migration|validator|service>`; respeta la estructura `app/`, `start/routes.ts`, `database/migrations`.
- Validación con VineJS (validators en `app/validators`), nunca validación manual en controllers.
- Controllers delgados; lógica en services inyectados (`@inject()`).
- Lucid ORM: relaciones y scopes en modelos; transacciones con `db.transaction`. Migraciones con `node ace migration:run` / `migration:rollback`.
- Config/env vía `env.ts` validado. Autorización con Bouncer si el proyecto lo usa.

## Tests
- Japa (`node ace test`): suites `unit` y `functional`. Cliente HTTP `@japa/api-client` para endpoints.
- BD de test aislada (transacción global por test o Testcontainers).

## Comandos
`node ace test` · `npm run lint` · `npm run typecheck` (si existe) · `node ace build`
