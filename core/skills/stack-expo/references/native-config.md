# Configuración nativa en Expo

## app.config.ts
- Fuente de verdad: nombre, `ios.bundleIdentifier`, `android.package`, iconos, splash, permisos, `plugins`, `extra`.
- Variantes por entorno leyendo `process.env.APP_VARIANT` (bundle IDs y nombres distintos para dev/preview/prod).

## Config plugins
- Usa el plugin del propio paquete cuando exista (`["expo-camera", { cameraPermission: "…" }]`).
- Plugins propios en `plugins/withAlgo.ts` con `@expo/config-plugins` (`withInfoPlist`, `withAndroidManifest`, `withGradleProperties`…). Idempotentes y tipados.
- Nunca modificar `ios/`/`android/` generados en un proyecto CNG: se pierde en el próximo prebuild.

## Módulos nativos propios
- **Expo Modules API**: `npx create-expo-module --local` → Swift (`Module` con `Name`, `Function`, `AsyncFunction`, `Events`, `View`) y Kotlin equivalente.
- Expo Modules 2.0 está en beta en SDK 58: usa la API estable salvo decisión explícita.
- El código Swift/Kotlin sigue `stack-ios`/`stack-android`.

## Actualizaciones de SDK
1. `npx expo install expo@^<nuevo>` → `npx expo install --fix` → `npx expo-doctor`.
2. Revisa el changelog (deprecaciones, cambios de mínimos iOS/Android).
3. `npx expo prebuild --clean` y prueba en ambos sistemas.
