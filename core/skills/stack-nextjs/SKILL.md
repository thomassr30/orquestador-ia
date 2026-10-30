---
name: stack-nextjs
description: Convenciones para desarrollar y testear aplicaciones Next.js (App Router o Pages Router). Usar cuando stack.json incluya nextjs.
---
# Next.js

## Reglas
- Versión desde `package.json`. Detecta el router: carpeta `app/` (App Router) o `pages/` (Pages Router). No migres de uno a otro sin pedirlo.
- El comportamiento de caché y fetch cambia entre versiones mayores: consulta la documentación de ESA versión antes de tocar data fetching.
- App Router:
  - Server Components por defecto; `'use client'` solo donde haya estado, efectos o eventos del navegador.
  - Mutaciones con Server Actions o Route Handlers (`app/api/.../route.ts`) según el patrón existente.
  - Valida entrada en el servidor; nunca expongas secretos a componentes cliente (solo `NEXT_PUBLIC_*` es público).
  - `loading.tsx`, `error.tsx`, `not-found.tsx` para estados.
- `next/image`, `next/link`, Metadata API para SEO.
- Aplica también las reglas de la skill `stack-react`.

## Tests
- Unit/componentes: Vitest o Jest + React Testing Library (Server Components async se prueban mejor con e2e).
- E2E: Playwright contra `next build && next start` (ver `test-e2e`).

## Comandos
`npm test` · `npm run lint` · `npm run build`
