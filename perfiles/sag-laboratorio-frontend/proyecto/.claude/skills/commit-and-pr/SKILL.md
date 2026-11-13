---
name: commit-and-pr
description: Prepara commits, ramas y Pull Requests según el Git Flow SAG y los hooks de Husky del proyecto (nombre de rama, formato de commit en español, versión de package.json, checklist de PR y vínculo con la HU en Azure DevOps). Usar cuando se pida crear una rama, hacer un commit, redactar el mensaje de commit, subir cambios, o preparar o describir una PR.
---

# Commits, ramas y PR

Fuente oficial: `CONTRIBUTING.md` (Git Flow SAG, guía DTI v6). Los hooks de `.husky/` validan
casi todo; el objetivo es que no fallen.

Con el harness: crear la rama, el commit y el push los hace el orquestador **solo si la persona lo pidió**, y
cada uno pide su confirmación (antes se muestra el comando y, en un commit, el mensaje completo). Un commit con
atribución de IA se bloquea, y `--no-verify` y `push --force` están denegados. **Crear o actualizar la PR está
bloqueado**: esta skill redacta la descripción y la persona crea la PR en Azure DevOps.

## Rama

- Solo `feature/…`, `release/…`, `hotfix/…` (más `master` y `develop`). No existen `docs/`, `chore/`, `refactor/`.
- Feature de una HU: `feature/HU[ID]_[Descripcion]` (ej. `feature/HU24576_Recepcionar_Muestra_Individual`).
- Se crea desde `develop` actualizado; hotfix desde `master`.
- No commitear directo en `master`/`develop` (el pre-commit advierte).

## Commit

```
<type>(<scope>): <subject>
<type>(<scope>)!: <subject>      ← cambio incompatible
```

- `type`: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
- `scope`: módulo o componente (`recepcion-muestras`, `solicitud-analisis`, `Form`) o la task (`#1234`).
- `subject`: español, imperativo presente ("Agrega", "Corrige", "Ajusta"), sin punto final,
  ≤ 200 caracteres en total, sin empezar con "Yo", "Alguien" o "Este commit". Describe lo que
  aporta el cambio, no quién lo hizo.
- Cuerpo opcional y libre para el porqué.

```
✔ feat(recepcion-muestras): Agrega el modal de cambio de área funcional
✔ fix(recepcion-muestras): Ajusta el timeout del proxy al confirmar la recepción
✗ feat: agregado modal.
```

- Un commit = un cambio coherente. Revisar `git status` y `git diff --staged` antes; no incluir
  `.env`, PDFs, logs ni exports.
- Nunca usar `--no-verify`. Si un hook falla, corregir la causa.

## Push y versión

- El pre-push bloquea si hay cambios sin commitear en `src/` (usar `git stash -u` si son de otra tarea).
- Corre `npm run build` + `lint`.
- Sube la versión de `package.json` según los commits de la rama vs `origin/develop`:
  `!`/`BREAKING CHANGE` → mayor, algún `feat` → menor, si no → parche. Crea el commit
  `chore(version): Actualiza la versión a vX.Y.Z` y **detiene el push**: hay que volver a lanzarlo.
- No subir la versión a mano salvo que se pida.

## Antes de la PR

```bash
npm run type-check
npm run lint
npm test
```

Checklist (de `CONTRIBUTING.md`):
- [ ] Rama con nomenclatura correcta y `develop` sincronizado
- [ ] Commits con formato y descripción clara
- [ ] Sin archivos que no deben versionarse
- [ ] HU vinculada a la PR, en estado `Done`/`Desarrollo Terminado` y `HistoriaValidada = True` (soporte: Task o Bug)
- [ ] Archivos coherentes con la HU
- [ ] type-check, lint y npm test sin errores
- [ ] Sin observaciones pendientes (correr la skill `review-code`)

## Descripción de la PR

PR `feature/…` → `develop` en Azure DevOps, vinculada a la HU. Se entrega en el chat, en un bloque listo
para copiar, con el título y la rama de origen y destino; la persona la crea. Estructura sugerida, en español:

```
## Resumen
Qué aporta y para qué HU.

## Cambios
- Lista por módulo/archivo relevante.

## Cómo probar
Pasos concretos y datos de prueba.

## Notas
Dependencias con el BFF, migraciones, pendientes.
```
