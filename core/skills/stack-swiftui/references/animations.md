# Animaciones en SwiftUI

## Básicas
- **Explícita**: `withAnimation(.snappy) { expandido.toggle() }` — preferida para cambios disparados por acciones.
- **Implícita**: `.animation(.spring(duration: 0.35, bounce: 0.2), value: estado)` — siempre con `value:`.
- Curvas: `.smooth`, `.snappy`, `.bouncy`, `.spring(duration:bounce:)`, `.easeOut(duration:)`. Springs por defecto en interacciones.
- **Transiciones**: `.transition(.opacity.combined(with: .move(edge: .bottom)))`, `.asymmetric(insertion:removal:)`, transiciones personalizadas con `Transition` (iOS 17+).

## Avanzadas
- `matchedGeometryEffect(id:in:)` para continuidad entre vistas del mismo jerarquía (ej. tarjeta → expandida).
- Transición de navegación zoom (iOS 18+): `.navigationTransition(.zoom(sourceID:in:))` + `.matchedTransitionSource(id:in:)`.
- `PhaseAnimator` para secuencias de fases; `KeyframeAnimator` para curvas por propiedad (iOS 17+).
- `contentTransition(.numericText())` para números que cambian; `.symbolEffect(.bounce, value:)` / `.contentTransition(.symbolEffect(.replace))` en SF Symbols.
- `scrollTransition` y `visualEffect` para efectos ligados a la posición en scroll (con moderación).
- `TimelineView` + `Canvas` para animaciones continuas/dibujo (gráficos, indicadores).

## Hápticos
`.sensoryFeedback(.success, trigger: guardado)`, `.selection`, `.impact(weight: .light)`, `.warning`, `.error` (iOS 17+). Core Haptics solo para patrones personalizados.

## Reglas
- `@Environment(\.accessibilityReduceMotion)`: sustituye movimiento por fundidos.
- No animes cambios de datos masivos (listas completas) sin necesidad; usa `.animation(nil)` o `transaction` para excluir.
- Animaciones interrumpibles: springs y estado como fuente de verdad (no secuencias con `DispatchQueue.asyncAfter`).
- 150–400 ms; nada decorativo infinito salvo indicadores de progreso.
