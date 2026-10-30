# Estado y navegación en SwiftUI

## Flujo de datos
| Caso | Herramienta |
|---|---|
| Estado local simple de la vista | `@State private var` |
| Modelo/VM propiedad de la vista | `@State private var vm = MiVM(...)` (con @Observable) |
| Editar un modelo recibido | `@Bindable var modelo` |
| Pasar edición de un valor al hijo | `Binding` (`$valor`) |
| Dependencias o valores globales | `@Environment(MiServicio.self)` / `@Entry` en `EnvironmentValues` |
| Preferencias persistidas | `@AppStorage` (no sensibles) |
| Modelos SwiftData | `@Query`, `@Environment(\.modelContext)` |
- `@Observable` reemplaza `ObservableObject/@Published/@StateObject/@ObservedObject` en iOS 17+.
- Inyecta el ViewModel desde el padre o la composición; para tests/previews, inicializa con dependencias fake.

## Navegación
```swift
enum Ruta: Hashable { case detalle(id: Muestra.ID), editar(id: Muestra.ID) }
@MainActor @Observable final class Router { var path: [Ruta] = [] }

NavigationStack(path: $router.path) {
    ListaMuestrasView()
        .navigationDestination(for: Ruta.self) { ruta in
            switch ruta {
            case .detalle(let id): DetalleMuestraView(id: id)
            case .editar(let id):  EditarMuestraView(id: id)
            }
        }
}
```
- Pasa IDs, no modelos grandes. Deep links → el Router traduce URL a ruta.
- Sheets: `.sheet(item:)` con un `Identifiable`; `presentationDetents([.medium, .large])`; confirmaciones con `.confirmationDialog`/`.alert`.
- Tabs: `TabView` con la API de tabs de la versión del proyecto (en iOS 18+ `Tab`), con estado de pestaña seleccionado.

## Formularios
- `Form` + `Section`; validación en el ViewModel; errores bajo el campo con texto y color; `.textContentType`, `.keyboardType`, `.submitLabel`, `@FocusState` para avanzar entre campos.
- Botón primario deshabilitado hasta que el formulario sea válido; estado "guardando" visible.
