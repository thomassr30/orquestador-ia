# Ubicación y mapas (iOS)

- Pide **"cuando se usa"** salvo necesidad real de "siempre" (requiere justificar y explicar en la app; revisión de App Store estricta).
- Precisión: reducida si basta (`CLAccuracyAuthorization.reducedAccuracy`); solicita precisa temporalmente con `requestTemporaryFullAccuracyAuthorization(withPurposeKey:)`.
- API moderna (iOS 17+): `CLLocationUpdate.liveUpdates()` (AsyncSequence) para actualizaciones; iOS 18+: `CLServiceSession` para declarar la intención de autorización. Para versiones anteriores: `CLLocationManager` + delegate puenteado a `AsyncStream`.
- Geocercas/monitoreo (iOS 17+): `CLMonitor` con condiciones circulares.
- Ahorro de batería: detén actualizaciones cuando no se necesitan; usa cambios significativos o visitas para seguimiento prolongado.
- Background: modo "Location updates" solo si es imprescindible; indicador azul visible para el usuario.
- Mapas: MapKit para SwiftUI (`Map` con `Marker`, `Annotation`, `MapCameraPosition`, `MapUserLocationButton`); búsquedas con `MKLocalSearch`; rutas con `MKDirections`.
- Geocodificación: `CLGeocoder` (limitado por tasa; cachear resultados).
- Simulador: ubicaciones simuladas (GPX) para pruebas.
