# Diferencias de plataforma y temas críticos

## Edge-to-edge (Android)
- Android 15+ con targetSdk 35 fuerza edge-to-edge; con targetSdk 36 (requisito de Google Play desde 31-ago-2026) no hay opt-out.
- RN 0.86+ corrige `KeyboardAvoidingView`, `measureInWindow` y `Dimensions` en edge-to-edge. Usa insets (`useSafeAreaInsets`) en headers, footers y botones flotantes.
- `StatusBar`: estilo según fondo; barra de navegación transparente.

## iOS: ciclo de vida de escenas
- Desde el SDK de iOS 27 (Xcode 27) Apple exige el ciclo de vida `UIScene`: RN 0.88 soporta `SceneDelegate`. Mantén `UIApplicationSupportsMultipleScenes = false` salvo que la app soporte multiventana.
- Al actualizar RN, sigue el Upgrade Helper para `AppDelegate`/`SceneDelegate`.

## Teclado
- `KeyboardAvoidingView` (`behavior="padding"` en iOS) o `react-native-keyboard-controller` si está en el proyecto.
- `keyboardShouldPersistTaps="handled"` en scrolls con formularios; `returnKeyType` y foco al siguiente campo.

## Permisos
- Pide en contexto (cuando el usuario usa la función), con pantalla previa que explique el motivo.
- iOS: textos `NS…UsageDescription` en `Info.plist` claros y específicos; Android: permisos en `AndroidManifest.xml` + solicitud en runtime.
- Maneja "denegado permanentemente": explica y ofrece abrir Ajustes (`Linking.openSettings()`).
- Librería única para permisos (`react-native-permissions` o módulos Expo).

## Back y gestos
- Android: back predictivo habilitado por defecto con targetSdk 36; usa la navegación del sistema (`BackHandler` solo para casos especiales).
- iOS: no bloquees el gesto de borde para volver salvo en flujos con datos sin guardar (y entonces confirma).

## Otros
- Fuentes: registrar en ambos proyectos nativos; desde 0.88 `fontVariationSettings` para fuentes variables.
- Deep links: Universal Links (iOS, `apple-app-site-association`) y App Links (Android, `assetlinks.json`).
- Notificaciones push: FCM/APNs vía librería del proyecto; permiso `POST_NOTIFICATIONS` en Android 13+.
