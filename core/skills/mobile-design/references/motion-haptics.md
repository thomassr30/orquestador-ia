# Movimiento y hápticos en mobile

## Cuándo animar
| Sí | No |
|---|---|
| Cambio de estado (botón → cargando → listo) | Elementos que aparecen al hacer scroll "porque sí" |
| Relación espacial (de la lista al detalle) | Animar todo al entrar a cada pantalla |
| Feedback de gesto (arrastrar, deslizar, soltar) | Animaciones que bloquean la interacción |
| Llamar la atención a un cambio importante | Loops infinitos decorativos |

## Tiempos y curvas
- Micro-interacciones: 100–200 ms. Transiciones de pantalla/elementos: 250–400 ms.
- **Springs** para lo que responde a gestos o debe sentirse físico (iOS y M3 Expressive los usan por defecto).
- Ease-out para entradas, ease-in para salidas; nunca lineal salvo progresos.
- Las animaciones interrumpibles: si el usuario vuelve a tocar, la animación continúa desde el estado actual.

## Reducir movimiento
- iOS: `UIAccessibility.isReduceMotionEnabled` / `@Environment(\.accessibilityReduceMotion)`.
- Android: escala de animaciones del sistema (`Settings.Global.ANIMATOR_DURATION_SCALE`); Compose respeta parte automáticamente.
- React Native: `AccessibilityInfo.isReduceMotionEnabled()`; Reanimated: `useReducedMotion()` y `ReduceMotion` en animaciones.
- Sustituye desplazamientos/zoom por fundidos cortos.

## Hápticos
| Evento | iOS | Android | Expo / RN |
|---|---|---|---|
| Selección (picker, toggle) | `.sensoryFeedback(.selection, trigger:)` | `HapticFeedbackConstants.SEGMENT_TICK` / `LocalHapticFeedback` | `Haptics.selectionAsync()` |
| Éxito / error / alerta | `.sensoryFeedback(.success/.error/.warning, …)` | `CONFIRM` / `REJECT` | `Haptics.notificationAsync(...)` |
| Impacto (soltar, encajar) | `.sensoryFeedback(.impact(weight:), …)` | `HapticFeedbackConstants.CLOCK_TICK`/`CONTEXT_CLICK` | `Haptics.impactAsync(Light/Medium/Heavy)` |
Reglas: sutiles, consistentes y asociados a una acción del usuario; nunca en scroll continuo ni en cada render.
