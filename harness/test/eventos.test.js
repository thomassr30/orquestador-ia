'use strict';
// Lote 6: eventos estructurados y correlacionados (sin datos sensibles) y presupuestos con estado explícito.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { project, tmp } = require('./helpers');
process.env.SDD_HOME = tmp('sdd-home-');
const core = require('../src/core');
const S = require('../src/state');
const EV = require('../src/eventos');

const NODE = process.execPath;
const E = (root, sid, event, extra = {}) => core.handle({ event, root, sessionId: sid, host: 'codex', nativeAsk: false, ...extra });
const shell = command => ({ tool: { kind: 'shell', name: 'Bash', command, paths: [], contents: [] } });
const edit = p => ({ tool: { kind: 'edit', name: 'Write', paths: [p], contents: ['x'] } });
const cfgFile = (dir, c) => { fs.mkdirSync(path.join(dir, '.sdd'), { recursive: true }); fs.writeFileSync(path.join(dir, '.sdd', 'harness.json'), JSON.stringify(c)); };
const FAKE_GH = ['gh', 'p_', 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef0123'].join('');

test('una aprobación deja una cadena reconstruible (solicitada → aprobada → consumida) sin el comando en claro', async () => {
  const d = project({});
  await E(d, 's', 'pre', shell('git push origin rama-secreta'));
  await E(d, 's', 'prompt', { prompt: 'sí' });
  await E(d, 's', 'pre', shell('git push origin rama-secreta'));
  const all = EV.read(d);
  const used = all.find(e => e.evento === 'aprobación' && e.decision === 'consumida');
  assert.ok(used, 'hay evento de consumo');
  const { cadena } = EV.explain(d, used.id);
  assert.deepStrictEqual(cadena.map(e => e.decision), ['solicitada', 'aprobada por el usuario', 'consumida']);
  assert.ok(cadena.every(e => e.sesion === 's' && e.accion && e.accion.huella === used.accion.huella));
  assert.doesNotMatch(JSON.stringify(all), /rama-secreta/, 'los argumentos no se registran');
  assert.ok(all.some(e => e.evento === 'mensaje' && e.turno === 1), 'los mensajes llevan su turno');
});

test('CLI: «eventos --explicar <id>» reconstruye la cadena sin ejecutar nada', async () => {
  const d = project({});
  await E(d, 's', 'pre', shell('npm install left-pad'));
  await E(d, 's', 'prompt', { prompt: 'sí' });
  await E(d, 's', 'pre', shell('npm install left-pad'));
  const used = EV.read(d).find(e => e.decision === 'consumida');
  const { spawnSync } = require('child_process');
  const { REPO } = require('./helpers');
  const r = spawnSync(process.execPath, [path.join(REPO, 'bin', 'sdd-harness.js'), 'eventos', '--explicar', used.id], { cwd: d, encoding: 'utf8', env: process.env });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /solicitada[\s\S]*aprobada por el usuario[\s\S]*▶.*consumida/);
});

test('el registro redacta secretos y fragmentos de secretos', () => {
  const d = project({});
  S.log(d, { herramienta: 'x', evento: 'prueba', detalle: `token ${FAKE_GH} y fragmento ${FAKE_GH.slice(0, 10)}…` });
  const text = fs.readFileSync(path.join(S.projectDir(d), 'eventos.jsonl'), 'utf8');
  assert.doesNotMatch(text, /ghp_ABCD/);
  assert.match(text, /\[secreto omitido\]/);
});

test('rotación por tamaño y retención por días; la lectura recorre los archivos rotados', () => {
  const d = project({});
  const prev = { ...EV.LIMITS };
  Object.assign(EV.LIMITS, { maxKB: 1, archivos: 2 });
  try {
    for (let i = 0; i < 40; i++) EV.write(d, { evento: 'prueba', detalle: `evento ${i} ${'x'.repeat(60)}` });
    const dir = S.projectDir(d);
    assert.ok(fs.existsSync(path.join(dir, 'eventos.1.jsonl')));
    assert.ok(!fs.existsSync(path.join(dir, 'eventos.3.jsonl')), 'se conservan como máximo N archivos');
    const read = EV.read(d);
    assert.match(read[read.length - 1].detalle, /evento 39/);
    const old = path.join(dir, 'eventos.1.jsonl');
    const past = Date.now() / 1000 - 40 * 86400;
    fs.utimesSync(old, past, past);
    EV.cleanup(d, 30);
    assert.ok(!fs.existsSync(old), 'lo rotado más viejo que la retención se borra');
  } finally { Object.assign(EV.LIMITS, prev); }
});

