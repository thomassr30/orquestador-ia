---
name: ci-gitlab
description: Pipelines CI/CD con GitLab CI (.gitlab-ci.yml, stages, rules, needs, caché, artefactos y reportes, entornos protegidos, despliegues manuales, include/extends, componentes). Usar al crear o modificar .gitlab-ci.yml o plantillas de GitLab CI.
---
# GitLab CI

Aplica los principios de `devops-cicd`.

## Estructura
- `stages:` explícitas (lint, test, build, security, publish, deploy).
- `workflow: rules:` para decidir cuándo se crea el pipeline (MR, ramas principales, tags) y evitar duplicados.
- `rules:` en jobs (no `only/except`); `needs:` para ejecución en DAG más rápida.
- `default:` para imagen, `interruptible: true` y `retry` (solo errores de runner/red).
- Plantillas: `include:` (local, project, template, **CI/CD components**) y `extends:`/anchors para no repetir.

## Caché y artefactos
- `cache: key: files: [package-lock.json]` (o `go.sum`, `gradle/libs.versions.toml`), `policy: pull` en jobs que no instalan.
- `artifacts: reports: junit:` y `coverage_report:` para ver resultados en el MR; `expire_in` definido.

## Servicios y tests
- `services:` (postgres, mcr.microsoft.com/mssql/server) con variables de conexión; o Testcontainers con Docker-in-Docker si la plataforma lo permite.

## Seguridad
- Variables CI/CD **masked** y **protected** (solo ramas/tags protegidos); por entorno con `environment scope`.
- `id_tokens:` para OIDC con nube/Vault.
- Plantillas de seguridad de GitLab (SAST, dependency/container scanning, secret detection) si la licencia/instancia las ofrece.

## Despliegue
- `environment: name/url` en jobs de deploy; **entornos protegidos** con aprobaciones para producción.
- `when: manual` (con `allow_failure: false` si debe bloquear) para despliegues manuales.
- `resource_group:` para serializar despliegues al mismo entorno.
- Imagen en el Container Registry de GitLab con `$CI_COMMIT_SHA` y tag en releases.

## Validación
CI Lint (`glab ci lint` o la UI) antes de proponer; explicar jobs nuevos y su impacto.
