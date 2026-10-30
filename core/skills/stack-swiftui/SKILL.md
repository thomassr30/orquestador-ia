---
name: stack-swiftui
description: Desarrollo de interfaces con SwiftUI (estado con Observation, composición de vistas, navegación, listas, formularios, animaciones, accesibilidad, Liquid Glass y rendimiento). Usar al crear o modificar UI iOS en SwiftUI, junto con stack-ios.
---
# SwiftUI

Referencias:
- `references/state-navigation.md` — flujo de datos, @State/@Bindable/@Environment, NavigationStack, sheets, formularios.
- `references/animations.md` — animaciones implícitas/explícitas, transiciones, matchedGeometry, PhaseAnimator, KeyframeAnimator, símbolos, hápticos.
- `references/performance-a11y.md` — rendimiento, listas, identidad de vistas, accesibilidad, previews.
Diseño: `mobile-design` (incluye HIG y Liquid Glass) + `design-quality`.

## Reglas
1. **Vistas pequeñas y componibles**: `body` legible (< ~40 líneas); extrae subvistas con nombre (`struct`), no funciones que devuelven `some View` gigantes.
2. **Una fuente de verdad** por dato: `@State` (local de la vista, `private`), `@Bindable` para editar un modelo `@Observable`, `@Environment` para dependencias/valores compartidos. Sin duplicar estado.
3. **La vista no hace trabajo**: nada de red, parseo ni lógica de negocio en `body` o inicializadores; usa `.task {}` para cargar.
4. **Componentes del sistema primero** (List, Form, NavigationStack, TabView, toolbar, sheet, Menu, ContentUnavailableView): obtienes accesibilidad, Dynamic Type, modo oscuro y Liquid Glass sin esfuerzo.
5. **Design system propio** como `ViewModifier`, `ButtonStyle`, `LabelStyle` y tokens (colores en Asset Catalog, tipografía semántica `.font(.headline)`), no estilos repetidos.
6. **Estados completos**: carga, vacío (`ContentUnavailableView`), error con reintento, contenido.
7. **Layout adaptable**: `ViewThatFits`, `Grid`, `containerRelativeFrame`, size classes; sin tamaños fijos que rompan con Dynamic Type o iPad.
8. **Previews** de cada vista con estados (cargando, vacío, error, datos largos) usando datos de ejemplo.
9. Disponibilidad: envuelve APIs nuevas con `if #available` / `@available` según el deployment target.
