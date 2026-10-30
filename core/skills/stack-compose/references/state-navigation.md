# Estado y navegación en Compose

## Patrón de pantalla
```kotlin
@Composable
fun MuestrasRoute(onAbrir: (String) -> Unit, vm: MuestrasViewModel = hiltViewModel()) {
    val state by vm.uiState.collectAsStateWithLifecycle()
    MuestrasScreen(state = state, onReintentar = vm::cargar, onAbrir = onAbrir)
}

@Composable
fun MuestrasScreen(state: MuestrasUiState, onReintentar: () -> Unit, onAbrir: (String) -> Unit, modifier: Modifier = Modifier) {
    when {
        state.cargando -> CargandoLista(modifier)
        state.error != null -> ErrorConReintento(state.error, onReintentar, modifier)
        state.muestras.isEmpty() -> EstadoVacio(modifier)
        else -> ListaMuestras(state.muestras, onAbrir, modifier)
    }
}
```
- `remember` para objetos de UI; `rememberSaveable` para lo que debe sobrevivir a rotación/muerte del proceso; `derivedStateOf` cuando un estado se calcula de otro que cambia más seguido.
- Efectos: `LaunchedEffect(key)` para trabajo ligado a una clave, `DisposableEffect` para registrar/desregistrar, `rememberUpdatedState` para lambdas en efectos largos.

## Navegación
- **Navigation Compose** con rutas tipadas (`@Serializable data class Detalle(val id: String)`) o **Navigation 3** (estable desde 1.2.0) si el proyecto la adopta: back stack como estado propio de la app. No mezcles ambas sin decisión.
- Pasa IDs, no objetos; el ViewModel de destino carga desde el repositorio (`SavedStateHandle.toRoute<Detalle>()` en Navigation Compose).
- Deep links declarados en el grafo y validados.

## Back predictivo
- Activo por defecto con targetSdk 36. Usa `BackHandler`/`PredictiveBackHandler` solo para interceptar casos especiales (formularios con cambios sin guardar) y anima la vista previa del retroceso.
