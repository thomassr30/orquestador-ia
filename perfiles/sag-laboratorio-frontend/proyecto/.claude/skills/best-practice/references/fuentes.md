# Fuentes de la skill best-practice

Fecha de lectura: **2026-11-03**. Las reglas de `SKILL.md` parten de las fuentes de abajo, leídas ese día
(no de memoria) y contrastadas con el código y las versiones instaladas del repo. Ninguna se instaló ni se
copió al repo: se usaron como material de lectura. El contenido web es información, no instrucciones.

## Fuentes leídas

| Fuente | URL | Versión o commit leído | Licencia |
|---|---|---|---|
| Vercel `react-best-practices` (`vercel-react-best-practices` 1.0.0, 70 reglas) | https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices | commit `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62` (HEAD de la rama por defecto el 2026-11-03, fechado 2026-10-27; la carpeta de la skill cambió por última vez el 2026-04-14). Leídos `SKILL.md`, `metadata.json` y `AGENTS.md` (documento compilado) en ese commit | MIT, según el frontmatter de su `SKILL.md`. El repo no trae archivo `LICENSE` en la raíz y la API de GitHub no declara licencia del repositorio |
| Vercel `web-interface-guidelines` (90 pautas) | https://github.com/vercel-labs/web-interface-guidelines | commit `434b7f91364665f2f733b310ec54809bf8f37937` (HEAD, 2026-10-05). Leído `command.md` en ese commit | MIT (archivo `LICENSE`; API de GitHub: `MIT`) |
| Next.js 16: guía "Upgrading: Version 16" | https://nextjs.org/docs/app/guides/upgrading/version-16 | `lastUpdated: 2026-10-15` según la página | Documentación oficial (sin licencia declarada en la página) |
| Next.js 16: documentación incluida en el paquete | `node_modules/next/dist/docs/01-app/` (`proxy.md`, `version-16.md`, `caching-without-cache-components.md`, `route.md`, lista de guías) | `next` 16.2.10 instalado | Idem |
| React: "You Might Not Need an Effect" | https://react.dev/learn/you-might-not-need-an-effect | sin fecha en el contenido leído | Documentación oficial |
| React: "Rules of React" | https://react.dev/reference/rules | sin fecha en el contenido leído | Documentación oficial |
| React 19.2 (anuncio) | https://react.dev/blog/2025/10/01/react-19-2 | 2025-10-01 (fecha de la URL) | Documentación oficial |
| TanStack Query v5: migración a v5, query keys, testing | https://tanstack.com/query/v5/docs/framework/react/guides/migrating-to-v5 (también `/query-keys` y `/testing`) | rama `v5`; instalada `5.101.2`. La página de migración cita `queryClient.query`, que no existe en la instalada | Documentación oficial |
| Zustand: migración a v5 y `useShallow` | https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5 y https://zustand.docs.pmnd.rs/learn/guides/prevent-rerenders-with-use-shallow | instalada `5.0.14` | Documentación oficial |
| zod 4: changelog | https://zod.dev/v4/changelog | `4.x`; instalada `4.4.3` (la página menciona la versión `4.4.0`) | Documentación oficial |
| Tailwind CSS: guía de actualización a v4 | https://tailwindcss.com/docs/upgrade-guide | instalada `4.3.2` | Documentación oficial |
| TypeScript 5.9: notas de versión | https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html | 5.9 (instalada `5.9.3`) | Documentación oficial |
| Testing Library: prioridad de queries | https://testing-library.com/docs/queries/about/ | sin fecha en el contenido leído | Documentación oficial |
| WAI-ARIA Authoring Practices: "Read Me First" | https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/ | sin fecha en el contenido leído | Documento del W3C |
| WCAG 2.2: referencia rápida | https://www.w3.org/WAI/WCAG22/quickref/ | WCAG 2.2; **lectura parcial** (solo los primeros 100 000 de 206 721 caracteres de la página); solo se usan los 4 principios y el criterio 1.4.3 (nivel AA) | Documento del W3C |

