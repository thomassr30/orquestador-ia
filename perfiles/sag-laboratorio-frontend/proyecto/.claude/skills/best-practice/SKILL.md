---
name: best-practice
description: Usar al crear o cambiar componentes, hooks, páginas, Route Handlers o consultas, al refactorizar y al revisar código del frontend SAG (src/) - efectos, estado, caché, rendimiento, accesibilidad, seguridad o pruebas. No hace falta para cambios chicos de estilo. Buenas prácticas de TypeScript, React 19.2, Next.js 16.2 App Router, TanStack Query 5.101, Zustand 5.0, zod 4.4, Tailwind 4.3 y Vitest 3.2, filtradas para las versiones instaladas. Las normas SAG y las skills del proyecto tienen precedencia.
user-invocable: false
---

# Buenas prácticas del stack

Prácticas generales filtradas para las versiones instaladas y para cómo trabaja este repo. Lo que ya
tiene su propia skill o su sección en `README.md`/`CONTRIBUTING.md` no se repite: se remite.

## Alcance y precedencia

1. `.claude/rules/constitution.md`
2. Normas Generales SAG (skill `general-standards`)
3. Skills del proyecto y código existente
4. **Esta skill**
5. Guías externas (Vercel, Next.js, React, etc.)

- Las prácticas SAG prevalecen sobre la guía oficial de Vercel/Next.js. Si una práctica de acá choca con
  el repo, **gana el repo**.
- No reescribas código que funciona solo para cumplir esta skill: aplícala al código nuevo y a lo que
  ya estás tocando (constitución VIII: alcance).
- Cada regla es verificable: viene de una fuente de `references/fuentes.md` o del código del repo.

## Lo ya cubierto: no se repite

| Tema | Dónde está |
|---|---|
| Formularios: zod + `Errores` + `Field`, limpieza de errores, 422 del BFF, Zustand de wizard | skill `validate-form` |
| Proxy `/api/bff/**`, tipos del contrato, servicio `fetchBff`, hooks de query/mutation, errores del BFF | skill `integrate-bff-endpoint` |
| UI: kit SAG, `ui/custom`, `cn()`, tokens, accesibilidad base, `'use client'` | skill `create-component` |
| Módulo nuevo, barrels, páginas delgadas, guard, `PROTECTED_ROUTES` | skill `create-module` |
| Severidades ALTA/MEDIA/BAJA y proceso de revisión | skill `review-code` y `CONTRIBUTING.md` |
| Ramas, commits, PR, hooks | skill `commit-and-pr` y `CONTRIBUTING.md` |
| Nombres, imports `@/`, dónde van los tipos, variables de entorno | `README.md` |
| Seguridad, Git, plan, verificación, alcance | `.claude/rules/constitution.md` |

## Versiones y APIs disponibles

Leídas de `node_modules/<paquete>/package.json` (2026-11-03), no de los rangos de `package.json`.

