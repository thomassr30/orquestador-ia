---
name: stack-tailwind
description: Convenciones para estilos con Tailwind CSS v3 o v4. Usar cuando el stack detectado incluya tailwind.
---
# Tailwind CSS

## Detectar versión
- v3: existe `tailwind.config.js|ts` con `content` y `theme.extend`.
- v4: configuración CSS-first (`@import "tailwindcss";` y `@theme { ... }` en CSS). No agregues `tailwind.config` en v4 salvo que ya exista.

## Reglas
- Usa los tokens del tema (colores, espaciados, fuentes); evita valores arbitrarios (`w-[37px]`) si existe un token equivalente.
- Nuevos tokens: en `theme.extend` (v3) o `@theme` (v4), no hardcodeados en componentes.
- Componentes repetidos → extraer componente (Angular/React), no `@apply` masivo. `@apply` solo para estilos base puntuales.
- Responsive mobile-first (`sm:`, `md:`, `lg:`); estados `hover:`, `focus-visible:`, `disabled:`; modo oscuro según la estrategia existente (`dark:`).
- Accesibilidad: no quitar outline sin `focus-visible:ring-*` equivalente; usa `sr-only` para textos de lector de pantalla.
- Si existe `prettier-plugin-tailwindcss`, respeta el orden de clases que genera.
- Clases dinámicas: nunca construir nombres por concatenación (`bg-${color}-500`); usar mapas de clases completas.
