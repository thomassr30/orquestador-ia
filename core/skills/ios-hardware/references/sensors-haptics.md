# Sensores y hápticos (iOS)

## CoreMotion
- `CMMotionManager` **una sola instancia** en la app; verifica disponibilidad (`isDeviceMotionAvailable`).
- Prefiere `startDeviceMotionUpdates` (fusión de sensores: actitud, gravedad, aceleración del usuario) sobre datos crudos.
- Frecuencia mínima necesaria (`deviceMotionUpdateInterval`), entrega en `OperationQueue` propia, puenteada a `AsyncStream`; detén al salir.
- Podómetro/actividad: `CMPedometer`, `CMMotionActivityManager` (permiso `NSMotionUsageDescription`).
- Altímetro/barómetro: `CMAltimeter`.

## Hápticos
- SwiftUI: `.sensoryFeedback(_:trigger:)` (iOS 17+). UIKit: `UIImpactFeedbackGenerator`, `UISelectionFeedbackGenerator`, `UINotificationFeedbackGenerator` (llama `prepare()` antes de eventos esperados).
- Core Haptics (`CHHapticEngine`) solo para patrones personalizados; verifica `supportsHaptics`.
- Uso: confirmaciones, selección, límites alcanzados, errores. Nunca continuo.

## Otros
- Proximidad, orientación y brillo vía `UIDevice`/`UIScreen` solo si el caso lo requiere.
- Sensores no disponibles en simulador: fakes con datos grabados para tests y previews.