| Paquete | Instalada | Qué implica |
|---|---|---|
| next | 16.2.10 | `params`, `searchParams`, `cookies()` y `headers()` solo asíncronos. `middleware` deprecado a favor de `proxy`. Turbopack por defecto. `next lint` no existe (se usa `eslint`). `fetch` no se cachea por defecto. `revalidateTag` exige 2 argumentos; `updateTag` y `refresh` son solo de Server Actions. `images.domains` deprecado (el repo usa `remotePatterns`). |
| react / react-dom | 19.2.4 | Existen `use`, `useActionState`, `useOptimistic`, `useEffectEvent`, `Activity`, `cache`, `cacheSignal` (verificado en el paquete). `ViewTransition` no se exporta en este build estable. `ref` es prop normal. |
| typescript | 5.9.3 | `strict`; `satisfies`; `import type`. Los `TypedArray` ya no son `ArrayBuffer`: tipa buffers como `Uint8Array<ArrayBuffer>`. |
| @tanstack/react-query | 5.101.2 | Sin `onSuccess`/`onError`/`onSettled` en queries (sí en mutations). `cacheTime` es `gcTime`. `isLoading` = `isPending && isFetching`. `keepPreviousData` es función de `placeholderData`. Existen `queryOptions`, `mutationOptions`, `useSuspenseQuery`, `skipToken`. `queryClient.query` **no existe** en esta versión (aunque lo cite la doc web): usa `fetchQuery`/`ensureQueryData`. |
| zustand | 5.0.14 | Solo exports nombrados (`create`, `createStore`, `useStore`). El selector debe devolver una referencia estable (`useShallow` de `zustand/react/shallow`). `createWithEqualityFn` (`zustand/traditional`) **no es utilizable**: falta `use-sync-external-store`. `persist` no guarda el estado inicial al crear. |
| zod | 4.4.3 | `z.email()`, `z.uuid()`, `z.url()` en vez de `z.string().email()`. `error` en vez de `message`/`invalid_type_error`. `ZodError.issues` (no `.errors`). `z.strictObject`/`z.looseObject`. `z.treeifyError` en vez de `.format()`. `.default()` corta ante `undefined` (usa `.prefault()` para el comportamiento de zod 3). |
| tailwindcss | 4.3.2 | `@import "tailwindcss"` y `@theme` en CSS; no hay `tailwind.config.js`. `shadow-xs`, `outline-hidden` (y `outline-none` solo quita el estilo), `ring-3`, `flex!` (importante al final), `bg-(--var)`. Borde por defecto `currentColor`. |
| eslint | 9.39.4 | Solo flat config (`eslint.config.mjs`). `eslint-config-next` 16.2.10 activa `react-hooks` 7.1.1: `exhaustive-deps` como warning; `set-state-in-effect`, `purity` y `refs` como error (verificado con `eslint --print-config`). |
| vitest | 3.2.4 | `vitest run`, `environment: 'jsdom'`, `globals: true`. Con `@testing-library/react` 16.3.0, `@testing-library/jest-dom` 6.9.1 y `user-event` 14.6.1. |

- **No instalado:** `babel-plugin-react-compiler` (no actives `reactCompiler`: exige dependencia, constitución III),
  `use-sync-external-store`, SWR, `react-window`/virtualizadores y `nuqs`.
- **Cache Components (`"use cache"`, PPR)** requiere `cacheComponents: true`, que el repo no habilita. No lo uses.

## TypeScript

- Sin `any` ni `as` para callar errores: `unknown` + narrowing (`error instanceof BffApiError`).
- `import type` para tipos. Uniones literales para estados (`'EN_CURSO' | 'CONFIRMADA'`), no `string`.
- `as const` + `satisfies` para catálogos constantes (conservan los literales y validan la forma).
- Los valores que vienen de fuera (BFF, `localStorage`, `sessionStorage`, `searchParams`) son `unknown` hasta
  validarlos; los contratos del BFF se tipan en `global/types/api`.
- Tipos de contrato y de dominio en su carpeta (ver `README.md`, "Dónde van los tipos").

Fuente: constitución II, `README.md`, TypeScript 5.9 (release notes) y el código (`BffApiError`).

## React 19

### Efectos y estado

- Un efecto sincroniza con algo externo (SSE `transmit`, listeners, timers, registro de errores). No lo uses
  para derivar estado: se calcula en el render ("You Might Not Need an Effect"). Ejemplo en el repo:
  `useAreasFuncionalesOptions` (registra el error de red de una query). `react-hooks/set-state-in-effect` es error en lint.
- La lógica de una interacción va en su handler, no en estado + efecto. Si dos componentes deben mantenerse
  sincronizados, se sube el estado al padre.
- Para reiniciar el estado de un componente cuando cambia un id, pasa otro `key`; no lo reinicies en un efecto.
- Limpia lo que el efecto abre (listeners, timers, suscripciones, `AbortController`). Un fetch con
  `useEffect` no se escribe a mano: es React Query.
- `setState` funcional si el nuevo valor depende del anterior; inicialización diferida
  (`useState(() => calcular())`) para valores iniciales caros.
- Valores que cambian seguido y no se pintan van en `useRef`. Los datos externos que se leen en cada render
  (por ejemplo `navigator.onLine`) usan `useSyncExternalStore`, no un efecto.
- `useEffectEvent` existe en 19.2.4 para extraer lógica "de evento" de un efecto sin agregarla a las
  dependencias; no lo uses para silenciar la regla de dependencias. El repo no lo usa hoy.
- Dependencias de efectos y hooks completas: `react-hooks/exhaustive-deps` avisa en lint; no la apagues sin una
  línea que explique el porqué (constitución VII).

### Render

