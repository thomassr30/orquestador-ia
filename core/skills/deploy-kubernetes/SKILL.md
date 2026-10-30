---
name: deploy-kubernetes
description: Manifiestos y operación en Kubernetes (Deployment, probes, recursos, securityContext, rollouts, PDB, ConfigMaps/Secrets) y diagnóstico de pods (CrashLoopBackOff, OOMKilled, ImagePull). Usar al crear o modificar manifiestos k8s o diagnosticar despliegues. Para OpenShift cargar también deploy-openshift.
---

## Deployment
- `resources.requests` y `limits` (memoria siempre; CPU limit según política del cluster).
- **Probes**: `startupProbe` (arranques lentos), `readinessProbe` (recibir tráfico), `livenessProbe` (reinicio; no la uses para dependencias externas).
- `securityContext`: `runAsNonRoot: true`, `readOnlyRootFilesystem: true`, `allowPrivilegeEscalation: false`, drop ALL capabilities. (OpenShift: ver `deploy-openshift`.)
- Estrategia `RollingUpdate` con `maxUnavailable: 0` en servicios críticos; `PodDisruptionBudget` si hay varias réplicas.
- Configuración: `envFrom` ConfigMap/Secret o inyección desde Consul/Vault (sidecar/agent/CSI) según la plataforma.
- Imagen con tag inmutable (SHA o versión), `imagePullPolicy: IfNotPresent`.
- Labels estándar (`app.kubernetes.io/name`, `version`, `part-of`).

## Diagnóstico (solo lectura, con aprobación)
| Síntoma | Comando |
|---|---|
| Estado general | `kubectl get pods -n <ns> -l app=<app>` |
| Por qué no arranca | `kubectl describe pod <pod> -n <ns>` (eventos: ImagePull, OOMKilled, probes) |
| Logs del arranque | `kubectl logs <pod> -n <ns> --previous` (si reinició) |
| Despliegue en curso | `kubectl rollout status deploy/<app> -n <ns>` |
| Config montada | `kubectl get configmap <cm> -n <ns> -o yaml` (Secrets: solo nombres de claves) |
OpenShift: equivalentes con `oc` (ver `deploy-openshift`).

## CrashLoopBackOff — orden de revisión
1. Logs `--previous` (error de arranque: configuración faltante, conexión a BD, puerto).
2. Eventos (OOMKilled → memoria; probes fallando → endpoint/tiempos).
3. Configuración/secretos esperados vs presentes (nombres de claves).
4. Conectividad a dependencias (DNS, NetworkPolicy, credenciales).
