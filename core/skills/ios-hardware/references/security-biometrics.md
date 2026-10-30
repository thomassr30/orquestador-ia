# Biometría, Keychain y cifrado (iOS)

## Face ID / Touch ID (LocalAuthentication)
```swift
let ctx = LAContext()
var err: NSError?
guard ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &err) else { /* fallback a código/contraseña */ }
let ok = try await ctx.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: "Confirma para ver los resultados")
```
- `NSFaceIDUsageDescription` obligatorio.
- `.deviceOwnerAuthentication` permite caer al código del dispositivo.
- La biometría **desbloquea un secreto** guardado en Keychain con control de acceso (`SecAccessControlCreateWithFlags` + `.biometryCurrentSet`), no es un booleano de "login correcto" para el servidor.
- Invalida si cambia el conjunto biométrico (`evaluatedPolicyDomainState`) cuando el riesgo lo amerita.

## Keychain
- Wrapper propio pequeño o librería del proyecto; `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` para tokens; `kSecAttrAccessGroup` solo si se comparte con extensiones.
- Nunca tokens en `UserDefaults`, archivos planos ni logs.

## Cifrado
- CryptoKit: `AES.GCM`/`ChaChaPoly` para datos, `SHA256` para hashes, `P256` firmas; claves en Secure Enclave (`SecureEnclave.P256`) cuando se requiere no exportables.
- Protección de datos de archivos (`.completeFileProtection`) para documentos sensibles.

## Passkeys
- AuthenticationServices (`ASAuthorizationPlatformPublicKeyCredentialProvider`) si el backend soporta WebAuthn; requiere dominio asociado (`webcredentials:`).
