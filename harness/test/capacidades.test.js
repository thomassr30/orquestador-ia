'use strict';
// Contrato de capacidades por cliente y niveles de evidencia de doctor: una prueba sintética no es una integración
// confirmada; solo los eventos reales del cliente (observado.json) la confirman.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { tmp, project, REPO } = require('./helpers');

process.env.SDD_HOME = tmp('sdd-home-');
const CAP = require('../src/capacidades');
const O = require('../src/observado');
const HC = require('../src/hooks-config');
const A = require('../src/adapters');

const ESPERADO = { // bloqueoPrevio, aprobacion, finDeTurno, compactacion, resultados, sesion, consumo, aislamiento
  claude: ['si', 'nativa', 'bloquea', 'reinyecta', 'ediciones', 'si', 'medido', 'desconocido'],
  codex: ['parcial', 'chat', 'bloquea', 'reinyecta', 'ediciones', 'si', 'no_disponible', 'desconocido'],
  gemini: ['si', 'chat', 'reintenta', 'reinyecta', 'ediciones', 'si', 'no_disponible', 'desconocido'],
  cursor: ['si', 'chat', 'reintenta', 'aviso-previo', 'ediciones', 'si', 'no_disponible', 'desconocido'],
  copilot: ['si', 'nativa', 'bloquea', 'aviso-previo', 'todas', 'si', 'no_disponible', 'desconocido'],
  opencode: ['si', 'chat', 'reintenta', 'reinyecta', 'todas', 'si', 'no_disponible', 'desconocido'],
};
const FUENTE = { 'hooks-config.js': 'harness/src/hooks-config.js', 'usage.js': 'harness/src/usage.js', 'sdd-harness.js': 'harness/opencode/sdd-harness.js', 'install.js': 'install.js' };
const lineas = rel => fs.readFileSync(path.join(REPO, rel), 'utf8').split('\n').length;

test('matriz de capacidades completa por cliente, con respaldo archivo:línea que existe', () => {
  const m = CAP.matriz();
  assert.deepStrictEqual(Object.keys(m), Object.keys(ESPERADO));
  for (const [id, vals] of Object.entries(ESPERADO)) {
    assert.deepStrictEqual(CAP.DIMENSIONES.map(d => m[id][d]), vals, id);
    for (const d of CAP.DIMENSIONES) {
      assert.ok(CAP.VALORES[d].includes(m[id][d]), `${id}.${d}: valor fuera del contrato`);
      assert.ok(m[id].notas[d], `${id}: falta la nota de ${d}`);
      if (d === 'aislamiento') continue;
      const refs = [...m[id].notas[d].matchAll(/([\w-]+\.js):(\d+)/g)];
      assert.ok(refs.length, `${id}.${d}: la nota no cita archivo:línea`);
      for (const [, file, n] of refs) {
        const rel = FUENTE[file] || `harness/src/adapters/${file}`;
        assert.ok(Number(n) <= lineas(rel), `${id}.${d}: ${file}:${n} no existe`);
      }
    }
  }
});

test('los hooks declarados son los que registra hooks-config.js y los que entiende cada adaptador', () => {
  for (const id of ['claude', 'codex', 'gemini', 'cursor', 'copilot']) {
    const reg = HC[id]('H');
    assert.deepStrictEqual(A[id].capacidades.hooks, Object.keys(id === 'copilot' ? reg.hooks : reg), id);
    for (const ev of A[id].capacidades.hooks) assert.ok(Object.prototype.hasOwnProperty.call(A[id].EVENTS, ev), `${id}: ${ev} sin evento común`);
  }
  const plugin = fs.readFileSync(path.join(REPO, 'harness', 'opencode', 'sdd-harness.js'), 'utf8');
  for (const h of CAP.CLIENTES.opencode.mod.capacidades.hooks) assert.ok(plugin.includes(`'${h}'`), `el plugin no tiene ${h}`);
});

