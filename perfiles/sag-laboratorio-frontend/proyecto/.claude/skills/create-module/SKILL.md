---
name: create-module
description: Crea un módulo funcional nuevo en src/modules (estructura de carpetas, barrels, constants, tipos) y su página en src/app con layout autenticado y guard de acceso. Usar cuando se pida crear un módulo, una pantalla o sección nueva del sistema, o una ruta nueva del dashboard.
---

# Crear un módulo

Un módulo agrupa todo lo de una funcionalidad de negocio (`recepcion-muestras`,
`solicitud-analisis`). Las rutas de `src/app` solo lo montan. Referencia: `README.md` →
"Estructura", "Convenciones de nombres", "Imports" y "Dónde van los tipos".

## 1. Estructura

```
src/modules/<modulo-en-kebab-case>/
  components/
    <subarea>/            # list, detail, modals, wizard… (inglés)
      <Componente>.tsx
      index.ts
  hooks/use<Algo>.ts
  types/
    <tema>.ts
    index.ts              # solo `export * from './<tema>'`
  utils/<tema>.ts         # funciones puras (mapeos, formatos, validaciones)
  schemas/                # solo si hay validación con zod
  store/                  # solo si hay estado compartido entre pasos/pantallas (Zustand)
  constants.ts            # UPPER_SNAKE_CASE
  index.ts                # API pública del módulo
```

Crea solo las carpetas que se usen. El nombre del módulo es de dominio (español, kebab-case).

## 2. API pública (`index.ts`)

Exporta solo lo que consume `src/app`:

```ts
export { SolicitudesPendientesRecepcion } from './components/list/SolicitudesPendientesRecepcion'
export { RecepcionAccessGuard } from './components/list/RecepcionAccessGuard'
```

Dentro del módulo se importa por ruta completa con `@/modules/<modulo>/...`, no desde el barrel
raíz (evita ciclos). Los tipos sí se importan del barrel `@/modules/<modulo>/types`.

## 3. Página en `src/app`

La página es delgada: sin lógica, sin fetch, sin estado.

```tsx
import { RecepcionAccessGuard, SolicitudesPendientesRecepcion } from '@/modules/recepcion-muestras'

export default function RecepcionDeMuestrasPage() {
  return (
    <RecepcionAccessGuard>
      <SolicitudesPendientesRecepcion />
    </RecepcionAccessGuard>
  )
}
```

- Las rutas URL van en español (`/dashboard/recepcion-muestras`, `/solicitudes`).
- Bajo `/dashboard` ya hay layout con `requireAuth()` + `AuthProvider` + `ModuleShell`.
  Un árbol nuevo fuera de `/dashboard` necesita su propio `layout.tsx` con `requireAuth()`
  (ver `src/app/solicitudes/layout.tsx`) y agregarse a `PROTECTED_ROUTES` en
  `src/global/config/routes.ts`.
- Breadcrumb con los componentes de `@/global/ui` y `APP_ROUTES` (ver `src/app/solicitudes/page.tsx`).
- Contenedor estándar: `mx-auto w-full max-w-[112rem] px-4 py-6 md:px-6`.

## 4. Guard de acceso (si el BFF puede negar acceso)

Patrón de `RecepcionAccessGuard`: un hook consulta al BFF; mientras carga muestra un `Skeleton`
con `aria-busy`, si responde 403 muestra `AccessNotice` y si no, renderiza `children`.

## 5. Datos

Para cada endpoint que use el módulo, sigue la skill `integrate-bff-endpoint`. Los tipos del
contrato van en `global/types/api`; los tipos de vista del módulo en `modules/<modulo>/types`.

## Nombres

- Técnico en inglés, dominio en español, sin mezclar en la parte técnica:
  `PlagasTable`, `AntecedentesStep`, `SuccessModal`, `useSolicitudDetail`.
- Componentes PascalCase, uno por archivo, mismo nombre que el archivo; props `<Componente>Props`.
- Funciones y variables se mantienen en español como el código existente (`mapearSolicitudAFila`).

## Checklist

- [ ] Carpetas técnicas en inglés, nombre del módulo de dominio en kebab-case
- [ ] `index.ts` con solo la API pública; `types/index.ts` solo con `export *`
- [ ] Página sin lógica, con guard/layout autenticado según corresponda
- [ ] Ruta protegida registrada si está fuera de `/dashboard` o `/solicitudes`
- [ ] Imports con `@/`, sin `../`
