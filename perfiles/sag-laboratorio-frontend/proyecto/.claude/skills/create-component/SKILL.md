---
name: create-component
description: Crea o modifica componentes React de UI siguiendo el design system SAG del proyecto (componentes de @/global/ui, componentes propios de ui/custom, cn, tokens de Tailwind 4, accesibilidad, 'use client'). Usar cuando se pida crear un componente, una tabla, un modal, un badge, un aviso o cualquier pieza de interfaz.
---

# Crear un componente

Referencia: `README.md` → "Estructura", "Convenciones de nombres" e "Imports".

## 1. Antes de crear, reutiliza

Busca primero si ya existe:

| Necesidad | Dónde |
|---|---|
| Button, Input, Textarea, Select, Checkbox, Switch, Badge, Card, Dialog, DropdownMenu, Table, Tooltip, Skeleton, Breadcrumb, Alert, Empty, Label | `@/global/ui` (kit SAG) |
| Tabla con orden y paginación | `DataTable` en `@/global/ui/sag/DataTable` |
| Campo con label, requerido, error y ayuda | `Field` en `@/global/ui/custom/form` |
| Selects con búsqueda, fechas, números | `SearchableSelect`, `SearchableMultiSelect`, `DatePicker`, `DateRangePicker`, `NumericInput` |
| Avisos y feedback | `StatusAlert`, `NoticeModal`, `RetryNotice`, `AccessNotice` en `@/global/ui/custom/feedback` |
| Wizard | `WizardStepper`, `WizardFooter` en `@/global/ui/custom/wizard` |
| Íconos | `lucide-react` |

**`src/global/ui/sag/` no se modifica**: es copia de la plantilla SAG. Si falta algo genérico, va
en `src/global/ui/custom/<area>/` y se exporta en su `index.ts`. Si es del negocio, va en
`src/modules/<modulo>/components/<subarea>/`.

## 2. Estructura del archivo

```tsx
'use client' // solo si usa estado, efectos, eventos, hooks de cliente o store

import { useState } from 'react'
import { Button } from '@/global/ui'
import { StatusAlert } from '@/global/ui/custom/feedback'
import { cn } from '@/global/utils'
import type { SolicitudFila } from '@/modules/recepcion-muestras/types'

interface SolicitudResumenProps {
  solicitud: SolicitudFila
  className?: string
  onSeleccionar: (id: number) => void
}

/** Qué muestra y cuándo se usa (una o dos líneas, en español). */
export function SolicitudResumen({ solicitud, className, onSeleccionar }: SolicitudResumenProps) {
  // ...
}
```

- Un componente por archivo, nombre PascalCase igual al archivo, **export nombrado** (no default,
  salvo `page.tsx`/`layout.tsx` de Next).
- Props en `interface <Componente>Props` en el mismo archivo.
- Nombre: técnico en inglés + dominio en español (`EstadoBadge`, `SolicitudesFilters`, `QrCameraViewer`).
- Server Component por defecto; `'use client'` solo cuando hace falta. Las páginas de `src/app`
  quedan como server y montan componentes cliente del módulo.
- Lógica no visual (mapeos, formatos, cálculos) en `utils/` del módulo; estado y datos en hooks.

## 3. Estilos

- Tailwind 4 con los tokens del kit (`bg-primary`, `text-muted-foreground`, `border-border`,
  `text-destructive`) y las variables de estado (`var(--color-success-bg)`, `--color-info-*`,
  `--color-warning-*`). Tokens en `src/global/ui/sag/styles/sag-tokens.css` y `src/app/globals.css`.
- No usar colores hex sueltos si existe token.
- Combinar clases con `cn()` de `@/global/utils` y aceptar `className` para extender.
- Variantes de un componente con un mapa tipado (`Record<Variante, {...}>`, ver `StatusAlert`).
  Para variantes del kit, usar las que ya expone (`variant` de `Button`, `Badge`, `Alert`).
- Responsive mobile-first (`md:`, `lg:`). Títulos usan `font-slab` por defecto.

## 4. Accesibilidad

- Controles siempre con label (`Field` lo resuelve con `htmlFor` + `aria-describedby`).
- Botones solo con ícono: `aria-label`. Íconos decorativos: `aria-hidden='true'`.
- Estados de carga: `Skeleton` + `aria-busy='true'`. Avisos dinámicos con rol adecuado (los de `feedback` ya lo traen).
- Modales con `Dialog` del kit (foco y Escape incluidos), con `DialogTitle`.

## 5. Textos

Todo texto visible en español, claro y sin códigos técnicos. Mensajes y constantes repetidas en
`constants.ts` del módulo.

## Checklist

- [ ] Reutiliza kit SAG / `ui/custom` antes de crear
- [ ] No modifica `src/global/ui/sag`
- [ ] Export nombrado, props tipadas, sin `any`
- [ ] `'use client'` solo si es necesario
- [ ] Tokens + `cn()`, acepta `className`
- [ ] Accesible (labels, aria, foco)
- [ ] Imports con `@/`, `./` solo entre hermanos
