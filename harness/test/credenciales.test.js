'use strict';
// Credenciales de servidores MCP con token: dónde quedan, con qué permisos, y que el lanzador las entregue al
// servidor sin ensuciar stdout (que es el canal del protocolo MCP).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { tmp, REPO } = require('./helpers');

const LANZADOR = path.join(REPO, 'bin', 'sdd-mcp.js');
const CLI = path.join(REPO, 'bin', 'sdd-harness.js');
const home = () => ({ ...process.env, SDD_HOME: tmp('cred-home-') });
const C = require('../src/credenciales');
const conHome = (h, fn) => { const prev = process.env.SDD_HOME; process.env.SDD_HOME = h; try { return fn(); } finally { process.env.SDD_HOME = prev; } };

test('la credencial se guarda codificada, solo legible por el usuario', () => {
  const h = tmp('cred-');
  conHome(h, () => {
    const r = C.save('azure-sag', 'azure-pat', { usuario: 'yo@empresa.cl', token: 'TOKEN-EN-CLARO' });
    const crudo = fs.readFileSync(r.archivo, 'utf8');
    assert.ok(!crudo.includes('TOKEN-EN-CLARO'), 'el token no queda en claro en el archivo');
    const c = C.read('azure-sag');
    assert.strictEqual(c.variable, 'PERSONAL_ACCESS_TOKEN');
    // El servidor de Microsoft espera el base64 de «correo:token», no el token pelado
    assert.strictEqual(Buffer.from(c.valor, 'base64').toString(), 'yo@empresa.cl:TOKEN-EN-CLARO');
    if (process.platform !== 'win32') {
      assert.strictEqual(fs.statSync(r.archivo).mode & 0o777, 0o600);
      assert.strictEqual(fs.statSync(path.dirname(r.archivo)).mode & 0o777, 0o700);
    }
  });
});

test('listar no expone el valor, y borrar lo quita', () => {
  const h = tmp('cred-');
  conHome(h, () => {
    C.save('azure-sag', 'azure-pat', { usuario: 'yo@empresa.cl', token: 'SECRETO' });
    const filas = C.list();
    assert.strictEqual(filas.length, 1);
    assert.strictEqual(filas[0].alias, 'azure-sag');
    assert.ok(!JSON.stringify(filas).includes('SECRETO'), 'el listado no lleva el valor');
    assert.strictEqual(C.remove('azure-sag'), true);
    assert.strictEqual(C.remove('azure-sag'), false, 'borrar lo que no está no falla');
    assert.strictEqual(C.list().length, 0);
  });
});

test('un alias con ruta adentro se rechaza', () => {
  for (const malo of ['../otro', 'a/b', 'CON MAYUSCULAS', '', '.']) assert.throws(() => C.checkAlias(malo), /alias inválido/, malo);
});

test('el lanzador entrega la credencial al servidor y deja stdout limpio', () => {
  const env = home();
  conHome(env.SDD_HOME, () => C.save('azure-sag', 'azure-pat', { usuario: 'yo@empresa.cl', token: 'T0K3N' }));
  // El «servidor» imprime por stdout solo lo que le toca; la credencial la lee del entorno.
  const r = spawnSync(process.execPath, [LANZADOR, 'azure-sag', '--', process.execPath, '-e',
    'process.stdout.write(Buffer.from(process.env.PERSONAL_ACCESS_TOKEN,"base64").toString())'], { env, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(r.stdout, 'yo@empresa.cl:T0K3N');
});

test('sin credencial el lanzador falla por stderr, nunca por stdout', () => {
  const r = spawnSync(process.execPath, [LANZADOR, 'no-registrada', '--', process.execPath, '-e', '1'], { env: home(), encoding: 'utf8' });
  assert.notStrictEqual(r.status, 0);
  assert.strictEqual(r.stdout, '', 'stdout es el canal MCP: un solo carácter ahí rompe la sesión');
  assert.match(r.stderr, /no hay credencial «no-registrada»/);
  assert.match(r.stderr, /credencial azure no-registrada/, 'dice el comando exacto para arreglarlo');
});

test('el código de salida del servidor se propaga', () => {
  const env = home();
  conHome(env.SDD_HOME, () => C.save('x', 'azure-pat', { usuario: 'a@b.cl', token: 't' }));
  const r = spawnSync(process.execPath, [LANZADOR, 'x', '--', process.execPath, '-e', 'process.exit(42)'], { env, encoding: 'utf8' });
  assert.strictEqual(r.status, 42);
});

test('el comando registra por tubería y no imprime el token', () => {
  const env = home();
  const r = spawnSync(process.execPath, [CLI, 'credencial', 'azure', 'azure-sag', '--usuario', 'yo@empresa.cl'],
    { env, encoding: 'utf8', input: 'TOKEN-SUPER-SECRETO\n' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(!(r.stdout + r.stderr).includes('TOKEN-SUPER-SECRETO'), 'el token no se imprime nunca');
  assert.match(r.stdout, /Guardada en/);
  const listado = spawnSync(process.execPath, [CLI, 'credencial', 'listar'], { env, encoding: 'utf8' });
  assert.match(listado.stdout, /azure-sag · azure-pat · yo@empresa\.cl/);
});

test('la carpeta de credenciales cuenta como archivo con secretos para la política', () => {
  const R = require('../src/rules');
  const protegido = p => R.SECRET_FILES.some(re => re.test(p));
  assert.ok(protegido('/home/u/.sdd-orquestador/credenciales/azure-sag.json'));
  assert.ok(protegido('C:\\Users\\x\\.sdd-orquestador\\credenciales\\azure-sag.json'));
  assert.ok(protegido('/home/u/.sdd-orquestador/clave-aprobaciones'));
  assert.ok(!protegido('/home/u/proyecto/src/app.js'));
});
