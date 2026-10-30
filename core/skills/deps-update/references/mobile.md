# Mobile
## Android (Gradle)
- Versiones en `gradle/libs.versions.toml`; actualizar BOM de Compose como unidad; AGP con su versión de Gradle y JDK requeridas (Upgrade Assistant de Android Studio).
- Plugin de versiones (`./gradlew dependencyUpdates` si existe el plugin ben-manes) para listar desactualizadas.
- targetSdk/compileSdk: subirlos es un cambio de comportamiento → revisar cambios de la versión de Android.
## iOS
- SPM: actualizar reglas de versión en el proyecto/`Package.swift` y `Package.resolved`; CocoaPods: `pod outdated`, `pod update <Pod>`.
- Xcode/SDK nuevos: revisar deprecaciones y requisitos de App Store.
## Expo
- Subir de SDK uno a la vez: `npx expo install expo@^<N>` → `npx expo install --fix` → `npx expo-doctor`; leer el changelog del SDK.
## React Native CLI
- Usar el Upgrade Helper (diff entre versiones) para archivos nativos; actualizar librerías nativas a versiones compatibles con la nueva RN (Nueva Arquitectura).
