'use strict';
// GATE: el "sí" del usuario cuenta aunque la herramienta no se lo avise bien al harness.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { project, tmp, REPO } = require('./helpers');
const gate = require('../src/gate');
const { gateReply } = require('../src/transcript');
const { emptyState } = require('../src/state');

const SDD_HOME = tmp('sdd-home-');
const HOOK = path.join(REPO, 'bin', 'sdd-hook.js');
const hook = (host, ev, input) => {
  const r = spawnSync(process.execPath, [HOOK, host, ev], { input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, SDD_HOME } });
  return r.stdout.trim() ? JSON.parse(r.stdout) : null;
};
const GATE_Q = 'Propongo agregar `/changes/` al .gitignore.\n¿Apruebo la implementación? (sí / no / ajustes)';
const jsonl = rows => rows.map(r => JSON.stringify(r)).join('\n') + '\n';
const codexMsg = (role, text) => ({ timestamp: 'x', type: 'response_item', payload: { type: 'message', role, content: [{ type: role === 'user' ? 'input_text' : 'output_text', text }] } });
const codexEvt = (type, message) => ({ timestamp: 'x', type: 'event_msg', payload: { type, message } });
const claudeMsg = (role, text) => ({ type: role, message: { role, content: role === 'user' ? text : [{ type: 'text', text }] } });

function writeTranscript(rows) {
  const f = path.join(tmp('sdd-tr-'), 'rollout.jsonl');
  fs.writeFileSync(f, jsonl(rows));
  return f;
}

