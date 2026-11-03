'use strict';
// Carpeta con varios proyectos adentro y workspaces multi-raíz: mapa, memoria, reglas, sensores y deshacer por proyecto.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { tmp, REPO } = require('./helpers');

const SDD_HOME = tmp('sdd-home-');
process.env.SDD_HOME = SDD_HOME;
const W = require('../src/workspace');

const hook = (host, ev, input) => {
  const r = spawnSync(process.execPath, [path.join(REPO, 'bin', 'sdd-hook.js'), host, ev], { input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, SDD_HOME } });
  return r.stdout.trim() ? JSON.parse(r.stdout) : null;
};
const cli = (cwd, ...args) => spawnSync(process.execPath, [path.join(REPO, 'bin', 'sdd-harness.js'), ...args], { cwd, encoding: 'utf8', env: { ...process.env, SDD_HOME } });
const decision = o => o && o.hookSpecificOutput && o.hookSpecificOutput.permissionDecision;

function write(base, files) {
  for (const [f, c] of Object.entries(files)) { const p = path.join(base, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c); }
}
/** Carpeta contenedora sin git con: front (Angular, repo), api (NestJS, repo, con memoria y reglas propias), libs/shared (Go). */
function container() {
  const c = tmp('sdd-cont-');
  write(c, {
    'front/package.json': JSON.stringify({ name: 'lab-front', dependencies: { '@angular/core': '17' } }), 'front/angular.json': '{}', 'front/src/a.ts': 'export const a = 1;\n',
    'api/package.json': JSON.stringify({ name: 'lab-api', dependencies: { '@nestjs/core': '10' } }), 'api/src/x.ts': 'export const x = 1;\n',
    'api/.sdd/memoria/MEMORIA.md': '# Memoria\n\nAPI de recepción de muestras (NestJS + Postgres)\n- Convención: DTOs en src/dto\n',
    'api/.sdd/harness.json': JSON.stringify({ reglas: [{ nombre: 'dominio-api', archivos: 'src/domain/**', noImportar: ['axios'], mensaje: 'usa el cliente http de src/infra' }],
      sensores: { alTerminar: ['tests'], comandos: { tests: 'node -e "process.exit(0)"' } } }),
    'libs/shared/go.mod': 'module shared\n',
  });
  for (const d of ['front', 'api']) spawnSync('git', ['init', '-q'], { cwd: path.join(c, d) });
  return c;
}

test('detecta los proyectos dentro de la carpeta abierta, con stack, memoria y repo', () => {
  const c = container();
  const ws = W.detect(c);
  const by = Object.fromEntries(ws.proyectos.map(p => [p.nombre, p]));
  assert.deepStrictEqual(Object.keys(by).sort(), ['api', 'front', 'shared']);
  assert.deepStrictEqual(by.front.stack, ['Angular']);
  assert.ok(by.api.memoria && by.api.git && by.api.config);
  assert.match(by.api.descripcion, /recepción de muestras/);
  assert.ok(W.isMulti(ws));
  assert.strictEqual(W.projectOf(ws, path.join(c, 'api/src/x.ts')).nombre, 'api');
  assert.deepStrictEqual(W.mentioned(ws, 'revisa lab-api y el front').map(p => p.nombre).sort(), ['api', 'front']);
  // Un proyecto solo: sin mapa (todo funciona como siempre)
  assert.strictEqual(W.mapBlock(W.detect(path.join(c, 'front'))), '');
});

test('workspace multi-raíz (.code-workspace): las otras carpetas entran al espacio y leerlas no pide permiso', () => {
  const base = tmp('sdd-ws-');
  write(base, { 'front/package.json': '{"name":"front"}', 'otro/package.json': '{"name":"otro"}', 'otro/src/b.ts': 'x',
    'mio.code-workspace': '{\n  // workspace\n  "folders": [ { "path": "front" }, { "path": "otro" }, ],\n}\n' });
  spawnSync('git', ['init', '-q'], { cwd: path.join(base, 'front') });
  const ws = W.detect(path.join(base, 'front'));
  assert.strictEqual(ws.carpetas.length, 2);
  assert.match(W.mapBlock(ws), /otro/);
  const read = hook('claude', 'PreToolUse', { session_id: 'w', cwd: path.join(base, 'front'), tool_name: 'Read', tool_input: { file_path: path.join(base, 'otro/src/b.ts') } });
  assert.notStrictEqual(decision(read), 'ask', 'la carpeta del workspace no es "fuera del proyecto"');
});

