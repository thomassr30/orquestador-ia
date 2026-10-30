# Módulos y vistas nativas (Nueva Arquitectura)

## Antes de escribir código nativo
1. ¿Existe una librería mantenida compatible con la Nueva Arquitectura? Úsala.
2. ¿El proyecto usa Expo o tiene `expo-modules-core`? Prefiere **Expo Modules API** (Swift/Kotlin con DSL simple, funciona también en apps CLI con `install-expo-modules`).
3. Si no: **Turbo Module** (lógica) o **Fabric Native Component** (vista), con Codegen.

## Turbo Module (resumen)
- Spec en TypeScript: `specs/NativeLector.ts` exportando una interfaz que extiende `TurboModule` y `TurboModuleRegistry.getEnforcing<Spec>('Lector')`.
- Configura `codegenConfig` en `package.json` (nombre, tipo `modules`, carpeta de specs, paquete Android).
- Implementación iOS (Objective-C++/Swift) y Android (Kotlin) generadas a partir de los headers de Codegen.
- Tipos soportados por Codegen: primitivos, objetos tipados, arrays, `Promise`, callbacks, eventos; desde 0.88 `ArrayBuffer` en Java TurboModules.
- Métodos síncronos solo si son muy rápidos; trabajo pesado → asíncrono con `Promise` en un hilo de fondo.

## Fabric Native Component
- Spec con `codegenNativeComponent<Props>('MiVista')`; props tipadas y eventos `DirectEventHandler`.
- Implementación con vistas nativas (UIView / Android View) o SwiftUI/Compose embebidos mediante el wrapper correspondiente.

## Buenas prácticas
- El código nativo sigue las skills `stack-ios`/`stack-android` (clean code, concurrencia, errores).
- Errores nativos → rechazar la `Promise` con código y mensaje claros; nunca crashear.
- Permisos solicitados desde JS con explicación previa al usuario (ver `platform.md`).
- Libera recursos (sensores, cámara, listeners) en `invalidate`/`onCatalystInstanceDestroy` equivalentes.
- Verifica la API exacta en la documentación de la versión de RN del proyecto antes de implementar.
