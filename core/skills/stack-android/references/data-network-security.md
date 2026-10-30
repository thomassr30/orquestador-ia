# Datos, red y seguridad en Android

## Persistencia
| Necesidad | Opción |
|---|---|
| Preferencias / configuración | DataStore (Preferences o Proto); no SharedPreferences en código nuevo |
| Datos estructurados offline | Room (KSP), DAOs con `Flow` y `suspend`, migraciones versionadas y probadas (`MigrationTestHelper`) |
| Archivos | almacenamiento interno de la app; MediaStore/SAF para compartidos |
| Secretos | Android Keystore (claves no exportables) |

## Red
- Retrofit + OkHttp + kotlinx.serialization (o Ktor client si el proyecto lo usa).
- Interceptores: auth, logging solo en debug (sin datos sensibles), timeouts; `Authenticator` para refresh de token con exclusión mutua.
- Errores HTTP mapeados a errores de dominio; nada de excepciones de Retrofit fuera de la capa de datos.
- Network security config: solo HTTPS; pinning solo si la institución lo exige.

## Trabajo en segundo plano
- WorkManager para trabajo diferible garantizado (sincronización, subidas) con restricciones (red, carga) y backoff; `CoroutineWorker`.
- Foreground services solo cuando el usuario ve un proceso en curso; declarar `foregroundServiceType` (Android 14+).

## Seguridad
- Biometría y Credential Manager (ver `android-hardware`).
- No exportar componentes innecesarios (`android:exported="false"`); validar intents y deep links entrantes.
- `FLAG_SECURE` en pantallas con datos sensibles si la política lo exige.
- R8 activado en release; no registrar datos personales en Logcat.
- Play Integrity API si se requiere verificar integridad del dispositivo/app.
