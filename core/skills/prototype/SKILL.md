---
name: prototype
description: Prototipos visuales navegables en HTML/CSS/JS sin dependencias (web o mobile) para validar diseño y flujo antes de implementar, usando los tokens y el contenido real del proyecto, con estados y capturas en varios tamaños. Usar cuando el usuario pida ver cómo se vería algo, una maqueta o prototipo, o en la fase de diseño de cambios con UI importante.
---
# Prototipos

Carga `design-quality` (y `mobile-design` si es mobile).

## Qué produce
- `changes/<id>/prototipo/index.html` (y pantallas adicionales enlazadas), **autocontenido**: HTML + CSS + JS inline, sin CDNs (funciona sin internet y en redes institucionales).
- Navegable: botones y enlaces llevan a las pantallas/estados correspondientes.
- Estados por pantalla: contenido, carga, vacío, error (selector visible "Ver estado: …").
- Mobile: marco de dispositivo de 390×844 (y 360×800 Android) con safe areas; patrones de la plataforma (tab bar iOS / navigation bar M3).

## Fidelidad
- **Tokens del proyecto**: lee colores, tipografía, espaciados y radios del tema existente (Tailwind config/`@theme`, variables CSS/SCSS, tema Angular/M3, Asset Catalog) y úsalos como variables CSS.
- **Contenido real del dominio** (campos, nombres, estados del negocio de `requirements.md`/`spec.md`), nunca lorem ipsum.
- Componentes y patrones que ya existen en la app (misma navegación, tablas, formularios) para que el prototipo sea realista.
- Accesible desde el prototipo: contraste, tamaños táctiles, foco visible.

## Revisión
1. Muestra el prototipo con `sdd-browser-operator`: capturas en móvil/tablet/escritorio (o los marcos de dispositivo) → `changes/<id>/prototipo/capturas/`.
2. Presenta al usuario las capturas + la ruta del `index.html` para abrirlo en su navegador.
3. Itera según comentarios (cambios puntuales, no rehacer todo).
4. Al aprobarse: registrar en `design.md` → "Dirección de diseño" y "Componentes de UI" con referencia al prototipo. El prototipo **no** se copia al código de producción: se implementa con los componentes reales del stack.
