'use strict';
// Perfiles de proyecto: la configuración de IA de un repo concreto vive en el harness (perfiles/<nombre>) y se
// aplica con un comando. Nunca borra, no pisa lo del equipo (semillas), conserva la configuración propia del
// proyecto al mezclar, se niega ante cambios sin commitear y el agente solo la aplica con confirmación del usuario.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { project, tmp, REPO } = require('./helpers');
const SDD_HOME = tmp('sdd-home-');
process.env.SDD_HOME = SDD_HOME;
const P = require('../src/perfiles');
const { Policy } = require('../src/policy');
const { compile, scanFile } = require('../src/project-rules');

const git = (cwd, ...args) => spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', '-c', 'core.autocrlf=false', ...args], { cwd, encoding: 'utf8' });
const leer = (d, rel) => fs.readFileSync(path.join(d, ...rel.split('/')), 'utf8');
const escribir = (d, rel, txt) => { const f = path.join(d, ...rel.split('/')); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, txt); };

/** Carpeta de perfiles con uno de prueba («demo»). */
function perfiles() {
  const dir = tmp('sdd-perfiles-');
  escribir(dir, 'demo/perfil.json', JSON.stringify({ nombre: 'demo', version: '2.0.0', descripcion: 'Perfil de prueba',
    detectar: { archivo: 'package.json', contiene: '"name": "demo-app"' }, semillas: ['.sdd/memoria/MEMORIA.md'],
    reemplaza: [{ ruta: '.claude/scripts', motivo: 'ya no se usa' }, { ruta: '.claude/no-existe', motivo: 'x' }] }));
  escribir(dir, 'demo/harness.json', JSON.stringify({ _comentario: 'nota', sensores: { obligatorios: ['lint', 'tests'] },
    permisos: { denegar: ['git push --force'], mcpBloquear: ['figma__use_figma'] },
    reglas: [{ nombre: 'kit', archivos: 'src/kit/**', soloLectura: true, mensaje: 'El kit no se toca.' }] }));
  escribir(dir, 'demo/proyecto/CLAUDE.md', '# Demo\nreglas\n');
  escribir(dir, 'demo/proyecto/.claude/skills/hacer-algo/SKILL.md', '---\nname: hacer-algo\ndescription: algo\n---\n');
  escribir(dir, 'demo/proyecto/.sdd/memoria/MEMORIA.md', '# Memoria semilla\n');
  escribir(dir, 'demo/proyecto/.sdd/harness.json', '{"gate":"nunca"}'); // no se copia nunca como archivo
  escribir(dir, 'otro-sin-json/x.md', 'x');
  return dir;
}
const app = files => project({ 'package.json': '{\n  "name": "demo-app"\n}\n', ...files });

test('lista los perfiles válidos y explica el que no existe', () => {
  const dir = perfiles();
  assert.deepStrictEqual(P.listar(dir).map(p => [p.nombre, p.version]), [['demo', '2.0.0']]);
  assert.throws(() => P.cargar('nada', dir), /no existe el perfil «nada» \(disponibles: demo\)/);
  assert.throws(() => P.cargar('../demo', dir), /nombre de perfil inválido/);
});

