# Rendimiento y accesibilidad en SwiftUI

## Rendimiento
- Identidad estable: `ForEach` con `Identifiable`/`id:` estable; evita `AnyView` y `if/else` que cambian la identidad de vistas grandes (prefiere modificadores condicionales de valor, ej. `.opacity`).
- Observation invalida solo las vistas que leen la propiedad: lee el estado lo más abajo posible en la jerarquía.
- `List`/`LazyVStack`/`LazyVGrid` para colecciones largas; imágenes con tamaño fijo y `AsyncImage` con placeholder (o caché del proyecto).
- Nada de cálculos costosos en `body`; precomputa en el ViewModel.
- Perfilar con Instruments (SwiftUI, Time Profiler, Hangs) en dispositivo.

## Accesibilidad
- Etiquetas: `.accessibilityLabel`, `.accessibilityValue`, `.accessibilityHint`; agrupa con `.accessibilityElement(children: .combine)`.
- Acciones: `.accessibilityAction(named:)` como alternativa a gestos; `.accessibilityAddTraits(.isHeader)` en títulos de sección.
- Dynamic Type: fuentes semánticas; `@ScaledMetric` para espaciados/íconos; layouts que cambian a vertical en tamaños de accesibilidad (`dynamicTypeSize.isAccessibilitySize`).
- Contraste y "Aumentar contraste", "Reducir transparencia" (importante con Liquid Glass), "Reducir movimiento".
- Prueba con VoiceOver y Accessibility Inspector.

## Previews
`#Preview("Vacío") { ListaView(vm: .preview(.vacio)) }` con variantes: `.environment(\.dynamicTypeSize, .accessibility3)`, `.preferredColorScheme(.dark)`, `.environment(\.locale, .init(identifier: "es-CL"))`.
