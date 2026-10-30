---
name: sdd-ticket
description: Trabaja un ticket del gestor de tareas (Jira, Azure Boards, GitHub, GitLab, Linear) de principio a fin — lo lee, elige el flujo SDD adecuado, lo desarrolla y prepara comentario, commit y PR con aprobación. Usar cuando el usuario mencione una clave o enlace de ticket (ej. LAB-123, #45, AB#678) o escriba /sdd-ticket.
---
# /sdd-ticket — Trabajar un ticket

Ticket: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario y sus adjuntos.)

1. Carga `tracker-common` y la skill del gestor del proyecto (si no se sabe, pregunta cuál usan).
2. Lee el ticket (MCP → CLI de solo lectura → pedir que lo pegue).
3. Elige el flujo según el tipo (`feature`, `fix`, `analysis`, `refactor`) y anuncia `[SDD] Flujo: <tipo> (ticket <CLAVE>)`.
4. Ejecuta el flujo normal (con su GATE).
5. Al cerrar, carga `release-notes` y entrega en el chat: mensaje de commit sugerido, descripción de PR y comentario para el ticket (textos para que el usuario los use). Escribir en el gestor solo con aprobación; git nunca.
