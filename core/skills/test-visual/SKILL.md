---
name: test-visual
description: Tests de regresión visual con capturas de Playwright. Usar cuando un cambio modifica el diseño de pantallas o componentes.
---
# Regresión visual

- Usa `await expect(page).toHaveScreenshot('<nombre>.png')` o sobre un locator concreto.
- Estabiliza antes de capturar: datos fijos, fuentes cargadas, animaciones desactivadas (`animations: 'disabled'`), ocultar fechas/horas dinámicas con `mask`.
- Captura en anchos clave: 360, 768 y 1280 px.
- Baselines: la primera ejecución las genera; deben revisarse y versionarse. Actualizar con `npx playwright test --update-snapshots` solo si el cambio visual es intencional (registrarlo en verify.md).
- Las capturas dependen del SO: genera baselines en el mismo entorno que la CI (idealmente contenedor Linux).
