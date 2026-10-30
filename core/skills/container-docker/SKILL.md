---
name: container-docker
description: Dockerfiles e imágenes de contenedor (multi-stage, usuario no root, caché, seguridad, escaneo) y docker-compose para desarrollo local. Usar al crear o modificar Dockerfile, .dockerignore o docker-compose.
---

## Dockerfile
- **Multi-stage**: etapa `build` (dependencias de desarrollo, compilación) y etapa `runtime` mínima (solo artefactos y dependencias de producción).
- Imagen base oficial, versión **fijada** (ej. `node:22-alpine` o `-slim`; `golang:1.x` → `gcr.io/distroless/static`); evita `latest`.
- Orden para caché: copiar manifiestos (`package*.json`, `go.mod/sum`) → instalar → copiar código.
- Node: `npm ci --omit=dev` en runtime; Go: binario estático `CGO_ENABLED=0`.
- **Usuario no root** (`USER node` / `USER 65532`), sistema de archivos de solo lectura cuando sea posible.
- `HEALTHCHECK` (o probes en k8s), `EXPOSE` documental, `ENTRYPOINT` en forma exec (`["node","dist/main.js"]`) para recibir señales.
- `.dockerignore`: `node_modules`, `.git`, `.env*`, `changes/`, `.sdd/`, coverage, dist local.
- Sin secretos en `ARG`/`ENV`/capas; para builds con credenciales usa BuildKit secrets.
- Escaneo de vulnerabilidades de la imagen (Trivy/Grype o el del registro).

## docker-compose (desarrollo local)
- Servicios de apoyo (Postgres, SQL Server, Redis, Consul) con versiones iguales a las de los entornos.
- `healthcheck` + `depends_on: condition: service_healthy`.
- Variables desde `.env` local no versionado (con `.env.example` versionado).
- Volúmenes nombrados para datos; puertos solo los necesarios.
