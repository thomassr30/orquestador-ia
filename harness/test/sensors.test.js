'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { project, tmp } = require('./helpers');
process.env.SDD_HOME = tmp('sdd-home-');
const { spawnSync } = require('child_process');
const { plan, runSensors, takeBaseline, summarize, quickCheck, detect } = require('../src/sensors');
const { DEFAULTS } = require('../src/config');
const { findProjectRoot } = require('../src/util');

const IS_WIN = process.platform === 'win32';
const bin = (dir, name) => { const f = path.join(dir, 'node_modules', '.bin', IS_WIN ? `${name}.cmd` : name); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, ''); };
const cfg = (over = {}) => ({ ...DEFAULTS, sensores: { ...DEFAULTS.sensores, ...over } });

// Disco que no distingue mayúsculas (Windows y macOS por defecto; Linux sí las distingue).
const caseInsensitiveFs = (() => { const d = tmp('sdd-Caso-'); return fs.existsSync(d.replace(/sdd-Caso-/, 'SDD-cASO-')); })();

test('los sensores corren con las mayúsculas reales de la ruta aunque el hook entregue otras ("c:\\…")', { skip: !caseInsensitiveFs && 'el disco distingue mayúsculas' }, () => {
  const base = project({});
  const real = path.join(base, 'Proyecto');
  fs.mkdirSync(path.join(real, '.git'), { recursive: true });
  fs.mkdirSync(path.join(real, 'Src'));
  fs.writeFileSync(path.join(real, 'package.json'), JSON.stringify({ scripts: { test: 'vitest' } }));
  fs.writeFileSync(path.join(real, 'Src', 'a.ts'), '');
  const mangled = path.join(base, 'pROYECTO').replace(/^[A-Z]:/, d => d.toLowerCase());
  const root = findProjectRoot(path.join(mangled, 'src'));
  assert.strictEqual(root, real);
  const steps = plan(root, ['Src/a.ts'], cfg({ alTerminar: ['tests'] }));
  assert.strictEqual(steps.length, 1);
  assert.strictEqual(steps[0].cwd, real);
});

test('detecta eslint, tsc y vitest de un proyecto Node (solo sobre lo cambiado)', () => {
  const dir = project({ 'package.json': JSON.stringify({ scripts: { test: 'vitest' } }), 'eslint.config.js': '', 'tsconfig.json': '{}', 'src/a.ts': '' });
  bin(dir, 'eslint'); bin(dir, 'tsc');
  const d = detect(dir, dir, ['src/a.ts']);
  assert.match(d.lint.cmd, /eslint --no-error-on-unmatched-pattern "src\/a\.ts"/);
  assert.match(d.tipos.cmd, /tsc --noEmit -p tsconfig\.json/);
  assert.match(d.tests.cmd, /vitest related --run --passWithNoTests "src\/a\.ts"/);
});

test('Angular usa tsconfig.app.json y no ejecuta Karma en modo watch', () => {
  const dir = project({ 'package.json': JSON.stringify({ scripts: { test: 'ng test', lint: 'ng lint' } }), 'angular.json': '{}', 'tsconfig.json': '{}', 'tsconfig.app.json': '{}', 'src/app/x.ts': '' });
  bin(dir, 'tsc');
  const d = detect(dir, dir, ['src/app/x.ts']);
  assert.match(d.tipos.cmd, /-p tsconfig\.app\.json/);
  assert.strictEqual(d.lint.cmd, 'npm run lint');
  assert.strictEqual(d.tests, undefined);
});

test('Angular con CLI local: ng build revisa plantillas y Karma corre headless', () => {
  const dir = project({ 'package.json': JSON.stringify({ scripts: { test: 'ng test' } }), 'angular.json': '{}', 'tsconfig.json': '{}', 'src/app/x.component.html': '', 'src/app/x.component.ts': '' });
  bin(dir, 'ng');
  const d = detect(dir, dir, ['src/app/x.component.html', 'src/app/x.component.ts']);
  assert.strictEqual(d.tipos.cmd, 'npx --no-install ng build --configuration development');
  assert.match(d.tests.cmd, /ng test --watch=false --browsers=ChromeHeadless/);
});

