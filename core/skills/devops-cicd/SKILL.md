---
name: devops-cicd
description: DevOps del proyecto (Docker, pipelines CI/CD en GitHub Actions/GitLab CI/Azure Pipelines/Jenkins, Kubernetes/OpenShift, Helm/Kustomize, configuración y secretos con Consul/Vault/variables, observabilidad). Usar al crear o modificar Dockerfiles, pipelines, manifiestos de despliegue o configuración por entorno, o al diagnosticar fallos de despliegue/arranque.
---
# DevOps / CI-CD

Lee SOLO la referencia del tema:
| Tema | Referencia |
|---|---|
| Dockerfile, imágenes, docker-compose | `references/docker.md` |
| Pipelines (GitHub Actions, GitLab CI, Azure Pipelines, Jenkins) | `references/pipelines.md` |
| Kubernetes / OpenShift, Helm, Kustomize | `references/kubernetes.md` |
| Configuración y secretos (Consul KV, Vault, env, ConfigMaps/Secrets) | `references/config-secrets.md` |
| Health checks, logs, métricas | `references/observability.md` |

## Reglas
1. **Nada se aplica a un entorno sin tu aprobación**: `kubectl apply/delete/rollout`, `oc`, `helm install/upgrade/rollback`, `terraform apply`, `docker push`, CLIs de nube y cambios en Consul/Vault reales son **decisiones críticas** → proponer el comando exacto y esperar el "sí". Producción: además, confirmar el entorno por nombre.
2. **Solo lectura primero**: para diagnosticar, `kubectl get/describe/logs`, `helm status`, `consul kv get` (solo nombres de claves; nunca imprimir valores secretos). También requieren aprobación del usuario en esta instalación.
3. **Infraestructura como código**: todo cambio queda en archivos versionados (Dockerfile, pipeline, manifiestos, values). Nada de cambios manuales sin reflejarlos en el repo.
4. **Mismo artefacto en todos los entornos**: la imagen se construye una vez; cambia solo la configuración por entorno.
5. **Configuración validada al arrancar** (fail fast con mensaje claro: qué clave falta y dónde se esperaba), nunca valores por defecto silenciosos para datos críticos.
6. **Secretos fuera del repo** y fuera de logs; en manifiestos, referencias a Secrets/Vault, no valores.
7. **Respeta la plataforma de la institución** (registro de imágenes, runners, políticas de red, cuotas). Si no la conoces, pregúntala y regístrala en la memoria (`temas/despliegue.md`).
8. **Cambios de pipeline** que afecten a ramas protegidas, aprobaciones o despliegue a producción → decisión crítica.
