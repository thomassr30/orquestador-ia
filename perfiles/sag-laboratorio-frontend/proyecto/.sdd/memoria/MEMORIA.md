# Memoria — sag.laboratorio.app.frontend
_Creada por el perfil sag-laboratorio-frontend del harness. Desde aquí la mantiene el equipo._

## Qué es
Frontend del Sistema de Laboratorios del SAG: wizard de solicitudes de análisis (`/solicitudes`) y recepción de muestras en laboratorio (bandeja, KPIs en tiempo real, checklist, QR) en `/dashboard`. Reglas e instrucciones en `CLAUDE.md` y `.claude/rules/constitution.md`.

## Stack
Next.js 16 (App Router, standalone), React 19, TypeScript strict, TanStack Query 5, Zustand 5, zod 4, Tailwind 4, Vitest. Consume solo el BFF `sag.laboratorio.api.bff` por el proxy `src/app/api/bff/**`. Auth SSO SAG (Keycloak) vía BFF, cookie `bff_session`.

## Mapa de módulos
`src/modules/`: `home`, `dashboard`, `solicitud-analisis`, `recepcion-muestras`. Kit SAG en `src/global/ui/sag` (no se modifica); componentes propios en `src/global/ui/custom`.

## Convenciones clave
Skills del proyecto en `.claude/skills` (índice: `project-conventions`). Implementa `frontend-expert`, revisa `frontend-reviewer`. Git Flow SAG (`feature/HU[ID]_…`), commits `<type>(<scope>): <subject>` en español.

## Azure DevOps
- Organización `SubdepartamentoSolucionesTI`, proyecto `Sistema Laboratorio` (repo, work items, pipelines).
- Normas Generales SAG: wiki `Normas-Generales.wiki`, proyecto `Normas Generales`, misma organización.
- Tipo de HU: Product Backlog Item. Antes de la PR la HU va en `Done`/`Desarrollo Terminado` con `HistoriaValidada = True` (CONTRIBUTING). Consulta los estados válidos antes de proponer una transición.
- Vínculo con el código: la PR se vincula a la HU; la crea la persona (el harness bloquea crear PR).

## Comandos
`npm run dev` · `npm run type-check` · `npm run lint` · `npm test` · `npm run test:ci` · `npm run build`.

## Temas disponibles

## Decisiones vigentes más importantes
