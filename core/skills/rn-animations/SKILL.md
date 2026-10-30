---
name: rn-animations
description: Animaciones y gestos en React Native/Expo con Animated, LayoutAnimation, React Native Reanimated (v4 estable, y v3 en proyectos antiguos) y Gesture Handler. Usar al crear o modificar animaciones, transiciones o interacciones con gestos en apps RN.
---
# Animaciones en React Native

Referencias:
- `references/reanimated.md` — API de Reanimated 4 (shared values, estilos animados, layout animations, CSS animations/transitions, scroll).
- `references/reanimated-v3.md` — diferencias si el proyecto sigue en Reanimated 3 (arquitectura antigua).
- `references/gestures.md` — Gesture Handler (v3 con hooks / v2 con `Gesture.*`) + Reanimated.
- `references/recipes.md` — patrones listos: botón con escala, swipe-to-delete, bottom sheet, header colapsable, skeleton, lista con entradas.
Criterios de cuándo y cuánto animar: `mobile-design` → `references/motion-haptics.md`.

## Elegir la herramienta
| Necesidad | Usa |
|---|---|
| Animación simple de opacidad/transform sin gestos | `Animated` con `useNativeDriver: true` (o Reanimated si ya está en el proyecto) |
| Cambio de layout puntual (expandir/colapsar) | Layout animations de Reanimated (`LinearTransition`) o `LayoutAnimation` |
| Animaciones ligadas a gestos, scroll o valores continuos | **Reanimated** + Gesture Handler |
| Transiciones declarativas tipo CSS por cambio de estado | Reanimated 4 CSS transitions/animations |
| Animaciones complejas de diseñadores (vector) | Lottie / Rive (si el proyecto lo usa) |

## Versiones (verificar en package.json)
- Referencia oct-2026: **Reanimated 4.7** (RN 0.86–0.88) + **react-native-worklets 0.13.x**; Reanimated 4 solo funciona con la **Nueva Arquitectura**.
- Plugin Babel: `react-native-worklets/plugin` (debe ser el **último** plugin). En Expo viene configurado por `babel-preset-expo`.
- Gesture Handler: v3 es la actual (API de hooks: `usePanGesture`, `useTapGesture`…); v2 usa `Gesture.Pan()` + `GestureDetector`. Usa la API de la versión instalada.
- Instala siempre la combinación compatible (tabla de compatibilidad de Reanimated / `npx expo install`).

## Reglas
1. **Animar en el hilo de UI**: `transform`, `opacity`, colores. Evita animar `width/height/top/left` por frame salvo con layout animations.
2. **No leas `sharedValue.value` durante el render** de React; úsalo en worklets/`useAnimatedStyle`. Con React Compiler usa `.get()`/`.set()`.
3. **Comunicación entre hilos**: de worklet a JS con `scheduleOnRN(fn, ...args)` (Reanimated 4/worklets); no llames funciones JS directamente desde un worklet.
4. **Interrumpibles**: las animaciones parten del valor actual (`withSpring`/`withTiming` sobre el shared value); cancela con `cancelAnimation` si corresponde.
5. **Reducir movimiento**: `useReducedMotion()` o `reduceMotion: ReduceMotion.System` en las animaciones; alternativa con fundidos.
6. **Duraciones**: 150–300 ms en micro-interacciones; springs para gestos. En Reanimated 4 la `duration` de `withSpring` es perceptual (dura ~1,5×).
7. **Listas**: entering/exiting en ítems solo si aporta; evita animar cientos de celdas al montar.
8. **Accesibilidad**: la animación no debe ser la única forma de comunicar un cambio (anuncios con `AccessibilityInfo.announceForAccessibility` si aplica).
9. **Rendimiento**: mide FPS en release y gama media; nada de `setState` por frame; usa `useDerivedValue` para cálculos.
