---
name: design-quality
description: Núcleo de diseño de interfaces web y mobile con criterio profesional y sin rasgos genéricos "de IA" — contexto de producto y sistema visual, modo de la pantalla (persuadir, operar, leer, experimentar), dirección, reglas por área (tipografía, color, espacio, movimiento, interacción, adaptación, simplicidad, primer uso) y catálogo de anti-patrones. Usar SIEMPRE antes de crear, modificar o revisar cualquier UI.
---
# Calidad de diseño

## 1. Contexto primero (siempre)
1. Lee `.sdd/memoria/temas/producto.md` (usuarios, propósito, plataforma, restricciones) y `.sdd/memoria/temas/diseno.md` (sistema visual: tokens y reglas). Si el proyecto tiene `PRODUCT.md`/`DESIGN.md` en la raíz, `.agents/context/` o `docs/`, léelos también.
2. Si faltan → skill `design-context` (los deriva del código y confirma lo esencial con el usuario).
3. **El sistema existente manda**: tokens, componentes y librería del proyecto. No inventes estilos paralelos. Si el código contradice el registro y es más reciente, actualiza el registro.

## 2. Modo de la pantalla (decide antes de diseñar)
| Modo | Trabajo del usuario | Prioriza |
|---|---|---|
| **Persuadir** | decidir y actuar (landing, precios, campañas) | mensaje claro, un CTA principal, jerarquía hacia la decisión, carácter de marca |
| **Operar** | completar una tarea (sistemas, dashboards, formularios, configuración) | eficiencia, escaneo, densidad adecuada, estados, color solo con significado, movimiento mínimo |
| **Leer** | entender (documentación, ayuda, informes) | tipografía, largo de línea, jerarquía de títulos, decoración mínima |
| **Experimentar** | explorar el contenido (portafolio, galería, showcase) | el contenido es protagonista; la interfaz es marco; se permite más audacia |
La mayoría de los sistemas institucionales son **Operar**.

## 3. Proceso según la tarea
| Tarea | Skill |
|---|---|
| Pantalla o flujo nuevo / rediseño | `design-shape` (brief y dirección) → implementar → `design-polish` |
| Revisar calidad visual y de experiencia | `design-critique` |
| Revisar calidad técnica de UI (a11y, rendimiento, temas, responsive) | `design-audit` |
| Estados de error, datos extremos, i18n, acciones repetidas | `design-harden` |
| Textos de interfaz | `ux-writing` |
| Mobile | además `mobile-design` |

## 4. Reglas por área (lee solo la referencia que aplique)
`references/tipografia.md` · `references/color.md` · `references/espacio.md` · `references/movimiento.md` · `references/interaccion.md` · `references/adaptar.md` · `references/simplificar.md` · `references/primer-uso.md` · `references/anti-patrones.md`

## 5. Checklist mínimo de entrega (incluir resultado en el reporte)
- [ ] Contexto y modo definidos; usa el sistema del proyecto (sin valores mágicos fuera de tokens).
- [ ] El elemento/acción principal se identifica en 3 segundos.
- [ ] Ningún anti-patrón de `references/anti-patrones.md` (o justificado por el sistema de diseño).
- [ ] Estados: carga, vacío, error, éxito, sin permisos; datos largos y extremos.
- [ ] Contraste AA, foco visible, áreas táctiles ≥ 44 px/pt (48 dp), texto escalable, orden de títulos.
- [ ] Probado en el ancho más chico y el más grande soportados (y tema oscuro si existe).