test('la retención se aplica al iniciar sesión (no solo existe en el código)', async () => {
  const d = project({});
  const dir = S.projectDir(d);
  fs.mkdirSync(dir, { recursive: true });
  const old = path.join(dir, 'registro.log');
  fs.writeFileSync(old, 'viejo\n');
  const past = Date.now() / 1000 - 40 * 86400;
  fs.utimesSync(old, past, past);
  await E(d, 's', 'session', { source: 'startup' });
  assert.ok(!fs.existsSync(old));
});

test('presupuesto de tokens (medido en el transcript): agotado es un estado explícito y recuperable con el «sí» del usuario', async () => {
  const d = project({ 'a.js': '' });
  cfgFile(d, { presupuesto: { maxTokensSesion: 1000 } });
  const tr = path.join(tmp('sdd-tr-'), 't.jsonl');
  fs.writeFileSync(tr, [1, 2].map(i => JSON.stringify({ type: 'assistant', message: { id: `m${i}`, role: 'assistant', usage: { input_tokens: 400, output_tokens: 300 }, content: [] } })).join('\n'));
  const o = await E(d, 's', 'stop', { lastMessage: 'Listo.', transcriptPath: tr });
  assert.match(o.notice, /Presupuesto de tokens agotado: 1\.400 de 1\.000 \(medido/);
  assert.strictEqual(S.readState(d, 's').presupuesto.agotado.recurso, 'tokens');
  assert.match((await E(d, 's', 'pre', edit('a.js'))).reason, /presupuesto agotado/);
  assert.strictEqual(await E(d, 's', 'pre', { tool: { kind: 'read', name: 'Read', paths: ['a.js'], contents: [] } }), null, 'leer sigue libre');
  assert.match((await E(d, 's', 'prompt', { prompt: 'sí' })).context, /otro tramo de tokens/);
  assert.strictEqual(await E(d, 's', 'pre', edit('a.js')), null, 'con el «sí» se habilita otro tramo');
});

test('sin medición del cliente, el presupuesto de tokens no se aplica (no se inventan números)', async () => {
  const d = project({ 'a.js': '' });
  cfgFile(d, { presupuesto: { maxTokensSesion: 1 } });
  await E(d, 's', 'stop', { lastMessage: 'Listo.' });
  assert.strictEqual((S.readState(d, 's').presupuesto || {}).agotado || null, null);
  assert.strictEqual(await E(d, 's', 'pre', edit('a.js')), null);
});

test('presupuesto de tiempo del pedido: no se exigen más correcciones, pero nada queda verificado', async () => {
  const d = project({ 'a.js': '' });
  cfgFile(d, { presupuesto: { maxMinutosPorPedido: 0.0001 }, sensores: { alTerminar: ['tests'], comandos: { tests: `"${NODE}" -e "process.exit(1)"` } } });
  await E(d, 's', 'prompt', { prompt: 'arregla a.js, directo' });
  await E(d, 's', 'post', edit('a.js'));
  await new Promise(r => setTimeout(r, 50));
  const o = await E(d, 's', 'stop', { lastMessage: 'Listo.' });
  assert.ok(!o.block);
  assert.match(o.notice, /Presupuesto de tiempo del pedido agotado/);
  const st = S.readState(d, 's');
  assert.strictEqual(st.sucio, true);
  assert.strictEqual(st.sensores.estado, 'fallido');
  assert.ok(EV.read(d).some(e => e.evento === 'presupuesto' && e.presupuesto.recurso === 'tiempo'));
  assert.ok(EV.read(d).some(e => e.evento === 'fin de turno' && e.terminacion && e.terminacion.motivo === 'cambios sin verificar'));
});
