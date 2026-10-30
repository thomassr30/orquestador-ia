---
name: test-mobile
description: "Testing de apps mobile por plataforma (React Native/Expo, iOS Swift/SwiftUI, Android Kotlin/Compose): unitarios, componentes/UI, integración, E2E, snapshots, rendimiento y accesibilidad. Usar al escribir o ejecutar tests en proyectos mobile."
---
# Testing mobile

Usa SIEMPRE el runner y las librerías que ya tiene el proyecto. Si falta algo, propónlo en el diseño del plan antes de agregarlo.

## React Native / Expo
| Tipo | Herramienta |
|---|---|
| Unitario (lógica, hooks) | Jest con preset `@react-native/jest-preset` (RN 0.85+) o `jest-expo` en Expo |
| Componentes | React Native Testing Library (`render`, `screen.getByRole`, `userEvent`) — consultar por rol/texto/label accesible |
| Red | MSW o mocks del cliente HTTP |
| Módulos nativos en Jest | mocks oficiales de cada librería (Reanimated, Gesture Handler, AsyncStorage…) |
| E2E | **Maestro** (flujos YAML, simple y multiplataforma) o **Detox** (si el proyecto lo usa) |
| Animaciones | Testear el estado final/comportamiento, no frames; helpers de test de Reanimated si es necesario |

## iOS (Swift / SwiftUI)
| Tipo | Herramienta |
|---|---|
| Unitario | **Swift Testing** (`@Test`, `#expect`, `#require`, `@Suite`, tests parametrizados) para código nuevo; XCTest en suites existentes |
| ViewModels y casos de uso | Swift Testing con dependencias fake (protocolos); `async` tests; `confirmation` para eventos |
| UI | XCUITest (identificadores de accesibilidad estables, `accessibilityIdentifier`) |
| Snapshots | swift-snapshot-testing si el proyecto lo usa (claro/oscuro, Dynamic Type) |
| Rendimiento | `XCTMetric` / Instruments |
Ejecutar: `xcodebuild test -scheme <App> -destination 'platform=iOS Simulator,name=<dispositivo>'` (requiere macOS; en Windows/Linux reportar "no medido").

## Android (Kotlin / Compose)
| Tipo | Herramienta |
|---|---|
| Unitario | JUnit (4 o 5 según el proyecto) + kotlinx-coroutines-test (`runTest`) + Turbine (flows) + MockK o fakes |
| ViewModels | `MainDispatcherRule`, repositorios fake, aserciones sobre `uiState` |
| Room / DataStore | tests instrumentados o Robolectric con BD en memoria; `MigrationTestHelper` |
| UI Compose | `createComposeRule()` / `createAndroidComposeRule`, `onNodeWithText`/`onNodeWithContentDescription`, `testTag` solo si no hay semántica |
| UI Views | Espresso |
| Screenshots | Roborazzi o Paparazzi si el proyecto los usa; Compose Preview Screenshot Testing |
| Rendimiento | Macrobenchmark + Baseline Profiles |
| Accesibilidad | Accessibility Test Framework (checks en Espresso/Compose) |
Ejecutar: `./gradlew testDebugUnitTest` · `./gradlew connectedDebugAndroidTest` (requiere emulador/dispositivo).

## Qué probar siempre
- Reglas de negocio y mapeos (unitarios puros).
- ViewModels: transiciones de estado (carga → datos / vacío / error) y reintentos.
- Permisos: concedido, denegado, denegado permanentemente (con fakes del servicio de permisos).
- Hardware: interfaces con fakes (cámara, ubicación, BLE, sensores) — sin hardware real en tests unitarios.
- Flujos críticos E2E: login, flujo principal del negocio, offline/reintento.
- Accesibilidad: etiquetas presentes en elementos interactivos; textos grandes no rompen el layout (snapshots).
