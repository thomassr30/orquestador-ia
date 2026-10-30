# iOS — Human Interface Guidelines (resumen operativo)

## Estructura
- **Tab bar** para secciones de primer nivel (2–5). **NavigationStack** para jerarquía con títulos grandes en la raíz.
- **Sheets** con detents (`.medium`, `.large`) para tareas secundarias; **full screen cover** solo para flujos inmersivos.
- **Toolbars** para acciones de la vista actual; botón primario a la derecha de la barra de navegación.
- Búsqueda con `.searchable`; menús contextuales con long-press; swipe actions en listas (con alternativa accesible).

## Componentes nativos preferidos
`List`/`Form` con estilos del sistema, `Picker`, `DatePicker`, `Toggle`, `Menu`, `ShareLink`, `PhotosPicker`, `ContentUnavailableView` (estado vacío), `ProgressView`, `Label` con SF Symbols.

## Liquid Glass (iOS 26+)
- Material translúcido del sistema para la capa de **navegación y controles** (barras, tab bar, botones flotantes), no para el contenido.
- Los componentes estándar (TabView, NavigationStack, toolbars, sheets) lo adoptan solos al compilar con el SDK de iOS 26+: **no reimplementes barras personalizadas** si no es necesario.
- Personalizado: `.glassEffect()` y `GlassEffectContainer` para agrupar; estilos de botón de vidrio del sistema. Úsalo con moderación y verifica legibilidad sobre contenido variable.
- Respeta "Reducir transparencia" y "Aumentar contraste".
- Verifica las APIs exactas en la documentación del SDK que use el proyecto.

## Detalles que marcan diferencia
- Títulos grandes que colapsan al hacer scroll; transiciones de navegación del sistema (zoom en iOS 18+ para abrir detalle desde una grilla).
- SF Symbols con la misma escala y peso que el texto contiguo; animaciones de símbolos (`symbolEffect`) para cambios de estado.
- Feedback háptico del sistema en confirmaciones, selección y errores (ver `motion-haptics.md`).
- Respeto a Dynamic Type, modo oscuro, orientación y multitarea en iPad.
