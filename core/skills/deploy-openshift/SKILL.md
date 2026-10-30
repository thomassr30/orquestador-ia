---
name: deploy-openshift
description: Despliegues en OpenShift (Routes, SCC y UID arbitrario, ImageStreams, BuildConfig/S2I, proyectos y cuotas, comandos oc). Usar cuando la plataforma de despliegue sea OpenShift; complementa a deploy-kubernetes.
---
# OpenShift

Carga también `deploy-kubernetes` (todo lo de Kubernetes aplica) y los principios de `devops-cicd`.

## Diferencias clave
- **UID arbitrario (SCC `restricted-v2`)**: el contenedor corre con un UID aleatorio del rango del proyecto y grupo `0`. La imagen debe:
  - no depender de un usuario fijo;
  - dar permisos al grupo 0 en carpetas escribibles (`chgrp -R 0 /app && chmod -R g=u /app`);
  - escuchar en puertos > 1024.
- No solicites SCC privilegiadas (`anyuid`, `privileged`) salvo aprobación explícita del equipo de plataforma.
- **Routes** para exponer servicios (TLS `edge` o `reencrypt`; `passthrough` si la app termina TLS). En clusters recientes también `Ingress`.
- Usa `Deployment` estándar; `DeploymentConfig` está obsoleto.
- **ImageStreams** si la plataforma los usa para promover imágenes entre proyectos; **BuildConfig/S2I** solo si el equipo construye en el cluster (preferible construir en el pipeline).
- Proyectos (namespaces) con **ResourceQuota/LimitRange**: define requests/limits dentro de las cuotas.

## Comandos (siempre con aprobación del usuario)
| Acción | Comando |
|---|---|
| Proyecto actual | `oc project` |
| Estado | `oc get pods`, `oc status` |
| Diagnóstico | `oc describe pod <pod>`, `oc logs <pod> --previous`, `oc get events --sort-by=.lastTimestamp` |
| Rollout | `oc rollout status deploy/<app>` |
Los comandos que modifican (`oc apply`, `oc rollout restart`, `oc set env`) son decisiones críticas.
