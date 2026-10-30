---
name: sdd-prototype
description: Crea un prototipo visual navegable de una pantalla o flujo (web o mobile) para ver cómo se vería antes de implementarlo, sin tocar el código del proyecto. Usar cuando el usuario pida ver cómo se vería algo, una maqueta, un mockup o un prototipo, o escriba /sdd-prototype.
---
# /sdd-prototype — Prototipo visual

Solicitud: $ARGUMENTS
(Si no ves la solicitud arriba, usa el mensaje del usuario.)

1. Carga `sdd-orchestrator`. Usa el cambio en curso si existe; si no: `node "{{SDD_HOME}}/bin/new-change.js" --type prototype "<título>"`.
2. `explore` breve para tokens de diseño y patrones de UI existentes (apoyado en memoria).
3. Delega en `sdd-prototyper` (skill `prototype`).
4. Muestra capturas y la ruta del prototipo; pide comentarios y itera.
5. Al aprobar, ofrece continuar con el desarrollo (`sdd-new`) usando el prototipo como referencia de diseño.