test('monorepo: un plan por módulo con su propio package.json', () => {
  const dir = project({ 'web/package.json': JSON.stringify({ scripts: { lint: 'eslint .' } }), 'web/src/a.js': '', 'api/package.json': JSON.stringify({ scripts: { typecheck: 'tsc' } }), 'api/src/b.ts': '' });
  const steps = plan(dir, ['web/src/a.js', 'api/src/b.ts'], cfg({ alTerminar: ['lint', 'tipos'] }));
  assert.deepStrictEqual(steps.map(s => [s.nombre, s.modulo, s.cmd]).sort(), [['lint', 'web', 'npm run lint'], ['tipos', 'api', 'npm run typecheck']]);
});

test('sin código modificado no hay sensores', () => {
  const dir = project({ 'package.json': '{"scripts":{"lint":"x"}}', 'README.md': '' });
  assert.deepStrictEqual(plan(dir, ['README.md'], cfg()), []);
});

test('comandos configurados: ejecuta, resume y marca fallas', async () => {
  const dir = project({ 'src/a.js': '' });
  const c = cfg({ alTerminar: ['lint', 'tests'], comandos: { lint: 'node -e "process.exit(0)"', tests: 'node -e "console.log(\'FAIL src/a.test.js\'); process.exit(1)" {archivos}' } });
  const run = await runSensors(dir, ['src/a.js'], c);
  assert.strictEqual(run.ok, false);
  const text = summarize(run, 1);
  assert.match(text, /✓ lint/);
  assert.match(text, /✗ tests/);
  assert.match(text, /FAIL src\/a\.test\.js/);
});

// Script de "tipos" que imprime los errores de un archivo de texto (así cada caso cambia la salida sin tocar package.json)
const typecheckFrom = dir => {
  fs.writeFileSync(path.join(dir, 'tc.js'), "const t=require('fs').readFileSync('errores.txt','utf8').trim(); if(t){console.log(t);process.exit(2)}");
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { typecheck: 'node tc.js' } }));
};
const commitAll = dir => { for (const a of [['add', '-A'], ['commit', '-qm', 'base']]) spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd: dir }); };

test('errores solo en archivos no tocados: sin línea base quedan «no verificado», nunca aprobados', async () => {
  const dir = project({ 'src/nuevo.ts': '', 'src/viejo.ts': '', 'errores.txt': 'src/viejo.ts(3,1): error TS2304: x' });
  typecheckFrom(dir);
  const c = cfg({ alTerminar: ['tipos'] });
  const run = await runSensors(dir, ['src/nuevo.ts'], c);
  assert.strictEqual(run.ok, false);
  assert.strictEqual(run.results[0].estado, 'no_verificado');
  assert.match(run.results[0].motivo, /sin línea base/);
  fs.writeFileSync(path.join(dir, 'errores.txt'), 'src/nuevo.ts(1,1): error TS2304: y');
  const bad = await runSensors(dir, ['src/nuevo.ts'], c);
  assert.strictEqual(bad.results[0].estado, 'fallido', 'si el error está en lo modificado, falla');
});