test('evaluar: sin eventos reales nunca es «confirmada»; con eventos reales sí, y lo dice con fecha', () => {
  const sint = { ok: true, deny: true, critica: true, fin: true };
  const sinObs = CAP.evaluar('claude', { configuracion: true, ejecutable: true, sintetica: sint }, { observado: {} });
  assert.strictEqual(sinObs.nivel, 'sintetica');
  assert.strictEqual(sinObs.confirmacion, null);
  assert.deepStrictEqual(sinObs.capacidades.bloqueoPrevio.respaldo, ['sintetica']);
  assert.strictEqual(sinObs.capacidades.compactacion.texto, CAP.SIN_CONFIRMAR);
  const obs = { claude: { PreToolUse: { primera: '2026-01-02T10:00:00.000Z', ultima: '2026-01-02T10:00:00.000Z', n: 1 } } };
  const con = CAP.evaluar('claude', { configuracion: true, ejecutable: true, sintetica: sint }, { observado: obs });
  assert.strictEqual(con.nivel, 'confirmada');
  assert.strictEqual(con.confirmacion, 'el harness recibió eventos reales de Claude Code el 2026-01-02 10:00');
  assert.deepStrictEqual(con.capacidades.bloqueoPrevio.respaldo, ['sintetica', 'evento-real']);
  assert.strictEqual(con.capacidades.finDeTurno.respaldo.includes('evento-real'), false, 'Stop no llegó: el fin de turno sigue sin evento real');
  const falla = CAP.evaluar('claude', { configuracion: true, ejecutable: true, sintetica: { ...sint, ok: false } }, { observado: obs });
  assert.strictEqual(falla.nivel, 'ejecutable', 'con la prueba sintética fallida no se confirma aunque haya eventos');
  assert.ok(falla.limitaciones.some(l => l.dimension === 'resultados' && l.valor === 'ediciones'));
});

test('aislamiento: solo lo que respalda la documentación (Claude sandbox.enabled, Codex sandbox_mode); el resto, desconocido', () => {
  const home = tmp('sdd-home-ais-');
  const prev = process.env.CODEX_HOME; delete process.env.CODEX_HOME;
  try {
    assert.strictEqual(CAP.aislamiento('claude', { home }).valor, 'desconocido');
    assert.strictEqual(CAP.aislamiento('codex', { home }).valor, 'desconocido');
    fs.mkdirSync(path.join(home, '.claude')); fs.mkdirSync(path.join(home, '.codex'));
    fs.writeFileSync(path.join(home, '.claude', 'settings.json'), JSON.stringify({ sandbox: { enabled: true } }));
    const c = CAP.aislamiento('claude', { home });
    assert.strictEqual(c.valor, 'sandbox');
    assert.match(c.nota, /Bash/);
    const toml = t => { fs.writeFileSync(path.join(home, '.codex', 'config.toml'), t); return CAP.aislamiento('codex', { home }).valor; };
    assert.strictEqual(toml('model = "x"\nsandbox_mode = "workspace-write"\n'), 'sandbox');
    assert.strictEqual(toml('sandbox_mode = "danger-full-access"\n'), 'sin-sandbox');
    assert.strictEqual(toml('[profiles.rapido]\nsandbox_mode = "read-only"\n'), 'desconocido', 'un perfil no es la configuración por defecto');
    assert.strictEqual(toml('default_permissions = "x"\nsandbox_mode = "read-only"\n'), 'desconocido');
    for (const id of ['gemini', 'cursor', 'copilot', 'opencode']) assert.strictEqual(CAP.aislamiento(id, { home }).valor, 'desconocido', id);
  } finally { if (prev !== undefined) process.env.CODEX_HOME = prev; }
});

test('observado.json: primera vez y luego como mucho una escritura por hora; SDD_DOCTOR=1 no cuenta', () => {
  const t0 = Date.parse('2026-03-01T12:00:00Z');
  assert.strictEqual(O.record('claude', 'PreToolUse', t0), true);
  assert.strictEqual(O.record('claude', 'PreToolUse', t0 + 60000), false, 'dentro de la hora no escribe');
  assert.strictEqual(O.record('claude', 'PreToolUse', t0 + 2 * O.HORA), true);
  const e = O.read().claude.PreToolUse;
  assert.strictEqual(e.n, 2);
  assert.strictEqual(e.primera, new Date(t0).toISOString());
  assert.strictEqual(O.record('__proto__', 'x', t0), false);
  process.env.SDD_DOCTOR = '1';
  try { assert.strictEqual(O.record('codex', 'Stop', t0), false); } finally { delete process.env.SDD_DOCTOR; }
  assert.strictEqual(O.read().codex, undefined);
  assert.strictEqual(O.limpiar(`falló en ${os.homedir()}${path.sep}proyecto`).includes(os.homedir()), false, 'sin rutas del usuario');
});

