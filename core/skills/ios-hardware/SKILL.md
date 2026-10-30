---
name: ios-hardware
description: Uso nativo del hardware y servicios del sistema en iOS con Swift (cámara, fotos, escáner de códigos, ubicación, mapas, Bluetooth LE, NFC, sensores de movimiento, hápticos, biometría, Keychain, notificaciones, tareas en segundo plano) con permisos y privacidad correctos. Usar en tareas iOS que usen hardware o capacidades del sistema.
---
# iOS — hardware y capacidades del sistema

Lee SOLO la referencia de la capacidad que necesitas:
| Capacidad | Referencia |
|---|---|
| Cámara, fotos, video, escaneo de códigos/texto | `references/camera-media.md` |
| Ubicación, mapas, geocercas | `references/location.md` |
| Bluetooth LE, NFC | `references/connectivity.md` |
| Acelerómetro, giroscopio, podómetro, hápticos | `references/sensors-haptics.md` |
| Face ID/Touch ID, Keychain, cifrado | `references/security-biometrics.md` |
| Notificaciones, tareas en segundo plano | `references/background-notifications.md` |

## Reglas comunes
1. **Permisos en contexto**: solicitar cuando el usuario usa la función, con explicación previa propia; nunca al abrir la app.
2. **Textos de uso** en `Info.plist` (`NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`, `NSBluetoothAlwaysUsageDescription`, `NFCReaderUsageDescription`, `NSFaceIDUsageDescription`, `NSMotionUsageDescription`, `NSPhotoLibraryAddUsageDescription`…) específicos: qué se usa y para qué.
3. **Todos los estados de autorización**: no determinado, denegado, restringido, limitado (fotos), aproximado (ubicación). Si está denegado: explicar y ofrecer `UIApplication.openSettingsURLString`.
4. **Capabilities/entitlements** en el target (NFC, Background Modes, Push) — no los agregues sin indicarlo en el diseño del plan.
5. **Encapsula el framework** detrás de un protocolo (`protocol LectorCodigos`) para testear con fakes y no acoplar la UI.
6. **Ciclo de vida**: iniciar/detener sesiones (cámara, sensores, escaneo BLE) según visibilidad de la vista y estado de la app; liberar recursos.
7. **Privacidad**: mínimo de datos y precisión necesarios; declara en `PrivacyInfo.xcprivacy`; no enviar datos crudos de sensores/ubicación sin necesidad.
8. **Simulador**: cámara, NFC, BLE y varios sensores no están disponibles: prueba en dispositivo y deja fakes para previews/tests.
9. **Concurrencia**: puentea delegates/callbacks a `AsyncStream`/`async` (ver `stack-ios/references/concurrency.md`).
