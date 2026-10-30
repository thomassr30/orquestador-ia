---
name: stack-nestjs
description: Convenciones para desarrollar y testear APIs en NestJS. Usar cuando stack.json incluya nestjs.
---
# NestJS

## Reglas
- Versión desde `package.json` (`@nestjs/core`). Ante dudas de API, consulta la documentación de esa versión.
- Un módulo por dominio: `controller → service → repository`. Sin lógica de negocio en controllers.
- DTOs con `class-validator`/`class-transformer`; `ValidationPipe` global con `whitelist: true` y `forbidNonWhitelisted: true` (si ya existe, respétalo).
- Config solo vía `ConfigModule`/`ConfigService`; nunca `process.env` dentro de servicios.
- Errores con excepciones HTTP de Nest (`NotFoundException`, etc.) o filtros globales existentes.
- Usa el ORM del proyecto (TypeORM, Prisma, MikroORM); migraciones con su CLI, nunca `synchronize: true` fuera de tests.
- Guards para autorización, interceptors para transversales (logging, mapeo). Documenta endpoints con `@nestjs/swagger` si el proyecto lo usa.

## Tests
- Unit: `Test.createTestingModule` con providers mockeados (`useValue`). Un `*.spec.ts` junto al archivo.
- E2E/API: `test/*.e2e-spec.ts` con `supertest` sobre `app.getHttpServer()`; BD real con Testcontainers.

## Comandos
`npm run test` · `npm run test:e2e` · `npm run test:cov` · `npm run lint` · `npm run build`
