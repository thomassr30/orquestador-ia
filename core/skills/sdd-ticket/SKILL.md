---
name: sdd-ticket
description: Trabaja un ticket del gestor de tareas (Jira, Azure Boards, GitHub, GitLab, Linear) de principio a fin — lo lee, elige el flujo SDD adecuado, lo desarrolla y prepara comentario, commit y PR con aprobación. Usar cuando el usuario mencione una clave o enlace de ticket (ej. LAB-123, #45, AB#678) o escriba /sdd-ticket.
---
# /sdd-ticket — Trabajar un ticket

Ticket: $ARGUMENTS
(Si no ves el ticket arriba, usa el mensaje del usuario.)

1. Carga `tracker-common` y la skill del gestor (según memoria del proyecto; si no se sabe, pregunta cuál usan).
2. Lee el ticket (MCP → CLI con aprobación → pedir que lo pegue).
3. Elige el flujo según el tipo (`feature`, `fix`, `analysis`, `refactor`) y créalo con la clave en el título. Anuncia `[SDD] Flujo: <tipo> (ticket <CLAVE>)`.
4. Ejecuta el flujo normal (con su GATE).
5. Al cerrar: carga `release-notes` y prepara `entrega.md` (commit, PR, comentario para el ticket). Propón, con aprobación separada: (a) comandos git, (b) comentario/transición en el gestor.
