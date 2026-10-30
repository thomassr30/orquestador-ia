# Biometría, Keystore y credenciales (Android)

## BiometricPrompt (androidx.biometric)
- Verifica con `BiometricManager.canAuthenticate(BIOMETRIC_STRONG or DEVICE_CREDENTIAL)` y maneja cada código (sin hardware, sin enrolar → llevar a enrolamiento).
- `BiometricPrompt.PromptInfo` con título/subtítulo claros; `setAllowedAuthenticators`.
- Para proteger datos: genera una clave en **Android Keystore** con `setUserAuthenticationRequired(true)` e `setInvalidatedByBiometricEnrollment(true)`, y usa `CryptoObject` en el prompt (la biometría desbloquea la clave, no es un booleano).
- Requiere `FragmentActivity` (o `AppCompatActivity`) como host.

## Keystore y cifrado
- Claves AES/GCM en Keystore (StrongBox si está disponible y se requiere); datos cifrados guardados en DataStore/archivos.
- Nada de secretos en `BuildConfig`, recursos ni código.
- Tink para criptografía de alto nivel si el proyecto lo usa.

## Credential Manager
- Login con **passkeys**, contraseñas guardadas y "Sign in with Google" mediante `androidx.credentials` (`CredentialManager.getCredential`). Requiere Digital Asset Links con el dominio del backend.
