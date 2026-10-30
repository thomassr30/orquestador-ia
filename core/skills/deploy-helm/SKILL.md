---
name: deploy-helm
description: Charts de Helm (estructura, values por entorno, values.schema.json, helpers, dependencias, lint/template, upgrades atómicos). Usar al crear o modificar charts o values de Helm.
---
# Helm

Aplica los principios de `devops-cicd` y `deploy-kubernetes` (los manifiestos resultantes deben cumplirlos).

## Estructura del chart
```
chart/
├── Chart.yaml            # version (del chart, SemVer) y appVersion (de la app)
├── values.yaml           # valores por defecto seguros (sin secretos)
├── values.schema.json    # validación de valores
├── values-dev.yaml / values-qa.yaml / values-prod.yaml
└── templates/ (_helpers.tpl, deployment.yaml, service.yaml, …, NOTES.txt)
```
## Reglas
- Plantillas simples; lógica repetida en `_helpers.tpl`; nombres y labels estándar con helpers.
- Todo valor configurable documentado en `values.yaml`; validado con `values.schema.json`.
- **Secretos**: nunca en values versionados; usar referencias a Secrets existentes, External Secrets o Vault.
- Subir `version` del chart en cada cambio; `appVersion` = versión de la imagen.
- Dependencias en `Chart.yaml` con versión fijada (`helm dependency update`).
## Validación local (sin tocar el cluster)
`helm lint ./chart -f values-<env>.yaml` · `helm template <release> ./chart -f values-<env>.yaml` (revisar el YAML generado).
## Despliegue (decisión crítica)
Proponer: `helm upgrade --install <release> ./chart -n <ns> -f values-<env>.yaml --atomic --wait --timeout 5m` (con `helm diff upgrade` antes si el plugin está disponible). Rollback: `helm rollback <release> <revisión>` — solo propuesto.
