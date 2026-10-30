# Arquitectura iOS

## Capas
```
App/                     # @main, composición de dependencias (Composition Root), escenas
Features/
  Muestras/
    Presentation/        # Views SwiftUI + ViewModels (@Observable, @MainActor)
    Domain/              # Entidades, casos de uso, protocolos de repositorio
    Data/                # Implementaciones de repositorio, DTOs, mappers, data sources
Core/                    # Networking, Persistence, DesignSystem, Utilities (paquetes SPM)
```
- Proyectos medianos/grandes: cada feature y `Core/*` como **paquete SPM local** (módulos con límites explícitos, compilación incremental más rápida).

## MVVM con Observation (iOS 17+)
```swift
@MainActor @Observable
final class MuestrasViewModel {
    private(set) var state: ViewState<[Muestra]> = .idle
    private let obtenerMuestras: ObtenerMuestrasUseCase
    init(obtenerMuestras: ObtenerMuestrasUseCase) { self.obtenerMuestras = obtenerMuestras }

    func cargar() async {
        state = .loading
        do { state = .loaded(try await obtenerMuestras.ejecutar()) }
        catch { state = .failed(MensajeError(error)) }
    }
}
enum ViewState<T> { case idle, loading, loaded(T), failed(MensajeError) }
```
- El ViewModel expone **estado** e **intenciones** (métodos); no expone dependencias.
- Para iOS < 17: `ObservableObject` + `@Published`.
- TCA (The Composable Architecture) solo si el proyecto ya la usa; no la introduzcas sin decisión explícita.

## Casos de uso y repositorios
```swift
protocol MuestrasRepository: Sendable { func listar() async throws -> [Muestra] }
struct ObtenerMuestrasUseCase: Sendable {
    let repo: MuestrasRepository
    func ejecutar() async throws -> [Muestra] { try await repo.listar().sorted { $0.fecha > $1.fecha } }
}
```
Los casos de uso valen la pena cuando hay reglas de negocio; si solo delegan, el ViewModel puede usar el repositorio directamente.

## Inyección de dependencias
- Composition Root en `App`: construye implementaciones reales y las pasa por inicializador.
- En SwiftUI, valores de entorno (`@Environment` con `@Entry`) para dependencias transversales; o un contenedor ligero (Factory) si el proyecto ya lo usa.
- Tests: implementaciones fake de los protocolos.

## Navegación
- `NavigationStack` con ruta tipada (`enum Ruta: Hashable`) y `navigationDestination(for:)`; un **Router** `@Observable` por flujo si hay deep links o navegación programática.
- Coordinadores solo en apps UIKit o mixtas.

## UIKit
- En apps existentes UIKit: MVVM + coordinadores; nuevas pantallas pueden ser SwiftUI vía `UIHostingController`.
- Ciclo de vida con `UISceneDelegate` (obligatorio desde SDK iOS 27).