test('con línea base del commit actual: mismos errores = aprobado; errores nuevos en otro archivo = fallido', async () => {
  const dir = project({ 'src/nuevo.ts': '', 'src/viejo.ts': '', 'src/otro.ts': '', 'errores.txt': 'src/viejo.ts(3,1): error TS2304: viejo' });
  typecheckFrom(dir);
  commitAll(dir);
  const c = cfg({ alTerminar: ['tipos'] });
  const lb = await takeBaseline(dir, c, ['src/nuevo.ts', 'src/viejo.ts', 'src/otro.ts']);
  assert.ok(lb.ok);
  const same = await runSensors(dir, ['src/nuevo.ts'], c);
  assert.strictEqual(same.results[0].estado, 'aprobado');
  assert.match(same.results[0].motivo, /sin errores nuevos/);
  // El cambio en nuevo.ts rompe otro.ts (el chequeo solo nombra otro.ts): ya no se acepta como «previo»
  fs.writeFileSync(path.join(dir, 'errores.txt'), 'src/viejo.ts(3,1): error TS2304: viejo\nsrc/otro.ts(9,2): error TS2322: roto por el cambio');
  const fresh = await runSensors(dir, ['src/nuevo.ts'], c);
  assert.strictEqual(fresh.results[0].estado, 'fallido');
  assert.match(fresh.results[0].motivo, /1 error\(es\) nuevo/);
  // Otro commit: la línea base deja de valer
  commitAll(dir);
  fs.writeFileSync(path.join(dir, 'src/nuevo.ts'), 'x');
  commitAll(dir);
  const stale = await runSensors(dir, ['src/nuevo.ts'], c);
  assert.strictEqual(stale.results[0].estado, 'no_verificado');
  assert.match(stale.results[0].motivo, /vuelve a tomarla/);
});

test('un sensor que excede el tiempo queda «no verificado» y, si es obligatorio, el resultado también', async () => {
  const dir = project({ 'src/a.js': '' });
  const c = cfg({ alTerminar: ['tests'], timeoutSeg: 1, comandos: { tests: 'node -e "setTimeout(()=>{}, 10000)"' } });
  const run = await runSensors(dir, ['src/a.js'], c);
  assert.strictEqual(run.ok, false);
  assert.strictEqual(run.results[0].estado, 'no_verificado');
  assert.strictEqual(run.estado, 'no_verificado');
  assert.match(run.motivo, /obligatorios sin verificar: tests/);
});

test('herramienta ausente y presupuesto agotado quedan «no verificado» (antes contaban como ok)', async () => {
  const dir = project({ 'src/a.js': '' });
  const missing = await runSensors(dir, ['src/a.js'], cfg({ alTerminar: ['tests'], comandos: { tests: 'comando-que-no-existe-xyz' } }));
  assert.strictEqual(missing.results[0].estado, 'no_verificado');
  assert.match(missing.results[0].motivo, /no instalada/);
  const noTime = await runSensors(dir, ['src/a.js'], cfg({ alTerminar: ['tests'], comandos: { tests: 'node -e "0"' }, presupuestoSeg: 2 }));
  assert.strictEqual(noTime.results[0].estado, 'no_verificado');
  assert.strictEqual(noTime.ok, false);
  const optional = await runSensors(dir, ['src/a.js'], cfg({ alTerminar: ['lint', 'tests'], comandos: { lint: 'comando-que-no-existe-xyz', tests: 'node -e "0"' } }));
  assert.strictEqual(optional.estado, 'aprobado', 'un opcional omitido no impide aprobar');
  assert.match(optional.motivo, /opcionales sin verificar: lint/);
});

test('chequeos rápidos: JSON estricto, JSONC tolerado, YAML con tabs y conflictos de merge', () => {
  const dir = project({});
  const w = (f, t) => { const p = path.join(dir, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, t); return p; };
  assert.match(quickCheck(w('package.json', '{\n "a": 1,\n}'))[0], /JSON inválido en línea 3/);
  assert.strictEqual(quickCheck(w('tsconfig.json', '{\n // comentario\n "compilerOptions": {},\n}')), null);
  assert.strictEqual(quickCheck(w('.vscode/settings.json', '{ "x": 1, }')), null);
  assert.match(quickCheck(w('ci.yml', 'a:\n\tb: 1'))[0], /tabulaciones/);
  assert.match(quickCheck(w('a.ts', '<<<<<<< HEAD\na\n=======\nb\n>>>>>>> rama\n'))[0], /conflicto/);
  assert.strictEqual(quickCheck(w('ok.json', '{"a":[1,2]}')), null);
});
