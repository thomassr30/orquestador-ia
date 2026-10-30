---
name: design-audit
description: Auditoría técnica de UI en cinco áreas (accesibilidad, rendimiento, temas/sistema de diseño, responsive, integridad de implementación) con puntaje 0–4 por área (total /20) y hallazgos P0–P3, opcionalmente apoyada por un detector automático de anti-patrones. Usar en la verificación de cambios con UI o cuando se pida auditar la interfaz.
---
# Auditoría técnica de UI

Carga `design-quality`. **No modifica código.** Usa el código y, si hay navegador, la página renderizada (`browser-automation`).

## Áreas (0–4 cada una → total /20)
| Área | Revisa |
|---|---|
| **Accesibilidad** | contraste AA, foco visible, nombres accesibles, orden de títulos y landmarks, teclado, áreas táctiles, texto escalable, `prefers-reduced-motion` (axe si está disponible: `test-a11y`) |
| **Rendimiento** | errores en consola, peso de imágenes/fuentes, saltos de layout (CLS), animaciones de layout, listas largas sin virtualizar, renders excesivos |
| **Temas y sistema** | uso de tokens (sin colores/medidas sueltos), coherencia con `diseno.md`, tema oscuro si existe |
| **Responsive** | 360, 768, 1280 px (o marcos mobile): desbordes, texto pegado a bordes, tablas, menús recortados |
| **Integridad** | estados (carga, vacío, error), datos extremos, imágenes rotas, contenido oculto tras animaciones, HTML semántico |
Puntaje: 4 sin problemas · 3 menores · 2 varios relevantes · 1 graves · 0 bloqueante.

## Detector automático (opcional)
Si el usuario lo habilitó (memoria: `diseno.md` → "Detector: habilitado"), ejecuta el detector de Impeccable sin telemetría, solo lectura:
`IMPECCABLE_NO_UPDATE_CHECK=1 DO_NOT_TRACK=1 IMPECCABLE_NO_TELEMETRY=1 npx impeccable detect <carpeta-o-url> --json`
(en PowerShell, definir las variables con `$env:VAR="1"` antes). La primera vez descarga el paquete: es agregar una herramienta → pedir aprobación. Sus hallazgos son señales a revisar, no veredictos.

## Severidad y salida
P0–P3 (como `design-critique`). → `changes/<id>/design-review.md` (sección Auditoría): tabla de áreas con puntaje, hallazgos ordenados por severidad con evidencia y sugerencia.
**Gate de diseño**: con P0 o P1 abiertos, el cambio no se da por terminado (vuelve al implementer con `design-polish`); P2/P3 se reportan.
