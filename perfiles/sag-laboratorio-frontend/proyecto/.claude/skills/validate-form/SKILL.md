---
name: validate-form
description: Implementa formularios con el patrón del proyecto - validación con esquemas zod que producen un mapa Errores, el componente Field para mostrar errores, limpieza de errores al corregir y estado en useState o Zustand. Usar cuando se pida crear o modificar un formulario, un paso de wizard, filtros con validación, o reglas de validación de campos.
---

# Formularios y validación

El proyecto **no usa react-hook-form** (está instalado pero sin uso). El patrón real es:
estado propio (useState o store Zustand) → esquema zod → mapa `Errores` → `Field`.
Referencia: `modules/solicitud-analisis/schemas/solicitud.schemas.ts`,
`modules/solicitud-analisis/hooks/useErrorCleanup.ts` y los pasos de
`modules/solicitud-analisis/components/wizard/steps/`.

## 1. Tipos

```ts
// modules/<modulo>/types/form.ts
export type Errores = Record<string, string> // campo → mensaje
export interface MiFormValues { nombre: string; fechaDesde: string; /* ... */ }
```

Los valores del formulario se manejan como `string` (lo que entregan los inputs); la conversión
a números/fechas del payload se hace al enviar, en `utils/payload.ts`.

## 2. Esquema — `modules/<modulo>/schemas/<tema>.schemas.ts`

```ts
import { z } from 'zod'

const OBLIGATORIO = 'Este campo es obligatorio.'

function req(mensaje: string = OBLIGATORIO) {
  return z.string().trim().min(1, mensaje)
}

const miFormSchema = z
  .object({ nombre: req(), fechaDesde: req() })
  .superRefine((v, ctx) => {
    // reglas cruzadas: obligatorio condicional, rangos, fechas futuras…
    if (v.esOtro && !v.otroTexto.trim()) {
      ctx.addIssue({ code: 'custom', message: OBLIGATORIO, path: ['otroTexto'] })
    }
  })

/** Valida y devuelve un Errores (vacío si es válido). */
export function validarMiForm(valores: MiFormValues): Errores {
  const r = miFormSchema.safeParse(valores)
  return r.success ? {} : issuesToErrores(r.error)
}
```

- Mensajes en español, terminados en punto, pensados para el usuario.
- `issuesToErrores` guarda el **primer** mensaje por campo (`issue.path[0]`).
- Si la regla depende de "ahora", el esquema es una función que recibe `ahora: Date` (testeable).
- Constantes de límites (máx. caracteres, tamaños) en `constants.ts` o en el servicio, no inline.
- Zod v4: usar `code: 'custom'` en `addIssue`.

## 3. Componente

```tsx
const [errores, setErrores] = useState<Errores>({})
const limpiarError = useErrorCleanup(setErrores, validarMiForm)

<Field label='Nombre' requerido error={errores.nombre}>
  <Input
    value={nombre}
    onChange={(e) => {
      const candidato = { ...valores, nombre: e.target.value }
      setValores(candidato)
      limpiarError('nombre', candidato) // revalida solo si el campo ya mostraba error
    }}
    onBlur={() => onCampoBlur('nombre')}
  />
</Field>
```

- Validar todo al enviar/avanzar; si `Object.keys(errores).length > 0`, no continuar y llevar el
  foco al primer campo con error.
- Mientras el usuario corrige, `useErrorCleanup` quita o actualiza el error de ese campo.
- `Field` conecta `label`, `requerido` (asterisco), `error` y `hint` con `aria-describedby`.
- Errores de servidor: un 422 de `BffApiError` trae `fields` → mapearlos a `Errores` y mostrarlos
  igual que los locales, llevando al paso donde está el campo si es un wizard (ver
  `modules/solicitud-analisis/utils/submitErrors.ts`).

## 4. Dónde vive el estado

- Formulario de una pantalla o filtros: `useState` en el componente o en un hook del módulo
  (ver `useSolicitudesPendientes`: filtros editados vs. filtros aplicados).
- Formulario multipaso o compartido entre pantallas: store Zustand en `modules/<modulo>/store/`.
  - Acciones con nombre de dominio (`setCampos`, `agregarPlaga`, `siguientePaso`).
  - Leer con selectores por campo: `useSolicitudStore((s) => s.origen)`, no el store completo.
  - Persistir borradores con `persist` + `createJSONStorage(() => sessionStorage)` solo si se
    pide; nunca guardar `File` ni datos sensibles en storage.

## Checklist

- [ ] Esquema zod que produce `Errores`, mensajes en español
- [ ] Reglas condicionales en `superRefine`, constantes con nombre
- [ ] `Field` en cada control, con `requerido` y `error`
- [ ] Limpieza de errores al corregir y foco al primer error al enviar
- [ ] Errores 422 del BFF mapeados a campos
- [ ] Sin react-hook-form (salvo decisión explícita del equipo)
