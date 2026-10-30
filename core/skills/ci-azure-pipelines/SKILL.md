---
name: ci-azure-pipelines
description: Pipelines CI/CD con Azure DevOps Pipelines (YAML, stages, templates, variable groups, environments con aprobaciones, deployment jobs, service connections). Usar al crear o modificar azure-pipelines.yml o plantillas de Azure Pipelines.
---
# Azure Pipelines

Aplica los principios de `devops-cicd`.

## Estructura
- `trigger:` (ramas/paths) y `pr:` explícitos; `stages` → `jobs` → `steps`.
- `pool: vmImage:` fijado (ej. `ubuntu-latest` aceptable solo si el equipo lo permite; preferible versión concreta) o pool propio de la institución.
- **Templates** (`template:` de steps/jobs/stages y `extends:` para plantillas obligatorias de seguridad) en un repo compartido referenciado en `resources.repositories`.

## Variables y secretos
- Variable groups (idealmente vinculados a **Azure Key Vault**); variables secretas nunca impresas.
- Parámetros tipados (`parameters:`) para plantillas.

## Tests y calidad
- `Cache@2` con clave por lockfile; `PublishTestResults@2` (JUnit) y `PublishCodeCoverageResults@2`.
- Servicios para tests: contenedores de servicio (`resources.containers` + `services:`) o Testcontainers.

## Despliegue
- `deployment` jobs con `environment:` y **approvals & checks** en el Environment (aprobadores, horarios, checks de calidad).
- Estrategias `runOnce` / `rolling` / `canary` según la plataforma de destino.
- **Service connections** con permisos mínimos y aprobadas por el equipo; preferir federación de identidad (workload identity) a secretos.

## Validación
Validar YAML en el editor de Azure DevOps o con la API de preview de runs; explicar stages nuevos y su impacto.
