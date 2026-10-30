# EAS (Build, Submit, Update)

## eas.json
- Perfiles `development` (dev client, distribución interna), `preview` (QA interna) y `production` (tiendas).
- `channel` por perfil para EAS Update; `autoIncrement` de versión de build en producción.
- Secretos de build como variables de entorno de EAS (no en el repo).

## Builds
`eas build --profile <perfil> --platform ios|android|all`. Builds locales: `--local` (requiere Xcode/Android SDK).

## Envío
`eas submit` con credenciales gestionadas por EAS o las de la institución. Revisa requisitos vigentes: Google Play exige targetSdk 36 (desde 31-ago-2026) y App Store exige Xcode 26+ / SDK iOS 26+.

## Actualizaciones OTA (EAS Update)
- Solo cambios JS/assets compatibles con el binario (`runtimeVersion` con política `fingerprint` o `appVersion`).
- Cambios nativos (nuevo módulo, permisos, SDK) → nuevo build en tienda.
- Publica primero en canal de preview; usa rollouts graduales y ten plan de rollback (`eas update:republish`).
