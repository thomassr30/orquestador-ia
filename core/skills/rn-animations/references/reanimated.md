# Reanimated 4 — API esencial

```tsx
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, withSequence, withRepeat, withDelay,
  interpolate, interpolateColor, Extrapolation, useDerivedValue, useAnimatedReaction,
  useAnimatedScrollHandler, useScrollOffset, useAnimatedRef, cancelAnimation, Easing,
  FadeIn, FadeOut, SlideInDown, LinearTransition, Keyframe, ReduceMotion, useReducedMotion,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
```

## Shared values y estilos
```tsx
const progress = useSharedValue(0);
const style = useAnimatedStyle(() => ({
  opacity: progress.value,
  transform: [{ translateY: interpolate(progress.value, [0, 1], [16, 0], Extrapolation.CLAMP) }],
}));
useEffect(() => { progress.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) }); }, []);
return <Animated.View style={[styles.card, style]} />;
```
- Springs: `withSpring(1, { duration: 400, dampingRatio: 0.8 })` o con `stiffness/damping/mass`. En v4, `energyThreshold` reemplaza `restDisplacementThreshold`/`restSpeedThreshold`.
- Composición: `withSequence(withTiming(1.1), withSpring(1))`, `withRepeat(anim, -1, true)`, `withDelay(100, anim)`.
- Colores: `interpolateColor(v, [0, 1], [c1, c2])`.
- Derivados: `useDerivedValue(() => …)`; reaccionar: `useAnimatedReaction(() => x.value, (cur, prev) => { … })`.
- Llamar JS al terminar: `withTiming(1, {}, (finished) => { if (finished) scheduleOnRN(onDone); })`.

## Layout animations
```tsx
<Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} layout={LinearTransition.springify()} />
```
- Presets: Fade, Slide, Zoom, Bounce, Flip, Stretch, Rotate, LightSpeed, Pinwheel… con `.duration()`, `.delay()`, `.springify()`, `.reduceMotion(ReduceMotion.System)`.
- `Keyframe` para secuencias personalizadas. Entrada/salida combinadas: `EntryExitTransition.entering(a).exiting(b)` (reemplaza `combineTransition`).

## CSS animations y transitions (v4)
```tsx
<Animated.View style={{
  transitionProperty: ['opacity', 'transform'], transitionDuration: 200,
  opacity: visible ? 1 : 0, transform: [{ scale: visible ? 1 : 0.96 }],
}} />
<Animated.View style={{
  animationName: { from: { opacity: 0.4 }, to: { opacity: 1 } },
  animationDuration: '900ms', animationIterationCount: 'infinite', animationDirection: 'alternate',
}} />
```
Ideal para animaciones por cambio de estado sin escribir shared values. Conviven con las basadas en shared values.

## Scroll
- `const ref = useAnimatedRef<Animated.ScrollView>(); const offset = useScrollOffset(ref);` (antes `useScrollViewOffset`).
- O `useAnimatedScrollHandler({ onScroll: e => { y.value = e.contentOffset.y; } })` con `scrollEventThrottle={16}`.

## APIs renombradas/eliminadas en v4 (no usar)
`runOnJS` → `scheduleOnRN` · `runOnUI` → `scheduleOnUI` · `useWorkletCallback` → `useCallback` + `'worklet'` · `useAnimatedGestureHandler` → API de Gesture Handler · `combineTransition` → `EntryExitTransition` · `useScrollViewOffset` → `useScrollOffset`.
Shared element transitions: experimentales; no usar en producción sin aprobación.
