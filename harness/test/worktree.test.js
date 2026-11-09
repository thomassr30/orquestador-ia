'use strict';
// Worktrees: una carpeta por tarea con su propia rama. Nada descarta cambios sin commitear, y los subcomandos
// que escriben los decide el usuario (la política se los pide al agente aunque pasen por el script propio).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { tmp } = require('./helpers');
process.env.SDD_HOME = tmp('sdd-home-');
const W = require('../src/worktree');
const { Policy } = require('../src/policy');

const git = (cwd, ...args) => spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd, encoding: 'utf8' });
/** Repo con rama develop y un commit. */
function repo() {
  const d = fs.realpathSync(fs.mkdtempSync(path.join(tmp('wt-'), 'repo')));
  git(d, 'init', '-q', '-b', 'develop', '.');
  // Identidad en el repo: los comandos del módulo no la pasan por la línea de comandos, como en un repo real
  git(d, 'config', 'user.email', 't@t'); git(d, 'config', 'user.name', 't');
  fs.writeFileSync(path.join(d, 'app.js'), 'v1\n');
  git(d, 'add', '-A'); git(d, 'commit', '-qm', 'base');
  return d;
}

test('un worktree por tarea: la carpeta actual no se toca y lo commiteado se comparte', () => {
  const d = repo();
  assert.deepStrictEqual(W.list(d).map(w => [w.rama, w.principal]), [['develop', true]]);

  // Trabajo en curso sin commitear en el principal: crear el worktree no lo toca
  fs.writeFileSync(path.join(d, 'app.js'), 'en curso\n');
  const r = W.create(d, 'f/urgente');
  assert.strictEqual(r.rama, 'f/urgente');
  assert.strictEqual(r.base, 'develop');
  assert.ok(fs.existsSync(r.dir));
  assert.strictEqual(fs.readFileSync(path.join(d, 'app.js'), 'utf8'), 'en curso\n', 'lo que estaba en curso se queda');
  assert.deepStrictEqual(W.list(d).map(w => w.rama).sort(), ['develop', 'f/urgente']);
  assert.deepStrictEqual(W.dirty(d), ['app.js'], 'el nombre no sale cortado por el espacio del estado de git');

  // La rama no se crea dos veces
  assert.throws(() => W.create(d, 'f/urgente'), /ya está en el worktree/);
  assert.throws(() => W.create(d, 'otra', { desde: 'no-existe' }), /no existe la rama/);
});

test('sincronizar: muestra qué entra, nunca pisa cambios sin commitear y solo mezcla con confirmar', () => {
  const d = repo();
  const w = W.create(d, 'f/x').dir;
  // develop avanza en el principal
  fs.writeFileSync(path.join(d, 'otro.js'), 'nuevo\n');
  git(d, 'add', '-A'); git(d, 'commit', '-qm', 'cambio en develop');

  // Vista previa: no mezcla
  const prev = W.sync(w);
  assert.strictEqual(prev.entran.length, 1);
  assert.deepStrictEqual(prev.archivos, ['otro.js']);
  assert.strictEqual(prev.mezclado, false);
  assert.ok(prev.conflictos === null || prev.conflictos.length === 0);
  assert.strictEqual(fs.existsSync(path.join(w, 'otro.js')), false, 'sin --confirmar no entra nada');

  // Con cambios sin commitear se niega, con el nombre completo del archivo
  fs.writeFileSync(path.join(w, 'app.js'), 'mio\n');
  const sucio = W.sync(w, { confirmar: true });
  assert.match(sucio.bloqueado, /sin commitear \(app\.js\)/);
  assert.strictEqual(fs.existsSync(path.join(w, 'otro.js')), false, 'no mezcló nada');

  // Commiteado, mezcla
  git(w, 'commit', '-qam', 'mio');
  const m = W.sync(w, { confirmar: true });
  assert.strictEqual(m.mezclado, true);
  assert.strictEqual(fs.readFileSync(path.join(w, 'otro.js'), 'utf8'), 'nuevo\n');

  // Estar en la propia rama base no es sincronizar
  assert.match(W.sync(d).bloqueado, /es la propia rama base/);
});

