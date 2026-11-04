'use strict';
// Lote 3: finalización basada en requisitos y evidencia (modelo de trabajo verificable).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { project, tmp, REPO } = require('./helpers');
process.env.SDD_HOME = tmp('sdd-home-');
const core = require('../src/core');
const T = require('../src/trabajo');
const S = require('../src/state');
const { loadConfig } = require('../src/config');

const NODE = process.execPath;
const E = (root, sid, event, extra = {}) => core.handle({ event, root, sessionId: sid, host: 'codex', nativeAsk: false, ...extra });
const GATE_Q = 'Plan…\n¿Apruebo la implementación? (sí / no / ajustes)';
const edit = p => ({ tool: { kind: 'edit', name: 'Write', paths: [p], contents: ['x'] } });
const testsCmd = code => ({ sensores: { alTerminar: ['tests'], comandos: { tests: `"${NODE}" -e "${code}"` } } });
const cfgFile = (dir, c) => { fs.mkdirSync(path.join(dir, '.sdd'), { recursive: true }); fs.writeFileSync(path.join(dir, '.sdd', 'harness.json'), JSON.stringify(c)); };
const PLAN = {
  objetivo: 'exportar a PDF',
  requisitos: [{ id: 'REQ-01', texto: 'el listado se exporta', criterios: [{ id: 'CA-01', texto: 'tests del exportador', control: 'tests' }] }],
  tareas: [{ id: 'T-01', titulo: 'exportador', requisitos: ['REQ-01'], archivos: ['src/pdf.js'] }],
};
/** Proyecto con plan registrado y aprobado por el usuario (GATE). */
async function approved(files = {}, plan = PLAN, cfg = testsCmd('process.exit(0)')) {
  const d = project({ 'src/pdf.js': 'v1', ...files });
  cfgFile(d, cfg);
  await E(d, 's', 'prompt', { prompt: 'agrega exportación a PDF' });
  assert.ok(T.setPlan(d, plan, { sesion: 's' }).ok);
  await E(d, 's', 'stop', { lastMessage: GATE_Q });
  await E(d, 's', 'prompt', { prompt: 'sí' });
  return d;
}

test('un plan inválido se rechaza con motivos legibles', () => {
  const { errores } = T.normalizePlan({
    objetivo: 'x',
    requisitos: [{ id: 'REQ-01', texto: 'a', criterios: [] }, { id: 'REQ-02', texto: 'b', criterios: [{ texto: 'sin tipo' }] }],
    tareas: [{ id: 'T-01', titulo: 't', requisitos: ['REQ-09'], depende: ['T-02'] }, { id: 'T-02', titulo: 'u', requisitos: ['REQ-01'], depende: ['T-01'] }],
  });
  const all = errores.join('\n');
  assert.match(all, /REQ-01: necesita al menos un criterio/);
  assert.match(all, /indica exactamente uno de «control»/);
  assert.match(all, /el requisito REQ-09 no existe/);
  assert.match(all, /REQ-02: ninguna tarea lo cubre/);
  assert.match(all, /dependencias en ciclo/);
});

test('el «sí» del usuario congela el plan; un plan nuevo queda como propuesta hasta la siguiente aprobación', async () => {
  const d = await approved();
  const t = T.load(d).trabajo;
  assert.ok(t.congelado, 'congelado al aprobar');
  assert.strictEqual(t.estado, 'en_curso');
  const weaker = { ...PLAN, requisitos: [{ id: 'REQ-01', texto: 'el listado se exporta', criterios: [{ id: 'CA-01', texto: 'a ojo', manual: true }] }] };
  assert.strictEqual(T.setPlan(d, weaker, { sesion: 's' }).propuesta, true);
  assert.strictEqual(T.load(d).trabajo.requisitos[0].criterios[0].control, 'tests', 'el agente no rebaja los criterios aprobados');
  await E(d, 's', 'prompt', { prompt: 'cambia el criterio de aceptación' });
  await E(d, 's', 'stop', { lastMessage: GATE_Q });
  await E(d, 's', 'prompt', { prompt: 'sí' });
  assert.strictEqual(T.load(d).trabajo.requisitos[0].criterios[0].manual, true, 'con la nueva aprobación se aplica');
});

test('«terminé» sin evidencia no completa: al terminar el turno se muestra lo que falta (una vez)', async () => {
  const d = await approved();
  fs.writeFileSync(path.join(d, 'src/pdf.js'), 'v2');
  await E(d, 's', 'post', edit('src/pdf.js'));
  const o = await E(d, 's', 'stop', { lastMessage: 'Listo, terminé la exportación.' });
  assert.match(o.block, /el trabajo NO está terminado/);
  assert.match(o.block, /T-01 en curso|T-01 pendiente/);
  const again = await E(d, 's', 'stop', { lastMessage: 'Listo, terminé la exportación.' });
  assert.ok(!again || !again.block, 'no insiste en bucle');
});

test('verificar crea evidencia del harness; un cambio posterior la vence y deja la tarea por reverificar', async () => {
  const d = await approved();
  T.startTask(d, 'T-01', { responsable: 'backend' });
  const r = await T.verifyTask(d, 'T-01', { cfg: loadConfig(d), sesion: 's' });
  assert.strictEqual(r.tarea.estado, 'verificada');
  let st = T.status(d);
  assert.strictEqual(st.estado, 'tecnicamente_completo');
  assert.ok(st.requisitos[0].criterios[0].evidencia, 'cada requisito completado apunta a su evidencia');
  fs.writeFileSync(path.join(d, 'src/pdf.js'), 'v3');
  st = T.status(d);
  assert.strictEqual(st.tareas[0].estado, 'por_reverificar');
  assert.strictEqual(st.estado, 'en_curso');
  assert.match(st.faltan.join(' '), /venció: los archivos cambiaron/);
});