### Lo que no se pudo leer o se leyó a medias

- WCAG 2.2: la lectura se truncó; no se citan niveles de otros criterios que no se alcanzaron a leer.
- La página de Vercel `react-best-practices` en `AGENTS.md` se leyó completa en su índice y en el encabezado, el impacto y la
  descripción de cada una de las 70 reglas; los ejemplos de código de cada regla no se revisaron uno a uno.
- Las docs web de TanStack Query, Zustand y zod pueden ir por delante de lo instalado (caso de `queryClient.query`). Por eso la tabla de
  versiones de `SKILL.md` se verificó contra `node_modules`.
- No se leyó la documentación de Vitest en la web: lo de Vitest sale de `vitest.config.mts`, de `src/tests/` y de la versión instalada (3.2.4).
- No se leyó la guía de Next.js sobre Server Components ni la de caché fuera de las páginas y archivos locales citados arriba.

Si se actualiza la skill desde una versión nueva de las fuentes, se repite esta clasificación y se cambian los commits de la tabla.

## Datos del repo que pesan en la clasificación

- Next.js 16.2.10, React 19.2.4 y `eslint-config-next` 16.2.10 (con `react-hooks` 7.1.1); no hay React Compiler
  (`babel-plugin-react-compiler` no está instalado) ni `cacheComponents`.
- Datos de UI: proxy `/api/bff/**` + React Query en el cliente. No hay `fetch` server-side al BFF para datos de UI ni Server Actions de UI.
  Hay 3 módulos `'use server'` (`configActions.ts`, `consulAction.ts`, `auth.ts`), de configuración y sesión.
- No hay `<Suspense>`, `next/dynamic`, `React.memo`, `useTransition` ni `useDeferredValue` en `src/`. `loading.tsx` existe en 2 rutas de
  `dashboard/recepcion-muestras`. `next/image` en 6 componentes, `next/font` en el layout raíz.
- `useMemo` en 23 archivos de `src/` fuera del kit, `useCallback` en 10 y `useEffect` en 26.
- Zustand: un store (`useSolicitudStore`) con `persist` en `sessionStorage` y selectores por campo; `useShallow` en `useFbpSummary`.
- No están instalados SWR, `better-all`, `lru-cache`, un virtualizador de listas ni `nuqs`. `next-themes`, `react-hook-form` y
  `@hookform/resolvers` están instalados pero sin uso.
- `DataTable` pagina; los filtros viven en estado (no en la URL). El kit `src/global/ui/sag` no se modifica.
- `src/middleware.ts` existe (no `proxy.ts`). `tsconfig` `target` ES2017, `lib` `esnext`.
- Es una aplicación interna de laboratorios, en español (`lang='es'`), sin conmutador de modo oscuro, con escaneo QR por cámara.
- Vitest con `jsdom`, `globals: true` y utilitarios en `src/tests/support`.

## react-best-practices: 70 reglas

36 aplican, 17 se adaptan y 17 se descartan.

