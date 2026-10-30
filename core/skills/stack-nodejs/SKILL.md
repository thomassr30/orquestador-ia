---
name: stack-nodejs
description: Convenciones para código Node.js (scripts, APIs Express/Fastify u otras) sin framework de alto nivel. Usar cuando stack.json incluya nodejs.
---
# Node.js

## Reglas
- Respeta el sistema de módulos de `package.json` (`"type": "module"` → ESM; si no, CommonJS). No mezclar.
- TypeScript si el proyecto lo usa; `strict` activado no se desactiva.
- Nunca bloquees el event loop: sin `*Sync` en código de request; usa `async/await` y maneja todos los rechazos.
- Configuración solo vía variables de entorno validadas al inicio (ej. zod/envalid si ya existen). Sin secretos en código.
- Valida toda entrada externa (body, query, params) con el validador del proyecto.
- Errores: clases de error propias o del framework; middleware central de errores; no filtrar stack traces al cliente.
- SQL parametrizado o vía ORM/query builder del proyecto.
- Dependencias: `npm ci` en CI; no agregues paquetes sin justificarlo en design.md.

## Tests
- Usa el runner existente (`vitest`, `jest` o `node --test`). APIs HTTP con `supertest`. BD con Testcontainers (skill `test-db`).

## Comandos
`npm test` · `npm run lint` · `npx tsc --noEmit` (si es TS) · `npm audit --omit=dev`
