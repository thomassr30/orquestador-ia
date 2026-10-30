#!/usr/bin/env node
// Workspace multi-repo (.sdd/workspace.json en la carpeta actual).
// Uso: init [nombre] | add <nombre> <ruta> <rol> [contrato] | list | check
'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join(process.cwd(), '.sdd', 'workspace.json');
const [cmd, ...a] = process.argv.slice(2);
const load = () => { if (!fs.existsSync(FILE)) { console.error('No hay workspace. Crea con: init'); process.exit(1); } return JSON.parse(fs.readFileSync(FILE, 'utf8')); };
const save = w => { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(w, null, 2) + '\n'); };
const ROLES = ['backend', 'frontend', 'mobile', 'db', 'infra', 'lib', 'docs'];
const cmds = {
  init() { if (fs.existsSync(FILE)) return console.log('Ya existe .sdd/workspace.json'); save({ nombre: a[0] || path.basename(process.cwd()), repos: [] }); console.log('ok'); },
  add() {
    const [nombre, ruta, rol, contrato] = a;
    if (!nombre || !ruta || !ROLES.includes(rol)) { console.error(`Uso: add <nombre> <ruta> <${ROLES.join('|')}> [contrato]`); process.exit(1); }
    const w = load(); w.repos = w.repos.filter(r => r.nombre !== nombre);
    w.repos.push({ nombre, ruta: ruta.replace(/\\/g, '/'), rol, ...(contrato ? { contrato } : {}) }); save(w); console.log('ok');
  },
  list() { const w = load(); for (const r of w.repos) console.log(`${r.nombre.padEnd(24)} ${r.rol.padEnd(9)} ${r.ruta}${r.contrato ? '  contrato: ' + r.contrato : ''}`); },
  check() {
    const w = load(); let ok = true;
    for (const r of w.repos) {
      const p = path.resolve(process.cwd(), r.ruta);
      const exists = fs.existsSync(p), git = fs.existsSync(path.join(p, '.git')), mem = fs.existsSync(path.join(p, '.sdd', 'memoria', 'MEMORIA.md'));
      const c = r.contrato ? fs.existsSync(path.join(p, r.contrato)) : null;
      if (!exists) ok = false;
      console.log(`${exists ? '✓' : '✗'} ${r.nombre.padEnd(24)} ${exists ? '' : 'NO EXISTE '}${git ? 'git' : 'sin git'} · ${mem ? 'memoria' : 'sin memoria'}${c === null ? '' : c ? ' · contrato OK' : ' · contrato NO encontrado'}`);
    }
    process.exit(ok ? 0 : 1);
  }
};
(cmds[cmd] || (() => { console.error('Comandos: init | add | list | check'); process.exit(1); }))();
