---
name: ci-github-actions
description: Pipelines CI/CD con GitHub Actions (workflows, triggers, jobs, caché, matrices, entornos con aprobación, secretos, OIDC, workflows reutilizables). Usar al crear o modificar archivos en .github/workflows.
---
# GitHub Actions

Aplica los principios de `devops-cicd`.

## Estructura
- Un workflow por propósito: `ci.yml` (PR y push), `release.yml` (tags), `deploy.yml` (entornos).
- Triggers explícitos: `pull_request`, `push` a ramas principales, `workflow_dispatch` para manuales; `paths`/`paths-ignore` en monorepos.
- `concurrency: { group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }` en CI.
- `timeout-minutes` en cada job.

## Seguridad
- `permissions:` mínimos a nivel de workflow (`contents: read`) y ampliar por job solo lo necesario.
- Acciones de terceros **fijadas por SHA** (o al menos versión mayor de editores verificados); revisar antes de agregar.
- Secretos en `secrets`/`vars` del repo u organización; por entorno en **Environments**.
- Despliegue a nube con **OIDC** (`permissions: id-token: write`) en vez de credenciales de larga duración.
- No ejecutar código de PRs de forks con secretos (`pull_request_target` solo con extremo cuidado).

## Rendimiento
- Caché integrada de `actions/setup-node` (`cache: npm`), `actions/setup-go` (`cache: true`), `gradle/actions/setup-gradle`; o `actions/cache` con clave por hash del lockfile.
- `strategy.matrix` para versiones/plataformas; `fail-fast` según necesidad.
- `services:` para Postgres/SQL Server en tests de integración (o Testcontainers en el runner).

## Despliegue
- Jobs de despliegue con `environment: <nombre>` y **required reviewers** para producción.
- `needs:` para orden; artefactos con `actions/upload-artifact`/`download-artifact`.
- Imagen etiquetada con `${{ github.sha }}` y tag semántico en releases.

## Reutilización
- Workflows reutilizables (`on: workflow_call`) para pipelines comunes entre repos; composite actions para pasos repetidos.

## Validación
`actionlint` antes de proponer; explicar qué hace cada job nuevo y su impacto en tiempo.
