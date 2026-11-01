'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { spawnSync } = require('child_process');
const { project, tmp, REPO } = require('./helpers');

const SDD_HOME = tmp('sdd-home-');
const hook = (host, ev, input) => {
  const r = spawnSync(process.execPath, [path.join(REPO, 'bin', 'sdd-hook.js'), host, ev], { input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, SDD_HOME } });
  return r.stdout.trim() ? JSON.parse(r.stdout) : null;
};

test('modo ahorro: el pedido de cambio lo anuncia y el 4º sub-agente pide permiso (Claude Code)', () => {
  const dir = project({ 'a.js': '' });
  const base = { session_id: 'b1', cwd: dir };
  const ctx = hook('claude', 'UserPromptSubmit', { ...base, prompt: 'agrega la base de íconos y tooltips' }).hookSpecificOutput.additionalContext;
  assert.match(ctx, /Modo ahorro/);
  const task = { ...base, tool_name: 'Task', tool_input: { subagent_type: 'sdd-frontend-implementer', description: 'íconos', prompt: '…' } };
  for (let i = 0; i < 3; i++) assert.strictEqual(hook('claude', 'PreToolUse', task), null, `sub-agente ${i + 1}`);
  const r = hook('claude', 'PreToolUse', task).hookSpecificOutput;
  assert.strictEqual(r.permissionDecision, 'ask');
  assert.match(r.permissionDecisionReason, /ya lanzó 3 \(tope 3, modo ahorro\)/);
  hook('claude', 'UserPromptSubmit', { ...base, prompt: 'continúa' });
  assert.strictEqual(hook('claude', 'PreToolUse', task), null, 'cada mensaje del usuario reinicia la cuenta');
});

test('sin diálogo nativo (Codex): se pide "sí" en el chat y libera el resto del pedido', () => {
  const dir = project({ 'a.js': '' });
  const base = { session_id: 'b2', cwd: dir };
  hook('codex', 'UserPromptSubmit', { ...base, prompt: 'revisa todo el módulo' });
  const spawn = { ...base, tool_name: 'spawn_agent', tool_input: { agent_type: 'explorer' } };
  for (let i = 0; i < 3; i++) assert.strictEqual(hook('codex', 'PreToolUse', spawn), null);
  assert.match(hook('codex', 'PreToolUse', spawn).hookSpecificOutput.permissionDecisionReason, /presupuesto de sub-agentes/);
  assert.match(hook('codex', 'UserPromptSubmit', { ...base, prompt: 'sí' }).hookSpecificOutput.additionalContext, /más sub-agentes/);
  for (let i = 0; i < 5; i++) assert.strictEqual(hook('codex', 'PreToolUse', spawn), null, 'aprobado: sin tope en este pedido');
});

test('configurable: modo libre sin tope y tope propio por proyecto', () => {
  const dir = project({ 'a.js': '', '.sdd/harness.json': JSON.stringify({ presupuesto: { modo: 'normal', maxSubagentes: 1 } }) });
  const base = { session_id: 'b3', cwd: dir };
  hook('claude', 'UserPromptSubmit', { ...base, prompt: 'hola' });
  const task = { ...base, tool_name: 'Agent', tool_input: { subagent_type: 'x' } };
  assert.strictEqual(hook('claude', 'PreToolUse', task), null);
  assert.strictEqual(hook('claude', 'PreToolUse', task).hookSpecificOutput.permissionDecision, 'ask');
  const free = project({ 'a.js': '', '.sdd/harness.json': JSON.stringify({ presupuesto: { modo: 'libre' } }) });
  for (let i = 0; i < 8; i++) assert.strictEqual(hook('claude', 'PreToolUse', { session_id: 'b4', cwd: free, tool_name: 'Task', tool_input: {} }), null);
});

test('las herramientas de lista de tareas no cuentan como sub-agentes', () => {
  const { normalizeTool } = require('../src/adapters/common');
  assert.strictEqual(normalizeTool('Task', {}).kind, 'agent');
  assert.strictEqual(normalizeTool('task', {}, { opencode: true }).kind, 'agent');
  assert.notStrictEqual(normalizeTool('TaskCreate', {}).kind, 'agent');
  assert.notStrictEqual(normalizeTool('TodoWrite', {}).kind, 'agent');
});
