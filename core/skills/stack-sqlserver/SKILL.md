---
name: stack-sqlserver
description: Convenciones para diseño, migraciones, T-SQL y tests en SQL Server. Usar cuando el stack detectado incluya sqlserver o mssql.
---
# SQL Server

## Reglas
- Cambios de esquema SOLO con la herramienta de migraciones del proyecto (o scripts versionados existentes); cada uno con rollback.
- Esquemas explícitos (`dbo.Tabla`); nombres según la convención existente (PascalCase habitual).
- Tipos: `datetime2`/`datetimeoffset` (no `datetime`), `nvarchar` para texto Unicode, `decimal(p,s)` para montos, `bit` para booleanos.
- Procedimientos: `SET NOCOUNT ON;`, `BEGIN TRY ... END TRY BEGIN CATCH ... THROW; END CATCH`, transacciones con `XACT_ABORT ON`.
- Queries parametrizadas (`@p1`), nunca SQL dinámico concatenado; si es inevitable, `sp_executesql` con parámetros.
- Evitar cursores y funciones escalares en `WHERE`; preferir operaciones basadas en conjuntos.
- Índices: justificar cada uno; revisar plan de ejecución real y `SET STATISTICS IO ON` en queries nuevas.
- Paginación con `ORDER BY ... OFFSET n ROWS FETCH NEXT m ROWS ONLY` (o keyset en tablas grandes).

## Tests
- Integración con Testcontainers (imagen `mcr.microsoft.com/mssql/server`, versión del proyecto), aplicando migraciones reales.
- Lógica en procedimientos: tSQLt si el proyecto lo usa.
- Nunca ejecutar contra bases compartidas o de producción.