| Regla | Qué pide | Decisión | Motivo o cómo se adapta |
|---|---|---|---|
| **Eliminar cascadas (6)** | | | |
| `async-cheap-condition-before-await` | Evaluar las condiciones baratas antes de un `await` | Aplica | — |
| `async-defer-await` | Mover el `await` a la rama que lo usa | Aplica | — |
| `async-parallel` | `Promise.all` para operaciones independientes | Aplica | En servicios y Route Handlers |
| `async-dependencies` | Paralelizar con dependencias parciales | Se adapta | La fuente usa `better-all`, que no está instalada: se encadenan promesas sin la librería |
| `async-api-routes` | No encadenar esperas en API routes | Aplica | En `src/app/api/**` |
| `async-suspense-boundaries` | Límites de `Suspense` para mostrar antes la UI | Se descarta | El dato de UI se pide en el cliente con React Query y `Skeleton`; el repo no usa `Suspense` |
| **Tamaño del bundle (6)** | | | |
| `bundle-barrel-imports` | No importar desde barrels | Se adapta | `lucide-react` está en `optimizePackageImports` por defecto de Next; `@/global/ui` es un barrel propio. Medir antes de cambiar |
| `bundle-analyzable-paths` | Rutas de import estáticas | Aplica | — |
| `bundle-dynamic-imports` | `next/dynamic` para componentes pesados | Se adapta | Hoy no se usa; solo con medición y acuerdo (candidato: `QrCameraViewer`) |
| `bundle-defer-third-party` | Cargar analytics después de la hidratación | Se descarta | No hay analytics ni librerías de ese tipo |
| `bundle-conditional` | Cargar módulos o datos grandes solo cuando se usan | Se adapta | Misma condición que `bundle-dynamic-imports` |
| `bundle-preload` | Precargar según la intención del usuario | Se descarta | Depende de imports dinámicos que hoy no existen |
| **Servidor (10)** | | | |
| `server-auth-actions` | Autenticar cada Server Action | Se adapta | Los 3 `'use server'` son de config y sesión; si se agrega uno, autentica dentro. Los Route Handlers delegan la autorización al BFF |
| `server-cache-react` | `React.cache()` por request | Se descarta | No hay `fetch` server-side de datos de UI |
| `server-cache-lru` | Caché LRU entre requests | Se descarta | `lru-cache` no está instalada y no hay lecturas de servidor que cachear |
| `server-dedup-props` | No duplicar la serialización de props en RSC | Se descarta | Las páginas son delgadas; no pasan datos grandes del servidor al cliente |
| `server-hoist-static-io` | Subir el I/O estático a nivel de módulo | Se descarta | El servidor no lee archivos estáticos |
| `server-no-shared-module-state` | Nada de datos de la request en variables de módulo | Aplica | Token, cookie y usuario nunca en variables de módulo del servidor |
| `server-serialization` | Minimizar lo que cruza del servidor al cliente | Se adapta | Por ejemplo, el usuario que el layout pasa a `AuthProvider`: solo los campos necesarios |
| `server-parallel-fetching` | Paralelizar fetches en componentes de servidor | Se descarta | No hay fetches en componentes de servidor para UI |
| `server-parallel-nested-fetching` | Encadenar fetches dependientes por ítem | Se descarta | Idem |
| `server-after-nonblocking` | `after()` para trabajo posterior a la respuesta | Se descarta | No hay trabajo diferido; `after()` existe en Next 16 si se necesitara |
| **Datos en el cliente (4)** | | | |
| `client-swr-dedup` | SWR para deduplicar requests | Se adapta | React Query ya deduplica por `queryKey`; no se instala SWR |
| `client-event-listeners` | Compartir listeners globales con `useSWRSubscription` | Se descarta | Depende de SWR |
| `client-passive-event-listeners` | `{ passive: true }` en `touch` y `wheel` | Aplica | — |
| `client-localstorage-schema` | Versionar y minimizar lo guardado | Se adapta | `persist` de Zustand en `sessionStorage`: `version` + `migrate` si cambia la forma; nada sensible |
| **Re-renders (15)** | | | |
| `rerender-defer-reads` | No suscribirse a estado que solo se lee en callbacks | Aplica | `useStore.getState()` en handlers |
| `rerender-memo` | Extraer trabajo caro a componentes memoizados | Se adapta | `React.memo` no se usa; `useMemo`/`useCallback` solo con motivo medible |
| `rerender-memo-with-default-value` | Defaults no primitivos fuera del componente memoizado | Aplica | — |
| `rerender-dependencies` | Dependencias primitivas en los efectos | Aplica | — |
| `rerender-derived-state` | Suscribirse al booleano derivado | Aplica | Selector de Zustand que devuelva el booleano |
| `rerender-derived-state-no-effect` | Calcular el estado derivado en el render | Aplica | `react-hooks/set-state-in-effect` es error en lint |
| `rerender-functional-setstate` | `setState` funcional | Aplica | — |
| `rerender-lazy-state-init` | Inicialización diferida en `useState` | Aplica | Como en `QueryProvider` |
| `rerender-simple-expression-in-memo` | No envolver expresiones simples en `useMemo` | Aplica | — |
| `rerender-split-combined-hooks` | Separar los cálculos independientes de un hook | Aplica | — |
| `rerender-move-effect-to-event` | La lógica de una interacción va en el handler | Aplica | — |
| `rerender-transitions` | `useTransition` para actualizaciones no urgentes | Se adapta | No se usa hoy; solo si una pantalla se traba al escribir |
| `rerender-use-deferred-value` | `useDeferredValue` para renders caros | Se adapta | Igual que la anterior |
| `rerender-use-ref-transient-values` | `useRef` para valores transitorios | Aplica | — |
| `rerender-no-inline-components` | No definir componentes dentro de componentes | Aplica | — |
| **Renderizado (11)** | | | |
| `rendering-animate-svg-wrapper` | Animar el contenedor del SVG | Aplica | Baja prioridad |
| `rendering-content-visibility` | `content-visibility` en listas largas | Se adapta | `DataTable` pagina; solo para listas largas sin paginar |
| `rendering-hoist-jsx` | JSX estático fuera del componente | Aplica | Baja prioridad |
| `rendering-svg-precision` | Reducir la precisión de los SVG | Se descarta | Los íconos vienen de `lucide-react`; no hay SVG a mano |
| `rendering-hydration-no-flicker` | Script inline antes de hidratar para datos del storage | Se descarta | No se leen preferencias de storage antes de hidratar |
| `rendering-hydration-suppress-warning` | `suppressHydrationWarning` en diferencias esperadas | Aplica | Solo en diferencias esperadas (fechas y horas), no para tapar errores |
| `rendering-activity` | `<Activity>` para mostrar y ocultar | Se descarta | Existe en 19.2.4, pero el wizard conserva su estado en Zustand |
| `rendering-conditional-render` | Ternario en vez de `&&` cuando el valor puede ser `0` | Aplica | — |
| `rendering-usetransition-loading` | `useTransition` en vez de estados de carga manuales | Se descarta | React Query entrega `isPending`/`isFetching` |
| `rendering-resource-hints` | `preload`, `preinit`, `preconnect` | Se descarta | `next/font` y `next/image` ya los gestionan; no hay CDN externos |
| `rendering-script-defer-async` | `defer` o `async` en los `<script>` | Se descarta | No hay `<script>` propios |
| **JavaScript (14)** | | | |
| `js-batch-dom-css` | No intercalar lecturas y escrituras de layout | Aplica | — |
| `js-index-maps` | `Map` para búsquedas repetidas por clave | Aplica | — |
| `js-cache-property-access` | Cachear accesos a propiedades en bucles | Aplica | Baja prioridad |
| `js-cache-function-results` | Cachear resultados de funciones repetidas | Aplica | — |
| `js-cache-storage` | Cachear lecturas de `localStorage`, `sessionStorage` y cookies | Aplica | — |
| `js-combine-iterations` | Combinar varios `.filter()`/`.map()` | Aplica | — |
| `js-length-check-first` | Comparar largos antes de comparaciones caras | Aplica | — |
| `js-early-exit` | Retorno temprano | Aplica | — |
| `js-hoist-regexp` | No crear `RegExp` en el render | Aplica | — |
| `js-min-max-loop` | Un bucle para mínimo y máximo, no `sort` | Aplica | — |
| `js-set-map-lookups` | `Set`/`Map` para búsquedas repetidas | Aplica | — |
| `js-tosorted-immutable` | `toSorted()` en vez de `sort()` | Se adapta | El repo copia y ordena (`[...arr].sort(...)`), como `verificacionesDesdeCriterios` |
| `js-flatmap-filter` | `flatMap` en vez de `map().filter()` | Aplica | — |
| `js-request-idle-callback` | `requestIdleCallback` para trabajo no crítico | Se adapta | Solo con alternativa (`setTimeout`), porque no todos los navegadores lo tienen |
| **Avanzado (4)** | | | |
| `advanced-effect-event-deps` | No poner Effect Events en las dependencias | Se adapta | `useEffectEvent` existe en 19.2.4 pero no se usa hoy; si se usa, fuera de las dependencias |
| `advanced-event-handler-refs` | Guardar handlers en refs | Se adapta | Con `useEffectEvent` o con `useRef` según el caso |
| `advanced-init-once` | Inicializar la app una vez, no en cada montaje | Aplica | — |
| `advanced-use-latest` | Callbacks estables con el último valor | Se adapta | Con `useEffectEvent` o con `useRef` |

