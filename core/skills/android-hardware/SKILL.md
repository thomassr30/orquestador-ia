---
name: android-hardware
description: Uso nativo del hardware y servicios del sistema en Android con Kotlin (CameraX, Photo Picker, escaneo de códigos, ubicación, mapas, Bluetooth LE, NFC, sensores, vibración/hápticos, biometría, Keystore, Credential Manager, notificaciones, WorkManager, foreground services) con permisos en runtime correctos. Usar en tareas Android que usen hardware o capacidades del sistema.
---
# Android — hardware y capacidades del sistema

Lee SOLO la referencia de la capacidad que necesitas:
| Capacidad | Referencia |
|---|---|
| Cámara, fotos, video, escaneo de códigos/texto | `references/camera-media.md` |
| Ubicación, mapas, geocercas | `references/location.md` |
| Bluetooth LE, NFC | `references/connectivity.md` |
| Sensores, vibración/hápticos | `references/sensors-haptics.md` |
| Biometría, Keystore, passkeys | `references/security-biometrics.md` |
| Notificaciones, trabajo en segundo plano | `references/background-notifications.md` |

## Reglas comunes
1. **Permisos en runtime en contexto** con `rememberLauncherForActivityResult(RequestPermission/RequestMultiplePermissions)`; explicación previa propia; manejar "no volver a preguntar" (`shouldShowRequestPermissionRationale`) y ofrecer Ajustes.
2. **Declarar solo los permisos necesarios** en el manifest, con `maxSdkVersion`/`usesPermissionFlags` cuando aplique; `<uses-feature android:required="false">` si la función es opcional.
3. **Prefiere APIs sin permiso** cuando existen (Photo Picker, intents del sistema, Companion Device Manager).
4. **Encapsula** cada capacidad detrás de una interfaz en la capa de datos (`interface LectorCodigos`), expuesta como `Flow`/`suspend`, inyectada con Hilt; fakes para tests y previews.
5. **Ciclo de vida**: registrar/desregistrar según `Lifecycle` (`DisposableEffect`, `repeatOnLifecycle`); liberar cámara/sensores/escaneo al salir.
6. **Variabilidad de dispositivos**: comprueba disponibilidad (`packageManager.hasSystemFeature`, adaptadores nulos) y degrada con elegancia.
7. **Privacidad**: precisión y frecuencia mínimas; declara en el formulario de seguridad de datos de Google Play.
8. **Emulador**: cámara virtual, ubicación simulada; BLE/NFC/sensores reales requieren dispositivo.
