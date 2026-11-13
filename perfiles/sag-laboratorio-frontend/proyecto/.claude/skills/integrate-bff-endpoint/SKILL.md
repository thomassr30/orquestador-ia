---
name: integrate-bff-endpoint
description: Integra un endpoint del BFF (sag.laboratorio.api.bff) en el frontend - proxy route.ts en src/app/api/bff, tipos del contrato, servicio con fetchBff y hook de React Query (useQuery o useMutation) con manejo de errores. Usar cuando se pida consumir, conectar o integrar un endpoint, servicio o API del BFF, o agregar una consulta o acción que llame al backend.
---

# Integrar un endpoint del BFF

El navegador **nunca** llama al BFF directo. Toda llamada pasa por un proxy de Next.js en
`src/app/api/bff/**`, que reenvía la cookie de sesión y devuelve el sobre `{ ok, data, meta }`.
Referencia normativa: `README.md` → "Integración con el BFF" y "Dónde van los tipos".

Antes de empezar, confirma con el usuario (o en el contrato del BFF) el método, la ruta del BFF,
el request, la forma de `data` y los códigos de error relevantes (400/403/404/409/422).

## Las 4 capas (en este orden)

### 1. Proxy — `src/app/api/bff/<recurso>/.../route.ts`

Un archivo por ruta, usando `makeBffProxyHandler` de `@/global/api/lib/bffProxy`. No se escribe
`fetch` a mano ni se lee `BFF_BASE_URL` en el route.

```ts
import { makeBffProxyHandler } from '@/global/api/lib/bffProxy'
import { TIMEOUT_RECEPCION_MS } from '@/global/api/services/recepcion.service'

export const POST = makeBffProxyHandler<{ idRecepcion: string }>('POST', {
  endpointBuilder: ({ idRecepcion }) =>
    `/api/bff/recepciones/${encodeURIComponent(idRecepcion)}/confirmar`,
  timeoutMs: TIMEOUT_RECEPCION_MS,
})
```

- Ruta fija: `endpoint: '/api/bff/...'`. Ruta con params de Next: `endpointBuilder` + `encodeURIComponent`.
- El query string se reenvía solo; no hay que armarlo en el proxy.
- Archivos (PDF, etc.): `respuestaBinaria: true` y un `timeoutMs` amplio.
- Streams SSE: `makeBffEventStreamHandler` + `export const dynamic = 'force-dynamic'`.
- Las rutas de `src/app/api/bff/**` replican el contrato del BFF (en español).

### 2. Tipos — `src/global/types/api/<servicio>.ts`

Requests y la forma de `data` de la respuesta. Nunca `any`. Documenta con JSDoc los campos
cuyo significado no es obvio (estados, formatos de fecha, nulos). El sobre (`BffResponse`,
`BffApiError`, `BffPagination`) ya existe en `@/global/types/bff`; no se redefine.

### 3. Servicio — `src/global/api/services/<servicio>.service.ts`

Constantes de ruta (`XXX_API_PATH`), builders de query y funciones que llaman al proxy:

```ts
export function cancelarRecepcion(idRecepcion: number): Promise<RecepcionCancelada> {
  return fetchBff<RecepcionCancelada>(rutaCancelarRecepcion(idRecepcion), {
    method: 'POST',
    timeoutMs: TIMEOUT_RECEPCION_CLIENTE_MS,
  })
}
```

- `fetchBff<T>` devuelve solo `data`. Usa `fetchBffRaw<T>` si se necesitan `warnings` o `pagination`.
- Ambos lanzan `BffApiError` (`status`, `code`, `fields`, `traceId`) cuando `ok: false`.
- Query strings con `URLSearchParams`; los parámetros vacíos no se envían (ver
  `buildSolicitudesBandejaQuery` en `solicitudesBandeja.service.ts`).
- Timeouts como constantes con nombre y JSDoc del porqué. Si el proxy tiene `timeoutMs`, el
  cliente corta **después** (`TIMEOUT_X_CLIENTE_MS = TIMEOUT_X_MS + 5_000`) para recibir el 504 tipado.
- Nada de URLs absolutas ni hosts: solo rutas relativas `/api/bff/...`.

### 4. Hook — `src/modules/<módulo>/hooks/use<Algo>.ts`

Archivo con `'use client'`. Ejemplos de referencia:
`modules/recepcion-muestras/hooks/useSolicitudesPendientes.ts` (query paginada),
`modules/recepcion-muestras/hooks/useRecepcionMutations.ts` (mutations),
`modules/solicitud-analisis/hooks/useSolicitudDetail.ts` (detalle con `select`).

**Query:**

```ts
export const CLAVE_BANDEJA = ['solicitudes', 'recepcion'] as const

const consulta = useQuery({
  queryKey: [...CLAVE_BANDEJA, params],
  queryFn: () => fetchSolicitudesBandeja(params),
  placeholderData: keepPreviousData, // si pagina o filtra
  retry: 1,
})
```

- `queryKey` jerárquica, exportada como constante si otro hook debe invalidarla.
- No reintentar 401/403/404: `retry: (n, e) => !(e instanceof BffApiError && [401, 404].includes(e.status)) && n < 1`.
- Transformar la respuesta a modelo de vista con `select` o una función de `utils/` (`mapearXAFila`).
- `enabled: Boolean(id)` cuando depende de un parámetro opcional.

**Mutation:**

```ts
export function useCancelarRecepcion() {
  const refrescarBandeja = useRefrescarBandeja()
  return useMutation({
    mutationFn: cancelarRecepcion,
    retry: false,          // un timeout no distingue «no llegó» de «llegó y tardó»
    onSettled: refrescarBandeja, // invalida aunque falle (un 409 también indica cambio)
  })
}
```

- Varios argumentos → un objeto input tipado (`{ idRecepcion, cuerpo }`).
- `invalidateQueries(...).catch(...)` con `console.error` y prefijo `[nombreHook]`.

## Manejo de errores (obligatorio)

- El detalle técnico (`code`, `traceId`, error original) va a `console.error`; al usuario solo un
  mensaje en español, claro y sin códigos internos.
- Distinguir por `error.status`/`error.code` solo cuando la UI hace algo distinto (403 → `AccessNotice`,
  409 → avisar que cambió el estado, 422 con `fields` → errores por campo).
- Nunca `catch {}` vacío salvo intentos explícitamente "best effort" (ej. `keepalive`), con comentario.
- Mostrar el error con `StatusAlert`, `RetryNotice` o `NoticeModal` (`@/global/ui/custom/feedback`).

## Checklist

- [ ] Proxy con `makeBffProxyHandler`, sin `fetch` manual ni URLs hardcodeadas
- [ ] Tipos en `global/types/api/<servicio>.ts`, sin `any`
- [ ] Servicio con path, builders y timeouts nombrados
- [ ] Hook con `queryKey` estable, política de `retry` explícita e invalidación en mutations
- [ ] Errores logueados con `traceId` y mensaje genérico al usuario
- [ ] Imports con `@/` (nunca `../`)
- [ ] `npm run type-check` y `npm run lint` pasan
