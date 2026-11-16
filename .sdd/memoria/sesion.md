Proyecto: C:/dev/orquestador-ia
<!-- harness:inicio (bloque automático del harness; no editar) -->
Última actividad: 2026-11-16 12:57 (claude) · Plan: aprobado
Pedido en curso: luego que realiza la tarea se queda trabajando o pensando no lo se pero se demora demasiado lo que muestra en el recuadro rojo, cambiando palabras
Archivos modificados en la sesión: harness/src/util.js, harness/src/config.js, harness/src/core.js, harness/test/espacio.test.js, harness/test/sensors.test.js, README.md, CHANGELOG.md, config/harness.json
Sensores: aprobado — ✓ tests
<!-- harness:fin -->

Objetivo actual: plan de mejora del harness (análisis del 2026-11-06). 3.1.0 entregada; lo que queda está en pendientes.md.

Estado: 3.1.0 lista. Commiteado hasta 4c7b0ae; sin commit lo de abajo. npm test 287/287 (~35 s, disco local, nunca sobre la carpeta montada).

Último arreglo (2026-11-16, sin commit ni instalar): el spinner «Determining…» de la extensión de VS Code al terminar una tarea con varios repos era el hook Stop corriendo lint/tipos/tests de cada repo en secuencia (hasta 600 s). Ahora `runSpaceSensors` verifica de a `sensores.paralelo` (2) proyectos a la vez y el log trae `iniciados`/`iniciado`, `total N s` y `(N s)` por control (`mapLimit` en util.js; test en espacio.test.js y sensors.test.js; clave documentada en config/harness.json, README y CHANGELOG «Sin publicar»). Falta: `node install.js` para que rija en las sesiones, y mirar con `sdd-harness registro` qué repo del SAG es el lento (el diagnóstico era una inferencia: no había duraciones en el log). Si sigue lento, decidir si bajar `presupuestoSeg` solo para el espacio SAG.

Próximo paso (2026-11-16): Azure SAG listo (credencial azure-sag con --auth=pat, registrado en SAG\Proyectos, sus 12 repos y las carpetas de SAG.code-workspace; los globales se quitaron). Falta JUNJI: token nuevo (el viejo quedó expuesto; también hay copia en ~/.claude.json.backup), `credencial azure azure-junji --usuario tsoto@siigsa.cl` y registro con --org=ACTISLTDA-SIIGSA --nombre=azure-junji --auth=pat --alcance=proyecto en su carpeta (pendiente de que el usuario la indique). Trabajo de skills de proyecto cerrado y aceptado. Lo que queda del plan: medir el consumo con uso real (sdd-harness consumo) y elegir qué skills excluir en config/skills.json según lo que uses de verdad. Dato: los agentes NO precargaban skills (el campo skills: del frontmatter no se escribía en el archivo del cliente); el costo fijo son las descripciones, ~6.400 tokens con las 105.

Decisiones vigentes de esta etapa: el GATE se deja como está; `.sdd` se queda en la raíz; ODD no se adopta, solo ideas puntuales; el harness no publica en Azure, entrega las preguntas listas para que el usuario las publique; un MCP de Azure por proyecto, con el nombre del servidor por organización (JUNJI usa la organización de SIIGSA, SAG tiene la suya).

Dónde está lo demás: cambios por versión en CHANGELOG.md · decisiones y su motivo en decisiones.md · deuda y riesgos en pendientes.md · bitácora de sesiones terminadas en temas/sesiones-anteriores.md · plan completo de mejora en el documento «Orquestador SDD · cambios pendientes».
