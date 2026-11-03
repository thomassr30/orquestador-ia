'use strict';
// Runner de evaluaciones (bin/sdd-eval.js) con un cliente falso: nunca se invoca el `claude` real
// (SDD_EVAL_CLAUDE_BIN apunta al falso y el PATH no incluye la carpeta de node, donde suele estar claude).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { project, tmp, REPO } = require('./helpers');

const IS_WIN = process.platform === 'win32';
const EVAL = path.join(REPO, 'bin', 'sdd-eval.js');
const NODE = process.execPath;
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');

// PATH mínimo: git y el sistema, sin la carpeta de node.
function pathSeguro() {
  const where = spawnSync(IS_WIN ? 'where' : 'which', ['git'], { encoding: 'utf8' });
  const gitDirs = (where.stdout || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(p => path.dirname(p));
  const sys = IS_WIN
    ? [path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'usr', 'bin'), path.join(process.env.SystemRoot || 'C:\\Windows', 'System32'), process.env.SystemRoot || 'C:\\Windows']
    : ['/usr/bin', '/bin'];
  const nodeDir = path.dirname(NODE).toLowerCase();
  return [...new Set([...gitDirs, ...sys])].filter(d => d.toLowerCase() !== nodeDir || gitDirs.includes(d)).join(path.delimiter);
}
const ENV = (() => {
  const e = {};
  for (const [k, v] of Object.entries(process.env)) if (!/^(path|anthropic_api_key|sdd_eval_claude_bin|tmp|temp|tmpdir|fake_modo)$/i.test(k)) e[k] = v;
  e.PATH = pathSeguro();
  return e;
})();

const FAKE = log => `'use strict';
const fs = require('fs');
const args = process.argv.slice(2);
if (args.includes('--version')) { console.log('9.9.9 (Claude Code falso)'); process.exit(0); }
let pedido = '';
try { pedido = fs.readFileSync(0, 'utf8'); } catch { /* sin stdin */ }
let harness = null;
try { harness = JSON.parse(fs.readFileSync('.sdd/harness.json', 'utf8')); } catch { /* sin config */ }
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({ args, pedido, harness, archivos: fs.readdirSync('.') }) + '\\n');
const ok = (extra = {}) => console.log(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'listo', session_id: 'ses-1', num_turns: 3, total_cost_usd: 0.01, usage: { input_tokens: 10, cache_read_input_tokens: 900, output_tokens: 90 }, ...extra }));
const modo = process.env.FAKE_MODO || pedido;
if (modo.includes('no-json')) { console.error('falla rara del cliente ' + 'sk-' + 'ant-' + 'a1B2'.repeat(10)); console.log('esto no es JSON'); process.exit(3); }
else if (modo.includes('is-error')) console.log(JSON.stringify({ type: 'result', subtype: 'error_max_turns', is_error: true, num_turns: 40 }));
else if (modo.includes('duerme')) setTimeout(() => {}, 30000);
else if (modo.includes('nada')) ok();
else if (modo.includes('manipula')) { fs.writeFileSync('test/aceptacion.js', 'process.exit(0)\\n'); ok(); }
else if (modo.includes('gate') && !args.includes('--resume')) ok({ result: 'Plan: crear hecho.txt.\\n¿Apruebo la implementación? (sí / no / ajustes)', session_id: 'ses-gate' });
else { fs.writeFileSync('hecho.txt', 'listo'); ok(); }
`;

/** Cliente falso: .cmd en Windows, script sh en macOS/Linux. Registra cada llamada (sin --version). */
function clienteFalso() {
  const dir = tmp('sdd-fakecli-');
  const log = path.join(dir, 'llamadas.jsonl');
  const js = path.join(dir, 'claude-falso.js');
  fs.writeFileSync(js, FAKE(log));
  let bin;
  if (IS_WIN) {
    bin = path.join(dir, 'claude.cmd');
    fs.writeFileSync(bin, `@echo off\r\n"${NODE}" "${js}" %*\r\nexit /b %ERRORLEVEL%\r\n`);
  } else {
    bin = path.join(dir, 'claude');
    fs.writeFileSync(bin, `#!/bin/sh\nexec "${NODE}" "${js}" "$@"\n`);
    fs.chmodSync(bin, 0o755);
  }
  return { bin, llamadas: () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : []) };
}

