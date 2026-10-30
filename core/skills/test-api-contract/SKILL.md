---
name: test-api-contract
description: Valida que la API cumpla su contrato (OpenAPI o design.md) con tests de esquema y contrato. Usar cuando se crean o modifican endpoints.
---
# Tests de contrato de API

## Fuente del contrato
1. Spec OpenAPI del proyecto (ej. generada por `@nestjs/swagger`, `swag` en Go) si existe.
2. Si no, la sección "Contratos de API" de `design.md`.

## Opciones (elige la que encaje con el proyecto)
- **Validación de esquema en tests de integración**: validar el body de respuesta contra el esquema JSON (ajv en Node; `kin-openapi` en Go).
- **Fuzzing basado en OpenAPI**: `schemathesis run <openapi-url>` (requiere Python) para detectar 500s y respuestas fuera de esquema.
- **Contratos consumidor-proveedor**: Pact, solo si el proyecto ya lo usa.

## Qué verificar
- Códigos de estado documentados, tipos y campos requeridos, formatos (fecha ISO 8601, uuid).
- Cambios incompatibles (campo eliminado/renombrado) → reportar como bloqueante.
