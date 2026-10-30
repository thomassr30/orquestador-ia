# Notificaciones y segundo plano (Android)

## Notificaciones
- Android 13+: permiso runtime `POST_NOTIFICATIONS` pedido en contexto.
- **Canales** (`NotificationChannel`) por tipo, con importancia adecuada; creados al iniciar la app.
- `NotificationCompat.Builder` con ícono monocromo, `PendingIntent` inmutable (`FLAG_IMMUTABLE`) que abre el deep link correcto, acciones y estilo (BigText, Inbox, Progress).
- Push con FCM (`FirebaseMessagingService`): token al backend, mensajes de datos manejados de forma idempotente.
- Notificaciones de progreso de larga duración según APIs del sistema disponibles en la versión objetivo.

## Segundo plano
- **WorkManager** para trabajo diferible y garantizado (`CoroutineWorker`, `Constraints`, `BackoffPolicy`, trabajos únicos con `enqueueUniqueWork`).
- **Foreground service** solo para tareas visibles iniciadas por el usuario; Android 14+ exige `foregroundServiceType` (`location`, `camera`, `connectedDevice`, `dataSync`, `mediaPlayback`…) y su permiso específico; notificación obligatoria.
- Alarmas exactas restringidas (`SCHEDULE_EXACT_ALARM`/`USE_EXACT_ALARM` solo para casos permitidos); prefiere WorkManager o alarmas inexactas.
- Respeta Doze y App Standby; no intentes evadir optimizaciones de batería.
