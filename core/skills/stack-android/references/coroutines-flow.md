# Corrutinas y Flow

- Scopes: `viewModelScope` (UI), `lifecycleScope` con `repeatOnLifecycle(STARTED)` (Views), scope de aplicación inyectado para trabajo que sobrevive a pantallas. Nunca `GlobalScope`.
- **Dispatchers inyectados** (`@IoDispatcher`), nunca hardcodeados en clases testeables; las funciones `suspend` son main-safe (cambian de contexto internamente con `withContext`).
- `StateFlow` para estado, `Flow` frío para streams de datos; operadores `map`, `combine`, `flatMapLatest`, `debounce`, `distinctUntilChanged`.
- Recolectar en Compose con `collectAsStateWithLifecycle()`.
- Cancelación cooperativa: `ensureActive()` en bucles; no capturar `CancellationException` (o re-lanzarla).
- Errores: `catch {}` en flows, `supervisorScope` cuando un fallo no debe cancelar a los hermanos.
- Callbacks → Flow con `callbackFlow { … awaitClose { unregister() } }` (sensores, ubicación, BLE).
- Tests: `runTest` + `StandardTestDispatcher`/`UnconfinedTestDispatcher`, `MainDispatcherRule`, Turbine para flows.
