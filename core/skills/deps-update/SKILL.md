---
name: deps-update
description: Actualización controlada de dependencias y frameworks (auditoría de vulnerabilidades y desactualizadas, priorización, lotes por riesgo, majors de a uno con guía de migración, verificación) para Node, Go, Android/Gradle, iOS (SPM/CocoaPods), Expo/React Native y frameworks como Angular, NestJS o Next.js. Usar cuando el usuario pida actualizar dependencias, corregir vulnerabilidades o subir de versión un framework.
---
# Actualización de dependencias

Referencias por ecosistema (lee solo la del proyecto):
`references/node.md` · `references/go.md` · `references/mobile.md` (Gradle, SPM/CocoaPods, Expo, React Native) · `references/frameworks.md` (Angular, NestJS, Next.js, AdonisJS, React)

## Proceso
1. **Auditoría** (sin cambiar nada): vulnerabilidades + desactualizadas → `changes/<id>/deps-audit.md` con tabla: paquete | actual | objetivo | tipo (patch/minor/major) | motivo (CVE/soporte/funcionalidad) | riesgo.
2. **Priorizar**: (1) vulnerabilidades altas/críticas con explotación aplicable, (2) fin de soporte (runtime, framework), (3) patch/minor en lote, (4) majors **de a uno**.
3. **GATE**: el usuario aprueba qué lotes se aplican (agregar o subir dependencias es decisión crítica).
4. **Aplicar por lote**: actualizar → instalar con el lockfile → leer changelog/guía de migración en majors → ajustar código → tests/lint/build.
5. **Verificar** con `sdd-verify`; si un lote rompe y no se resuelve en 2 intentos, revertir ese lote y reportar.
6. Registrar en memoria versiones mínimas y trampas de migración encontradas.

## Reglas
- Nunca actualizar todo a la vez a "latest".
- Respetar los rangos de compatibilidad del framework (ej. versiones de React/RN que exige Expo o Reanimated).
- Lockfile siempre actualizado y versionado; sin mezclar gestores (npm/pnpm/yarn).
- Sin "overrides/resolutions" para silenciar vulnerabilidades sin explicar el riesgo.
- Proponer Renovate o Dependabot (config agrupada por tipo y horario) si el proyecto no lo tiene; no activarlo sin aprobación.