- Los componentes son puros: sin efectos en el render, sin mutar props, estado ni valores ya pasados a JSX.
- No definas componentes dentro de otros: cada render crea un tipo nuevo y se pierde el estado.
- Keys estables (ids del dominio), nunca el índice si la lista cambia. El repo hoy no usa índices como key.
- `memo`, `useMemo` y `useCallback` solo con un motivo medible (no hay React Compiler; el repo los usa en cálculos
  de columnas y derivados caros). No envuelvas expresiones simples de resultado primitivo en `useMemo`.
- Condicional con ternario o con comparación explícita cuando el valor puede ser `0` o `NaN` (`&&` los renderiza).
- JSX estático que no depende de props va fuera del componente.
- `useTransition`/`useDeferredValue` para actualizaciones no urgentes (el repo no los usa; úsalos si un filtro o
  una tabla pesada se traba al escribir, no por costumbre).
- `ref` es una prop normal: en componentes nuevos no hace falta `forwardRef` (el kit SAG lo conserva; no se toca).
- Hooks siempre al tope, en el mismo orden y solo desde componentes o hooks propios (`use<Algo>`).
- Formularios: solo lo no cubierto por `validate-form`. Un `input` con `value` lleva `onChange`; no se bloquea
  el pegado; `type`/`inputMode` correctos. No se usa `useActionState` ni `<form action>` (no hay Server Actions de UI).

Fuente: react.dev ("You Might Not Need an Effect", "Rules of React", React 19.2), Vercel react-best-practices
(`rerender-*`, `rendering-conditional-render`) y la skill `create-component`.

## Next.js 16 App Router

- **Server Component por defecto.** `'use client'` solo con estado, efectos, eventos, hooks de cliente o store, y lo
  más abajo posible en el árbol. Las páginas de `src/app` no tienen lógica: montan el guard y el componente del módulo.
- **Rutas protegidas nuevas:** `requireAuth()` en su `layout.tsx` y registro en `PROTECTED_ROUTES` (`src/global/config/routes.ts`).
- **Props asíncronas:** `params` y `searchParams` son `Promise` en páginas, layouts y Route Handlers, y
  `cookies()`/`headers()` también: `await` siempre. `PageProps`, `LayoutProps` y `RouteContext` (de `next typegen`) están
  disponibles; el proxy del BFF tipa su propio `RouteContext`.
- **Route Handlers:** `src/app/api/bff/**` usa `makeBffProxyHandler`/`makeBffEventStreamHandler`; no escribas `fetch` a mano.
  Las rutas de auth y de stream SSE llevan `export const dynamic = 'force-dynamic'` (como hoy).
  No supongas que la UI ya validó nada: el proxy reenvía la cookie y el BFF decide (403).
- **Datos de UI:** proxy + React Query en el cliente. No uses Server Actions ni `fetch` server-side al BFF para datos de UI
  (los 3 módulos `'use server'` existentes son de configuración y sesión, no un patrón para datos).
- **Caché:** `fetch` no se cachea por defecto en Next 16; los datos del usuario nunca se comparten entre requests ni se
  guardan en variables de módulo del servidor. Hoy el repo no usa `React.cache`, `unstable_cache` ni `cacheComponents`.
- **Carga y errores:** `loading.tsx` ya existe en `dashboard/recepcion-muestras`; para estados de carga de datos remotos, `Skeleton` +
  `aria-busy` (ver `create-component`). No hay `<Suspense>` en el repo: no lo introduzcas sin acuerdo del equipo.
- **Imágenes:** `next/image` con `width`/`height` (o `fill` con contenedor), `alt` real o `alt=''` si es decorativa. Los hosts
  remotos van en `images.remotePatterns` de `next.config.ts`, nunca `images.domains`.
- **Fuentes:** `next/font/google` en el layout raíz con `variable` y `display: 'swap'` (como hoy); no cargues fuentes con `<link>`.
- **Protección de rutas:** `src/middleware.ts` es el chequeo liviano de cookie y `requireAuth()` en el layout valida de verdad.
  En Next 16 el archivo `middleware` está **deprecado** (renombrado `proxy`, runtime Node): ver "Hallazgos". No lo migres sin pedido.
- **Variables:** nada de secretos en `NEXT_PUBLIC_*`; config solo vía `getEnv`/`getRequiredEnv`/`getBaseUrl` (`README.md`).
- `next lint` no existe: se usa `npm run lint` (ESLint 9 flat config).

