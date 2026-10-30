---
name: test-a11y
description: Tests de accesibilidad automáticos (axe-core) y checklist manual WCAG 2.2 AA. Usar cuando un cambio crea o modifica UI.
---
# Accesibilidad

## Automático
- Playwright + `@axe-core/playwright`:
  `const r = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa']).analyze(); expect(r.violations).toEqual([]);`
- En tests de componentes: `jest-axe` / `vitest-axe` si están disponibles.
- Gate: 0 violaciones `serious` o `critical`.

## Checklist manual (reportar en el informe de verificación)
- Navegable solo con teclado (Tab, Shift+Tab, Enter, Esc); orden de foco lógico; foco visible.
- Controles con nombre accesible (label, aria-label).
- Mensajes dinámicos (alertas, errores) anunciados (`role="alert"`/`aria-live`).
- Contraste AA; no transmitir información solo con color.
- Zoom 200% sin pérdida de contenido.
