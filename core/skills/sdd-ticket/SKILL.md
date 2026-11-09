---
name: sdd-ticket
description: Trabaja un ticket del gestor de tareas (Jira, Azure Boards, GitHub, GitLab, Linear) de principio a fin — lo lee, elige el flujo SDD adecuado, lo desarrolla y prepara comentario, commit y PR con aprobación. Usar cuando el usuario mencione una clave o enlace de ticket (ej. LAB-123, #45, AB#678) o escriba /sdd-ticket.
---
# /sdd-ticket — Trabajar un ticket

Ticket: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario y sus adjuntos.)

1. Carga `tracker-common` y la skill del gestor del proyecto (si no se sabe, pregunta cuál usan).
2. **Lee todo el contexto del ticket**, no solo su descripción (MCP → CLI de solo lectura → pedir que lo pegue):
   - El work item con su **padre y sus hijos**: una task suele no tener el porqué, que está en la HU o el PBI.
   - **Comentarios**: ahí suele estar lo acordado después de escribir el ticket, que a veces contradice la descripción.
   - **Adjuntos** (capturas, documentos): pásalos por `sdd-ingest`.
   - **Enlaces**: a la wiki, donde muchas veces está el problema completo, y a Figma (`figma-design`). Si el punto de partida es una página de wiki, parte de ahí y busca el work item vinculado.
3. **Cruza con el proyecto antes de planificar**: qué de lo pedido ya existe, qué hay que construir y dónde va según la arquitectura y las reglas del proyecto. Nombra archivos y capas concretas, no categorías.
4. **Separa lo claro de lo dudoso.** Dos tipos de duda, con destino distinto:
   - **Técnica** (dónde crear el módulo, qué patrón seguir, cómo nombrarlo): pregúntasela al usuario en el chat, concreta y una a la vez.
   - **De negocio o de alcance** (un estado que aparece en la wiki pero no en la HU, un campo que cambió de nombre, una regla que nadie definió): **no la resuelvas suponiendo**. Regístrala con `trabajo preguntar "¿…?" --para "<quién responde>" --donde "<AB#1234 o la página>" --tarea <la tarea que bloquea>` y muéstrasela al usuario con `trabajo preguntas`. **El orquestador no escribe en el gestor**: el usuario publica la pregunta y etiqueta a quien corresponda.
5. **Registra el plan** con `trabajo plan` (objetivo, requisitos con criterios de aceptación ligados a un control, tareas con archivos y dependencias) y preséntalo. Deja claras las tres partes: lo que está claro y se va a hacer, lo que queda bloqueado esperando respuesta, y lo que quedó fuera del alcance.
6. **Desarrolla solo con la aprobación del usuario**, y solo lo que no depende de una pregunta abierta. Nunca hay desarrollo automático.
7. **Cuando llegue una respuesta**: `trabajo responder <id> --respuesta "…"`, informa al usuario qué cambió y qué tareas quedan listas, y retómalas con `trabajo iniciar`. Si la respuesta cambia el alcance, el plan nuevo queda como propuesta hasta que el usuario lo apruebe otra vez.
8. Al cerrar, carga `release-notes` y entrega en el chat: mensaje de commit sugerido, descripción de PR y comentario para el ticket (textos para que el usuario los use). Escribir en el gestor solo con aprobación; commit solo por el orquestador con confirmación del usuario, y el PR lo crea el usuario.

Anuncia el flujo según el tipo (`feature`, `fix`, `analysis`, `refactor`): `[SDD] Flujo: <tipo> (ticket <CLAVE>)`. Si el ticket no tiene criterios de aceptación claros, el flujo es `analysis` y el paso 4 es el principal.