// doctor con HOME y SDD_HOME temporales y un Claude Code simulado que apunta a los hooks del repositorio.
test('doctor por niveles: sintética sin eventos → no confirmada; con eventos reales → confirmada; último error visible', () => {
  const home = tmp('sdd-fakehome-');
  const sddHome = tmp('sdd-home-doc-');
  fs.mkdirSync(path.join(home, '.claude'));
  fs.writeFileSync(path.join(home, '.claude', 'settings.json'), JSON.stringify({ hooks: HC.claude(REPO.replace(/\\/g, '/')) }));
  const env = { ...process.env, HOME: home, USERPROFILE: home, SDD_HOME: sddHome };
  for (const k of ['CLAUDE_PROJECT_DIR', 'GEMINI_PROJECT_DIR', 'GEMINI_SESSION_ID', 'CODEX_HOME', 'COPILOT_HOME', 'SDD_DOCTOR']) delete env[k];
  const dir = project({ 'a.js': '' });
  const doctor = (...args) => spawnSync(process.execPath, [path.join(REPO, 'bin', 'sdd-harness.js'), 'doctor', dir, ...args], { env, encoding: 'utf8', timeout: 120000 });
  const hook = (ev, input, extra = {}) => spawnSync(process.execPath, [path.join(REPO, 'bin', 'sdd-hook.js'), 'claude', ev], { input: JSON.stringify(input), env: { ...env, ...extra }, encoding: 'utf8' });

  const r1 = doctor('--json');
  assert.strictEqual(r1.status, 0, r1.stdout + r1.stderr);
  const d1 = JSON.parse(r1.stdout);
  assert.strictEqual(d1.clientes.claude.nivel, 'sintetica');
  assert.strictEqual(d1.clientes.claude.confirmacion, null);
  assert.deepStrictEqual(d1.clientes.claude.niveles, { configuracion: true, ejecutable: true, sintetica: true, eventosReales: false });
  assert.strictEqual(d1.clientes.claude.prueba.sintetica.critica, true, 'git push pide la confirmación nativa');
  assert.strictEqual(d1.clientes.codex.instalado, false);
  assert.match(d1.aviso, /no son un sandbox/);
  assert.ok(!fs.existsSync(path.join(sddHome, 'observado.json')), 'la prueba sintética de doctor no registra eventos reales');

  hook('SessionStart', { session_id: 'd', cwd: dir, source: 'startup' }, { SDD_DOCTOR: '1' });
  assert.ok(!fs.existsSync(path.join(sddHome, 'observado.json')), 'SDD_DOCTOR=1 no registra');
  hook('SessionStart', { session_id: 'd', cwd: dir, source: 'startup' });
  assert.ok(fs.existsSync(path.join(sddHome, 'observado.json')), 'un evento normal sí se registra');
  hook('PreToolUse', { session_id: 'd', cwd: 123 }); // excepción interna en el adaptador (cwd no es texto)
  const err = JSON.parse(fs.readFileSync(path.join(sddHome, 'ultimo-error.json'), 'utf8'));
  assert.strictEqual(err.cliente, 'claude');
  assert.strictEqual(err.evento, 'PreToolUse');

  const r2 = doctor();
  assert.strictEqual(r2.status, 0, r2.stdout + r2.stderr);
  assert.match(r2.stdout, /integración confirmada en el cliente real/);
  assert.match(r2.stdout, /el harness recibió eventos reales de Claude Code el \d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  assert.match(r2.stdout, /Último error interno del hook: .*claude PreToolUse/);
  assert.match(r2.stdout, /Modo: normal/);
  assert.match(r2.stdout, /Clave de aprobaciones por chat:/);
  assert.match(r2.stdout, /Línea base de errores:/);
  assert.doesNotMatch(r2.stdout, /Codex .*integración confirmada/);
});
