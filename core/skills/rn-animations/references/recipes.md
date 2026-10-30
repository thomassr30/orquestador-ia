# Recetas (adaptar a la versión del proyecto)

## Botón con feedback de presión
Shared value `pressed` → `scale: withSpring(pressed ? 0.97 : 1)`; en v4 también vale una CSS transition sobre `transform`. Háptico ligero en `onPress` confirmado, no en `onPressIn`.

## Swipe para eliminar
Pan horizontal (ver `gestures.md`) + fondo con acción revelada (opacidad según `interpolate` de `translateX`) + al superar el umbral: animar salida y `scheduleOnRN(onDelete)`; luego `LinearTransition` en la lista para cerrar el hueco. Incluir "Deshacer" (snackbar/toast) y acción accesible equivalente.

## Bottom sheet
Usa `@gorhom/bottom-sheet` (compatible con Reanimated 4 en versiones recientes) o el sheet nativo del sistema/Expo Router si cubre el caso. Snap points semánticos, backdrop con opacidad interpolada, cierre con gesto y botón.

## Header que colapsa
`useScrollOffset`/`useAnimatedScrollHandler` → `interpolate(y, [0, 120], [120, 56], Extrapolation.CLAMP)` para la altura del header animado con `transform: translateY` + título que cambia de escala/opacidad. Mantén el título accesible.

## Skeleton de carga
CSS animation (v4) de opacidad 0.5 ↔ 1 en bloques con la forma real del contenido; desactivar con reducir movimiento (dejar opacidad fija).

## Entradas de lista
`entering={FadeIn.delay(Math.min(index, 8) * 30)}` solo en la primera carga; sin animación al reciclar celdas ni al paginar.

## Cambio de número/estado
Contadores: transición de opacidad + `translateY` corto; estados de botón (Guardar → Guardando → Guardado ✓) con layout animation y háptico de éxito al final.
