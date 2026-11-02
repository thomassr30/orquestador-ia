'use strict';
// Git con confirmación (commit nunca), mensajes de commit sin atribución y "sin sdd" para toda la conversación.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { spawnSync } = require('child_process');
const { project, tmp, REPO } = require('./helpers');
const gate = require('../src/gate');
const { emptyState } = require('../src/state');
const { findAttribution } = require('../src/attribution');

const SDD_HOME = tmp('sdd-home-');
const hook = (host, ev, input) => {
  const r = spawnSync(process.execPath, [path.join(REPO, 'bin', 'sdd-hook.js'), host, ev], { input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, SDD_HOME } });
  return r.stdout.trim() ? JSON.parse(r.stdout) : null;
};

test('git por herramienta: Claude Code pregunta con su diálogo; Codex deja la aprobación a sus reglas; commit se bloquea en todas', () => {
  const dir = project({ 'a.js': '' });
  const bash = (host, command) => hook(host, 'PreToolUse', { session_id: 'g', cwd: dir, tool_name: 'Bash', tool_input: { command } });
  assert.strictEqual(bash('claude', 'git push origin main').hookSpecificOutput.permissionDecision, 'ask');
  assert.strictEqual(bash('codex', 'git push origin main'), null, 'Codex: la regla "prompt" pide la aprobación nativa');
  assert.strictEqual(bash('codex', 'git reset --hard HEAD~1').hookSpecificOutput.permissionDecision, 'deny', 'destructivo: confirmación en el chat con explicación');
  for (const host of ['claude', 'codex']) assert.strictEqual(bash(host, 'git commit -m "fix: x"').hookSpecificOutput.permissionDecision, 'deny', host);
  // Con el plan pendiente, git sigue disponible con confirmación (para resolver problemas de git)
  hook('claude', 'UserPromptSubmit', { session_id: 'g', cwd: dir, prompt: 'agrega un filtro por fecha' });
  assert.strictEqual(bash('claude', 'git stash').hookSpecificOutput.permissionDecision, 'ask');
});

test('detecta líneas de atribución de cualquier IA, no las de personas ni menciones en texto', () => {
  for (const t of ['feat: x\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>', '🤖 Generated with [Claude Code](https://claude.com/claude-code)', 'fix: y\n\nMade-with: Cursor',
    'feat: z\n\nCo-authored-by: Cursor <cursoragent@cursor.com>', '```\nfeat: x\n\nClaude-Session: https://claude.ai/code/x\n```', 'Co-authored-by: Copilot <x@users.noreply.github.com>']) assert.ok(findAttribution(t), t);
  for (const t of ['Co-authored-by: Juan Pérez <juan@empresa.cl>', 'La línea Co-Authored-By: Claude la agrega Claude Code', 'feat(clientes): exportar a Excel']) assert.strictEqual(findAttribution(t), null, t);
});

test('al terminar: si el mensaje de commit sugerido trae atribución, se pide reescribirlo (una sola vez)', () => {
  const dir = project({ 'a.js': '' });
  const msg = 'Commit sugerido:\n```\nfeat(clientes): exportar a Excel\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n```';
  const out = hook('claude', 'Stop', { session_id: 'a', cwd: dir, last_assistant_message: msg });
  assert.strictEqual(out.decision, 'block');
  assert.match(out.reason, /sin ninguna línea de atribución/);
  assert.strictEqual(hook('claude', 'Stop', { session_id: 'a', cwd: dir, last_assistant_message: msg, stop_hook_active: true }), null, 'no insiste en bucle');
});

test('"sin sdd" apaga el orquestador para toda la conversación y "con sdd" lo reactiva', () => {
  const cfg = { gate: 'siempre' };
  const s = emptyState('/tmp/p', 's');
  const n1 = gate.onPrompt(s, 'sin sdd: arregla el título del login', cfg);
  assert.match(n1.join(' '), /DESACTIVÓ el orquestador/);
  assert.strictEqual(gate.editBlockReason(s, cfg), null);
  gate.onStop(s, 'Plan…\n¿Apruebo la implementación? (sí / no / ajustes)');
  const n2 = gate.onPrompt(s, 'ahora agrega un filtro por fecha y corrige el bug del login', cfg);
  assert.strictEqual(gate.editBlockReason(s, cfg), null, 'sigue apagado en los mensajes siguientes');
  assert.match(n2.join(' '), /desactivado/);
  gate.onPrompt(s, 'con sdd', cfg);
  assert.strictEqual(s.sdd, 'on');
  gate.onPrompt(s, 'agrega exportación a CSV', cfg);
  assert.ok(gate.editBlockReason(s, cfg), 'reactivado: vuelve a pedir plan');
  for (const t of ['no uses el orquestador', 'desactiva el sdd', 'sin orquestador por favor']) { const x = emptyState('/tmp/p', 'x'); gate.onPrompt(x, t, cfg); assert.strictEqual(x.sdd, 'off', t); }
});

test('"sin sdd" por hook: la IA recibe el aviso en cada mensaje (Codex)', () => {
  const dir = project({ 'a.js': '' });
  const p = prompt => hook('codex', 'UserPromptSubmit', { session_id: 'off', cwd: dir, prompt });
  assert.match(p('sin sdd').hookSpecificOutput.additionalContext, /DESACTIVÓ/);
  assert.match(p('corrige el bug del login').hookSpecificOutput.additionalContext, /desactivado/);
  const patch = { session_id: 'off', cwd: dir, tool_name: 'apply_patch', tool_input: { command: '*** Begin Patch\n*** Update File: a.js\n@@\n+x\n*** End Patch' } };
  assert.strictEqual(hook('codex', 'PreToolUse', patch), null, 'edita sin plan');
});
