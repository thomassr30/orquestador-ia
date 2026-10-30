---
name: sdd-prototype
description: Crea un prototipo visual navegable de una pantalla o flujo (web o mobile) para ver cómo se vería antes de implementarlo, sin tocar el código del proyecto. Usar cuando el usuario pida ver cómo se vería algo, una maqueta, un mockup o un prototipo, o escriba /sdd-prototype.
---
# /sdd-prototype — Prototipo visual

Solicitud: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario y sus adjuntos.)

1. Carga `sdd-orchestrator`. Explorer (tokens y patrones de UI) → `sdd-prototyper`.
2. El prototipo es lo pedido, así que sí se crea (en `.sdd-prototipos/<nombre>/`, fuera del código de producción).
3. Muestra capturas y la ruta; itera con los comentarios. Al aprobar, ofrece implementarlo.
