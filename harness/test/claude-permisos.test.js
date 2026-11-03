'use strict';
// Compactador en Claude Code: solo se compacta lo que las reglas de permiso del usuario ya permiten (claude.js:25).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { tmp } = require('./helpers');
const { permite, coincide } = require('../src/adapters/claude-permisos');

const settings = (dir, rel, permissions) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, typeof permissions === 'string' ? permissions : JSON.stringify({ permissions })); };
const env = () => ({ home: tmp('sdd-home-claude-'), root: tmp('sdd-proj-claude-'), managedDir: tmp('sdd-managed-') });

test('la sintaxis de las reglas sigue la tabla de la documentación de Claude Code', () => {
  const casos = [
    ['npm run build', 'npm run build', true], ['npm run build', 'npm run build --watch', false],
    ['npm run *', 'npm run build', true], ['npm run *', 'npm run test --watch', true], ['npm run *', 'npm run', true], ['npm run *', 'npm install', false],
    ['git log * main', 'git log --oneline main', true], ['git log * main', 'git log main', false],
    ['git * main', 'git push origin main', true], ['git * main', 'git log', false],
    ['* --version', 'node --version', true], ['* --version', 'node -v', false],
    ['ls *', 'ls -la', true], ['ls *', 'ls', true], ['ls *', 'lsof', false], ['ls*', 'lsof', true],
    ['* --help *', 'npm --help x', true], ['* --help *', 'npm --help', false],
    ['npm test:*', 'npm test', true], ['npm test:*', 'npm test -- --watch', true], ['npm test:*', 'npm testing', false],
  ];
  for (const [spec, cmd, esperado] of casos) assert.strictEqual(coincide(spec, cmd), esperado, `Bash(${spec}) con «${cmd}»`);
});

test('sin una regla que lo permita, no se compacta (el compactador no concede permisos)', () => {
  const o = env();
  assert.strictEqual(permite(o.root, 'npm test', o).ok, false);
  settings(o.home, '.claude/settings.json', { allow: ['Bash(npm test:*)'] });
  assert.strictEqual(permite(o.root, 'npm test', o).ok, true, 'permitido por el usuario');
  assert.strictEqual(permite(o.root, 'npm run lint', o).ok, false, 'otro comando no');
});

test('preguntar y denegar ganan sobre permitir, venga de donde venga la regla', () => {
  const o = env();
  settings(o.home, '.claude/settings.json', { allow: ['Bash(npm test:*)', 'Bash(go test *)'] });
  settings(o.root, '.claude/settings.local.json', { ask: ['Bash(npm test *)'] });
  assert.match(permite(o.root, 'npm test', o).motivo, /preguntar/);
  settings(o.managedDir, 'managed-settings.json', { deny: ['Bash(go *)'] });
  assert.match(permite(o.root, 'go test ./...', o).motivo, /denegar/);
  settings(o.managedDir, 'managed-settings.d/10-equipo.json', { ask: ['Bash'] });
  assert.strictEqual(permite(o.root, 'npm run build', o).ok, false, '«Bash» a secas toca todos los comandos');
});

test('comandos compuestos: cada parte debe estar permitida; una parte con preguntar basta para no compactar', () => {
  const o = env();
  settings(o.root, '.claude/settings.json', { allow: ['Bash(npm test *)'], ask: ['Bash(rm *)'] });
  assert.strictEqual(permite(o.root, 'npm test && npm test -- --ci', o).ok, true);
  assert.strictEqual(permite(o.root, 'npm test && npm run deploy', o).ok, false);
  assert.strictEqual(permite(o.root, 'npm test; FOO=1 rm -rf dist', o).ok, false);
});

test('un archivo de configuración ilegible no se toma como permiso', () => {
  const o = env();
  settings(o.home, '.claude/settings.json', { allow: ['Bash'] });
  settings(o.root, '.claude/settings.json', '{ "permissions": { "deny": ["Bash(npm test *)"] ');
  assert.match(permite(o.root, 'npm test', o).motivo, /no se pudo leer/);
});
