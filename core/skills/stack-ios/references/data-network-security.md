# Datos, red y seguridad en iOS

## Red
- Cliente propio sobre `URLSession` con `async/await`: `Endpoint` tipado (método, ruta, query, body), decodificación `Codable` con `JSONDecoder` configurado (fechas ISO 8601, `keyDecodingStrategy` según API).
- Errores mapeados a un `enum APIError` (sin conexión, timeout, 401, 4xx con mensaje, 5xx, decodificación).
- Auth: token en Keychain; refresh centralizado con un `actor` para evitar refrescos concurrentes.
- ATS activo (solo HTTPS); no agregar excepciones sin aprobación. Certificate pinning solo si la institución lo exige.
- Reintentos con backoff solo para operaciones idempotentes; `URLSession` en background para descargas grandes.

## Persistencia
| Necesidad | Opción |
|---|---|
| Preferencias simples | `UserDefaults` / `@AppStorage` (nunca datos sensibles) |
| Modelo local (iOS 17+) | SwiftData (`@Model`, `ModelContainer`, `@Query`) |
| Proyectos existentes o necesidades avanzadas | Core Data |
| Secretos, tokens | Keychain (`kSecAttrAccessibleWhenUnlockedThisDeviceOnly`) |
| Archivos | `FileManager` en Application Support / Caches con protección de datos |
- Persistencia detrás de un repositorio (el dominio no conoce SwiftData).
- Migraciones de esquema versionadas y probadas.

## Seguridad
- Biometría con LocalAuthentication (ver `ios-hardware`); cifrado con CryptoKit; claves en Secure Enclave si aplica.
- No registrar datos personales en logs; `Logger` (os) con niveles y `privacy: .private` para valores sensibles.
- Privacy manifest (`PrivacyInfo.xcprivacy`) con APIs de "required reason" y datos recolectados; actualízalo al agregar SDKs.
- Validar deep links y datos de extensiones/portapapeles como entrada no confiable.

## Errores y logging
- Mensajes al usuario humanos y accionables; detalle técnico al log.
- `Logger(subsystem: Bundle.main.bundleIdentifier!, category: "Muestras")` por módulo.
