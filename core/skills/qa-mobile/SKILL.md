---
name: qa-mobile
description: Ejecución de QA funcional en apps mobile (React Native/Expo, iOS, Android) con Maestro o el framework E2E del proyecto, emuladores/simuladores y checklist de condiciones reales (interrupciones, red, permisos, rotación, texto grande, modo oscuro). Usar al probar funcionalmente una app mobile.
---
# QA funcional mobile

Carga `qa-acceptance` (proceso). Tests automatizados de la plataforma: `test-mobile`.

## Cómo ejecutar
1. **Automatizado si es posible**: flujos Maestro (`maestro test flows/<caso>.yaml`) o el E2E del proyecto (Detox, XCUITest, Compose UI test) en emulador/simulador. Capturas de cada paso clave.
2. **Si no se puede ejecutar** (sin emulador, sin macOS para iOS, build no disponible): generar el **checklist manual** del caso para que el usuario lo ejecute y registre resultados; marcar esos casos como "pendiente manual", nunca como aprobados.
3. Build a probar identificada (versión/build number, canal: dev client, preview, TestFlight, prueba interna de Play).

## Matriz mínima de dispositivos
- iOS: un modelo pequeño y uno grande con la versión mínima soportada y la actual.
- Android: gama baja/pantalla pequeña, gama media actual, y tablet o plegable si la app los soporta (Android 16+ ignora bloqueo de orientación en ≥ 600 dp).

## Condiciones reales (checklist por cambio)
- Interrupciones: llamada/notificación, enviar a segundo plano y volver, bloquear pantalla.
- Red: sin conexión, red lenta, cambio wifi ↔ datos durante una operación.
- Permisos: concedido, denegado, denegado permanentemente, revocado desde Ajustes.
- Rotación y pantalla dividida; teclado tapando campos.
- Texto al tamaño máximo, modo oscuro, lector de pantalla (VoiceOver/TalkBack) en el flujo principal.
- Back del sistema (Android, predictivo) y gesto de volver (iOS) a mitad de flujo.
- Actualización desde la versión anterior (datos locales/migraciones) cuando aplique.
