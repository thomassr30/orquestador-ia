---
name: stack-expo
description: Convenciones para apps con Expo (SDK, Expo Router, módulos expo-*, config plugins, prebuild/CNG, EAS Build/Submit/Update). Usar cuando stack.json incluya expo. Complementa a stack-react-native.
---
# Expo

Carga también `stack-react-native` (reglas comunes de RN). Referencias:
- `references/router.md` — Expo Router: rutas, layouts, tipos, data loaders, tabs nativas.
- `references/native-config.md` — app.config, config plugins, prebuild (CNG), módulos nativos propios.
- `references/eas.md` — builds, perfiles, envío a tiendas, actualizaciones OTA.

## Versión
- Toma `expo` de `package.json` y alinea dependencias con `npx expo install --check` (nunca `npm install` "a mano" de paquetes expo-*/RN con versiones arbitrarias).
- Referencia oct-2026: Expo SDK 58 (RN 0.88, iOS 27 / ciclo de vida de escenas). Expo Go para un SDK nuevo puede tardar semanas: usa **development builds** para trabajo serio.
- Lee el changelog del SDK del proyecto antes de usar APIs nuevas; revisa deprecaciones al actualizar (`npx expo-doctor`).

## Reglas
- **Development build** (`expo-dev-client`) como entorno principal; Expo Go solo para prototipos sin módulos nativos propios.
- **CNG**: si el proyecto no versiona `ios/` y `android/`, NO los edites: todo cambio nativo va por `app.config.ts` y config plugins; regenera con `npx expo prebuild --clean`.
- Si el proyecto SÍ versiona carpetas nativas (bare), se editan directamente y el prebuild no se usa.
- Prefiere módulos del SDK: `expo-image`, `expo-secure-store`, `expo-camera`, `expo-location`, `expo-notifications`, `expo-haptics`, `expo-file-system`, `expo-sqlite`, `expo-localization`, `expo-font`, `expo-splash-screen`.
- Permisos y textos de uso (`NS…UsageDescription`) en la sección `plugins`/`ios.infoPlist`/`android.permissions` de app config.
- Variables: `EXPO_PUBLIC_*` es pública (va al bundle); secretos solo en servidor o EAS secrets para el build.
- Animaciones: Reanimated y Gesture Handler vía `npx expo install` (versión compatible con el SDK). Ver `rn-animations`.

## Comandos
`npx expo start` · `npx expo run:ios` / `run:android` · `npx expo install <paquete>` · `npx expo-doctor` · `npx expo prebuild --clean` · `eas build --profile development|preview|production` · `eas update --channel <canal>`
