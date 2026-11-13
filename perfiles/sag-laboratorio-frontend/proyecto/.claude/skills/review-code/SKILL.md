---
name: review-code
description: Revisa el código nuevo de la rama o del diff según los criterios de revisión de PR del proyecto (severidades ALTA seguridad, MEDIA manejo de errores y hardcoding, BAJA buenas prácticas) y las convenciones del README. Usar cuando se pida revisar código, revisar una PR, revisar los cambios antes de subir, o validar que algo cumple las normas del proyecto.
---

# Revisar código

Criterio oficial: `CONTRIBUTING.md` → "Qué revisa el revisor" y "Checklist rápido antes de cada PR";
convenciones de código en `README.md`. Ante discrepancia manda la guía SAG citada en CONTRIBUTING.

## Alcance

Solo **código nuevo o modificado**. Nunca reportar problemas de código preexistente.

```bash
git fetch origin develop
git diff origin/develop...HEAD --stat
git diff origin/develop...HEAD
```

Si hay cambios sin commitear, incluir también `git diff` y `git diff --staged`.

## Qué buscar

### ALTA — Seguridad
- Renderizado sin sanitizar (`dangerouslySetInnerHTML` con datos externos).
- Secretos, tokens o URLs internas en el código o en variables `NEXT_PUBLIC_*`.
- Redirecciones con el query param crudo (pasarlo por `sanitizeReturnTo()` de `@/global/config/routes`).
- Cookie `bff_session` sin `httpOnly` + `sameSite:'lax'` + `secure` (salvo local).
- Llamadas al BFF que salten el proxy `src/app/api/bff/**` o rutas protegidas sin `requireAuth()`.

### MEDIA — Manejo de errores
- `catch` vacío o que pierde el error original; errores sin `console.error` (con `code`/`traceId` si es `BffApiError`).
- Continuar el flujo tras un fallo; mutations con reintento automático.
- Mostrar al usuario mensajes técnicos o códigos internos.
- Promesas sin manejar (`invalidateQueries` sin `.catch`).

### MEDIA — Hardcoding
- Valores mágicos sin nombre ni comentario (timeouts, límites, códigos de estado de negocio).
- URLs o hosts en el código; config fuera de `getEnv`/`getRequiredEnv`/`getBaseUrl` + `envMapping.ts`.

### BAJA — Buenas prácticas
- `any`, `as` innecesarios, tipos en el lugar equivocado (ver "Dónde van los tipos").
- Nombres que mezclan idiomas en la parte técnica o no siguen PascalCase/`use<Algo>`/UPPER_SNAKE_CASE.
- Imports con `../`; imports del kit SAG fuera de `@/global/ui`; cambios dentro de `src/global/ui/sag`.
- Código comentado sin explicación, duplicado, o componentes que podrían reutilizar `ui/custom`.
- `'use client'` innecesario; lógica de negocio dentro de `page.tsx`.
- `useEffect` para derivar estado que se puede calcular; dependencias faltantes.
- Accesibilidad: controles sin label, botones de ícono sin `aria-label`.

### Proceso
- Rama `feature/HU[ID]_…`, `release/…` o `hotfix/…`; commits `<type>(<scope>): <subject>`.
- Archivos coherentes con la HU; sin PDFs, logs ni exports versionados.
- Si el diff toca `README.md`, `CONTRIBUTING.md` o `.claude/`, aplicar también `sync-rules`.

## Verificación

Correr desde la raíz y reportar el resultado real:

```bash
npm run type-check
npm run lint
```

## Formato del reporte

Agrupar por severidad (ALTA → BAJA). Por hallazgo: `archivo:línea`, problema, por qué importa y
corrección sugerida. Terminar con el voto sugerido: **Aprobar (10)** si no hay hallazgos,
**Esperar autor (−5)** si hay alguno (todas las severidades se corrigen antes de aprobar),
**Rechazar (−10)** solo ante problemas críticos. No inventar hallazgos para llenar el reporte.