test('al iniciar: mapa del espacio; al mencionar un proyecto o editar en él: su memoria (una vez)', () => {
  const c = container();
  const base = { session_id: 'm', cwd: c };
  const start = hook('claude', 'SessionStart', { ...base, source: 'startup' }).hookSpecificOutput.additionalContext;
  assert.match(start, /Espacio de trabajo: 3 proyecto/);
  assert.match(start, /\*\*api\*\* — `api` — NestJS · con memoria · repo git/);
  assert.match(start, /busca en TODOS los proyectos/);
  const p1 = hook('claude', 'UserPromptSubmit', { ...base, prompt: 'en lab-api agrega un endpoint de estado, directo' }).hookSpecificOutput.additionalContext;
  assert.match(p1, /Memoria del proyecto api/);
  assert.match(p1, /DTOs en src\/dto/);
  const p2 = hook('claude', 'UserPromptSubmit', { ...base, prompt: 'y en lab-api también un health, directo' }).hookSpecificOutput.additionalContext;
  assert.doesNotMatch(p2, /Memoria del proyecto api/, 'no la repite');
});

test('reglas, protecciones, sensores y deshacer de cada proyecto', () => {
  const c = container();
  const base = { session_id: 'r', cwd: c };
  const edit = (f, content) => hook('claude', 'PreToolUse', { ...base, tool_name: 'Write', tool_input: { file_path: path.join(c, f), content } });
  hook('claude', 'UserPromptSubmit', { ...base, prompt: 'cambia los valores, directo' });
  const v = edit('api/src/domain/u.ts', "import axios from 'axios';");
  assert.strictEqual(decision(v), 'deny', 'la regla del proyecto api aplica con rutas relativas a api');
  assert.match(v.hookSpecificOutput.permissionDecisionReason, /dominio-api/);
  assert.ok(!decision(edit('front/src/domain/u.ts', "import axios from 'axios';")), 'en front esa regla no aplica');
  assert.strictEqual(decision(edit('api/.sdd/harness.json', '{}')), 'ask', 'la configuración de cada proyecto está protegida');
  assert.strictEqual(decision(edit('front/.git/config', 'x')), 'deny', '.git de cada repo');
  // Puntos: uno por repo tocado, mismo turno
  edit('front/src/a.ts', 'export const a = 2;');
  fs.writeFileSync(path.join(c, 'front/src/a.ts'), 'export const a = 2;\n');
  edit('api/src/x.ts', 'export const x = 2;');
  fs.writeFileSync(path.join(c, 'api/src/x.ts'), 'export const x = 2;\n');
  hook('claude', 'PostToolUse', { ...base, tool_name: 'Write', tool_input: { file_path: path.join(c, 'front/src/a.ts'), content: '' } });
  hook('claude', 'PostToolUse', { ...base, tool_name: 'Write', tool_input: { file_path: path.join(c, 'api/src/x.ts'), content: '' } });
  const list = cli(c, 'puntos').stdout;
  assert.match(list, / 1\. .*cambia los valores.*· (front, api|api, front)/);
  const pv = cli(c, 'deshacer').stdout;
  assert.match(pv, /↺ front\/src\/a\.ts/);
  assert.match(pv, /↺ api\/src\/x\.ts/);
  cli(c, 'deshacer', '--confirmar');
  assert.strictEqual(fs.readFileSync(path.join(c, 'front/src/a.ts'), 'utf8'), 'export const a = 1;\n');
  assert.strictEqual(fs.readFileSync(path.join(c, 'api/src/x.ts'), 'utf8'), 'export const x = 1;\n');
  for (const d of ['front', 'api']) assert.notStrictEqual(spawnSync('git', ['-C', path.join(c, d), 'log', '-1']).status, 0, `sin commits en ${d}`);
});

test('al terminar, los sensores corren en cada proyecto con su propia configuración', () => {
  const c = container();
  const base = { session_id: 's', cwd: c };
  hook('claude', 'UserPromptSubmit', { ...base, prompt: 'arregla x, directo' });
  hook('claude', 'PostToolUse', { ...base, tool_name: 'Write', tool_input: { file_path: path.join(c, 'api/src/x.ts'), content: '' } });
  hook('claude', 'Stop', { ...base, last_assistant_message: 'Listo.' });
  const estado = cli(c, 'estado', c).stdout;
  assert.match(estado, /Verificación: aprobado — ✓ tests@api/);
  assert.match(cli(c, 'registro', '200').stdout, /sensores · aprobado · tests@api:aprobado/);
});
