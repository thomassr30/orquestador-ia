# Gradle, build y publicación

- **Version catalog** (`gradle/libs.versions.toml`) como única fuente de versiones; Compose vía BOM.
- **Convention plugins** en `build-logic/` para configuración común (android library, compose, hilt, tests).
- **KSP** en lugar de kapt (Room, Hilt, Moshi…).
- AGP 9: Kotlin integrado y nuevo DSL; si el proyecto aún usa opt-outs (`android.builtInKotlin=false`, `android.newDsl=false`), migrar antes de AGP 10.
- Build types `debug`/`release` y product flavors por entorno (dev/qa/prod) con `applicationIdSuffix`.
- **R8** (`isMinifyEnabled = true`, `isShrinkResources = true`) con reglas keep mínimas y probadas.
- **Baseline Profiles** (módulo `baselineprofile` + Macrobenchmark) para arranque y scroll.
- **Firma**: keystore fuera del repo; Play App Signing.
- **Publicación**: App Bundle (AAB); targetSdk 36 obligatorio en Google Play; declarar permisos sensibles y formulario de seguridad de datos; pruebas internas/cerradas antes de producción.
