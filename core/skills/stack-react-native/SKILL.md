---
name: stack-react-native
description: Convenciones para desarrollar apps con React Native CLI (Nueva Arquitectura, TypeScript, navegación, estado, rendimiento, módulos nativos). Usar cuando stack.json incluya react-native sin Expo, o como base común para Expo.
---
# React Native (CLI)

Referencias (léelas solo si la tarea lo requiere):
- `references/architecture.md` — estructura de carpetas, navegación, estado, datos, configuración.
- `references/performance.md` — listas, renders, imágenes, arranque, memoria.
- `references/native-modules.md` — Turbo Modules, Fabric, código Swift/Kotlin, Codegen.
- `references/platform.md` — diferencias iOS/Android, edge-to-edge, permisos, teclado, SceneDelegate.
Animaciones → skill `rn-animations`. Diseño → `mobile-design` + `design-quality`. Tests → `test-mobile`.

## Versión
- Toma la versión de `package.json` (`react-native`, `react`). Referencia oct-2026: RN 0.88 estable (React 19.3, Hermes V1 por defecto desde 0.84, Nueva Arquitectura obligatoria).
- Cambios recientes a respetar según versión: Jest preset `@react-native/jest-preset` (0.85+), API TypeScript estricta sin deep imports `react-native/Libraries/*` (0.87+), Node ≥ 22.13 (0.87+), `StyleSheet.absoluteFillObject` eliminado (usar `absoluteFill`), `InteractionManager` eliminado (0.87).
- Antes de usar una API o librería, verifica compatibilidad con la versión del proyecto (Context7 / docs oficiales). No mezcles guías de versiones antiguas.

## Reglas de código
- **TypeScript estricto**; props y navegación tipadas; sin `any`.
- Componentes funcionales pequeños; lógica en hooks (`useXxx`) y servicios; UI sin llamadas de red directas.
- **Estilos** con `StyleSheet.create` o el sistema del proyecto (NativeWind, Tamagui, Unistyles…); tokens de diseño centralizados (`theme/`), sin colores/medidas mágicas.
- **Safe areas** con `react-native-safe-area-context` (`SafeAreaProvider` + `useSafeAreaInsets`), no el `SafeAreaView` de RN.
- **Listas**: nunca `ScrollView` + `map` para colecciones largas; usa `FlatList`/`SectionList` o FlashList si está en el proyecto.
- **Imágenes** con dimensiones definidas y caché (`react-native-fast-image` o `expo-image` si existe).
- **Secretos**: nunca en el bundle JS. Tokens en Keychain/Keystore (`react-native-keychain` o `expo-secure-store`). `.env` solo para configuración no sensible.
- **Errores**: Error Boundary en la raíz y por flujo crítico; reporte a la herramienta del proyecto (Sentry, etc.).
- **Plataforma**: `Platform.select` o archivos `.ios.tsx` / `.android.tsx` cuando el comportamiento difiere de verdad.
- **Accesibilidad**: `accessibilityRole`, `accessibilityLabel`, `accessibilityState`, `hitSlop` para áreas táctiles pequeñas; soporte a escalado de fuente (no fijar `allowFontScaling={false}` salvo justificación).
- **Dependencias nativas**: antes de agregar una, verifica soporte de Nueva Arquitectura y mantenimiento; justifícala en design.md.

## Comandos habituales
`npx react-native start` · `npx react-native run-android` · `npx react-native run-ios` · `npm test` · `npx tsc --noEmit` · `npm run lint`
iOS: `cd ios && bundle exec pod install` (o SPM si el proyecto lo migró). Android: `cd android && ./gradlew assembleDebug` (`gradlew.bat` en Windows).
