'use strict';
// Contrato público del estado (`sdd-harness estado --json`): lo que consume la extensión de VS Code y
// cualquier panel propio, para que nadie lea los archivos internos del estado. Se prueba la forma que una
// integración necesita y, sobre todo, que NO se filtre lo que el estado guarda para sí: el último mensaje
// del agente y las huellas de los archivos.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { spawnSync } = require('child_process');
const { tmp, project, REPO } = require('./helpers');

const SDD_HOME = tmp('sdd-home-');
process.env.SDD_HOME = SDD_HOME;
const S = require('../src/state');

const cli = (cwd, ...args) => spawnSync(process.execPath, [path.join(REPO, 'bin', 'sdd-harness.js'), ...args], { cwd, encoding: 'utf8', env: { ...process.env, SDD_HOME } });
const json = (cwd, ...args) => {
  const r = cli(cwd, ...args);
  assert.strictEqual(r.status || 0, 0, `salió con error: ${r.stderr}`);
  return JSON.parse(r.stdout);
};

test('sin actividad del harness, el contrato ya trae proyecto, configuración y versión', () => {
  const dir = project({ 'package.json': '{"name":"x"}' });
  const o = json(dir, 'estado', dir, '--json');
  assert.strictEqual(o.v, 1);
  assert.strictEqual(o.proyecto.nombre, path.basename(dir));
  assert.strictEqual(o.sesion, null);
  assert.strictEqual(o.gate, null);
  assert.ok(o.config.gate, 'el contrato dice con qué política de GATE corre el proyecto');
  assert.ok(o.harness.repo, 'versión del repositorio, para comparar con la instalada');
  assert.ok(o.harness.estadoDir, 'carpeta del estado: una integración la vigila para saber cuándo volver a preguntar, sin leer los archivos de adentro');
  assert.deepStrictEqual(o.aprobaciones, { pendientes: [], vigentes: [] });
});

test('con una sesión en curso trae GATE, controles y confirmaciones, y no filtra lo interno', () => {
  const dir = project({ 'package.json': '{"name":"x"}' });
  S.updateState(dir, 's1', s => {
    s.herramienta = 'copilot';
    s.gate = { estado: 'pendiente', desde: new Date().toISOString() };
    s.mensajeUsuario = 'agrega exportación a Excel';
    s.cambios = ['src/a.ts', '.sdd/memoria/sesion.md'];
    s.sucio = true;
    s.sensores = {
      estado: 'fallido', ok: false, motivo: '', en: new Date().toISOString(), huella: 'h1', pausado: false,
      resumen: [{ nombre: 'tests', modulo: '.', estado: 'fallido', obligatorio: true, motivo: '1 de 48', ms: 1200 }],
    };
    s.aprobaciones = { pendientes: [{ id: 'a3f2', tipo: 'comando', etiqueta: 'git commit', vence: '2026-11-09T00:30:00.000Z' }], aprobadas: [] };
    s.ultimoMensaje = 'RESPUESTA-DEL-AGENTE-QUE-NO-DEBE-SALIR';
    s.huellas = { 'src/a.ts': 'HUELLA-QUE-NO-DEBE-SALIR' };
  });
  const o = json(dir, 'estado', dir, '--json');
  assert.strictEqual(o.sesion.id, 's1');
  assert.strictEqual(o.sesion.herramienta, 'copilot');
  assert.strictEqual(o.gate.estado, 'pendiente');
  assert.strictEqual(o.gate.bloqueaEdiciones, true, 'un plan pendiente bloquea las ediciones');
  assert.deepStrictEqual(o.cambios, ['src/a.ts'], 'la memoria del proyecto no cuenta como cambio de código');
  assert.strictEqual(o.sucio, true);
  assert.strictEqual(o.sensores.estado, 'fallido');
  assert.strictEqual(o.sensores.controles.length, 1);
  assert.strictEqual(o.sensores.controles[0].control, 'tests');
  assert.strictEqual(o.sensores.controles[0].obligatorio, true);
  assert.strictEqual(o.aprobaciones.pendientes[0].etiqueta, 'git commit');
  const texto = JSON.stringify(o);
  assert.ok(!texto.includes('RESPUESTA-DEL-AGENTE-QUE-NO-DEBE-SALIR'), 'el contrato no expone el último mensaje del agente');
  assert.ok(!texto.includes('HUELLA-QUE-NO-DEBE-SALIR'), 'el contrato no expone las huellas de los archivos');
});

test('un plan aprobado deja de bloquear ediciones y dice por dónde se aprobó', () => {
  const dir = project({ 'package.json': '{"name":"x"}' });
  S.updateState(dir, 's1', s => { s.gate = { estado: 'aprobado', desde: new Date().toISOString(), via: 'chat' }; });
  const o = json(dir, 'estado', dir, '--json');
  assert.strictEqual(o.gate.bloqueaEdiciones, false);
  assert.strictEqual(o.gate.via, 'chat');
});

test('con el orquestador apagado en la conversación, el contrato lo dice y no bloquea', () => {
  const dir = project({ 'package.json': '{"name":"x"}' });
  S.updateState(dir, 's1', s => { s.sdd = 'off'; s.gate = { estado: 'libre', desde: new Date().toISOString() }; });
  const o = json(dir, 'estado', dir, '--json');
  assert.strictEqual(o.gate.sdd, 'off');
  assert.strictEqual(o.gate.bloqueaEdiciones, false);
});

test('worktree listar --json entrega el principal con su rama y su carpeta', () => {
  const dir = project({ 'package.json': '{"name":"x"}' });
  const o = json(dir, 'worktree', 'listar', '--json');
  assert.strictEqual(o.v, 1);
  assert.strictEqual(o.worktrees[0].principal, true);
  assert.strictEqual(typeof o.worktrees[0].dir, 'string');
  assert.strictEqual(typeof o.worktrees[0].sucio, 'number');
});
