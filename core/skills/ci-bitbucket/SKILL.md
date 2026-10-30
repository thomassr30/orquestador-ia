---
name: ci-bitbucket
description: Pipelines CI/CD con Bitbucket Pipelines (bitbucket-pipelines.yml, steps, caches, services, deployments con entornos, pipes, variables seguras, OIDC). Usar al crear o modificar bitbucket-pipelines.yml.
---
# Bitbucket Pipelines

Aplica los principios de `devops-cicd`.

## Estructura
- `image:` fijada; `definitions:` con `caches`, `services` y steps reutilizables mediante anchors YAML (`&build` / `*build`).
- `pipelines:` → `default`, `branches`, `pull-requests`, `tags`, `custom` (ejecuciones manuales).
- `max-time` por step; `size: 2x` solo si hace falta memoria.

## Caché, servicios y reportes
- Caches predefinidas (`node`, `gradle`) o personalizadas con `key: files:`.
- `services:` (postgres, mssql) definidos en `definitions.services` con memoria asignada.
- Reportes de tests en las rutas que Bitbucket detecta (`test-results/`, `test-reports/`).

## Despliegue
- `deployment: test|staging|production` (entornos con variables propias y permisos).
- `trigger: manual` para producción; restricciones de despliegue por rama/usuarios en la configuración del entorno.
- **Pipes** oficiales para tareas comunes (publicar imágenes, despliegues); fijar versión.
- Variables **secured**; OIDC (`oidc: true`) para nube en lugar de claves estáticas.

## Validación
Validador de `bitbucket-pipelines.yml` de Atlassian antes de proponer.
