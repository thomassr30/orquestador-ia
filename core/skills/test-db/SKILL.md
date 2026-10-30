---
name: test-db
description: Tests contra PostgreSQL o SQL Server reales usando Testcontainers, pgTAP y tSQLt. Usar al probar migraciones, queries, repositorios o procedimientos.
---
# Tests de base de datos

## Requisitos
Docker en ejecución (Docker Desktop en Windows). Si no está disponible, reporta el bloqueo; no reemplaces por mocks silenciosamente.

## Testcontainers
| Stack | Paquete |
|---|---|
| Node/NestJS/AdonisJS | `@testcontainers/postgresql`, `@testcontainers/mssqlserver` |
| Go | `github.com/testcontainers/testcontainers-go/modules/postgres`, `.../modules/mssql` |

Patrón:
1. Iniciar el contenedor una vez por suite (misma versión mayor que producción).
2. Aplicar las migraciones REALES del proyecto.
3. Aislar cada test (transacción con rollback o truncado de tablas).
4. Detener el contenedor al final.

SQL Server requiere aceptar la licencia (`ACCEPT_EULA=Y`) y contraseña fuerte; imagen `mcr.microsoft.com/mssql/server`.

## Qué probar
- Migraciones: up y down aplican sin error.
- Repositorios/queries: resultados, filtros, paginación, orden, nulos.
- Restricciones: unique, FK, check (deben fallar cuando corresponde).
- Procedimientos/funciones: pgTAP (Postgres) o tSQLt (SQL Server) si el proyecto ya los usa.