test('sincronizar avisa de los conflictos antes de mezclar y deja el árbol como estaba', () => {
  const d = repo();
  const w = W.create(d, 'f/y').dir;
  fs.writeFileSync(path.join(d, 'app.js'), 'desde develop\n');
  git(d, 'add', '-A'); git(d, 'commit', '-qm', 'develop toca app.js');
  fs.writeFileSync(path.join(w, 'app.js'), 'desde mi rama\n');
  git(w, 'commit', '-qam', 'yo toco app.js');

  const r = W.sync(w, { confirmar: true });
  assert.ok(r.conflictos === null || r.conflictos.includes('app.js'), JSON.stringify(r.conflictos));
  if (r.conflictos) assert.match(r.bloqueado, /en conflicto/);
  assert.strictEqual(fs.readFileSync(path.join(w, 'app.js'), 'utf8'), 'desde mi rama\n', 'mi versión intacta');
  assert.deepStrictEqual(W.dirty(w), [], 'la vista previa no deja nada a medias');
  assert.strictEqual(fs.existsSync(path.join(w, '.git', 'MERGE_HEAD')), false);
});

test('cerrar: avisa de lo que se perdería y no quita sin confirmar', () => {
  const d = repo();
  const w = W.create(d, 'f/z').dir;
  fs.writeFileSync(path.join(w, 'app.js'), 'cambio\n');
  git(w, 'commit', '-qam', 'un commit sin subir');

  const prev = W.close(d, 'f/z');
  assert.strictEqual(prev.quitado, false);
  assert.ok(prev.riesgos.some(x => /sin subir/.test(x)), prev.riesgos.join(' | '));
  const bloq = W.close(d, 'f/z', { confirmar: true });
  assert.strictEqual(bloq.quitado, false);
  assert.match(bloq.bloqueado, /no se quita con/);
  assert.ok(fs.existsSync(w), 'sigue ahí');
  assert.throws(() => W.close(d, 'no-existe'), /no encontré ese worktree/);
});

test('los subcomandos que escriben los decide el usuario, y se anuncian antes de pedir el sí', () => {
  const p = new Policy({ root: repo() });
  const cmd = s => `node "$HOME/.sdd-orquestador/bin/sdd-harness.js" worktree ${s}`;
  // Cada uno dice qué hace en concreto, no un permiso genérico: el usuario lo lee en el diálogo de su cliente
  const casos = [
    ['nuevo f/login-500', /crea la rama «f\/login-500» y una carpeta de trabajo nueva/],
    ['sincronizar --confirmar', /mezcla la rama base .* vista previa, que es «sincronizar» sin --confirmar/s],
    ['cerrar f/login-500 --confirmar', /quita la carpeta de trabajo de «f\/login-500».*la rama se conserva/s],
  ];
  for (const [s, re] of casos) {
    const r = p.checkCommand(cmd(s));
    assert.strictEqual(r.decision, 'ask', s);
    assert.ok(r.critical, `${s}: decisión del usuario`);
    assert.match(r.reason, re, s);
    assert.match(r.reason, /Antes del sí, dile en una o dos líneas qué vas a hacer y por qué ahora/, `${s}: se anuncia antes de pedir permiso`);
  }
  // Leer y las vistas previas no molestan
  for (const s of ['listar', 'sincronizar', 'cerrar f/x']) {
    assert.strictEqual(p.checkCommand(cmd(s)).decision, 'allow', s);
  }
  // Y lo mismo en las otras operaciones del orquestador que cambian el proyecto o la configuración
  for (const s of ['deshacer --confirmar', 'workspace --aplicar']) {
    const r = p.checkCommand(`node "$HOME/.sdd-orquestador/bin/sdd-harness.js" ${s}`);
    assert.ok(r.critical, s);
    assert.match(r.reason, /Antes del sí, dile/, s);
  }
});
