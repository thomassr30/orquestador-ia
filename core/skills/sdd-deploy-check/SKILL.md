---
name: sdd-deploy-check
description: Verifica un despliegue en un entorno (pods, logs, configuración, health, smoke en el navegador) y recomienda continuar, corregir o hacer rollback. Usar cuando el usuario diga que desplegó, pida verificar un entorno o revisar un pod, o escriba /sdd-deploy-check.
---
# /sdd-deploy-check — Verificar despliegue

Solicitud: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario y sus adjuntos.)

1. Carga `sdd-orchestrator`. Confirma entorno, servicio y versión esperada (producción: confirmar el nombre del entorno).
2. En paralelo: `sdd-devops-engineer` (pods, logs, configuración, health; cada comando de cluster con aprobación) ∥ `sdd-browser-operator` (smoke funcional).
3. Informa en el chat: veredicto, evidencia por verificación, problemas con causa probable y recomendación (continuar / corregir / rollback propuesto, nunca ejecutado).
