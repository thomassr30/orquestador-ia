---
name: sdd-new
description: Desarrolla funcionalidades nuevas con el flujo SDD completo (especificar, diseñar, testear, implementar, verificar). Usar cuando el usuario pida agregar, crear, desarrollar o implementar algo en el proyecto, adjunte un requerimiento, o escriba /sdd-new.
---
# /sdd-new — Desarrollo nuevo

Solicitud: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario y sus adjuntos.)

1. Carga `sdd-orchestrator` y sigue el flujo `feature` (o `fix` si es pequeño): todo en el chat, sin archivos de trabajo.
2. Adjuntos (PDF, DOCX, imágenes): léelos con `sdd-ingest` (conversión temporal, sin guardar en el proyecto).
3. Entender en paralelo (explorer ∥ analista si es un requerimiento de negocio) → plan → GATE con el plan completo → construir y verificar en paralelo.