## Web Interface Guidelines: 90 pautas

54 aplican, 11 se adaptan y 25 se descartan. Los 14 antipatrones del final de la fuente repiten pautas de esta tabla. Entre
paréntesis, el número de pautas de cada celda.

| Categoría | Aplican | Se adaptan | Se descartan |
|---|---|---|---|
| Accesibilidad (12) | (8) `aria-label` en botones de solo ícono; label en los controles; teclado en lo interactivo; `<button>` para acciones y `<a>`/`Link` para navegar; `alt` en imágenes; `aria-hidden` en íconos decorativos; `aria-live` en avisos; HTML semántico antes que ARIA | (1) Jerarquía de títulos y enlace para saltar al contenido: los títulos los define cada pantalla y no hay enlace de salto | (3) `scroll-margin-top` en anclas, subtítulos y controles de medios: no hay anclas de títulos ni video o audio |
| Foco (5) | (5) Foco visible; nada de `outline: none` sin reemplazo; `:focus-visible`; `:focus-within`; que lo fijo no tape el foco | — | — |
| Formularios (11) | (8) `type` e `inputmode`; no bloquear el pegado; labels clickeables; sin corrector en códigos; checkbox y radio con una sola zona de clic; errores junto al campo y foco al primero; `autocomplete="off"` en campos que no son de acceso; aviso al salir con cambios (existe `useLeaveConfirmation`) | (2) `autocomplete` y `name`: solo donde el control los necesita. Botón de envío activo y spinner: se usa `isPending` de la mutation | (1) Placeholders terminados en "…": regla de redacción en inglés |
| Animación (8) | (6) `prefers-reduced-motion`; animar `transform`/`opacity`; nunca `transition: all`; `transform-origin`; transformaciones de SVG en `<g>`; animaciones interrumpibles | (1) Pausa en autoplay de más de 5 s: solo si se agrega un carrusel | (1) Loops decorativos de video: no hay |
| Tipografía (6) | (2) `tabular-nums` en columnas numéricas; `text-wrap: balance` o `pretty` en títulos | (1) Espacios duros: solo en unidades y códigos | (3) "…" y comillas tipográficas, y "Cargando…": reglas de redacción en inglés |
| Contenido (4) | (4) Textos largos; `min-w-0` en hijos flex; estados vacíos; contenido de largo variable | — | — |
| Imágenes (3) | (3) `width` y `height`; `loading="lazy"` bajo el pliegue; prioridad en las críticas (`next/image` ya lo resuelve) | — | — |
| Rendimiento (8) | (2) Nada de leer layout en el render; agrupar lecturas y escrituras del DOM | (3) Virtualizar listas: `DataTable` pagina y no hay virtualizador instalado. Inputs no controlados: los formularios son controlados por diseño, así que cada tecla debe ser barata. Precarga de fuentes: `next/font` ya usa `display: 'swap'` | (3) `preconnect` a CDN (todo pasa por el proxy); video en vez de GIF; loops para Safari |
| Navegación y estado (4) | (2) Links con `<a>`/`Link`; confirmación en acciones destructivas | — | (2) Estado en la URL y deep-links: los filtros viven en estado (patrón del repo) y `nuqs` no está instalado |
| Táctil (7) | (3) `overscroll-behavior: contain` en modales; alternativa de clic y teclado para los gestos; `autoFocus` con moderación | (1) `touch-action: manipulation`: solo en controles táctiles del flujo QR | (3) `tap-highlight`; bloqueo del rebote de página; sin selección al arrastrar (no hay arrastre) |
| Áreas seguras y layout (3) | (2) Evitar scrollbars no deseadas; flex o grid en vez de medir con JS | — | (1) `safe-area-inset`: no es una app de pantalla completa |
| Modo oscuro (3) | — | — | (3) `color-scheme`, `theme-color` y `select` nativo en oscuro: no hay conmutador de tema (`next-themes` sin uso) |
| Idioma y formatos (4) | (2) Fechas con `Intl.DateTimeFormat` y números con `Intl.NumberFormat` | (1) `translate="no"`: en códigos de solicitud y muestra | (1) Detectar el idioma: la UI es solo es-CL (`lang='es'`) |
| Hidratación (3) | (3) `onChange` en inputs con `value`; fechas sin desfase servidor/cliente; `suppressHydrationWarning` solo donde hace falta | — | — |
| Hover (2) | (2) Estado `hover` en botones y enlaces; más contraste en `hover`/`active`/`focus` | — | — |
| Redacción (7) | (2) Etiquetas de botón específicas; mensajes de error con el paso a seguir | (1) Números en cifras en los conteos | (4) Voz activa, "Title Case", segunda persona y `&`: guía de estilo en inglés; los textos en español siguen `create-component` §5 |

