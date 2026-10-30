---
name: mobile-design
description: Diseño de interfaces mobile (iOS y Android, nativo o React Native/Expo) según Apple HIG y Material 3, con layout, tipografía, navegación, gestos, movimiento, haptics y accesibilidad. Usar al diseñar o implementar pantallas mobile, junto con design-quality.
---
# Diseño mobile

Carga también `design-quality`. Detalle por tema en `references/`:
- `references/ios-hig.md` — patrones y componentes iOS (incluye Liquid Glass en iOS 26+).
- `references/material3.md` — patrones y componentes Android (Material 3 / Expressive).
- `references/motion-haptics.md` — movimiento, transiciones y vibración háptica.

## Principios
1. **Respeta la plataforma.** En React Native/Expo, adapta por plataforma lo que el usuario percibe como "nativo": navegación (tabs abajo en iOS; en Android tabs o navigation bar M3), back (gesto de borde en iOS / back predictivo en Android), selectores de fecha, menús, alertas, hojas modales.
2. **Pulgar primero.** Acciones primarias en la zona inferior alcanzable; destructivas lejos de las frecuentes.
3. **Una tarea por pantalla.** Formularios largos → pasos o secciones; teclado correcto por campo (`keyboardType`, `textContentType`/`autofill`).
4. **Safe areas y edge-to-edge.** El contenido llega a los bordes; los controles respetan notch, Dynamic Island, barra de gestos y teclado. Android 15+ fuerza edge-to-edge y en targetSdk 36 no se puede desactivar.
5. **Feedback inmediato** (< 100 ms): estado presionado, háptico sutil en acciones confirmadas, optimistic UI cuando aplique.
6. **Offline y red lenta**: estados de carga con skeleton, reintentos, datos en caché; nunca pantallas en blanco.

## Medidas base
| | iOS | Android |
|---|---|---|
| Área táctil mínima | 44 × 44 pt | 48 × 48 dp |
| Márgenes laterales | 16–20 pt | 16 dp (24 en tablets) |
| Grilla | 4/8 pt | 4/8 dp |
| Texto cuerpo | 17 pt (Body) | 14–16 sp (bodyMedium/Large) |
| Tipografía del sistema | SF Pro (Dynamic Type) | Roboto/Google Sans Flex o la de marca (escala `sp`) |
| Íconos | SF Symbols | Material Symbols |

## Tipografía y escalado
- Usa estilos semánticos (iOS: `.largeTitle`…`.caption2`; M3: `display/headline/title/body/label`) en vez de tamaños fijos.
- Soporta tamaños de texto grandes: layouts que crecen en alto, sin truncar información crítica; prueba al 200%.
- Números en tablas/listas con cifras tabulares.

## Color y temas
- Modo claro y oscuro desde el inicio (colores semánticos, no hex sueltos).
- Android 12+: considerar color dinámico (Material You) si la marca lo permite; si no, paleta de marca generada como esquema M3 completo.
- Contraste AA mínimo; no comunicar estado solo con color.

## Navegación
- ≤ 5 destinos principales en la barra inferior; el resto en jerarquía.
- Tablets/plegables: layouts adaptativos (lista-detalle, navigation rail) — Android 16 ignora restricciones de orientación en pantallas ≥ 600 dp.
- Modales para tareas cortas y autocontenidas; hojas (sheets) con detents para contexto adicional.

## Estados obligatorios por pantalla
Carga · vacío (con acción sugerida) · error (mensaje humano + reintentar) · sin conexión · sin permisos (explicar y llevar a Ajustes) · éxito.

## Accesibilidad
- Etiquetas para lector de pantalla (VoiceOver/TalkBack) en íconos e imágenes significativas; agrupa elementos relacionados.
- Orden de foco lógico; acciones personalizadas para gestos complejos (swipe para borrar debe tener alternativa).
- "Reducir movimiento": reemplaza desplazamientos/escala por fundidos.
- Prueba con VoiceOver/TalkBack y texto al tamaño máximo antes de dar por terminado.
