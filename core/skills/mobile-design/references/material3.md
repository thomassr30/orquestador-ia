# Android — Material 3 (resumen operativo)

## Estructura
- **Navigation bar** inferior (3–5 destinos) en teléfonos; **navigation rail** en tablets/plegables; **drawer** solo para muchos destinos.
- **Top app bar** (small/center/medium/large) con comportamiento de scroll.
- **FAB** para la acción principal de la pantalla (una sola).
- **Bottom sheets** (modal o estándar), **dialogs** solo para decisiones que bloquean.
- Back predictivo: la animación previa al gesto de atrás debe mostrar el destino real (habilitado por defecto con targetSdk 36).

## Componentes
Cards (elevated/filled/outlined) con propósito, Chips (filtro/entrada/sugerencia), Segmented buttons, Search bar/view, Snackbar para feedback (con acción "Deshacer"), Date/Time pickers M3, Progress indicators, Badges.

## Color y forma
- Esquema M3 completo (primary, secondary, tertiary, surface containers, error) generado desde el color de marca o con color dinámico.
- Superficies con tonos (`surfaceContainerLow…Highest`) en lugar de sombras fuertes.
- Escala de formas consistente (extra small → extra large); no redondear todo igual.

## Material 3 Expressive
- Movimiento basado en física (springs), formas más variadas y énfasis tipográfico para jerarquía. Úsalo si la versión de material3 del proyecto lo soporta; no mezcles con estilos de versiones anteriores.

## Adaptativo
- Diseña por **window size class** (compact/medium/expanded), no por dispositivo.
- Lista-detalle y paneles de soporte en pantallas expandidas; maneja plegado (postura de mesa) si aplica.
- Android 16+ ignora bloqueo de orientación/aspect ratio en pantallas ≥ 600 dp: la UI debe funcionar en cualquier tamaño.

## Edge-to-edge
- Dibuja detrás de barras de estado y navegación; aplica insets al contenido y a los elementos interactivos (no al fondo).
- Barra de navegación por gestos transparente; contraste automático para 3 botones.
