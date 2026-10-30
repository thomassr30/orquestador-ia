# Adaptativo, rendimiento y accesibilidad en Compose

## Layouts adaptativos
- Decide por **window size class** (`currentWindowAdaptiveInfo().windowSizeClass`), no por tipo de dispositivo.
- Material 3 adaptive: `NavigationSuiteScaffold` (barra inferior ↔ rail ↔ drawer automático), `ListDetailPaneScaffold`, `SupportingPaneScaffold`.
- targetSdk 36: orientación/aspect ratio ignorados en pantallas ≥ 600 dp → prueba en tablet y plegable (emulador resizable).
- Mantén estado en rotación/cambio de tamaño (ViewModel + `rememberSaveable`).

## Edge-to-edge
- `enableEdgeToEdge()` antes de `setContent`. `Scaffold` aplica insets a sus barras; aplica `innerPadding` al contenido.
- `WindowInsets.safeDrawing`/`systemBars`/`ime`; `Modifier.imePadding()` en formularios; listas con `contentPadding` para que el último ítem no quede bajo la barra de gestos.

## Rendimiento
- Compilar y medir en **release** (R8) con Baseline Profiles; Layout Inspector para contar recomposiciones.
- Strong skipping está activo por defecto en versiones actuales del compilador; aun así prefiere parámetros estables/inmutables (colecciones inmutables o `@Immutable`/`@Stable` justificados).
- `key` y `contentType` en listas; `remember` para cálculos costosos; `derivedStateOf` para umbrales (ej. mostrar botón "subir" al pasar del ítem 5).
- Lambdas que leen estado tarde (`Modifier.offset { }`, `drawBehind { }`) para evitar recomposiciones.
- Imágenes con Coil y tamaño definido.

## Accesibilidad
- `contentDescription` en íconos con significado (`null` si son decorativos); `Modifier.semantics { heading() }` en títulos; `mergeDescendants` para agrupar.
- Áreas táctiles ≥ 48 dp (los componentes M3 lo aplican; en custom usa `minimumInteractiveComponentSize()`).
- Escalado de fuente: unidades `sp`, layouts que crecen; prueba con `@PreviewFontScale` y 200%.
- `Modifier.clickable(onClickLabel = …)` y acciones personalizadas como alternativa a gestos.
- Prueba con TalkBack y el Accessibility Scanner.
