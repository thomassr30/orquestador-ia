---
name: stack-compose
description: Desarrollo de interfaces Android con Jetpack Compose y Material 3 (estado y UDF, navegación, listas, formularios, temas, animaciones, layouts adaptativos, edge-to-edge, rendimiento y accesibilidad). Usar al crear o modificar UI Android en Compose, junto con stack-android.
---
# Jetpack Compose

Referencias:
- `references/state-navigation.md` — state hoisting, rememberSaveable, ViewModel, Navigation Compose / Navigation 3, back predictivo.
- `references/animations.md` — API de animación de Compose, transiciones de elementos compartidos, M3 Expressive.
- `references/adaptive-performance.md` — layouts adaptativos, edge-to-edge, rendimiento, estabilidad, accesibilidad, previews.
Diseño: `mobile-design` (incluye Material 3) + `design-quality`.

## Reglas
1. **Composables sin estado** (stateless) que reciben estado y emiten eventos; la versión con estado (`Pantalla(vm)`) solo en el nivel de pantalla.
2. **Parámetro `modifier: Modifier = Modifier`** como primer parámetro opcional en todo composable reutilizable; el orden de modificadores importa (padding → clickable → background, según intención).
3. **Estado del ViewModel** con `collectAsStateWithLifecycle()`; estado de UI local con `remember`/`rememberSaveable`.
4. **Material 3** y el tema del proyecto (`MaterialTheme.colorScheme`, `typography`, `shapes`); nunca colores o tamaños de texto hardcodeados.
5. **Slot APIs** (`content: @Composable () -> Unit`) para componentes flexibles; componentes del design system en `core/designsystem`.
6. **Listas**: `LazyColumn`/`LazyVerticalGrid` con `key` estable y `contentType`; nunca `Column` + `forEach` para colecciones largas.
7. **Edge-to-edge**: `enableEdgeToEdge()` en la Activity; `Scaffold` con `innerPadding` aplicado; insets (`WindowInsets.safeDrawing`, `imePadding()`) en contenido interactivo.
8. **Estados completos**: carga, vacío, error con reintento, contenido; feedback con `Snackbar`.
9. **Previews** (`@Preview` + `@PreviewLightDark`, `@PreviewFontScale`, `@PreviewScreenSizes`) con datos de ejemplo de cada estado.
10. **Strings** desde recursos (`stringResource`), `contentDescription` en íconos significativos.
