# Ubicación y mapas (Android)

- `FusedLocationProviderClient` (Google Play Services): `getCurrentLocation` para una lectura; `requestLocationUpdates` con `LocationRequest.Builder(Priority…, intervalo)` puenteado a `callbackFlow`.
- Permisos: `ACCESS_COARSE_LOCATION` y/o `ACCESS_FINE_LOCATION` (el usuario puede conceder solo aproximada: soportarlo). `ACCESS_BACKGROUND_LOCATION` solo si es imprescindible, pedido por separado y con revisión de Google Play.
- Prioridad/precisión mínima necesaria; detener actualizaciones al salir.
- Seguimiento continuo visible: foreground service tipo `location`.
- Geocercas: `GeofencingClient` (límite de geocercas y precisión ~100 m).
- Comprobar ajustes de ubicación con `SettingsClient` y pedir activarlos.
- Mapas: Maps Compose (`GoogleMap`, `Marker`, `rememberCameraPositionState`) u otro proveedor si la institución lo define.
- Dispositivos sin Google Play Services: `LocationManager` como alternativa si el proyecto lo requiere.