/** Repositorio temporal con un commit (es lo que se evalúa). */
function repo(files = {}) {
  const dir = project(files);
  spawnSync('git', ['add', '-A'], { cwd: dir });
  spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'base', '--allow-empty'], { cwd: dir });
  return dir;
}

/** Corre el evaluador con su propia carpeta temporal (para comprobar que no deja copias). */
function correr(spec, { flags = ['--confirmar'], bin, dir = tmp('sdd-evals-'), env = {} } = {}) {
  const file = path.join(dir, 'tareas.json');
  if (spec !== undefined) fs.writeFileSync(file, typeof spec === 'string' ? spec : JSON.stringify(spec, null, 2));
  const temp = tmp('sdd-evaltmp-');
  const started = Date.now();
  const r = spawnSync(NODE, [EVAL, file, ...flags], { encoding: 'utf8', timeout: 120000, env: { ...ENV, TMP: temp, TEMP: temp, TMPDIR: temp, SDD_EVAL_CLAUDE_BIN: bin, ...env } });
  const histFile = path.join(dir, 'tareas.resultados.json');
  const hist = fs.existsSync(histFile) ? JSON.parse(fs.readFileSync(histFile, 'utf8')) : null;
  return { ...r, salida: `${r.stdout}\n${r.stderr}`, ms: Date.now() - started, file, dir, histFile, hist, ultima: hist && hist[hist.length - 1], temporales: fs.readdirSync(temp).filter(f => f.startsWith('sdd-eval-')) };
}

const ACEPTA = `"${NODE}" -e "process.exit(require('fs').existsSync('hecho.txt')?0:1)"`;
const tarea = (nombre, pedido, extra = {}) => ({ nombre, pedido, aceptacion: { comando: ACEPTA }, ...extra });
const spec = (proyecto, tareas, extra = {}) => ({ proyecto, version: 't1', modelo: 'sonnet', tareas, ...extra });
const sinTraza = s => assert.doesNotMatch(s, /\n\s+at .+:\d+:\d+/, 'sin trazas de error');

test('sdd-eval: el entorno de prueba no puede invocar el claude real', () => {
  const r = spawnSync(IS_WIN ? 'where' : 'which', ['claude'], { cwd: tmp('sdd-where-'), encoding: 'utf8', env: ENV });
  assert.notStrictEqual(r.status, 0, `claude visible en el PATH de prueba: ${r.stdout}`);
});

test('sdd-eval: spec u opciones inválidas → exit 2 con errores legibles, sin traza y sin ejecutar', () => {
  const cli = clienteFalso();
  const proj = repo();
  fs.mkdirSync(path.join(proj, 'aceptacion'));
  const casos = [
    ['{ esto no es json', /no es JSON válido/],
    [JSON.stringify(spec(proj, [])), /«tareas» está vacío/],
    [JSON.stringify(spec(proj, 'texto')), /«tareas» debe ser un arreglo de tareas \(recibido: string\)/],
    [JSON.stringify(spec(proj, [{ nombre: 'x', pedido: 'y' }])), /falta el criterio de aceptación «aceptacion»/],
    [JSON.stringify(spec(proj, [tarea('a', 'p'), tarea('a', 'q')])), /«nombre» repetido/],
    [JSON.stringify(spec(proj, [tarea('a', 'p', { timeoutMin: -1, maxTurnos: 'x' })])), /«timeoutMin» debe ser un número positivo[\s\S]*«maxTurnos» debe ser un entero positivo/],
    [JSON.stringify(spec(proj, [tarea('a', 'p')], { cliente: 'codex' })), /cliente no soportado: codex \(pendiente; solo claude está implementado\)/],
    [JSON.stringify(spec(proj, [tarea('a', 'p')], { modo: 'otro' })), /«modo» debe ser sin-gate o flujo/],
    [JSON.stringify(spec(proj, [{ nombre: 'a', pedido: 'p', aceptacion: { comando: 'x', dir: path.join(proj, 'aceptacion') } }])), /«aceptacion\.dir» debe estar fuera del proyecto/],
    [JSON.stringify(spec(proj, [{ nombre: 'a', pedido: 'p', aceptacion: { comando: 'x', archivos: ['../fuera.js'] } }])), /«aceptacion\.archivos» debe ser una lista de rutas relativas/],
  ];
  for (const [contenido, esperado] of casos) {
    const r = correr(contenido, { bin: cli.bin });
    assert.strictEqual(r.status, 2, `${contenido}\n${r.salida}`);
    assert.match(r.stderr, esperado);
    sinTraza(r.salida);
    assert.strictEqual(r.hist, null, 'no se escribe historial');
  }
  const flags = correr(spec(proj, [tarea('a', 'p')]), { bin: cli.bin, flags: ['--confirmar', '--repeticiones=0', '--otra'] });
  assert.strictEqual(flags.status, 2);
  assert.match(flags.stderr, /--repeticiones debe ser un entero mayor que 0[\s\S]*opción desconocida o mal escrita: --otra/);
  assert.strictEqual(correr(undefined, { bin: cli.bin }).status, 2, 'archivo inexistente');
  assert.deepStrictEqual(cli.llamadas(), [], 'nunca se lanzó el cliente');
});

