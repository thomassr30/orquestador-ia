---
name: design-harden
description: Robustece la UI para cuando los datos, la conexión o las acciones fallan — datos extremos, carga y errores con recuperación, idioma y formatos, acciones repetidas o en conflicto, accesibilidad y alternativas. Usar al implementar formularios, listados y flujos críticos, o cuando se pida endurecer una pantalla.
---
# Robustecer la interfaz

## Cobertura
1. **Datos extremos**: nombres y textos muy largos (truncado con texto completo accesible), valores vacíos o nulos, números grandes, listas muy largas (paginación/virtualización), 0 y 1 elemento.
2. **Carga y errores**: explicar qué pasó y cómo seguir; **conservar lo ingresado** (un guardado fallido no borra el formulario); reintentar; timeouts; sin conexión.
3. **Idioma y formatos**: tildes y ñ, expansión de texto (+30%), formatos locales de fecha, número y moneda (es-CL por defecto si el proyecto no define otro), zonas horarias; RTL solo si el producto lo requiere.
4. **Acciones repetidas o en conflicto**: doble clic/envío (deshabilitar mientras procesa, idempotencia), peticiones superpuestas (cancelar la anterior), sesión expirada a mitad de flujo, permisos que cambian, edición concurrente.
5. **Accesibilidad y alternativas**: todo control alcanzable por teclado, cambios de estado anunciados, imágenes con alternativa, funcionalidad sin depender de una animación.

Ejemplo: al fallar "Guardar", el formulario mantiene los datos, muestra el error junto al campo o arriba, y el botón vuelve a estar disponible para reintentar.
