---
name: stack-react
description: Convenciones para desarrollar y testear aplicaciones React (sin Next.js). Usar cuando stack.json incluya react.
---
# React

## Reglas
- Versión desde `package.json`. Funciones nuevas de React 19 (Actions, `use`) solo si la versión lo permite.
- Componentes funcionales con TypeScript; props tipadas; un componente por archivo.
- Reglas de hooks; no derivar estado que se puede calcular; `useEffect` solo para sincronizar con sistemas externos.
- Estado de servidor con la librería del proyecto (TanStack Query, SWR, RTK Query); no reinventar caché.
- Listas con `key` estable (nunca índice si el orden cambia).
- Formularios con la librería existente (React Hook Form, etc.) y validación con el esquema del proyecto.
- Accesibilidad: elementos semánticos, `label` asociado, foco gestionado en modales.
- Estilos según el sistema del proyecto (Tailwind, CSS Modules, SCSS). No mezclar.

## Tests
- Vitest o Jest (el que exista) + React Testing Library + `@testing-library/user-event`.
- Consultas por rol/label/texto (`getByRole`), nunca por clases. Mock de red con MSW si existe.

## Comandos
`npm test` · `npm run lint` · `npx tsc --noEmit` · `npm run build`
