# Verificación visual de la UI propia

Úsalo después de implementar UI web (o pantallas web de una app híbrida) para comprobar que se ve y funciona bien.

## Preparación
- App corriendo en local (`npm run dev`, `ng serve`, `next dev`…). Si no está levantada, propone el comando y espera confirmación.
- Datos de prueba que muestren los estados (vacío, con datos, error).

## Checklist
1. **Tamaños**: 360×800 (móvil), 768×1024 (tablet), 1280×800 y 1920×1080 (escritorio) con `browser_resize`; captura de cada uno.
2. **Estados**: carga, vacío, error, datos largos (textos y listas extensas), sin permisos.
3. **Interacción**: navegación con teclado (Tab/Shift+Tab/Enter/Esc), foco visible, hover y estados deshabilitados.
4. **Consola sin errores ni warnings nuevos**; red sin 4xx/5xx inesperados.
5. **Accesibilidad**: revisar el snapshot (nombres accesibles en botones, labels en campos, encabezados en orden). Si el proyecto tiene `@axe-core/playwright`, ejecútalo (ver `test-a11y`).
6. **Diseño**: aplicar el checklist de `design-quality` sobre las capturas (jerarquía, alineación, contraste, nada de diseño genérico).
7. **Modo oscuro** si la app lo soporta (`prefers-color-scheme` emulado o toggle de la app).

## Reporte
Tabla: verificación | resultado | captura. Problemas con captura y ubicación (componente/archivo si se conoce). No corrijas el código desde este modo: reporta al orquestador.
