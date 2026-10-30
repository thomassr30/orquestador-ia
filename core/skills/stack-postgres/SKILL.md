---
name: stack-postgres
description: Convenciones para diseño, migraciones, queries y tests en PostgreSQL. Usar cuando stack.json incluya postgres.
---
# PostgreSQL

## Reglas
- Cambios de esquema SOLO con la herramienta de migraciones del proyecto; cada migración con `down` o justificación.
- Nombres `snake_case`; PK `bigint generated always as identity` o `uuid` según el estándar existente.
- Tiempos con `timestamptz`; dinero con `numeric(p,s)`; textos con `text` + `CHECK` de longitud si aplica.
- FKs con índice en la columna referenciante; índices para filtros/orden frecuentes; justificar cada índice nuevo.
- En tablas grandes en producción: `CREATE INDEX CONCURRENTLY` (fuera de transacción) y migraciones no bloqueantes (agregar columna nullable → backfill → constraint).
- Queries siempre parametrizadas; sin `SELECT *` en código de aplicación; paginación por keyset en listados grandes.
- Transacciones explícitas para operaciones multi-tabla; nivel de aislamiento por defecto salvo justificación.
- Revisar planes con `EXPLAIN (ANALYZE, BUFFERS)` en queries nuevas sobre tablas grandes.

## Tests
- Integración con Testcontainers (`postgres:<versión del proyecto>`), aplicando las migraciones reales.
- Lógica en BD (funciones, triggers): pgTAP si el proyecto lo usa.
- Nunca ejecutar contra bases compartidas o de producción.
