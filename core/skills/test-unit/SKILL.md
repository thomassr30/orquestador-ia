---
name: test-unit
description: Cómo escribir tests unitarios y de componentes por stack (Go, Node, NestJS, AdonisJS, Angular, React, Next.js). Usar al escribir tests unitarios.
---
# Tests unitarios

## Principios
- Un comportamiento por test; nombre que describe el escenario: `debería <resultado> cuando <condición>`.
- Patrón AAA (Arrange, Act, Assert). Sin lógica condicional en tests.
- Mockea solo fronteras (HTTP, BD, reloj, aleatorio); no mockees lo que pruebas.
- Deterministas: fija fechas/zonas horarias y semillas.
- Para UI, prueba comportamiento visible (texto, rol, estado), no detalles de implementación.

## Herramientas por stack (usa SIEMPRE el runner que ya tiene el proyecto)
| Stack | Herramienta |
|---|---|
| Go | `testing` + table-driven, testify si existe |
| Node.js | Vitest / Jest / `node --test` |
| NestJS | Jest + `@nestjs/testing` (`Test.createTestingModule`) |
| AdonisJS | Japa (`node ace test unit`) |
| Angular | Runner configurado (Vitest, Karma/Jasmine o Jest) + Angular Testing Library o `TestBed` |
| React / Next.js | Vitest o Jest + React Testing Library + user-event |

## Ubicación
Junto al archivo (`x.spec.ts`, `x_test.go`) o en la carpeta de tests que ya use el proyecto.
