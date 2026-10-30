---
name: test-e2e
description: Tests end-to-end de flujos de usuario con Playwright para Angular, React y Next.js. Usar para flujos completos en el navegador.
---
# Tests E2E (Playwright)

## Reglas
- Usa `@playwright/test`. Si el proyecto no lo tiene, proponlo en el diseño del plan antes de instalarlo.
- Selectores accesibles: `getByRole`, `getByLabel`, `getByText`; `data-testid` solo como último recurso. Nunca selectores CSS frágiles.
- Aserciones web-first con espera automática (`await expect(locator).toBeVisible()`); nunca `waitForTimeout`.
- Cada test independiente: datos propios (vía API o seed), sin depender del orden.
- Login reutilizable con `storageState` (setup project); credenciales desde variables de entorno.
- `baseURL` y `webServer` en `playwright.config.ts` para levantar la app.

## Estructura
`e2e/<flujo>.spec.ts` (o la carpeta existente). Un archivo por flujo de usuario de los requisitos.

## Comandos
`npx playwright test` · `npx playwright test --ui` (depurar) · `npx playwright show-report`
