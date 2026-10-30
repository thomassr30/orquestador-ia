---
name: design-polish
description: Pasada final de calidad sobre UI cuya dirección ya es correcta — función y estados, interacciones, detalles visuales y consistencia con el sistema — corrigiendo primero lo bloqueante. Usar al terminar de implementar UI o para corregir hallazgos de design-critique/design-audit.
---
# Pulido final

Carga `design-quality`. Conserva el propósito y la identidad visual: **no rediseñar**. Si existe la revisión de diseño, empieza por sus P0/P1.

## Cuatro áreas
1. **Función y estados**: defectos, carga, vacío, error, éxito, sin permisos; datos largos.
2. **Interacción**: foco, teclado, áreas táctiles, hover como mejora, transiciones con propósito, feedback.
3. **Detalle visual**: espaciado del sistema, jerarquía tipográfica, alineaciones exactas, íconos del mismo set/tamaño, responsive en ancho mínimo y máximo.
4. **Consistencia**: mismos patrones que pantallas vecinas; tokens en vez de valores sueltos; textos según `ux-writing`.

## Comprobaciones antes de devolver
Ejecuta la tarea principal · revisa ancho mínimo · fuerza carga/vacío/error · revisa el diff (sin cambios fuera de alcance) · anti-patrones de `design-quality`.
