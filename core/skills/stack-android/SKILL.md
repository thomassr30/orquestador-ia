---
name: stack-android
description: Desarrollo Android nativo en Kotlin con clean code, arquitectura recomendada (UI/dominio/datos), Hilt, corrutinas y Flow, Room/DataStore, red, seguridad, Gradle y requisitos de Google Play. Usar cuando stack.json incluya android/kotlin. Para UI cargar stack-compose; para hardware cargar android-hardware.
---
# Android nativo — Kotlin

Referencias:
- `references/architecture.md` — capas, UDF/MVVM, UiState, casos de uso, repositorios, modularización, Hilt.
- `references/coroutines-flow.md` — corrutinas, dispatchers, Flow/StateFlow, ciclo de vida, cancelación.
- `references/data-network-security.md` — Room, DataStore, Retrofit/Ktor, serialización, WorkManager, seguridad.
- `references/build-release.md` — Gradle (version catalogs, convention plugins, KSP), R8, baseline profiles, requisitos de Google Play.
UI → `stack-compose`. Hardware → `android-hardware`. Tests → `test-mobile`. Diseño → `mobile-design` + `design-quality`.

## Versiones
- Lee `libs.versions.toml`/`build.gradle(.kts)`: Kotlin, AGP, compileSdk/targetSdk/minSdk, Compose BOM. No subas minSdk sin aprobación.
- Referencia oct-2026: Kotlin 2.4.x, AGP 9.4 (Gradle 9.6, JDK 17+, API máx. 37), Compose BOM 2026.09, Navigation 3 estable 1.2.0. **Google Play exige targetSdk 36** para nuevas apps y actualizaciones desde 31-ago-2026 (extensión posible hasta 1-nov-2026).
- Cambios de comportamiento con targetSdk 36: edge-to-edge sin opt-out, back predictivo por defecto (`onBackPressed` ya no se llama), orientación/redimensionado ignorados en pantallas ≥ 600 dp. Revisa los de targetSdk 37 antes de subirlo.

## Clean code — reglas
1. **Capas** (guía oficial de arquitectura): UI (Compose + ViewModel) → Dominio (opcional, casos de uso) → Datos (repositorios + data sources). Dependencias hacia adentro; el dominio es Kotlin puro.
2. **Flujo unidireccional (UDF)**: el ViewModel expone `StateFlow<UiState>` inmutable y recibe eventos; la UI no muta estado.
3. **Inyección de dependencias con Hilt** (o la del proyecto); constructores con `@Inject`; nada de `object` globales con estado.
4. **Inmutabilidad**: `val`, `data class`, colecciones inmutables; `sealed interface` para estados y resultados.
5. **Null-safety real**: sin `!!` (salvo invariantes documentadas); `requireNotNull` con mensaje.
6. **Errores** modelados (`sealed interface Resultado`/`Result`) en los límites; excepciones solo para lo excepcional; nunca `catch (e: Exception) {}` vacío (y no tragar `CancellationException`).
7. **Corrutinas estructuradas**: `viewModelScope`, dispatchers inyectados, sin `GlobalScope`.
8. **Nombres** según las convenciones de Kotlin; funciones pequeñas; extensiones con moderación; sin "utils" gigantes.
9. **Recursos**: strings en `strings.xml` (i18n), sin textos hardcodeados en UI; dimensiones desde el tema.
10. **Sin warnings** de compilación ni de Android Lint en el código tocado; detekt/ktlint según config del proyecto.

## Comandos (Windows: `gradlew.bat`)
`./gradlew assembleDebug` · `./gradlew testDebugUnitTest` · `./gradlew connectedDebugAndroidTest` · `./gradlew lint` · `./gradlew detekt` / `ktlintCheck` (si existen)
