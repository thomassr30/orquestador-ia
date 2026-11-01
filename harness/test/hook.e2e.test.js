'use strict';
// Prueba de punta a punta del punto de entrada de los hooks (como lo ejecuta cada herramienta).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { project, tmp, REPO } = require('./helpers');

const SDD_HOME = tmp('sdd-home-');
const HOOK = path.join(REPO, 'bin', 'sdd-hook.js');
function hook(host, ev, input, env = {}) {
  const r = spawnSync(process.execPath, [HOOK, host, ev], { input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, SDD_HOME, ...env } });
  return { code: r.status, json: r.stdout.trim() ? JSON.parse(r.stdout) : null, stderr: r.stderr };
}

test('Claude Code: GATE, permisos, sensores al terminar y checkpoint de sesión', () => {
  const dir = project({
    'package.json': '{"name":"p"}', 'src/a.js': 'let x = 1\n',
    '.sdd/harness.json': JSON.stringify({ sensores: { alTerminar: ['lint'], comandos: { lint: 'node -e "console.error(\'src/a.js:1:5 error no-unused-vars\'); process.exit(1)"' } } }),
  });
  const base = { session_id: 'e2e', cwd: dir };
  const edit = { ...base, tool_name: 'Edit', tool_input: { file_path: path.join(dir, 'src/a.js'), old_string: 'x', new_string: 'y' } };

  assert.match(hook('claude', 'UserPromptSubmit', { ...base, prompt: 'agrega un contador de visitas' }).json.hookSpecificOutput.additionalContext, /Pedido de cambio/);
  assert.strictEqual(hook('claude', 'PreToolUse', edit).json.hookSpecificOutput.permissionDecision, 'deny', 'sin plan aprobado no se edita');
  assert.strictEqual(hook('claude', 'PreToolUse', { ...base, tool_name: 'Bash', tool_input: { command: 'npm test' } }).json, null, 'los tests sí se pueden correr');
  assert.strictEqual(hook('claude', 'PreToolUse', { ...base, tool_name: 'Bash', tool_input: { command: 'git commit -am x' } }).json.hookSpecificOutput.permissionDecision, 'deny');
  assert.strictEqual(hook('claude', 'PreToolUse', { ...base, tool_name: 'Bash', tool_input: { command: 'kubectl apply -f k8s/' } }).json.hookSpecificOutput.permissionDecision, 'ask');
  assert.strictEqual(hook('claude', 'PreToolUse', { ...base, tool_name: 'Read', tool_input: { file_path: path.join(dir, '.env') } }).json.hookSpecificOutput.permissionDecision, 'deny');

  hook('claude', 'Stop', { ...base, last_assistant_message: 'Plan:\n1. …\n¿Apruebo la implementación? (sí / no / ajustes)' });
  assert.match(hook('claude', 'UserPromptSubmit', { ...base, prompt: 'sí, dale' }).json.hookSpecificOutput.additionalContext, /Plan aprobado/);
  assert.strictEqual(hook('claude', 'PreToolUse', edit).json, null, 'con el plan aprobado se puede editar');

  fs.writeFileSync(path.join(dir, 'src/conf.json'), '{"a": 1,}');
  const fb = hook('claude', 'PostToolUse', { ...base, tool_name: 'Write', tool_input: { file_path: path.join(dir, 'src/conf.json') } }).json;
  assert.strictEqual(fb.decision, 'block');
  assert.match(fb.reason, /JSON inválido/);

  const s1 = hook('claude', 'Stop', { ...base, last_assistant_message: 'Listo.' }).json;
  assert.strictEqual(s1.decision, 'block', 'con sensores en rojo no puede terminar');
  assert.match(s1.reason, /no-unused-vars/);
  assert.strictEqual(hook('claude', 'Stop', { ...base, last_assistant_message: 'Corregido.', stop_hook_active: true }).json.decision, 'block');
  const s3 = hook('claude', 'Stop', { ...base, last_assistant_message: 'Ese error ya existía.', stop_hook_active: true }).json;
  assert.ok(s3.systemMessage && !s3.decision, 'tras el máximo de bloqueos avisa y deja terminar');

  const ses = fs.readFileSync(path.join(dir, '.sdd/memoria/sesion.md'), 'utf8');
  assert.match(ses, /^Proyecto: /);
  assert.match(ses, /harness:inicio/);
  assert.match(ses, /src\/conf\.json/);
  assert.match(hook('claude', 'SessionStart', { ...base, source: 'compact' }).json.hookSpecificOutput.additionalContext, /se acaba de compactar/);
});

test('Codex: confirmación crítica en el chat (sin "ask" nativo), de un solo uso', () => {
  const dir = project({ 'src/a.js': '' });
  const base = { session_id: 'cx', cwd: dir };
  const rm = { ...base, tool_name: 'Bash', tool_input: { command: 'rm -rf dist' } };
  assert.match(hook('codex', 'PreToolUse', rm).json.hookSpecificOutput.permissionDecisionReason, /Requiere confirmación/);
  assert.match(hook('codex', 'UserPromptSubmit', { ...base, prompt: 'sí' }).json.hookSpecificOutput.additionalContext, /aprobó: rm -rf dist/);
  assert.strictEqual(hook('codex', 'PreToolUse', rm).json, null);
  assert.strictEqual(hook('codex', 'PreToolUse', rm).json.hookSpecificOutput.permissionDecision, 'deny', 'la confirmación vale una sola vez');
});

test('los mensajes generados por el harness no se toman como pedidos del usuario', () => {
  const dir = project({ 'src/a.js': '' });
  const base = { session_id: 'hx', cwd: dir };
  hook('gemini', 'BeforeAgent', { ...base, prompt: 'agrega X' });
  hook('gemini', 'AfterAgent', { ...base, prompt_response: '¿Apruebo la implementación? (sí / no / ajustes)' });
  hook('gemini', 'BeforeAgent', { ...base, prompt: 'sí' });
  assert.strictEqual(hook('gemini', 'BeforeAgent', { ...base, prompt: '[harness] Sensores…\n✗ lint errores' }).json, null);
  assert.strictEqual(hook('gemini', 'BeforeTool', { ...base, tool_name: 'write_file', tool_input: { file_path: 'src/a.js', content: 'y' } }).json, null, 'el GATE sigue aprobado');
});

test('un error interno nunca bloquea (falla abierta) y la salida es solo JSON', () => {
  const r = spawnSync(process.execPath, [HOOK, 'claude', 'PreToolUse'], { input: '{no es json', encoding: 'utf8', env: { ...process.env, SDD_HOME } });
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, '');
  const u = spawnSync(process.execPath, [HOOK, 'desconocida', 'X'], { input: '{}', encoding: 'utf8', env: { ...process.env, SDD_HOME } });
  assert.strictEqual(u.status, 0);
});
