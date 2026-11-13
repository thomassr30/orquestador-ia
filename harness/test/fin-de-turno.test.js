'use strict';
// Fin de turno sin esperas inútiles: no se repite una verificación sobre el mismo contenido (una suite completa puede
// tardar minutos y llegar a su límite) y no se verifica mientras sub-agentes en segundo plano siguen trabajando
// (el cliente no puede avisarle al agente que terminaron hasta que el hook suelta el turno).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { project, tmp } = require('./helpers');
process.env.SDD_HOME = tmp('sdd-home-');
const core = require('../src/core');
const S = require('../src/state');

const NODE = process.execPath;
const cuenta = salida => `"${NODE}" -e "require('fs').appendFileSync('corridas.txt','x');process.exit(${salida})"`;
const corridas = d => { try { return fs.readFileSync(path.join(d, 'corridas.txt'), 'utf8').length; } catch { return 0; } };
const cfg = (d, salida) => { fs.mkdirSync(path.join(d, '.sdd'), { recursive: true }); fs.writeFileSync(path.join(d, '.sdd', 'harness.json'), JSON.stringify({ gate: 'nunca', sensores: { alTerminar: ['tests'], comandos: { tests: cuenta(salida) } } })); };
const E = (root, event, extra = {}) => core.handle({ event, root, sessionId: 's', host: 'codex', nativeAsk: false, ...extra });
const C = (root, event, extra = {}) => E(root, event, { host: 'claude', nativeAsk: true, subagentStop: true, ...extra });
const edit = p => ({ tool: { kind: 'edit', name: 'Write', paths: [p], contents: ['x'] } });
const agente = { tool: { kind: 'agent', name: 'Agent', agente: 'sdd-explorer', descripcion: 'leer el PBI', paths: [], contents: [] } };

test('contenido ya verificado: no se vuelve a correr en el turno siguiente', async () => {
  const d = project({ 'a.js': '1' }); cfg(d, 0);
  await E(d, 'post', edit('a.js'));
  assert.match((await E(d, 'stop', { lastMessage: 'Listo.' })).notice, /Verificado/);
  S.updateState(d, 's', s => { s.sucio = true; }); // p. ej. el mismo archivo tocado de nuevo sin cambiar su contenido
  await E(d, 'stop', { lastMessage: 'Listo.' });
  assert.strictEqual(corridas(d), 1);
  assert.strictEqual(S.readState(d, 's').sucio, false);
});

test('mismo contenido que una verificación fallida: avisa una vez, pide la excepción y no repite la corrida', async () => {
  const d = project({ 'a.js': '1' }); cfg(d, 1);
  await E(d, 'post', edit('a.js'));
  assert.ok((await E(d, 'stop', { lastMessage: 'Listo.' })).block);
  const o = await E(d, 'stop', { lastMessage: 'No pude corregirlo.' });
  assert.match(o.notice, /Sin cambios desde la última verificación \(fallido: tests\): no se vuelve a correr/);
  assert.strictEqual(corridas(d), 1, 'una sola corrida para el mismo contenido');
  const st = S.readState(d, 's');
  assert.strictEqual(st.sucio, true, 'sigue pendiente');
  assert.strictEqual(st.aprobaciones.pendientes[0].tipo, 'excepcion');
  fs.writeFileSync(path.join(d, 'a.js'), '2');
  await E(d, 'post', edit('a.js'));
  await E(d, 'stop', { lastMessage: 'Corregido.' });
  assert.strictEqual(corridas(d), 2, 'con otro contenido sí se verifica');
});

test('sub-agentes en segundo plano: el fin de turno no verifica ni retiene hasta que terminan', async () => {
  const d = project({ 'a.js': '1' }); cfg(d, 0);
  await C(d, 'session', { source: 'startup' });
  await C(d, 'post', edit('a.js'));
  assert.strictEqual(await C(d, 'pre', agente), null);
  assert.strictEqual(await C(d, 'pre', agente), null);
  const espera = await C(d, 'stop', { lastMessage: 'Lancé dos agentes para leer el PBI y el código.' });
  assert.match(espera.notice, /Verificación en espera: 2 sub-agente\(s\)/);
  assert.ok(!espera.block);
  assert.strictEqual(corridas(d), 0);
  await C(d, 'subagentStop');
  assert.match((await C(d, 'stop', { lastMessage: 'Uno terminó.' })).notice, /en espera: 1/);
  await C(d, 'subagentStop');
  assert.match((await C(d, 'stop', { lastMessage: 'Listo.' })).notice, /Verificado/);
  assert.strictEqual(corridas(d), 1);
});

test('sin aviso de fin de sub-agente (otras herramientas) o con un aviso perdido, la verificación no se queda en espera', async () => {
  const d = project({ 'a.js': '1' }); cfg(d, 0);
  await E(d, 'post', edit('a.js'));
  await E(d, 'pre', agente); // codex: no hay SubagentStop, no se cuenta
  assert.match((await E(d, 'stop', { lastMessage: 'Listo.' })).notice, /Verificado/);
  const d2 = project({ 'a.js': '1' }); cfg(d2, 0);
  await C(d2, 'post', edit('a.js'));
  S.updateState(d2, 's', s => { s.enCurso = [new Date(Date.now() - 31 * 60000).toISOString()]; });
  assert.match((await C(d2, 'stop', { lastMessage: 'Listo.' })).notice, /Verificado/, 'a los 30 min se olvida');
  await C(d2, 'pre', agente);
  await C(d2, 'session', { source: 'clear' });
  assert.deepStrictEqual(S.readState(d2, 's').enCurso, [], 'una sesión nueva empieza sin sub-agentes en curso');
});