Fuente: guía "Upgrading to 16" y docs de `node_modules/next/dist/docs` (16.2.10), `README.md` y `integrate-bff-endpoint`.

## TanStack Query 5

El detalle del flujo está en `integrate-bff-endpoint`. Reglas de fondo:

- `queryKey` jerárquicas. Las que otro hook invalida se exportan como constante (`CLAVE_BANDEJA`) o con función
  (`claveMuestrasRecepcion(idSolicitud)`), nunca como literales repetidos.
- Política de `retry` explícita: no reintentar 401/403/404; mutations con `retry: false`.
- Las mutations invalidan en `onSettled`, también tras un error: un 409 indica que el estado cambió. Registra el fallo de
  `invalidateQueries` con `.catch`.
- `placeholderData: keepPreviousData` en listados paginados o filtrados.
- Transforma a modelo de vista con `select` o con funciones de `utils/`, no en el JSX.
- Toda variable que use el `queryFn` va en la `queryKey` (es su lista de dependencias); la clave es un arreglo serializable.
- Los efectos secundarios de una query (loguear el error) no usan `onError` (no existe): `useEffect` sobre `error`, como hace el repo
  con `registrarErrorBff`, o el manejo en el `queryFn`.
- Estados: `isPending` (sin datos), `isFetching` (en curso), `isLoading` (primera carga), `isPlaceholderData` (datos previos).
- `enabled: Boolean(id)` cuando falta un parámetro; `skipToken` es la alternativa tipada.
- `staleTime` como constante con nombre y JSDoc (`OPCIONES_STALE_TIME_MS`), no número suelto. El `QueryProvider` fija `staleTime` de 5 min y `retry: 1`.
- No copies datos de la query a `useState` para "editarlos": deriva en el render o usa un estado de edición separado.
- Pruebas: un `QueryClient` nuevo por prueba y `retry: false` (`crearQueryClient` en `src/tests/support/render.tsx`).

Fuente: TanStack Query v5 (migración, query keys, testing) y código en `src/modules/*/hooks`.

## Zustand 5

- Un store por flujo, en `modules/<mod>/store/`, con acciones de dominio (`useSolicitudStore`).
- Selectores por campo: `useStore((s) => s.campo)`. Nunca `useStore()` completo (hoy no ocurre con `useSolicitudStore`).
- Si el selector arma un objeto o arreglo nuevo, envuélvelo en `useShallow` (`zustand/react/shallow`, como `useFbpSummary`);
  sin eso, en v5 puede entrar en bucle de renderizado.
- Lo que solo se lee dentro de un handler se lee con `useStore.getState()` en vez de suscribirse.
- `persist` solo con `createJSONStorage(() => sessionStorage)`, sin `File` ni datos sensibles; si cambia la forma del estado persistido, `version` + `migrate`.
- El estado del servidor vive en React Query, no en Zustand.

Fuente: Zustand (migración a v5, `useShallow`), Vercel `client-localstorage-schema`, `rerender-defer-reads`.

## zod 4

Cubierto por `validate-form`. Además, con la API de zod 4.4.3:

- Formatos con `z.email()`, `z.uuid()`, `z.url()`; `z.enum([...])` en vez de `z.nativeEnum`; `z.strictObject()` si el objeto no admite claves extra.
- Mensajes con el parámetro `error` (`z.string().min(1, { error: '…' })`); `message` está deprecado y `invalid_type_error`/`required_error` ya no existen.
- Errores de `safeParse`: lee `error.issues` (no `.errors`); `z.treeifyError()`/`z.flattenError()` si necesitas árbol o plano.
- Reglas cruzadas en `superRefine` con `ctx.addIssue({ code: 'custom', ... })`, como `solicitud.schemas.ts`.
- `.default(x)` debe coincidir con el tipo de salida; para pasar `x` por el esquema usa `.prefault(x)`.
- Un esquema se define una vez a nivel de módulo, no dentro del render. Si depende de "ahora", es una función que recibe `ahora: Date`.

Fuente: zod 4 (changelog) y `src/modules/solicitud-analisis/schemas/solicitud.schemas.ts`.

## Tailwind 4

