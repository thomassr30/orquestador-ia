'use strict';
// El plugin de OpenCode usa el mismo núcleo: se carga como lo haría OpenCode (ESM) con un cliente simulado.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { project, tmp, REPO } = require('./helpers');

process.env.SDD_HOME = tmp('sdd-home-');

test('plugin de OpenCode: bloquea, da feedback y continúa la sesión si los sensores fallan', async () => {
  const dir = project({ 'src/a.js': '', '.sdd/harness.json': JSON.stringify({ sensores: { alTerminar: ['lint'], comandos: { lint: 'node -e "console.error(\'error: a.js\'); process.exit(1)"' } } }) });
  const tpl = fs.readFileSync(path.join(REPO, 'harness', 'opencode', 'sdd-harness.js'), 'utf8').split('{{SDD_HOME}}').join(REPO.replace(/\\/g, '/'));
  const file = path.join(tmp('sdd-oc-'), 'sdd-harness.mjs');
  fs.writeFileSync(file, tpl);
  const { SddHarness } = await import(pathToFileURL(file).href);
  const prompts = [];
  const client = { session: {
    messages: async () => ({ data: [{ info: { role: 'assistant' }, parts: [{ type: 'text', text: 'Listo.' }] }] }),
    prompt: async x => { prompts.push(x); },
  } };
  const h = await SddHarness({ client, directory: dir, worktree: dir });
  const sid = 'oc1';

  await h['chat.message']({ sessionID: sid }, { parts: [{ type: 'text', text: 'agrega un botón' }] });
  await assert.rejects(h['tool.execute.before']({ tool: 'edit', sessionID: sid, callID: '1' }, { args: { filePath: path.join(dir, 'src/a.js'), oldString: '', newString: 'x' } }), /GATE/);
  await assert.rejects(h['tool.execute.before']({ tool: 'bash', sessionID: sid, callID: '2' }, { args: { command: 'git push' } }), /solo lectura/);

  await h['chat.message']({ sessionID: sid }, { parts: [{ type: 'text', text: 'sí' }] });
  fs.writeFileSync(path.join(dir, 'src/conf.json'), '{"a":1,}');
  await h['tool.execute.before']({ tool: 'write', sessionID: sid, callID: '3' }, { args: { filePath: path.join(dir, 'src/conf.json'), content: '{"a":1,}' } });
  const output = { output: 'ok' };
  await h['tool.execute.after']({ tool: 'write', sessionID: sid, callID: '3' }, output);
  assert.match(output.output, /JSON inválido/);

  await h.event({ event: { type: 'session.idle', properties: { sessionID: sid } } });
  await new Promise(r => setTimeout(r, 50));
  assert.strictEqual(prompts.length, 1);
  assert.match(prompts[0].body.parts[0].text, /^\[harness\] Sensores/);

  const ctx = { context: [] };
  await h['experimental.session.compacting']({ sessionID: sid }, ctx);
  assert.match(ctx.context[0], /Contexto SDD del proyecto/);
  const sys = { system: [] };
  await h['experimental.chat.system.transform']({}, sys);
  assert.match(sys.system[0], /harness:inicio/);
});
