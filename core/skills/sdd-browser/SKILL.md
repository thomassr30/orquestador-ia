---
name: sdd-browser
description: "Controla el navegador para ver, inspeccionar o interactuar con páginas web (sitios externos o la app corriendo en local): abrir, navegar, capturar pantalla, revisar diseño, consola y red, llenar formularios, descargar. Usar cuando el usuario pida ver, abrir, mostrar, revisar visualmente o hacer algo en una página web, o escriba /sdd-browser."
---
# /sdd-browser — Control del navegador

Solicitud: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario y sus adjuntos.)

Carga `browser-automation` y elige el modo: **Ver** (cómo se ve / qué dice), **Inspeccionar** (consola, red, rendimiento), **Verificación visual** (UI propia en varios tamaños) o **Tarea** (pasos en una web).
1. Si hay login, el usuario inicia sesión en la ventana del navegador (nunca contraseñas por chat).
2. Delega en `sdd-browser-operator` (o hazlo tú si no hay sub-agentes). Si la app local no corre, propone el comando para levantarla y espera confirmación.
3. Informa en el chat lo observado, hallazgos y capturas. No guardes evidencias en el proyecto salvo pedido.
