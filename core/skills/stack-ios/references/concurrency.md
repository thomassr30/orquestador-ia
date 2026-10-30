# Concurrencia en Swift 6

## Modo del proyecto
- Revisa en el target: modo de lenguaje Swift 6 (comprobación estricta) y si usa **aislamiento por defecto a MainActor** (Swift 6.2+, "Approachable Concurrency": `-default-isolation MainActor`). Respeta la configuración existente.
- Con aislamiento por defecto a MainActor, marca explícitamente con `@concurrent` / `nonisolated` el trabajo que debe salir del hilo principal.

## Reglas
- UI y ViewModels en `@MainActor`.
- Estado mutable compartido → `actor`. Tipos que cruzan límites de aislamiento → `Sendable` (structs inmutables, enums, clases `final` inmutables).
- Nada de `@unchecked Sendable` ni `nonisolated(unsafe)` sin justificación documentada.
- Trabajo pesado (parseo grande, imágenes, cifrado) fuera del MainActor (`@concurrent` func o actor dedicado).
- `Task {}` desde la vista: usa `.task { await vm.cargar() }` (se cancela solo al desaparecer la vista); `.task(id:)` para recargar al cambiar un valor.
- **Cancelación**: comprueba `Task.isCancelled` / `try Task.checkCancellation()` en bucles largos; propaga `CancellationError` sin mostrarlo como error al usuario.
- Paralelismo: `async let` para pocas tareas fijas; `withThrowingTaskGroup` para colecciones.
- Streams: `AsyncStream`/`AsyncSequence` para eventos (sensores, ubicación); `Observations` (Swift 6.2+) para observar cambios de modelos `@Observable` fuera de la UI.
- Interoperar con APIs de callbacks: `withCheckedThrowingContinuation` (reanudar exactamente una vez).
- Evita `DispatchQueue.main.async` en código nuevo; usa `await MainActor.run {}` solo si es imprescindible.