test('sdd-eval: --validar valida sin clonar ni ejecutar; «verificar» se acepta con aviso de obsoleto', () => {
  const cli = clienteFalso();
  const r = correr({ proyecto: 'no-existe', tareas: [{ nombre: 'vieja', pedido: 'p', verificar: 'npm test' }] }, { bin: cli.bin, flags: ['--validar'] });
  assert.strictEqual(r.status, 0, r.salida);
  assert.match(r.stdout, /Archivo de tareas válido: 1 tarea/);
  assert.match(r.stderr, /«verificar» está obsoleto/);
  assert.deepStrictEqual(cli.llamadas(), []);
  const ejemplo = spawnSync(NODE, [EVAL, path.join(REPO, 'evals', 'ejemplo.tareas.json'), '--validar'], { encoding: 'utf8', env: ENV });
  assert.strictEqual(ejemplo.status, 0, `el ejemplo del repo es válido: ${ejemplo.stderr}`);
});

test('sdd-eval: sin --confirmar muestra el plan, sale con 2 y no lanza el cliente', () => {
  const cli = clienteFalso();
  const r = correr(spec(repo(), [tarea('uno', 'p'), tarea('dos', 'q')], { modo: 'flujo' }), { bin: cli.bin, flags: ['--max-tareas=1'] });
  assert.strictEqual(r.status, 2);
  assert.match(r.stdout, /Tareas: +uno, dos/);
  assert.match(r.stdout, /claude · modelo sonnet · modo flujo/);
  assert.match(r.stdout, /máx\. 1 ejecuciones/);
  assert.match(r.stderr, /consume tokens[\s\S]*--confirmar/);
  assert.deepStrictEqual(cli.llamadas(), []);
  assert.strictEqual(r.hist, null);
});

