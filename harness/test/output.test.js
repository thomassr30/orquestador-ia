'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { tmp, project, REPO } = require('./helpers');
process.env.SDD_HOME = tmp('sdd-home-');
const { isCompactable, compact } = require('../src/output');
const { Policy } = require('../src/policy');

test('solo se envuelven comandos de verificación simples', () => {
  for (const c of ['npm test', 'npm run test:unit', 'npx vitest run src/a.ts', 'npx ng build --configuration development', 'go test ./...', 'pnpm run lint']) assert.ok(isCompactable(c, { win: false }), c);
  for (const c of ['npm test | tail -5', 'git status', 'npm test > out.txt', 'echo $(npm test)', 'npm install x', 'node script.js']) assert.ok(!isCompactable(c, { win: false }), c);
  assert.ok(!isCompactable('./gradlew test', { win: true }), 'cmd.exe no entiende ./');
});

test('compacta: conserva errores con contexto y el resumen final, omite el ruido', () => {
  const lines = [...Array(400).keys()].map(i => `ok ${i}`);
  lines.splice(200, 0, 'FAIL src/a.test.ts > suma', '  Expected 3, received 4');
  const r = compact(lines.join('\n') + '\nTests: 1 failed, 400 passed', 1, { max: 2000 });
  assert.ok(r.compacted);
  assert.match(r.text, /FAIL src\/a\.test\.ts/);
  assert.match(r.text, /Expected 3, received 4/);
  assert.match(r.text, /Tests: 1 failed/);
  assert.match(r.text, /líneas omitidas/);
  assert.ok(r.to < 60, `quedaron ${r.to} líneas`);
  const short = compact('todo bien\n3 passed', 0);
  assert.strictEqual(short.compacted, false);
});

test('el comando envuelto se evalúa por su contenido real (no sirve para colar un git commit)', () => {
  const p = new Policy({ root: '/tmp/p' });
  const wrap = c => `node "C:/Users/X/.sdd-orquestador/bin/sdd-salida.js" ${Buffer.from(c).toString('base64')} 4000`;
  assert.strictEqual(p.checkCommand(wrap('git commit -m x')).decision, 'deny');
  assert.strictEqual(p.checkCommand(wrap('npm test')).decision, 'allow');
  assert.strictEqual(p.checkCommand(wrap('rm -rf dist')).critical, true);
});

test('sdd-salida ejecuta, compacta y conserva el código de salida', () => {
  const dir = project({ 'package.json': JSON.stringify({ scripts: { test: 'node -e "for(let i=0;i<1500;i++)console.log(\'ok \'+i);console.log(\'FAIL x\');process.exitCode=3"' } }) });
  const r = spawnSync(process.execPath, [path.join(REPO, 'bin', 'sdd-salida.js'), Buffer.from('npm test').toString('base64'), '2000'], { cwd: dir, encoding: 'utf8' });
  assert.strictEqual(r.status, 3);
  assert.match(r.stdout, /Salida compactada/);
  assert.match(r.stdout, /FAIL x/);
  const full = /Completa en: (\S+)/.exec(r.stdout)[1];
  assert.match(fs.readFileSync(full, 'utf8'), /ok 150/, 'la salida completa queda disponible');
});
