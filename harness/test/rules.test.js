'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { project, tmp, REPO } = require('./helpers');

const SDD_HOME = tmp('sdd-home-');
const env = { ...process.env, SDD_HOME };
const hook = (host, ev, input) => {
  const r = spawnSync(process.execPath, [path.join(REPO, 'bin', 'sdd-hook.js'), host, ev], { input: JSON.stringify(input), encoding: 'utf8', env });
  return r.stdout.trim() ? JSON.parse(r.stdout) : null;
};
const RULES = { reglas: [{ nombre: 'trusted-types', archivos: 'src/**/*.{ts,html}', prohibido: 'innerHTML|DOMParser', mensaje: 'La política Trusted Types lo bloquea: usa el componente de íconos propio.', excepto: '**/*.spec.ts' }] };

test('reglas propias: bloquean el contenido nuevo con el mensaje de corrección', () => {
  const dir = project({ 'src/app/icon.ts': '', '.sdd/harness.json': JSON.stringify({ gate: 'nunca', ...RULES }) });
  const base = { session_id: 'r1', cwd: dir };
  const bad = hook('claude', 'PreToolUse', { ...base, tool_name: 'Edit', tool_input: { file_path: path.join(dir, 'src/app/icon.ts'), old_string: 'a', new_string: 'el.innerHTML = svg;' } }).hookSpecificOutput;
  assert.strictEqual(bad.permissionDecision, 'deny');
  assert.match(bad.permissionDecisionReason, /trusted-types.*componente de íconos propio/);
  assert.strictEqual(hook('claude', 'PreToolUse', { ...base, tool_name: 'Edit', tool_input: { file_path: path.join(dir, 'src/app/icon.ts'), old_string: 'a', new_string: 'this.svg.set(datos);' } }), null);
  assert.strictEqual(hook('claude', 'PreToolUse', { ...base, tool_name: 'Write', tool_input: { file_path: path.join(dir, 'src/app/icon.spec.ts'), content: 'expect(el.innerHTML)' } }), null, 'los tests están exceptuados');
  assert.match(hook('codex', 'PreToolUse', { session_id: 'r2', cwd: dir, tool_name: 'apply_patch', tool_input: { command: '*** Begin Patch\n*** Update File: src/app/x.html\n+<div [innerHTML]="h"></div>\n*** End Patch' } }).hookSpecificOutput.permissionDecisionReason, /trusted-types/);
});

test('sdd-harness reglas revisa todo el proyecto', () => {
  const dir = project({ 'src/a.ts': 'ok\nconst d = new DOMParser();\n', 'src/a.spec.ts': 'innerHTML', '.sdd/harness.json': JSON.stringify(RULES) });
  const r = spawnSync(process.execPath, [path.join(REPO, 'bin', 'sdd-harness.js'), 'reglas', dir], { encoding: 'utf8', env });
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout, /src\/a\.ts:2 +\[trusted-types\]/);
  assert.doesNotMatch(r.stdout, /a\.spec\.ts/);
});

test('el pedido en curso queda en la memoria para retomar tras /clear', () => {
  const dir = project({ 'src/a.js': '', '.sdd/harness.json': JSON.stringify({ gate: 'auto', sensores: { alTerminar: [] } }) });
  const base = { session_id: 'r3', cwd: dir };
  hook('claude', 'UserPromptSubmit', { ...base, prompt: 'agrega la base de íconos lucide y los tooltips del panel' });
  hook('claude', 'Stop', { ...base, last_assistant_message: '¿Apruebo la implementación? (sí / no / ajustes)' });
  hook('claude', 'UserPromptSubmit', { ...base, prompt: 'sí' });
  hook('claude', 'PostToolUse', { ...base, tool_name: 'Write', tool_input: { file_path: path.join(dir, 'src/a.js') } });
  hook('claude', 'Stop', { ...base, last_assistant_message: 'Listo.' });
  const ses = fs.readFileSync(path.join(dir, '.sdd/memoria/sesion.md'), 'utf8');
  assert.match(ses, /Pedido en curso: agrega la base de íconos lucide y los tooltips del panel/);
});

test('sdd-eval: corre tareas en una copia temporal, verifica y guarda el historial', { skip: process.platform === 'win32' }, () => {
  const proj = project({ 'a.txt': 'hola' });
  spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qam', 'x', '--allow-empty'], { cwd: proj });
  spawnSync('git', ['add', '.'], { cwd: proj });
  spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'base'], { cwd: proj });
  const bin = tmp('sdd-fakebin-');
  fs.writeFileSync(path.join(bin, 'claude'), '#!/bin/sh\ncat > /dev/null\necho listo > hecho.txt\necho \'{"result":"ok","num_turns":3,"total_cost_usd":0.01,"usage":{"input_tokens":10,"cache_read_input_tokens":900,"output_tokens":90}}\'\n');
  fs.chmodSync(path.join(bin, 'claude'), 0o755);
  const tasks = path.join(tmp('sdd-evals-'), 'tareas.json');
  fs.writeFileSync(tasks, JSON.stringify({ proyecto: proj, tareas: [{ nombre: 'crea-archivo', pedido: 'crea hecho.txt', verificar: 'test -f hecho.txt' }] }));
  const r = spawnSync(process.execPath, [path.join(REPO, 'bin', 'sdd-eval.js'), tasks], { encoding: 'utf8', env: { ...env, PATH: `${bin}:${process.env.PATH}` } });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /Éxito: 100% · tokens promedio: 1\.000/);
  assert.ok(!fs.existsSync(path.join(proj, 'hecho.txt')), 'tu carpeta no se toca');
  const hist = JSON.parse(fs.readFileSync(tasks.replace('.json', '.resultados.json'), 'utf8'));
  assert.strictEqual(hist.length, 1);
});
