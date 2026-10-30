# Node.js (npm / pnpm / yarn)
- Auditoría: `npm audit --omit=dev` (+ `npm audit` completo para dev), `npm outdated`; pnpm: `pnpm audit`, `pnpm outdated`; yarn: `yarn npm audit`.
- Patch/minor: `npm update` (respeta rangos de package.json) o `npx npm-check-updates --target minor -u` + `npm install`.
- Major: `npm install paquete@^X` de a uno; leer CHANGELOG/guía de migración.
- Corrección automática: `npm audit fix` (sin `--force`; `--force` puede introducir majors).
- Runtime: subir la versión de Node en `.nvmrc`/`engines`/Dockerfile/pipeline juntos.
