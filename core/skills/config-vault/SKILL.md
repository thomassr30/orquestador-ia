---
name: config-vault
description: Gestión de secretos con HashiCorp Vault (métodos de autenticación Kubernetes/AppRole/OIDC, KV v2, credenciales dinámicas de BD, leases, Vault Agent/CSI/External Secrets, políticas mínimas). Usar cuando el proyecto obtenga secretos desde Vault.
---
# Vault

Aplica los principios de `devops-cicd`.

## Obtener secretos
- **Autenticación** según plataforma: Kubernetes auth (service account del pod), AppRole (CI/servidores), OIDC/JWT (pipelines con id_tokens). Nunca tokens raíz ni de larga duración en apps.
- **Entrega a la app** (preferir sin código): Vault Agent Injector / CSI provider / External Secrets Operator → archivo o variable de entorno. Con SDK solo si se necesita renovación dinámica.
- **KV v2** para secretos estáticos (versionados); **motores dinámicos** (database) para credenciales temporales de BD cuando la plataforma lo ofrece.
- Respetar **leases**: renovar o volver a leer antes de expirar; manejar rotación sin reiniciar si es posible.

## Seguridad
- Políticas con privilegio mínimo por servicio y entorno (`path "kv/data/<servicio>/<env>/*" { capabilities = ["read"] }`).
- Nunca imprimir secretos en logs, errores, reportes ni memoria; solo nombres de rutas/claves.
- Auditoría habilitada por el equipo de plataforma; no desactivar.

## Operación (decisiones críticas)
Cualquier `vault` CLI contra servidores reales (incluido `read`) requiere aprobación; escritura/rotación solo propuesta.