test('lee la pregunta del GATE y las respuestas en conversaciones de Codex, Claude Code y Copilot CLI', () => {
  const codex = writeTranscript([
    codexMsg('user', '<environment_context><cwd>C:\\x</cwd></environment_context>'),
    codexMsg('user', 'por qué aparece la carpeta changes'), codexEvt('user_message', 'por qué aparece la carpeta changes'),
    { type: 'response_item', payload: { type: 'function_call', name: 'shell', arguments: '{}' } },
    codexMsg('assistant', GATE_Q), codexEvt('agent_message', GATE_Q),
    codexMsg('user', '# Context from my IDE setup:\n\n## Open tabs:\n- a.ts\n\n## My request for Codex:\nsi'), codexEvt('user_message', 'si'),
  ]);
  assert.deepStrictEqual(gateReply(codex), { asked: true, replies: ['si', 'si'] });
  const claude = writeTranscript([claudeMsg('user', 'agrega export'), claudeMsg('assistant', GATE_Q), { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', content: 'x' }] } }, claudeMsg('user', 'sí')]);
  assert.deepStrictEqual(gateReply(claude), { asked: true, replies: ['sí'] });
  const copilot = writeTranscript([{ type: 'assistant.message', data: { content: GATE_Q } }, { type: 'user.message', data: { content: 'dale' } }]);
  assert.deepStrictEqual(gateReply(copilot), { asked: true, replies: ['dale'] });
  assert.deepStrictEqual(gateReply(writeTranscript([claudeMsg('assistant', 'Listo.')])), { asked: false, replies: [] });
});

test('caso real (Codex): el hook del mensaje no registró el "si" → la edición se aprueba leyendo la conversación', () => {
  const dir = project({ '.gitignore': 'node_modules\n' });
  const base = { session_id: 'codex-1', cwd: dir };
  hook('codex', 'UserPromptSubmit', { ...base, prompt: 'corrige el .gitignore para que no aparezca changes/' });
  hook('codex', 'Stop', { ...base, last_assistant_message: GATE_Q });
  // El "si" nunca llegó al hook de mensaje, pero quedó en la conversación
  const transcript_path = writeTranscript([codexMsg('assistant', GATE_Q), codexEvt('user_message', 'si')]);
  const patch = { ...base, transcript_path, tool_name: 'apply_patch', tool_input: { command: '*** Begin Patch\n*** Update File: .gitignore\n@@\n node_modules\n+/changes/\n*** End Patch' } };
  assert.strictEqual(hook('codex', 'PreToolUse', patch), null, 'la edición pasa');
  const estado = spawnSync(process.execPath, [path.join(REPO, 'bin', 'sdd-harness.js'), 'estado', dir], { encoding: 'utf8', env: { ...process.env, SDD_HOME } }).stdout;
  assert.match(estado, /plan aprobado/);
  assert.match(estado, /aprobado desde conversación/);
});

test('respaldo seguro: un "sí" antes de que el agente presente el nuevo plan no aprueba', () => {
  const dir = project({ 'a.js': '' });
  const base = { session_id: 'codex-2', cwd: dir };
  hook('codex', 'UserPromptSubmit', { ...base, prompt: 'agrega un filtro por fecha' });
  // En la conversación hay un plan anterior aprobado, luego un pedido nuevo y un "sí" apresurado
  const transcript_path = writeTranscript([codexMsg('assistant', GATE_Q), codexEvt('user_message', 'si'), codexMsg('assistant', 'Listo, implementado.'), codexEvt('user_message', 'agrega un filtro por fecha'), codexEvt('user_message', 'sí')]);
  const patch = { ...base, transcript_path, tool_name: 'apply_patch', tool_input: { command: '*** Begin Patch\n*** Update File: a.js\n@@\n+x\n*** End Patch' } };
  assert.strictEqual(hook('codex', 'PreToolUse', patch).hookSpecificOutput.permissionDecision, 'deny');
});

test('el hook del mensaje con la conversación: aprueba aunque no se haya registrado el fin del turno', () => {
  const dir = project({ 'a.js': '' });
  const base = { session_id: 'codex-3', cwd: dir };
  hook('codex', 'Stop', { ...base, last_assistant_message: 'Revisé el proyecto.' }); // la herramienta sí entrega mensajes
  hook('codex', 'UserPromptSubmit', { ...base, prompt: 'agrega un filtro por fecha' });
  // El fin del turno con la pregunta del GATE no llegó al harness
  const transcript_path = writeTranscript([codexEvt('user_message', 'agrega un filtro por fecha'), codexMsg('assistant', GATE_Q)]);
  const out = hook('codex', 'UserPromptSubmit', { ...base, transcript_path, prompt: 'si' });
  assert.match(out.hookSpecificOutput.additionalContext, /Plan aprobado/);
});

test('si el agente muestra la pregunta del GATE, el "sí" siguiente aprueba aunque no se haya detectado un pedido de cambio', () => {
  const cfg = { gate: 'siempre' };
  const s = emptyState('/tmp/p', 's');
  gate.onPrompt(s, '¿por qué aparece la carpeta changes en git?', cfg);
  assert.ok(gate.editBlockReason(s, cfg));
  gate.onStop(s, GATE_Q);
  gate.onPrompt(s, 'si', cfg);
  assert.strictEqual(gate.editBlockReason(s, cfg), null);
  const a = emptyState('/tmp/p', 's');
  gate.onPrompt(a, 'explica la carpeta changes', { gate: 'auto' });
  gate.onStop(a, GATE_Q);
  assert.strictEqual(a.gate.estado, 'pendiente');
  gate.onPrompt(a, 'si', { gate: 'auto' });
  assert.strictEqual(a.gate.estado, 'aprobado');
});

test('el agente no puede escribir en las conversaciones guardadas (de ahí sale el respaldo)', () => {
  const { Policy } = require('../src/policy');
  const os = require('os');
  const p = new Policy({ root: project({}) });
  for (const f of ['.codex/sessions/2026/11/02/rollout-x.jsonl', '.claude/projects/x/s.jsonl', '.copilot/session-state/s/events.jsonl']) {
    const r = p.checkPath(path.join(os.homedir(), f), 'write');
    assert.strictEqual(r.decision, 'ask', f);
    assert.ok(r.critical, f);
  }
});
