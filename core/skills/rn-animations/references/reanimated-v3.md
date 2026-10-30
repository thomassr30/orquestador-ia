# Proyectos en Reanimated 3

- Reanimated 3 soporta arquitectura antigua; Reanimated 4 NO. Si el proyecto usa la arquitectura antigua, **no actualices a v4** sin migrar primero la app (y todas sus librerías nativas) a la Nueva Arquitectura.
- Plugin Babel: `react-native-reanimated/plugin`.
- Hilos: `runOnJS(fn)(args)` y `runOnUI(fn)(args)` (en v4 cambian a `scheduleOnRN(fn, args)` / `scheduleOnUI`).
- `useAnimatedGestureHandler` está deprecado incluso en v3: usa `Gesture.*` de Gesture Handler 2.
- `withSpring` usa `restDisplacementThreshold`/`restSpeedThreshold`; la `duration` no es perceptual.
- Sin CSS animations/transitions (son de v4).

## Migración a v4 (resumen)
1. Confirmar Nueva Arquitectura en la app y librerías.
2. Instalar `react-native-reanimated@4` + `react-native-worklets` compatible.
3. Cambiar el plugin Babel a `react-native-worklets/plugin`.
4. Reemplazar `runOnJS`/`runOnUI`, `useWorkletCallback`, `combineTransition`, `useScrollViewOffset`.
5. Revisar springs (umbrales y duración) y probar todas las animaciones en ambos sistemas.
Haz la migración como un cambio `refactor` separado, con tests y verificación visual.
