# Arquitectura Android

## Módulos (proyectos medianos/grandes)
```
app/                      # Application (@HiltAndroidApp), navegación raíz, composición
feature/muestras/         # UI + ViewModels de la feature
core/domain/              # casos de uso, modelos de dominio (Kotlin puro)
core/data/                # repositorios, mappers
core/database/            # Room
core/network/             # Retrofit/Ktor, DTOs
core/designsystem/        # tema M3, componentes base
core/testing/             # fakes, reglas de test
build-logic/              # convention plugins
```
Respeta la modularización existente; en apps pequeñas basta con paquetes por feature.

## ViewModel + UiState
```kotlin
data class MuestrasUiState(
    val cargando: Boolean = false,
    val muestras: List<Muestra> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class MuestrasViewModel @Inject constructor(
    private val obtenerMuestras: ObtenerMuestrasUseCase,
) : ViewModel() {
    private val _uiState = MutableStateFlow(MuestrasUiState())
    val uiState: StateFlow<MuestrasUiState> = _uiState.asStateFlow()

    fun cargar() = viewModelScope.launch {
        _uiState.update { it.copy(cargando = true, error = null) }
        obtenerMuestras()
            .onSuccess { lista -> _uiState.update { it.copy(cargando = false, muestras = lista) } }
            .onFailure { e -> _uiState.update { it.copy(cargando = false, error = e.toMensaje()) } }
    }
}
```
- Alternativa reactiva: combinar flows del repositorio con `stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), UiState())`.
- Eventos de una sola vez (navegar, snackbar): modelarlos como estado consumible o callbacks; evita `SharedFlow` sin repetición que se pierde.
- `SavedStateHandle` para argumentos y estado que debe sobrevivir a la muerte del proceso.

## Dominio y datos
```kotlin
class ObtenerMuestrasUseCase @Inject constructor(private val repo: MuestrasRepository) {
    suspend operator fun invoke(): Result<List<Muestra>> = runCatching { repo.listar().sortedByDescending { it.fecha } }
}
interface MuestrasRepository { suspend fun listar(): List<Muestra>; fun observar(): Flow<List<Muestra>> }
```
- Repositorio como **fuente única de verdad** (offline-first: la BD local manda, la red sincroniza).
- Mappers DTO ↔ entidad ↔ dominio explícitos.
- Cuidado con `runCatching`: re-lanza `CancellationException`.

## Hilt
- `@HiltAndroidApp` en Application, `@AndroidEntryPoint` en Activity, `@HiltViewModel` + `hiltViewModel()` en Compose.
- Módulos `@Module @InstallIn(SingletonComponent::class)` con `@Binds` para interfaces y `@Provides` para terceros.
- Calificadores (`@IoDispatcher`) para dispatchers inyectados.