- Reutiliza `@/global/ui` y `@/global/ui/custom/*` antes de crear; no toques `src/global/ui/sag`.
- Tokens del kit (`bg-primary`, `text-muted-foreground`, `border-border`) y variables de estado, no hex sueltos; combina con `cn()` y acepta `className` (ver `create-component`).
- Los tokens nuevos van en CSS con `@theme` (`src/app/globals.css`), no en un `tailwind.config.js` (no existe).
- Clases v4: `shadow-xs`, `rounded-xs`, `outline-hidden` para quitar el contorno **solo** con un reemplazo `focus-visible:ring-*`,
  `flex!` para `!important`, `bg-(--variable)` para variables CSS, `shrink-*`/`grow-*`.
- Un `border` sin color usa `currentColor`: define `border-border` (o el token) explícito.
- Responsive mobile-first (`md:`, `lg:`). Nunca armes nombres de clase por concatenación (`bg-${color}-500`): Tailwind no los ve;
  usa un mapa tipado de variantes completas.
- Animación con `transition-[propiedades]` o `transition-colors`, no `transition-all`; respeta `motion-reduce:` en lo nuevo.

Fuente: Tailwind v4 (guía de actualización), Web Interface Guidelines (animación) y `create-component`.

## Rendimiento

- Imports puntuales y estáticos (`@/global/ui`, `lucide-react` por nombre: está en la lista de `optimizePackageImports` por defecto de Next).
  Nada de imports dinámicos armados por nombre.
- Componentes pesados y de uso condicional (por ejemplo el visor de cámara QR, `QrCameraViewer`) se cargan con `next/dynamic`
  cuando se agreguen; hoy `next/dynamic` no se usa. Mide con `next build` antes de optimizar a ciegas.
- Listas largas: paginación del BFF (`DataTable`); no renderices miles de filas sin paginar.
- Cálculos sobre listas: un solo recorrido, `Map`/`Set` para búsquedas repetidas, no ordenes con `sort` sobre arreglos de props
  (`[...arr].sort(...)`, como `verificacionesDesdeCriterios`; el repo no usa `toSorted`).
- Eventos de `scroll`/`touch`/`wheel` con `{ passive: true }`; no leas layout (`getBoundingClientRect`) en el render.
- `setState` por tecla debe ser barato; los filtros con búsqueda usan el patrón "editados vs aplicados" (`useSolicitudesPendientes`).
- Las llamadas independientes se hacen en paralelo (`Promise.all` en servicios, queries separadas en el cliente), sin esperas en cadena.

Fuente: Vercel react-best-practices (`bundle-*`, `js-*`, `async-parallel`, `client-passive-event-listeners`) adaptado en `references/fuentes.md`.

## Accesibilidad e interfaz

Base en `create-component`. Además:

- Labels en todo control (`Field`), `aria-label` en botones de ícono, `aria-busy` en cargas y foco gestionado en modales (`Dialog` del kit).
- `<button>` para acciones y `<a>`/`Link` para navegar; nunca `div`/`span` con `onClick`. HTML semántico antes que ARIA
  ("sin ARIA es mejor que ARIA mal usado": un rol obliga a implementar su teclado).
- Íconos clicables dentro de `<button>` con `aria-label`; íconos decorativos con `aria-hidden='true'`; imágenes con `alt`.
- Mensajes dinámicos (errores, éxitos) en una región `role='alert'` o `aria-live='polite'` (`StatusAlert`, `AccessNotice` ya lo traen).
- Foco visible siempre: `focus-visible:ring-*`; `outline-none`/`outline-hidden` solo con reemplazo. Un header fijo no debe tapar el foco.
- Al enviar con errores, el foco va al primer campo inválido (`validate-form`).
- `autoComplete='off'` en búsquedas y campos que no son de acceso; `spellCheck={false}` en códigos e identificadores.
- Estados vacíos, de carga y de error contemplados; textos largos con `truncate`/`line-clamp-*` y `min-w-0` en hijos flex.
- Acciones destructivas piden confirmación (`NoticeModal`/`Dialog`); cualquier gesto táctil tiene alternativa de clic y teclado.
- Fechas y números con `Intl.*` (`es-CL`) o con las utilidades del módulo; `tabular-nums` en columnas numéricas.
- Contraste de texto ≥ 4.5:1 (WCAG 2.2, 1.4.3) usando solo los tokens del kit.

Fuente: Vercel Web Interface Guidelines (clasificadas en `references/fuentes.md`), WAI-ARIA APG ("Read Me First") y WCAG 2.2.

## Seguridad básica

Reglas de la constitución IV (secretos, proxy, `sanitizeReturnTo()`, `dangerouslySetInnerHTML`). Además:

