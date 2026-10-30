# Bluetooth LE y NFC (Android)

## Bluetooth LE
- Permisos Android 12+: `BLUETOOTH_SCAN` (con `neverForLocation` si no se deriva ubicación), `BLUETOOTH_CONNECT`; `BLUETOOTH_ADVERTISE` si anuncia. Versiones antiguas: ubicación (`maxSdkVersion` en los legacy).
- `BluetoothManager.adapter` puede ser nulo; pide activar con `ACTION_REQUEST_ENABLE`.
- Escaneo con filtros (`ScanFilter` por UUID de servicio) y tiempo límite; nunca escaneo indefinido.
- GATT: `connectGatt(context, false, callback, TRANSPORT_LE)`; **cola de operaciones** (una a la vez); `requestMtu`; notificaciones con descriptor CCCD; cerrar con `gatt.close()`.
- Encapsula en una clase con `callbackFlow`/`suspend`, reconexión con backoff y timeouts.
- **Companion Device Manager** para emparejar dispositivos con UI del sistema y menos permisos.
- Uso prolongado en segundo plano: foreground service tipo `connectedDevice`.

## NFC
- `<uses-permission android:name="android.permission.NFC"/>` y `<uses-feature android:name="android.hardware.nfc" android:required="false"/>`.
- `NfcAdapter.getDefaultAdapter(context)` puede ser nulo o estar desactivado (llevar a ajustes).
- Lectura en primer plano: **reader mode** (`enableReaderMode` con flags de tecnologías) en la Activity visible; desactivar en `onPause`.
- NDEF con `Ndef`/`NdefMessage`; tecnologías específicas con `IsoDep`, `MifareClassic`, `NfcA`…; operaciones de I/O fuera del hilo principal.
- Intents filtrados (`ACTION_NDEF_DISCOVERED`) solo si la app debe abrirse al acercar un tag.
