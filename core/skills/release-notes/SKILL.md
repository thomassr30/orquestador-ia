---
name: release-notes
description: Redacta textos de entrega sin ejecutar git — mensaje de commit (Conventional Commits), descripción de PR/MR con cómo probar y riesgos, entrada de CHANGELOG y notas de versión con SemVer. Usar al cerrar un cambio o cuando el usuario pida preparar commit, PR o release.
---
# Commit, PR y notas de versión (solo borradores)

**Nunca ejecuta git/gh/glab**: escribe los textos en `changes/<id>/entrega.md` y los muestra para que el usuario los use o apruebe su ejecución.

## Mensaje de commit (Conventional Commits)
`<tipo>(<ámbito>): <resumen en imperativo, ≤ 72 caracteres>` + cuerpo (qué y por qué) + pie (`Refs: LAB-123`, `BREAKING CHANGE: …`).
Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `perf`, `build`, `ci`, `chore`. Respeta la convención del repo si es otra.

## Descripción de PR / MR
```markdown
## Qué cambia
## Por qué (ticket: LAB-123)
## Cómo probar (pasos + datos)
## Evidencia (tests, capturas de QA/visual)
## Riesgos y plan de rollback
## Checklist: tests ✅ · lint ✅ · migraciones (sí/no) · config nueva por entorno (sí/no) · docs
Closes #123   (o AB#123 / LAB-123 según el gestor)
```

## CHANGELOG y versión
- Entrada en `CHANGELOG.md` (Keep a Changelog: Added/Changed/Fixed/Removed/Security) en lenguaje para usuarios.
- SemVer: MAJOR (rompe compatibilidad), MINOR (funcionalidad compatible), PATCH (correcciones). Si hay `BREAKING CHANGE`, advertirlo.
- Notas de versión para el cliente/institución: sin jerga técnica, agrupadas por funcionalidad, con impacto y acciones requeridas.
