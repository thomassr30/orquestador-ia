---
name: stack-html-css
description: Convenciones de HTML semántico, CSS y accesibilidad. Usar cuando stack.json incluya html o css, o al construir cualquier UI.
---
# HTML y CSS

## HTML
- Semántica: `header`, `nav`, `main`, `section`, `article`, `footer`, `button` (no `div` clicable).
- Un `h1` por página; jerarquía de encabezados sin saltos.
- Formularios: cada control con `label` asociado; errores con `aria-describedby`; `required`, `type` correcto.
- Imágenes con `alt` significativo (vacío si es decorativa).
- Alertas dinámicas con `role="alert"` o `aria-live="polite"`.

## CSS
- Mobile-first con media queries por rango; unidades relativas (`rem`, `%`, `clamp()`).
- Variables CSS (`--color-primario`) para tokens; sin colores mágicos repetidos.
- Layout con Flexbox/Grid; sin `!important` salvo utilidades justificadas.
- Foco visible siempre (`:focus-visible`); contraste mínimo WCAG AA (4.5:1 texto normal).
- Respeta `prefers-reduced-motion` en animaciones.
- Convención de clases del proyecto (BEM u otra); sin estilos inline.

## Verificación
Validar con axe (skill `test-a11y`) y revisar en 360 px, 768 px y 1280 px de ancho.
