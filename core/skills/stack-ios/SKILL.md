---
name: stack-ios
description: Desarrollo iOS nativo en Swift con clean code, arquitectura por capas, concurrencia segura (Swift 6), persistencia, red, seguridad y tooling. Usar cuando el stack detectado incluya ios/swift. Para UI cargar stack-swiftui; para cámara, sensores, ubicación, BLE, NFC, biometría cargar ios-hardware.
---
# iOS nativo — Swift

Referencias:
- `references/architecture.md` — capas, MVVM con @Observable, Clean Architecture, DI, navegación, modularización con SPM.
- `references/concurrency.md` — Swift 6, aislamiento a MainActor, actors, Sendable, tareas y cancelación.
- `references/data-network-security.md` — URLSession, Codable, SwiftData/Core Data, Keychain, CryptoKit, errores, logging.
- `references/tooling.md` — Xcode, SPM, configuraciones, SwiftLint/swift-format, CI, requisitos de App Store.
UI → `stack-swiftui`. Hardware → `ios-hardware`. Tests → `test-mobile`. Diseño → `mobile-design` + `design-quality`.

## Versiones
- Lee el deployment target, versión de Swift y Xcode del proyecto (`*.xcodeproj`, `Package.swift`, `.xcode-version`). No subas el deployment target sin aprobación.
- Referencia oct-2026: Xcode 27.1, Swift 6.4, SDK iOS 27. App Store exige compilar con Xcode 26+/SDK iOS 26+ y target mínimo iOS 13+. Con SDK iOS 27, las apps UIKit deben usar el ciclo de vida `UIScene`.
- APIs con `@available`: usa `if #available(iOS 18, *)` y alternativa para versiones menores soportadas.

## Clean code — reglas
1. **Capas y dependencias hacia adentro**: Presentación → Dominio ← Datos. El dominio no importa SwiftUI/UIKit ni frameworks de red/persistencia.
2. **Protocolos en los límites** (repositorios, servicios) e **inyección por inicializador**; nada de singletons globales mutables (salvo los del sistema, encapsulados).
3. **Tipos de valor por defecto** (`struct`, `enum`); `class` solo para identidad/estado compartido; `final` por defecto.
4. **Nombres según las Swift API Design Guidelines**: claros en el punto de uso, verbos para acciones, sustantivos para valores; sin abreviaturas.
5. **Funciones cortas, una responsabilidad**; `guard` para salidas tempranas; sin pirámides de `if let`.
6. **Errores tipados** (`enum` que conforma `Error`, `throws(MiError)` cuando aporta); nunca `try!`/`!` salvo invariantes documentadas; nada de errores silenciados.
7. **Inmutabilidad**: `let` por defecto; `private`/`fileprivate` por defecto; exponer lo mínimo.
8. **Sin lógica en vistas**: la vista solo renderiza estado y envía intenciones.
9. **Concurrencia estructurada** (`async/await`, `TaskGroup`), sin callbacks anidados ni `DispatchQueue` en código nuevo salvo interoperabilidad.
10. **SOLID** con criterio: abstracciones solo donde hay más de una implementación o se necesitan tests.
11. **Accesibilidad e internacionalización** desde el inicio: String Catalogs (`.xcstrings`), formatos con `FormatStyle`.
12. **Sin warnings** del compilador (incluidos los de concurrencia).

## Comandos
`xcodebuild -scheme <App> -destination 'platform=iOS Simulator,name=iPhone 17' build test` · `swift test` (paquetes SPM) · `swiftlint` · `swift format lint -r .`
Requiere macOS con Xcode: en Windows/Linux solo se puede editar y analizar código, no compilar ni testear iOS (repórtalo como "no medido").
