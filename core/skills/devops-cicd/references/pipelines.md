# Pipelines CI/CD

## Etapas estándar
1. **Lint y tipos** → 2. **Tests** (unit + integración; BD con servicios/contenedores) → 3. **Build** → 4. **Seguridad** (dependencias, SAST, escaneo de imagen, secretos) → 5. **Publicar imagen** (solo ramas principales/tags) → 6. **Desplegar** a dev/QA automático; **producción con aprobación manual**.

## Buenas prácticas
- Caché de dependencias (npm, Go modules, Gradle) por hash de lockfile.
- Versionado de imagen por SHA de commit + tag semántico en releases; nunca solo `latest`.
- Secretos desde el gestor de la plataforma (no en el YAML); permisos mínimos del token del pipeline.
- Jobs reproducibles (versiones de herramientas fijadas); timeouts; reintentos solo en pasos de red.
- Artefactos: reportes de tests y cobertura publicados.
- Plantillas/reutilización: workflows reutilizables (GitHub), `include`/`extends` (GitLab), templates (Azure), shared libraries (Jenkins).

## Por plataforma (archivo)
| Plataforma | Archivo | Aprobación manual |
|---|---|---|
| GitHub Actions | `.github/workflows/*.yml` | `environment` con reviewers requeridos |
| GitLab CI | `.gitlab-ci.yml` | `when: manual` + entornos protegidos |
| Azure Pipelines | `azure-pipelines.yml` | approvals/checks en Environments |
| Jenkins | `Jenkinsfile` | `input` step |

## Validación local antes de proponer
- Sintaxis: `actionlint` (GitHub), CI Lint de GitLab, validación de YAML; nunca "probar en producción".
- Explica en el reporte qué hace cada job nuevo/cambiado y su impacto en tiempos.