test('aplica: crea y reemplaza archivos, mezcla la configuración sin perder la del proyecto y no pisa las semillas', () => {
  const dir = perfiles();
  const d = app({ 'CLAUDE.md': '# viejo\r\nantes\r\n', '.sdd/memoria/MEMORIA.md': '# Memoria del equipo\n', '.claude/scripts/azdo.mjs': '//',
    '.sdd/harness.json': JSON.stringify({ gate: 'siempre', permisos: { denegar: ['make deploy'] }, reglas: [{ nombre: 'propia', archivos: 'src/**', prohibido: 'eval\\(', mensaje: 'no' }, { nombre: 'kit', archivos: 'x', prohibido: 'y', mensaje: 'vieja' }] }) });
  git(d, 'add', '-A'); git(d, 'commit', '-qm', 'base'); // un archivo sin seguimiento que se reemplazaría no se podría recuperar
  const pl = P.planificar(d, 'demo', { dir });
  assert.strictEqual(pl.coincide, true);
  assert.deepStrictEqual(pl.archivos.map(a => [a.rel, a.accion]), [['.claude/skills/hacer-algo/SKILL.md', 'crear'], ['.sdd/memoria/MEMORIA.md', 'semilla'], ['CLAUDE.md', 'reemplazar']]);
  assert.deepStrictEqual(pl.obsoletos.map(o => o.ruta), ['.claude/scripts'], 'solo informa lo obsoleto que existe');
  assert.strictEqual(leer(d, 'CLAUDE.md'), '# viejo\r\nantes\r\n', 'la vista previa no escribe');

  const r = P.aplicar(d, 'demo', { dir });
  assert.ifError(r.error);
  assert.strictEqual(leer(d, 'CLAUDE.md'), '# Demo\r\nreglas\r\n', 'conserva el fin de línea del archivo que reemplaza');
  assert.match(leer(d, '.claude/skills/hacer-algo/SKILL.md'), /name: hacer-algo/);
  assert.strictEqual(leer(d, '.sdd/memoria/MEMORIA.md'), '# Memoria del equipo\n', 'la semilla existente no se toca');
  assert.ok(fs.existsSync(path.join(d, '.claude', 'scripts', 'azdo.mjs')), 'nunca borra');
  const cfg = JSON.parse(leer(d, '.sdd/harness.json'));
  assert.strictEqual(cfg.gate, 'siempre', 'lo propio del proyecto se conserva');
  assert.deepStrictEqual(cfg.permisos.denegar, ['make deploy', 'git push --force'], 'las listas se suman');
  assert.deepStrictEqual(cfg.reglas.map(x => [x.nombre, x.mensaje]), [['propia', 'no'], ['kit', 'El kit no se toca.']], 'las reglas se reemplazan por nombre');
  assert.deepStrictEqual(cfg._perfil, { nombre: 'demo', version: '2.0.0' });
  assert.ok(!('_comentario' in cfg), 'las notas del perfil no pasan al proyecto');

  // Idempotente: aplicar otra vez no cambia nada ni duplica listas
  assert.strictEqual(P.pendientes(P.planificar(d, 'demo', { dir })), 0);
  P.aplicar(d, 'demo', { dir });
  assert.deepStrictEqual(JSON.parse(leer(d, '.sdd/harness.json')).permisos.denegar, ['make deploy', 'git push --force']);
  assert.deepStrictEqual(P.estado(d, { dir }), { nombre: 'demo', aplicada: '2.0.0', disponible: '2.0.0', pendientes: 0 });
});

test('se niega sin escribir nada: otro proyecto, cambios sin commitear o configuración ilegible', () => {
  const dir = perfiles();
  const ajeno = project({ 'package.json': '{"name":"otra"}' });
  const r1 = P.aplicar(ajeno, 'demo', { dir });
  assert.match(r1.error, /no parece el del perfil/);
  assert.ok(!fs.existsSync(path.join(ajeno, 'CLAUDE.md')));
  assert.ifError(P.aplicar(ajeno, 'demo', { dir, forzar: true }).error);

  const d = app({ 'CLAUDE.md': 'v1\n' });
  git(d, 'add', '-A'); git(d, 'commit', '-qm', 'base');
  fs.writeFileSync(path.join(d, 'CLAUDE.md'), 'editado a mano\n');
  const r2 = P.aplicar(d, 'demo', { dir });
  assert.match(r2.error, /cambios sin commitear .*CLAUDE\.md/);
  assert.strictEqual(leer(d, 'CLAUDE.md'), 'editado a mano\n');
  assert.ok(!fs.existsSync(path.join(d, '.claude', 'skills', 'hacer-algo')), 'tampoco escribe los demás');

  const roto = app({ '.sdd/harness.json': '{ roto' });
  const r3 = P.aplicar(roto, 'demo', { dir, forzar: true });
  assert.match(r3.error, /no es JSON válido/);
  assert.strictEqual(leer(roto, '.sdd/harness.json'), '{ roto');
});

test('CLI: lista, muestra la vista previa y aplica solo con --confirmar', () => {
  const dir = perfiles();
  const d = app({});
  const env = { ...process.env, SDD_HOME, SDD_PERFILES_DIR: dir };
  const cli = (...a) => spawnSync(process.execPath, [path.join(REPO, 'bin', 'sdd-harness.js'), 'perfil', ...a], { cwd: d, encoding: 'utf8', env });
  assert.match(cli().stdout, /demo 2\.0\.0 +Perfil de prueba/);
  const pv = cli('aplicar', 'demo');
  assert.match(pv.stdout, /\+ CLAUDE\.md \(nuevo\)/);
  assert.match(pv.stdout, /\+ \.sdd\/harness\.json \(nuevo: sensores, permisos, reglas\)/);
  assert.match(pv.stdout, /perfil aplicar demo --confirmar/);
  assert.ok(!fs.existsSync(path.join(d, 'CLAUDE.md')));
  const ap = cli('aplicar', 'demo', '--confirmar');
  assert.match(ap.stdout, /✓ Perfil aplicado: 4 archivo\(s\)/);
  assert.match(cli('aplicar', 'demo').stdout, /ya está al día/);
  const dr = spawnSync(process.execPath, [path.join(REPO, 'bin', 'sdd-harness.js'), 'doctor'], { cwd: d, encoding: 'utf8', env });
  assert.match(dr.stdout, /Perfil: demo 2\.0\.0 · al día/);
});

