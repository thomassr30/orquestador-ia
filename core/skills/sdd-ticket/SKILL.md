---
name: sdd-ticket
description: Trabaja un ticket del gestor de tareas (Jira, Azure Boards, GitHub, GitLab, Linear) de principio a fin — lee el ticket, su wiki y su Figma, arma el plan, y con una sola aprobación lo desarrolla completo, verifica contra los criterios y contra el diseño, y prepara comentario, commit y PR. Usar cuando el usuario mencione una clave o enlace de ticket (ej. LAB-123, #45, AB#678, PBI 4521, HU 3310) o escriba /sdd-ticket.
---
# /sdd-ticket — Un ticket de punta a punta

Ticket: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario y sus adjuntos.)

El objetivo es entregar el ticket **desarrollado completo y verificado**, con una sola pausa obligatoria: la aprobación
del plan (GATE). Si el usuario solo pidió leerlo o resumirlo, haz los pasos 1–4, entrega el resumen y detente.

## 1. Leer el ticket (tú mismo, sin delegar)
Carga `tracker-common` y la skill del gestor del proyecto (si no se sabe, pregunta cuál usan). Lee el ticket **en el
hilo principal**, con el MCP del gestor (→ CLI de solo lectura → pedir que lo pegue): es la base del plan y un
sub-agente lo resumiría. Delega en paralelo solo la exploración del código (`sdd-explorer`). Lee todo el contexto:
- El work item con su **padre y sus hijos**: una task suele no tener el porqué, que está en la HU o el PBI.
- **Comentarios**: ahí suele estar lo acordado después de escribir el ticket, que a veces contradice la descripción.
- **Adjuntos** (capturas, documentos): pásalos por `sdd-ingest`.
- **Enlaces a la wiki**, donde muchas veces está el problema completo. Si el punto de partida es una página de wiki,
  parte de ahí y busca el work item vinculado.
- **Enlaces a Figma**: en la descripción, los criterios, los comentarios, los hijos y las páginas de wiki. Haz la lista
  de frames que cubre el ticket.

## 2. Leer el diseño (antes del plan, no después)
Si el ticket tiene UI, el diseño es parte de la especificación: sigue `figma-design` §1–3 para **cada frame** de la
lista (o la skill de Figma del proyecto, si trae una: manda la suya en el cupo y los permisos; la exactitud de §2–3 no
se negocia). El resultado es el **inventario** de cada frame, con valores exactos y su origen, y la lista de «sin dato».
- Un enlace sin `node-id`, un frame que no se puede leer, sin acceso o sin cupo: esa pantalla queda **bloqueada** con una
  pregunta (paso 4). Nunca se implementa UI desde la captura, el texto del ticket o el sistema de diseño a ojo.
- Lo que el ticket pide y el diseño no dibuja (estados vacíos, errores, carga, mobile, validaciones) va a preguntas o a
  supuestos explícitos del plan (`figma-design` §6), nunca al código por iniciativa propia.
- Si el ticket y el diseño se contradicen (un campo que está en uno y no en el otro, otro texto, otro orden), es una
  pregunta de negocio: no elijas tú.

## 3. Cruzar con el proyecto
Qué de lo pedido ya existe, qué hay que construir y dónde va según la arquitectura, las reglas y las **skills del
proyecto**. Nombra archivos, capas y componentes concretos, y para cada elemento del inventario, el token o componente
del proyecto que lo expresa (`figma-design` §4), con las diferencias de valor reportadas.

## 4. Separar lo claro de lo dudoso
- **Técnica** (dónde crear el módulo, qué patrón seguir, cómo nombrarlo): pregúntasela al usuario en el chat, concreta
  y una a la vez.
- **De negocio, de alcance o de diseño** (un estado que aparece en la wiki pero no en la HU, un campo que cambió de
  nombre, un «sin dato» del inventario, una regla que nadie definió): **no la resuelvas suponiendo**. Regístrala con
  `trabajo preguntar "¿…?" --para "<quién responde>" --donde "<AB#1234, la página o el frame>" --tarea <la tarea que bloquea>`
  y muéstrasela al usuario con `trabajo preguntas`. **El orquestador no escribe en el gestor**: el usuario publica la
  pregunta y etiqueta a quien corresponda.

## 5. Plan y GATE
Registra el plan con `trabajo plan`: objetivo; **un requisito por criterio de aceptación del ticket**, cada uno ligado a
un control (`tests`, un comando de aceptación o `manual`); un requisito de **fidelidad al diseño** por frame, con
`manual: true` (lo acepta el usuario con la tabla de §6); y tareas con archivos y dependencias. Presenta:
1. lo que está claro y se va a hacer, con el inventario resumido por frame (filas y «sin dato»);
2. lo que queda bloqueado esperando respuesta;
3. lo que quedó fuera del alcance.

Pregunta `¿Apruebo la implementación? (sí / no / ajustes)`. Nunca hay desarrollo sin ese «sí».

## 6. Con el «sí»: desarrollar hasta el final
El trabajo sigue solo, sin nuevas pausas, salvo decisiones críticas del harness o una duda que cambie el resultado:
1. Implementa **todas** las tareas que no dependen de una pregunta abierta, en paralelo cuando no comparten archivos
   (`sdd-orchestrator`). Cada delegación de UI lleva `Inventario Figma:` con las filas de su frame **completas** y la
   instrucción de no volver a leer Figma ni agregar nada fuera del inventario; las de lógica, el criterio de aceptación
   que cubren.
2. Tests de cada criterio (`sdd-test-writer` junto al implementer) y `trabajo verificar <tarea>` al terminar cada tarea.
3. Por cada frame, la **comparación obligatoria** de `figma-design` §5: navegador al ancho del frame, medición en
   números contra el inventario, sobrantes y corrección de cada diferencia. La hace quien no implementó
   (`sdd-ui-reviewer` o el revisor del proyecto), con el inventario en la delegación.
4. Revisión del diff (`sdd-reviewer` o el revisor del proyecto) y verificación del harness en verde. Lo que quede
   «no verificado» se dice así.
5. No des el ticket por terminado mientras `trabajo` muestre tareas sin evidencia, una comparación con diferencias sin
   explicar o una pregunta abierta que bloquee algo: entrega lo hecho y lo que falta, con su motivo.

## 7. Cuando llegue una respuesta
`trabajo responder <id> --respuesta "…"`, informa al usuario qué cambió y qué tareas quedan listas, y retómalas con
`trabajo iniciar`. Si la respuesta cambia el alcance, el plan nuevo queda como propuesta hasta que el usuario lo apruebe otra vez.

## 8. Cerrar
Carga `release-notes` y entrega en el chat: estado de cada criterio de aceptación con su evidencia, la tabla de
fidelidad por frame («elemento · propiedad · Figma · código · estado»), lo que quedó pendiente, el mensaje de commit
sugerido, la descripción de PR y el comentario para el ticket (textos para que el usuario los use). Escribir en el
gestor solo con aprobación; commit solo por el orquestador con confirmación del usuario, y el PR lo crea el usuario.

Anuncia el flujo según el tipo (`feature`, `fix`, `analysis`, `refactor`): `[SDD] Flujo: <tipo> (ticket <CLAVE>)`. Si el
ticket no tiene criterios de aceptación claros, el flujo es `analysis` y el paso 4 es el principal.
