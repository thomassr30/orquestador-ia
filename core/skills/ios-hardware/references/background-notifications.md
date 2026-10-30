# Notificaciones y segundo plano (iOS)

## Notificaciones
- `UNUserNotificationCenter.requestAuthorization(options: [.alert, .sound, .badge])` en contexto (tras una acción que la justifique). Considera autorización provisional.
- Push: capability Push Notifications, registro `registerForRemoteNotifications`, token al backend; APNs vía el proveedor del proyecto (FCM/otro).
- Categorías y acciones para responder sin abrir la app; `threadIdentifier` para agrupar; `interruptionLevel` adecuado (no abusar de time-sensitive).
- Manejar apertura desde notificación como deep link (Router).
- Live Activities (ActivityKit) para procesos en curso visibles en pantalla bloqueada/Dynamic Island, si el caso lo justifica.

## Segundo plano
- `BGTaskScheduler`: `BGAppRefreshTask` (actualizaciones cortas) y `BGProcessingTask` (trabajo largo, puede requerir carga/red). Registrar identificadores en `Info.plist` (`BGTaskSchedulerPermittedIdentifiers`) y en el arranque.
- `URLSession` de background para transferencias grandes.
- Tareas: siempre con `expirationHandler` / cancelación; trabajo idempotente.
- Background Modes solo los necesarios (audio, ubicación, BLE, fetch, remote notifications); cada uno es revisado por App Store.
