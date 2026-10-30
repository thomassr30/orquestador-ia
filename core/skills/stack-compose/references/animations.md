# Animaciones en Compose

| Necesidad | API |
|---|---|
| Animar un valor al cambiar el estado | `animateFloatAsState`, `animateColorAsState`, `animateDpAsState`… |
| Mostrar/ocultar | `AnimatedVisibility(visible, enter = fadeIn() + expandVertically(), exit = fadeOut() + shrinkVertically())` |
| Cambiar contenido | `AnimatedContent(targetState) { … }` con `transitionSpec`; `Crossfade` para fundido simple |
| Varios valores coordinados por un estado | `updateTransition(state)` + `animateFloat`/`animateDp` |
| Tamaño que cambia | `Modifier.animateContentSize()` |
| Ítems de lista | `Modifier.animateItem()` en Lazy lists |
| Control imperativo / gestos | `Animatable` + `animateTo`/`snapTo` dentro de corrutinas |
| Repetición | `rememberInfiniteTransition()` (solo indicadores) |
| Elementos compartidos entre pantallas | `SharedTransitionLayout` + `Modifier.sharedElement()`/`sharedBounds()` con `AnimatedVisibility`/navegación |

## Especificaciones
- `spring(dampingRatio, stiffness)` por defecto para interacciones; `tween(durationMillis, easing = FastOutSlowInEasing)` para transiciones con duración fija; `keyframes {}` para secuencias.
- Material 3 Expressive: usa los motion schemes/tokens del tema (`MaterialTheme.motionScheme`) si la versión de material3 del proyecto los incluye, para coherencia con el sistema.

## Rendimiento
- Lee valores animados en fase de dibujo/layout con lambdas: `Modifier.graphicsLayer { alpha = a }`, `Modifier.offset { IntOffset(x.roundToPx(), 0) }` — evita recomposición por frame.
- No animes `padding`/tamaños de layouts grandes por frame si `graphicsLayer` (scale/translation) logra el efecto.

## Reglas
- Respeta la escala de animación del sistema (Compose usa `MotionDurationScale`); ofrece fundidos si está en 0.
- 150–400 ms; háptico con `LocalHapticFeedback.current.performHapticFeedback(HapticFeedbackType.Confirm)` (tipos según versión) en confirmaciones.
- Animaciones interrumpibles: parten del valor actual (comportamiento por defecto de `animate*AsState`/`Animatable`).
