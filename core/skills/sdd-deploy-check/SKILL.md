---
name: sdd-deploy-check
description: Verifica un despliegue en un entorno (pods, logs, configuración, health, smoke en el navegador) y recomienda continuar, corregir o hacer rollback. Usar cuando el usuario diga que desplegó, pida verificar un entorno o revisar un pod, o escriba /sdd-deploy-check.
---
# /sdd-deploy-check — Verificar despliegue

Solicitud: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario.)

1. Carga `sdd-orchestrator`. Si hay un cambio relacionado, úsalo; si no: `node "{{SDD_HOME}}/bin/new-change.js" --type deploy-check "<servicio> <entorno>"`.
2. Confirma entorno, servicio y versión esperada (pregunta lo que falte; si es producción, confirma explícitamente el nombre del entorno).
3. Delega en `sdd-devops-engineer` los pasos 1–4 de la skill `post-deploy-check` (cada comando de cluster con aprobación del usuario) y en `sdd-browser-operator` el smoke funcional.
4. Escribe/actualiza `deploy-check.md` y reporta el veredicto en ≤ 8 líneas.