test('las evidencias de fin de turno tomadas en curso no vencen una verificación posterior; un cambio después sí', async () => {
  const d = await approved();
  T.startTask(d, 'T-01', { responsable: 'backend' });
  fs.writeFileSync(path.join(d, 'src/pdf.js'), 'v2');
  await E(d, 's', 'post', edit('src/pdf.js'));
  await E(d, 's', 'stop', { lastMessage: 'avance' });
  assert.ok(T.load(d).trabajo.tareas[0].evidencias.length >= 1, 'el fin de turno dejó evidencia en la tarea en curso');
  fs.writeFileSync(path.join(d, 'src/pdf.js'), 'v3');
  const r = await T.verifyTask(d, 'T-01', { cfg: loadConfig(d), sesion: 's' });
  assert.strictEqual(r.tarea.estado, 'verificada');
  assert.strictEqual(T.status(d).tareas[0].estado, 'verificada', 'la evidencia vieja (v2) no la vence');
  await E(d, 's', 'stop', { lastMessage: 'listo' });
  assert.strictEqual(T.load(d).trabajo.tareas[0].estado, 'verificada', 'el fin de turno tampoco');
  fs.writeFileSync(path.join(d, 'src/pdf.js'), 'v4');
  assert.strictEqual(T.status(d).tareas[0].estado, 'por_reverificar');
});

test('un comando de aceptación que falla impide verificar; el «sin progreso» bloquea la tarea al tercer intento igual', async () => {
  const plan = { ...PLAN, requisitos: [{ id: 'REQ-01', texto: 'x', criterios: [{ id: 'CA-01', texto: 'aceptación', comando: `"${NODE}" -e "console.log('falla igual');process.exit(1)"` }] }] };
  const d = await approved({}, plan);
  T.startTask(d, 'T-01');
  const cfg = loadConfig(d);
  const r1 = await T.verifyTask(d, 'T-01', { cfg, sesion: 's' });
  assert.strictEqual(r1.tarea.estado, 'en_curso');
  assert.strictEqual(r1.resultado.estado, 'fallido');
  await T.verifyTask(d, 'T-01', { cfg, sesion: 's' });
  const r3 = await T.verifyTask(d, 'T-01', { cfg, sesion: 's' });
  assert.strictEqual(r3.sinProgreso, true);
  assert.strictEqual(r3.tarea.estado, 'bloqueada');
  assert.match(r3.tarea.motivo, /sin progreso: 3 intentos/);
});

test('dependencias: no se inicia una tarea cuyas dependencias no están verificadas; un responsable no pisa a otro', async () => {
  const plan = { ...PLAN, tareas: [{ id: 'T-01', titulo: 'a', requisitos: ['REQ-01'], archivos: ['src/pdf.js'] }, { id: 'T-02', titulo: 'b', requisitos: ['REQ-01'], depende: ['T-01'], archivos: ['src/pdf.js'] }] };
  const d = await approved({}, plan);
  assert.throws(() => T.startTask(d, 'T-02'), /depende de T-01/);
  T.startTask(d, 'T-01', { responsable: 'backend' });
  assert.throws(() => T.startTask(d, 'T-01', { responsable: 'frontend' }), /ya la trabaja «backend»/);
});

test('una sesión nueva (o tras compactar) recibe qué falta y por qué', async () => {
  const d = await approved();
  const ctx = (await E(d, 'otra', 'session', { source: 'startup' })).context;
  assert.match(ctx, /Trabajo en curso: exportar a PDF/);
  assert.match(ctx, /Falta: .*REQ-01\/CA-01: sin evidencia del control «tests»/);
  const after = (await E(d, 's', 'compact', { wantsContext: true })).context;
  assert.match(after, /Trabajo en curso/);
});

test('un trabajo dañado no se interpreta como completo', async () => {
  const d = await approved();
  fs.writeFileSync(path.join(S.projectDir(d), 'trabajo.json'), '{ roto');
  assert.ok(T.status(d).problema);
  assert.match(T.summary(d), /no se puede leer/);
  await assert.rejects(T.verifyTask(d, 'T-01', { cfg: loadConfig(d), sesion: 's' }), /no se puede usar/);
});

test('CLI: el agente registra y verifica; aceptar y descartar son solo del usuario', async () => {
  const d = project({ 'src/pdf.js': 'v1' });
  cfgFile(d, testsCmd('process.exit(0)'));
  const cli = (...args) => spawnSync(NODE, [path.join(REPO, 'bin', 'sdd-harness.js'), 'trabajo', ...args], { cwd: d, encoding: 'utf8', env: process.env });
  let r = cli('plan', '--json', JSON.stringify(PLAN));
  assert.match(r.stdout, /Plan registrado/);
  r = cli();
  assert.strictEqual(r.status, 1, 'incompleto → código 1');
  assert.match(r.stdout, /plan sin aprobar/);
  assert.match(cli('verificar', 'T-01').stdout, /no está aprobado por el usuario/);
  const deny = await E(d, 's', 'pre', { tool: { kind: 'shell', name: 'Bash', command: 'node "$HOME/.sdd-orquestador/bin/sdd-harness.js" trabajo aceptar', paths: [] } });
  assert.match(deny.reason, /solo el usuario/);
  assert.strictEqual(await E(d, 's', 'pre', { tool: { kind: 'shell', name: 'Bash', command: 'node "$HOME/.sdd-orquestador/bin/sdd-harness.js" trabajo verificar T-01', paths: [] } }), null);
});
