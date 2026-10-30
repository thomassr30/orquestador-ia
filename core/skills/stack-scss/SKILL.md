---
name: stack-scss
description: Convenciones para estilos SCSS/Sass. Usar cuando stack.json incluya scss o sass.
---
# SCSS

## Reglas
- Módulos con `@use` / `@forward`; NO uses `@import` (obsoleto en Dart Sass).
- Tokens en parciales (`_variables.scss`, `_mixins.scss`) y expuestos vía `@forward` en un índice.
- Anidamiento máximo 3 niveles; evita selectores largos y específicos.
- Convención de clases del proyecto (BEM u otra). Sin IDs para estilos.
- Mixins para media queries y patrones repetidos; funciones de `sass:math`, `sass:color` (módulos oficiales).
- Preferir variables CSS para valores que cambian en runtime (temas); SCSS para constantes de compilación.
- En Angular, respeta la encapsulación del componente; estilos globales solo en `styles.scss`.
- Accesibilidad: foco visible y contraste AA (ver `stack-html-css`).

## Verificación
`npx stylelint "**/*.scss"` si el proyecto tiene stylelint; el build no debe emitir warnings de deprecación nuevos.