test('sdd-eval: agente ok + aceptación ok → aprobado, copia intacta, temporal borrado e historial v2', () => {
  const cli = clienteFalso();
  const cfg = JSON.stringify({ sensores: { alTerminar: [] } });
  const proj = repo({ 'a.txt': 'hola', '.sdd/harness.json': cfg });
  const r = correr(spec(proj, [tarea('crea-archivo', 'crea hecho.txt')]), { bin: cli.bin });
  assert.strictEqual(r.status, 0, r.salida);
  assert.ok(!fs.existsSync(path.join(proj, 'hecho.txt')), 'tu carpeta no se toca');
  assert.deepStrictEqual(r.temporales, [], 'la copia temporal se borra');
  assert.match(r.stdout, /Resultado: 1\/1 aprobadas/);
  assert.match(r.stdout, /Sin corrida comparable: es la primera corrida/);
  const [llamada] = cli.llamadas();
  assert.strictEqual(llamada.pedido, 'crea hecho.txt');
  assert.deepStrictEqual(llamada.harness, { sensores: { alTerminar: [] }, gate: 'nunca' }, 'modo sin-gate: GATE apagado solo en la copia');
  assert.ok(llamada.args.includes('--model') && llamada.args.includes('sonnet') && llamada.args.includes('--max-turns'));
  const u = r.ultima;
  assert.strictEqual(u.v, 2);
  assert.deepStrictEqual(u.dataset, { version: 't1', hash: sha256(fs.readFileSync(r.file)) });
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: proj, encoding: 'utf8' }).stdout.trim();
  assert.deepStrictEqual(u.proyecto, { commit: head, arbolLimpio: true, nota: 'se evalúa lo commiteado' });
  assert.deepStrictEqual(u.harness, { version: require(path.join(REPO, 'package.json')).version, hashConfig: sha256(cfg) });
  assert.deepStrictEqual(u.cliente, { nombre: 'claude', version: '9.9.9 (Claude Code falso)', modelo: 'sonnet' });
  assert.strictEqual(u.modo, 'sin-gate');
  assert.strictEqual(u.lineaBase, false);
  assert.deepStrictEqual(u.limites, { maxTareas: null, maxCostoUsd: null, maxMinutos: null });
  const t = u.resultados[0];
  assert.strictEqual(t.estado, 'aprobado');
  assert.strictEqual(t.causa, null);
  assert.strictEqual(t.turnos, 3);
  assert.deepStrictEqual(t.tokens, { valor: 1000, fuente: 'medido' });
  assert.deepStrictEqual(t.costoUsd, { valor: 0.01, fuente: 'medido' });
  assert.strictEqual(t.reintentos, 0);
  assert.strictEqual(t.intervencion, 0);
  assert.strictEqual(t.aceptacionModificada, false);
  assert.strictEqual(t.evidencia.agente[0].jsonValido, true);
  assert.strictEqual(t.evidencia.aceptacion.codigo, 0);
  assert.strictEqual(u.resumen.aprobadas, 1);
  assert.strictEqual(u.resumen.total, 1);
  assert.strictEqual(u.resumen.porEstado.aprobado, 1);
});

test('sdd-eval: un agente que no arranca es fallido/agente (exit 1), no un éxito', () => {
  const proj = repo();
  for (const bin of [path.join(tmp('sdd-nobin-'), IS_WIN ? 'claude.cmd' : 'claude'), 'claude-que-no-existe-sdd']) {
    const r = correr(spec(proj, [tarea('x', 'crea hecho.txt')]), { bin });
    assert.strictEqual(r.status, 1, r.salida);
    const t = r.ultima.resultados[0];
    assert.strictEqual(t.estado, 'fallido');
    assert.strictEqual(t.causa, 'agente');
    assert.match(t.motivo, /no arrancó/);
    assert.strictEqual(r.ultima.cliente.version, null);
    assert.deepStrictEqual(r.temporales, []);
  }
});

test('sdd-eval: salida no JSON con exit 3 → fallido/agente con evidencia sin secretos', () => {
  const cli = clienteFalso();
  const r = correr(spec(repo(), [tarea('x', 'no-json')]), { bin: cli.bin });
  assert.strictEqual(r.status, 1, r.salida);
  const t = r.ultima.resultados[0];
  assert.strictEqual(t.estado, 'fallido');
  assert.strictEqual(t.causa, 'agente');
  assert.match(t.motivo, /código 3 y su salida no es JSON/);
  assert.deepStrictEqual({ ...t.evidencia.agente[0], salida: undefined }, { codigo: 3, timeout: false, jsonValido: false, salida: undefined });
  assert.match(t.evidencia.agente[0].salida, /falla rara del cliente \[secreto omitido\][\s\S]*esto no es JSON/);
  assert.doesNotMatch(fs.readFileSync(r.histFile, 'utf8'), /a1B2a1B2/);
  assert.deepStrictEqual(t.tokens, { valor: null, fuente: 'no_disponible' });
});

test('sdd-eval: JSON con is_error → fallido/agente aunque salga con 0', () => {
  const cli = clienteFalso();
  const r = correr(spec(repo(), [tarea('x', 'is-error')]), { bin: cli.bin });
  assert.strictEqual(r.status, 1);
  assert.strictEqual(r.ultima.resultados[0].causa, 'agente');
  assert.match(r.ultima.resultados[0].motivo, /error_max_turns/);
});

