# Gestos con Gesture Handler + Reanimated

- Raíz envuelta en `GestureHandlerRootView` (style `{ flex: 1 }`).
- Los callbacks de gestos corren en el hilo de UI cuando se integran con Reanimated: actualiza shared values directamente.

## Gesture Handler v2 (API `Gesture`)
```tsx
const x = useSharedValue(0);
const pan = Gesture.Pan()
  .onUpdate(e => { x.value = e.translationX; })
  .onEnd(e => {
    const out = Math.abs(e.translationX) > 120 || Math.abs(e.velocityX) > 800;
    x.value = out ? withTiming(Math.sign(e.translationX) * 500, {}, () => scheduleOnRN(onDismiss)) : withSpring(0);
  });
<GestureDetector gesture={pan}><Animated.View style={useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))} /></GestureDetector>
```
Composición: `Gesture.Simultaneous(pinch, rotate)`, `Gesture.Exclusive(doubleTap, tap)`, `Gesture.Race(...)`.

## Gesture Handler v3 (API de hooks)
- Gestos como hooks: `usePanGesture`, `useTapGesture`, `usePinchGesture`, `useRotationGesture`, `useLongPressGesture`, `useFlingGesture`; componente `Touchable`.
- Integración más profunda con Reanimated. **Consulta la documentación de v3** para la forma exacta de configuración y composición antes de escribir el código; no mezcles estilos v2/v3 en la misma base sin decisión explícita.

## Reglas
- Define umbrales por distancia **y** velocidad para decidir completar o revertir.
- Respeta el gesto de "volver" del sistema (no captures pans horizontales desde el borde izquierdo en iOS).
- Alternativa accesible para todo gesto (botón o acción de accesibilidad).
- Háptico al cruzar el umbral de acción (una vez), no en cada frame.
