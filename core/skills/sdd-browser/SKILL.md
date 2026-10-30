---
name: sdd-browser
description: "Controla el navegador para ver, inspeccionar o interactuar con páginas web (sitios externos o la app corriendo en local): abrir, navegar, capturar pantalla, revisar diseño, consola y red, llenar formularios, descargar. Usar cuando el usuario pida ver, abrir, mostrar, revisar visualmente o hacer algo en una página web, o escriba /sdd-browser."
---
# /sdd-browser — Control del navegador

Solicitud: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario.)

Carga la skill `browser-automation` y elige el modo:

| Modo | Cuándo | Carpeta `changes/` |
|---|---|---|
| **Ver** | "muéstrame", "abre", "cómo se ve", "qué dice la página X" | No |
| **Inspeccionar** | errores en consola, peticiones fallidas, rendimiento, "por qué no carga" | No (sí si deriva en un fix) |
| **Verificación visual** | revisar la UI propia en local tras un cambio (responsive, estados, diseño) | Sí, dentro del cambio en curso |
| **Tarea** | varios pasos: formularios, descargas, flujos con evidencia | Sí |

## Modo Ver / Inspeccionar (rápido)
1. Si es un sitio con login, pide al usuario que inicie sesión en la ventana del navegador (nunca pidas contraseñas por chat).
2. Delega en `sdd-browser-operator` (o hazlo tú si no hay sub-agentes) con: URL, qué mirar y formato de respuesta.
3. Responde: lo observado (≤8 líneas) + captura(s) guardadas en `.sdd-browser/` del proyecto (o la carpeta temporal) + hallazgos de consola/red si aplica.

## Modo Verificación visual / Tarea
1. Carga `sdd-orchestrator`. Si no hay cambio en curso: `node "{{SDD_HOME}}/bin/new-change.js" --type browser "<título>"`.
2. Escribe pasos y datos en `changes/<id>/browser-task.md` (pregunta lo que falte).
3. Delega en `sdd-browser-operator`. Reporta resultado, pasos fallidos y la ruta de `evidencia/`.
4. Si la app local no está corriendo, propón el comando para levantarla (ej. `npm run dev`) y espera confirmación antes de ejecutarlo.