- URLs que vienen del BFF o del usuario (`href`, `src`, `window.open`) solo con esquema `http(s)`: un `javascript:` ejecuta código en el origen.
- No guardes tokens ni datos sensibles en `localStorage`/`sessionStorage`; la sesión es la cookie `httpOnly` `bff_session`.
- Ocultar un botón por rol no protege la operación: la autorización real es del BFF. La UI solo refleja el 403 (`AccessNotice`).
- No registres con `console.log` datos del usuario ni la URL de Consul/BFF (los `console.log` de `getBaseUrl` y `consulAction` son deuda, ver más abajo).
- Valida con zod lo que entra por formulario y trata las respuestas como `unknown` hasta tiparlas.
- Un cambio que toque autenticación, cookies o redirecciones merece una revisión de seguridad dedicada por una persona.

Fuente: constitución IV, guía "Upgrading to 16" (imágenes y runtime) y `review-code` (severidad ALTA).

## Pruebas con Vitest y Testing Library

Instalados: Vitest 3.2.4, `@testing-library/react` 16.3.0, `jest-dom` 6.9.1 y `user-event` 14.6.1. Las pruebas viven en `src/tests/unit/**`
y se llaman `*.test.ts(x)`; los utilitarios compartidos están en `src/tests/support/` (`renderWithProviders`, `crearQueryClient`, `bff`, `fixtures`).

- Renderiza con `renderWithProviders` (trae `QueryClient` sin reintentos y `AuthProvider`); no crees tu propio wrapper.
- Consulta por rol y etiqueta (`getByRole`, `getByLabelText`) antes que por texto, y `getByTestId` solo como último recurso.
  `findBy*` para lo asíncrono; `queryBy*` para afirmar ausencia.
- Interacciones con `userEvent` (`user` del render), no con `fireEvent`.
- Mockea `fetch` con `simularFetch`/`bffOk`/`respuestaBffError` de `src/tests/support/bff.ts`; no llames a un BFF real.
- Prueba comportamiento visible, no detalles de implementación. Lógica pura (`utils/`, `schemas/`) se prueba sin render.
- Fechas en `America/Santiago` (ya fijado en `vitest.config.mts`); no dependas de la hora real.
- Cada prueba deja limpio lo que usa (`cleanup` ya corre en `setup.ts`; restaura `vi.stubGlobal` con `vi.unstubAllGlobals`).

Fuente: Testing Library (prioridad de queries), TanStack Query (testing) y `src/tests/support/*`.

## Hallazgos de versión: no se corrigen sin pedido

- **`src/middleware.ts` vs `proxy.ts`:** la guía de Next 16 declara deprecado el archivo `middleware` y la función `middleware` (renombrar a
  `proxy.ts` / `export function proxy`; el runtime es Node y no admite `edge`). El repo aún usa `middleware.ts` (solo cookies y
  `NextResponse`, sin edge). No se migra aquí: se reporta para decidir en su propia HU.

## Deuda existente: no la repitas

No hay refactor propuesto; solo no copies estos patrones al usar un molde:

- `console.log` de diagnóstico en `src/global/api/utils/getBaseUrl.ts` y `src/global/config/services/consulAction.ts`.
- `transition-all` y `outline-none` en el kit `src/global/ui/sag` (no se toca). `outline-none` aparece también en
  `ui/custom/form/Searchable*Select.tsx`: en código nuevo, siempre con un reemplazo de foco visible.
- Ningún componente respeta `prefers-reduced-motion` (`motion-reduce:` no se usa).
- Dependencias instaladas sin uso en `src/`: `react-hook-form`, `@hookform/resolvers` y `next-themes`.
- No existen `error.tsx`, `not-found.tsx` ni `global-error.tsx` en `src/app`.
- `staleTime` como número suelto (`5 * 60 * 1000`) en `QueryProvider`, `useMe`, `usePublicacion` y `useNoticias`.

## Fuentes

Vercel `react-best-practices` y `web-interface-guidelines` (MIT), documentación oficial de Next.js 16, React, TanStack Query 5, Zustand 5,
zod 4, Tailwind 4, TypeScript 5.9, Testing Library y WAI-ARIA/WCAG. Qué se tomó, qué se adaptó y qué se descartó, regla por regla y con su
motivo, está en [references/fuentes.md](references/fuentes.md).