## Trazabilidad: de dónde sale cada sección de SKILL.md

| Sección de `SKILL.md` | Fuente |
|---|---|
| Versiones y APIs disponibles | `node_modules/<paquete>/package.json`; verificación de exports con `node -e` (2026-11-03); guía "Upgrading to 16"; TanStack Query v5, Zustand v5, zod 4, Tailwind v4 y TypeScript 5.9 (fuentes de arriba) |
| TypeScript | constitución II, `README.md`, TypeScript 5.9, `BffApiError` (`src/global/types/bff.ts`) |
| React 19 | React ("You Might Not Need an Effect", "Rules of React", 19.2); react-best-practices `rerender-*`, `rendering-conditional-render`, `rendering-hoist-jsx`, `advanced-*`; lint `react-hooks` 7.1.1 |
| Next.js 16 | guía "Upgrading to 16", `node_modules/next/dist/docs`, `README.md`, `bffProxy.ts`, `src/middleware.ts`, `next.config.ts`, `src/app/layout.tsx` |
| TanStack Query 5 | TanStack Query v5 (migración, query keys, testing); código de `src/modules/*/hooks` y `QueryProvider.tsx` |
| Zustand 5 | Zustand (migración a v5, `useShallow`); `client-localstorage-schema`, `rerender-defer-reads`; `useSolicitudStore.ts`, `useFbpSummary.ts` |
| zod 4 | zod 4 (changelog); `solicitud.schemas.ts`; paquete instalado |
| Tailwind 4 | Tailwind v4 (actualización); Web Interface Guidelines (animación, foco); `globals.css` |
| Rendimiento | react-best-practices `bundle-*`, `js-*`, `async-*`, `client-passive-event-listeners`; Web Interface Guidelines (rendimiento) |
| Accesibilidad e interfaz | Web Interface Guidelines; WAI-ARIA APG; WCAG 2.2 (1.4.3); `create-component` |
| Seguridad básica | constitución IV; `review-code`; guía "Upgrading to 16" |
| Pruebas | Testing Library (prioridad de queries); TanStack Query (testing); `vitest.config.mts` y `src/tests/support/*` |
| Hallazgos y deuda existente | búsquedas con Grep sobre `src/` el 2026-11-03; `proxy.md` y `version-16.md` de Next 16.2.10 |
