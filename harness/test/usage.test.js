'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { tmp } = require('./helpers');
const { sessionUsage } = require('../src/usage');

test('consumo: suma uso por mensaje (sin duplicar), sub-agentes y salidas más pesadas', () => {
  const dir = tmp('sdd-tr-');
  const t = path.join(dir, 'abc.jsonl');
  const usage = { input_tokens: 10, cache_creation_input_tokens: 100, cache_read_input_tokens: 1000, output_tokens: 50 };
  const lines = [
    { type: 'assistant', message: { id: 'm1', role: 'assistant', usage, content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'npm test' } }] } },
    { type: 'assistant', message: { id: 'm1', role: 'assistant', usage, content: [] } },
    { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'x'.repeat(40000) }] } },
    { type: 'assistant', message: { id: 'm2', role: 'assistant', usage, content: [{ type: 'tool_use', id: 't2', name: 'Read', input: { file_path: 'src/a.ts' } }] } },
    { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't2', content: [{ type: 'text', text: 'y'.repeat(4000) }] }] } },
  ];
  fs.writeFileSync(t, lines.map(l => JSON.stringify(l)).join('\n'));
  fs.mkdirSync(path.join(dir, 'abc', 'subagents'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'abc', 'subagents', 'agent-1.jsonl'), JSON.stringify({ type: 'assistant', message: { id: 's1', role: 'assistant', usage, content: [] } }));
  const u = sessionUsage(t);
  assert.strictEqual(u.principal.mensajes, 2);
  assert.strictEqual(u.principal.cacheLectura, 2000);
  assert.strictEqual(u.subagentes.agentes, 1);
  assert.strictEqual(u.mayores[0].nombre, 'Bash');
  assert.strictEqual(u.mayores[0].detalle, 'npm test');
  assert.strictEqual(u.mayores[0].tokens, 10000);
});