test('sdd-eval: timeout del agente → fallido/agente y se detiene el proceso', () => {
  const cli = clienteFalso();
  const r = correr(spec(repo(), [tarea('x', 'duerme', { timeoutMin: 0.02 })]), { bin: cli.bin });
  assert.strictEqual(r.status, 1, r.salida);
  const t = r.ultima.resultados[0];
  assert.strictEqual(t.causa, 'agente');
  assert.match(t.motivo, /excedió el tiempo límite/);
  assert.strictEqual(t.evidencia.agente[0].timeout, true);
  assert.ok(r.ms < 25000, `no esperó a que el agente terminara solo (${r.ms} ms)`);
  assert.deepStrictEqual(r.temporales, []);
});

test('sdd-eval: la aceptación que falla → fallido/aceptacion', () => {
  const cli = clienteFalso();
  const r = correr(spec(repo(), [tarea('x', 'nada')]), { bin: cli.bin });
  assert.strictEqual(r.status, 1);
  assert.strictEqual(r.ultima.resultados[0].estado, 'fallido');
  assert.strictEqual(r.ultima.resultados[0].causa, 'aceptacion');
  assert.strictEqual(r.ultima.resultados[0].evidencia.aceptacion.codigo, 1);
});

test('sdd-eval: si el agente manipula un archivo de aceptación se restaura y la tarea falla', () => {
  const cli = clienteFalso();
  const original = "console.log('ORIGINAL'); process.exit(require('fs').existsSync('hecho.txt') ? 0 : 1);\n";
  const proj = repo({ 'test/aceptacion.js': original });
  const r = correr(spec(proj, [{ nombre: 'trampa', pedido: 'manipula', aceptacion: { comando: `"${NODE}" test/aceptacion.js`, archivos: ['test/aceptacion.js'] } }]), { bin: cli.bin });
  assert.strictEqual(r.status, 1, r.salida);
  const t = r.ultima.resultados[0];
  assert.strictEqual(t.estado, 'fallido');
  assert.strictEqual(t.causa, 'aceptacion');
  assert.strictEqual(t.aceptacionModificada, true);
  assert.match(t.motivo, /modificó archivos de aceptación.*test\/aceptacion\.js/);
  assert.match(t.evidencia.aceptacion.salida, /ORIGINAL/, 'corrió el archivo original restaurado');
});

test('sdd-eval: aceptacion.dir se copia recién cuando el agente terminó (el agente no la ve)', () => {
  const cli = clienteFalso();
  const dir = tmp('sdd-evals-');
  fs.mkdirSync(path.join(dir, 'oculta'));
  fs.writeFileSync(path.join(dir, 'oculta', 'verifica-oculto.js'), "process.exit(require('fs').readFileSync('hecho.txt', 'utf8') === 'listo' ? 0 : 1);\n");
  const r = correr(spec(repo(), [{ nombre: 'oculta', pedido: 'crea hecho.txt', aceptacion: { comando: `"${NODE}" verifica-oculto.js`, dir: 'oculta' } }]), { bin: cli.bin, dir });
  assert.strictEqual(r.status, 0, r.salida);
  assert.strictEqual(r.ultima.resultados[0].estado, 'aprobado');
  assert.ok(!cli.llamadas()[0].archivos.includes('verifica-oculto.js'), 'el agente no vio la aceptación oculta');
});

test('sdd-eval: presupuesto (--max-tareas, --max-costo-usd) → las que no caben quedan bloqueado/presupuesto', () => {
  const proj = repo();
  for (const flag of ['--max-tareas=1', '--max-costo-usd=0.005']) {
    const cli = clienteFalso();
    const r = correr(spec(proj, [tarea('uno', 'crea'), tarea('dos', 'crea')]), { bin: cli.bin, flags: ['--confirmar', flag] });
    assert.strictEqual(r.status, 1, r.salida);
    const [a, b] = r.ultima.resultados;
    assert.strictEqual(a.estado, 'aprobado');
    assert.strictEqual(b.estado, 'bloqueado');
    assert.strictEqual(b.causa, 'presupuesto');
    assert.strictEqual(cli.llamadas().length, 1, 'la segunda no se ejecutó');
    assert.match(r.stdout, /bloqueado: 1 \(presupuesto 1\)/);
  }
});

