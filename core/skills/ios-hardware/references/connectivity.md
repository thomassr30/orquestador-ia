# Bluetooth LE y NFC (iOS)

## Bluetooth LE (CoreBluetooth)
- Rol central: `CBCentralManager` → esperar `.poweredOn` → `scanForPeripherals(withServices: [UUIDs])` (filtrar por servicio, nunca escanear todo indefinidamente) → `connect` → descubrir servicios/características → leer/escribir/suscribirse (`setNotifyValue`).
- Encapsula en un `actor`/manager con API `async` y `AsyncStream` de eventos; maneja desconexiones, reconexión con backoff y timeouts.
- Permiso `NSBluetoothAlwaysUsageDescription`; background: modo "Uses Bluetooth LE accessories" solo si es necesario; restauración de estado (`CBCentralManagerOptionRestoreIdentifierKey`) para sesiones largas.
- AccessorySetupKit (iOS 18+) para emparejar accesorios con una experiencia del sistema y permisos acotados, si el caso lo permite.
- No disponible en simulador: probar con dispositivo y periférico real o simulado.

## NFC (CoreNFC)
- Requiere capability "Near Field Communication Tag Reading" + `NFCReaderUsageDescription` (+ identificadores ISO7816/FeliCa en Info.plist si aplica).
- Lectura NDEF: `NFCNDEFReaderSession`; tags específicos (ISO 7816, MIFARE, ISO 15693): `NFCTagReaderSession`.
- Verifica `readingAvailable`; mensajes de la hoja del sistema (`alertMessage`) claros; invalidar la sesión al terminar o en error.
- Escritura de tags NDEF soportada; valida tamaño y bloqueo del tag.
- Lectura en background de tags NDEF con Universal Links si el caso lo requiere.
