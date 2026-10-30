---
name: test-integration
description: Tests de integración de APIs y servicios con dependencias reales (HTTP, BD) por stack. Usar al probar endpoints o la interacción entre capas.
---
# Tests de integración

## Principios
- Levanta la app real (o el módulo) con dependencias reales donde importa (BD con Testcontainers) y mocks solo para servicios externos de terceros.
- Prueba el contrato observable: código HTTP, cuerpo, headers, efectos en BD.
- Cada test prepara y limpia sus datos (transacción revertida o BD efímera).
- Incluye casos de error: validación (400/422), no autorizado (401/403), no encontrado (404), conflicto (409).

## Herramientas
| Stack | Herramienta |
|---|---|
| Go | `httptest.NewServer` / `httptest.NewRecorder` + testcontainers-go |
| Node.js / NestJS | `supertest` sobre la app; NestJS: `app.getHttpServer()` en `*.e2e-spec.ts` |
| AdonisJS | Japa `functional` + `@japa/api-client` |
| Frontend (Angular/React) | MSW o `HttpTestingController` para simular la API según el contrato |

Ver `test-db` para contenedores de PostgreSQL y SQL Server.