test('el agente puede ver la vista previa, pero aplicar un perfil lo decide el usuario', () => {
  const p = new Policy({ root: project({}) });
  const cmd = s => `node "$HOME/.sdd-orquestador/bin/sdd-harness.js" perfil ${s}`;
  for (const s of ['', 'listar', 'aplicar sag-laboratorio-frontend']) assert.strictEqual(p.checkCommand(cmd(s)).decision, 'allow', s);
  for (const s of ['aplicar sag-laboratorio-frontend --confirmar', 'aplicar demo --confirmar --forzar']) {
    const r = p.checkCommand(cmd(s));
    assert.strictEqual(r.decision, 'ask', s);
    assert.ok(r.critical, s);
    assert.match(r.reason, /vista previa.*Antes del sí, dile/s, s);
  }
});

test('regla soloLectura: bloquea crear o editar esos archivos y no inunda la revisión del proyecto', () => {
  const env = { ...process.env, SDD_HOME };
  const d = project({ 'src/kit/boton.tsx': 'export const B = 1;\n', 'src/app/a.tsx': '',
    '.sdd/harness.json': JSON.stringify({ gate: 'nunca', reglas: [{ nombre: 'kit', archivos: 'src/kit/**', soloLectura: true, mensaje: 'El kit no se toca: usa src/custom.' }] }) });
  const hook = input => { const r = spawnSync(process.execPath, [path.join(REPO, 'bin', 'sdd-hook.js'), 'claude', 'PreToolUse'], { input: JSON.stringify({ session_id: 'k1', cwd: d, ...input }), encoding: 'utf8', env }); return r.stdout.trim() ? JSON.parse(r.stdout).hookSpecificOutput : null; };
  for (const ti of [{ tool_name: 'Edit', tool_input: { file_path: path.join(d, 'src/kit/boton.tsx'), old_string: '1', new_string: '' } },
    { tool_name: 'Write', tool_input: { file_path: path.join(d, 'src/kit/nuevo.tsx'), content: 'x' } }]) {
    const o = hook(ti);
    assert.strictEqual(o.permissionDecision, 'deny', ti.tool_name);
    assert.match(o.permissionDecisionReason, /«kit».*El kit no se toca: usa src\/custom/);
  }
  assert.strictEqual(hook({ tool_name: 'Edit', tool_input: { file_path: path.join(d, 'src/app/a.tsx'), old_string: '', new_string: 'x' } }), null);
  const reglas = [{ nombre: 'kit', archivos: 'src/kit/**', soloLectura: true, mensaje: 'm' }];
  assert.strictEqual(compile(reglas)[0].tipo, 'soloLectura');
  assert.deepStrictEqual(scanFile(d, 'src/kit/boton.tsx', 'a\nb\n', reglas), [], 'lo que ya existe no es una violación');
});

test('el perfil sag-laboratorio-frontend del repositorio es coherente', () => {
  const dir = path.join(REPO, 'perfiles');
  const p = P.cargar('sag-laboratorio-frontend', dir);
  const skills = p.archivos.filter(f => /^\.claude\/skills\/[^/]+\/SKILL\.md$/.test(f)).map(f => f.split('/')[2]);
  assert.ok(skills.length >= 10);
  assert.ok(!skills.includes('read-pbi'), 'leer una HU es el flujo sdd-ticket del harness');
  const core = fs.readdirSync(path.join(REPO, 'core', 'skills'));
  assert.deepStrictEqual(skills.filter(s => core.includes(s)), [], 'ninguna skill del perfil se llama como una global (en Claude Code ganaría la global)');
  for (const f of p.archivos) {
    const t = fs.readFileSync(path.join(p.ruta, 'proyecto', ...f.split('/')), 'utf8');
    assert.doesNotMatch(t, /azdo\.mjs|check-normas|lint-file\.mjs|\bread-pbi\b/, `${f}: sin referencias a lo que reemplaza el harness`);
    assert.doesNotMatch(t, /\r\n/, `${f}: fin de línea LF`);
  }
  const settings = JSON.parse(fs.readFileSync(path.join(p.ruta, 'proyecto', '.claude', 'settings.json'), 'utf8'));
  assert.ok(!settings.hooks, 'los hooks propios los reemplaza el harness');
  assert.deepStrictEqual(compile(p.fragmento.reglas).map(r => r.tipo), ['noImportar', 'soloLectura', 'prohibido'], 'todas las reglas compilan');
  // Cada herramienta de escritura de Figma/Drive/Docs denegada en settings.json también la bloquea el harness
  const bloq = p.fragmento.permisos.mcpBloquear;
  for (const d of settings.permissions.deny.filter(x => x.startsWith('mcp__'))) {
    const [, srv, tool] = /^mcp__(.+?)__(.+)$/.exec(d);
    assert.ok(bloq.includes(`${srv}__${tool}`.toLowerCase()), d);
  }
  for (const s of skills) assert.match(fs.readFileSync(path.join(p.ruta, 'proyecto', 'CLAUDE.md'), 'utf8'), new RegExp(`\`${s}\``), `${s} figura en CLAUDE.md`);
});