test('sdd-eval: si no se puede clonar → fallido/infraestructura (exit 3) y sin copias temporales', () => {
  const cli = clienteFalso();
  const r = correr(spec(path.join(tmp('sdd-evals-'), 'no-existe'), [tarea('x', 'crea')]), { bin: cli.bin });
  assert.strictEqual(r.status, 3, r.salida);
  const t = r.ultima.resultados[0];
  assert.strictEqual(t.estado, 'fallido');
  assert.strictEqual(t.causa, 'infraestructura');
  assert.match(t.motivo, /no se pudo clonar/);
  assert.deepStrictEqual(r.temporales, []);
  assert.deepStrictEqual(cli.llamadas(), [], 'el agente no se lanzó');
  assert.strictEqual(r.ultima.proyecto.commit, null);
});

test('sdd-eval: modo flujo no toca el GATE y responde «sí» una vez con --resume', () => {
  const cli = clienteFalso();
  const r = correr(spec(repo(), [tarea('con-gate', 'gate: crea hecho.txt')], { modo: 'flujo' }), { bin: cli.bin });
  assert.strictEqual(r.status, 0, r.salida);
  const [uno, dos] = cli.llamadas();
  assert.strictEqual(uno.harness, null, 'no se escribió gate:nunca');
  assert.ok(!uno.args.includes('--resume'));
  assert.deepStrictEqual(dos.args.slice(0, 3), ['-p', '--resume', 'ses-gate']);
  assert.strictEqual(dos.pedido, 'sí');
  const t = r.ultima.resultados[0];
  assert.strictEqual(t.intervencion, 1);
  assert.strictEqual(t.turnos, 6);
  assert.deepStrictEqual(t.tokens, { valor: 2000, fuente: 'medido' });
  assert.strictEqual(r.ultima.modo, 'flujo');
});

test('sdd-eval: compara solo con corridas compatibles y conserva el historial anterior', () => {
  const cli = clienteFalso();
  const dir = tmp('sdd-evals-');
  fs.writeFileSync(path.join(dir, 'tareas.resultados.json'), JSON.stringify([{ fecha: '2025-01-01T00:00:00Z', exito: 1, resultados: [] }]));
  const proj = repo();
  const s = spec(proj, [tarea('x', 'crea')]);
  const a = correr(s, { bin: cli.bin, dir });
  assert.match(a.stdout, /Sin corrida comparable: el historial solo tiene corridas del formato anterior/);
  const b = correr(s, { bin: cli.bin, dir });
  assert.match(b.stdout, /Comparada con .*: aprobadas 1\/1 → 1\/1/);
  assert.strictEqual(b.ultima.comparadaCon, a.ultima.fecha);
  const c = correr({ ...s, modelo: 'opus' }, { bin: cli.bin, dir });
  assert.match(c.stdout, /Sin corrida comparable: .*modelo: sonnet → opus/);
  assert.strictEqual(c.hist.length, 4);
  assert.strictEqual(c.hist[0].exito, 1, 'la corrida de formato anterior se conserva');
});

test('sdd-eval: una tarea aprobada en la línea base que ahora falla es regresión (exit 1)', () => {
  const cli = clienteFalso();
  const dir = tmp('sdd-evals-');
  const s = spec(repo(), [tarea('estable', 'crea'), tarea('otra', 'crea')]);
  const base = correr(s, { bin: cli.bin, dir, flags: ['--confirmar', '--linea-base'] });
  assert.strictEqual(base.status, 0, base.salida);
  assert.strictEqual(base.ultima.lineaBase, true);
  const r = correr(s, { bin: cli.bin, dir, env: { FAKE_MODO: 'nada' } });
  assert.strictEqual(r.status, 1, r.salida);
  assert.deepStrictEqual(r.ultima.regresiones, ['estable', 'otra']);
  assert.strictEqual(r.ultima.lineaBaseUsada, base.ultima.fecha);
  assert.match(r.stdout, /Regresiones contra la línea base .*: estable, otra/);
});
