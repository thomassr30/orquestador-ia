#!/usr/bin/env node
// Descarga la última versión desde GitHub y reinstala. Uso: node update.js   (o: npm run update)
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');
const ROOT = __dirname;
const IS_WIN = process.platform === 'win32';
const sh = (line, extraEnv = {}) => spawnSync(line, { cwd: ROOT, stdio: 'inherit', shell: true, env: { ...process.env, ...extraEnv } });

const st = spawnSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8', shell: true });
if (st.status !== 0) { console.error('Esta carpeta no es un repositorio git. Clónala desde GitHub primero.'); process.exit(1); }
if (st.stdout.trim()) {
  console.log('Tienes cambios locales sin commit:\n' + st.stdout);
  console.log('Haz commit (git add . && git commit -m "mis ajustes") o descártalos antes de actualizar.');
  process.exit(1);
}
console.log('Descargando cambios...');
const pull = sh('git pull --ff-only', { SDD_SKIP_HOOK: '1' });
if (pull.status !== 0) {
  console.error('\nNo se pudo actualizar con fast-forward (tu copia y GitHub divergen).');
  console.error('Resuélvelo con: git pull --rebase   y luego: node install.js');
  process.exit(1);
}
const r = spawnSync(process.execPath, [path.join(ROOT, 'install.js'), ...process.argv.slice(2)], { cwd: ROOT, stdio: 'inherit' });
process.exit(r.status || 0);
