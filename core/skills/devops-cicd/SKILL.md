---
name: devops-cicd
description: Principios DevOps y mapa de skills por plataforma (CI/CD, contenedores, despliegue, infraestructura como código, configuración y secretos, observabilidad). Usar al crear o modificar infraestructura, pipelines o configuración por entorno, o al diagnosticar fallos de despliegue; luego cargar SOLO la skill de la plataforma del proyecto.
---
# DevOps — principios y mapa

## Carga solo la skill de la plataforma que usa el proyecto (ver `stack.json` → `infra`)
| Área | Skills |
|---|---|
| CI/CD | `ci-github-actions` · `ci-gitlab` · `ci-azure-pipelines` · `ci-jenkins` · `ci-bitbucket` |
| Contenedores | `container-docker` |
| Despliegue | `deploy-kubernetes` · `deploy-openshift` · `deploy-helm` · `deploy-kustomize` |
| Infraestructura como código | `iac-terraform` |
| Configuración y secretos | `config-consul` · `config-vault` |
| Observabilidad | `ops-observability` |
| Verificación post-despliegue | `post-deploy-check` |

## Principios (aplican a todas las plataformas)
1. **Nada se aplica a un entorno sin aprobación del usuario** (decisión crítica): comandos contra clusters, registros, nube, Consul/Vault reales, incluso de solo lectura. Proponer el comando exacto y esperar el "sí"; en producción, confirmar el entorno por nombre.
2. **Todo como código** y versionado; nada de cambios manuales sin reflejarlos en el repo.
3. **Un artefacto, muchos entornos**: la imagen se construye una vez; cambia solo la configuración.
4. **Etapas de pipeline**: lint/tipos → tests → build → seguridad (dependencias, SAST, imagen, secretos) → publicar (ramas principales/tags) → desplegar (dev/QA automático; producción con aprobación manual).
5. **Configuración validada al arrancar** (fail fast): si falta una clave obligatoria, el error dice qué clave, de qué fuente y qué claves llegaron (solo nombres).
6. **Secretos** fuera del repo, de las imágenes y de los logs; `.env.example` versionado sin valores, `.env` ignorado.
7. **Permisos mínimos** para pipelines, service accounts y tokens; versiones de herramientas y acciones fijadas.
8. **Plataforma de la institución**: registro, runners, políticas de red y cuotas mandan. Si no se conocen, preguntar y registrar en memoria (`.sdd/memoria/temas/despliegue.md`).
9. Cambios que afecten ramas protegidas, aprobaciones o despliegue a producción → decisión crítica.
