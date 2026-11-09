'use strict';
// Garantías de los lotes 1 y 2 (resultados verificables, aprobaciones exactas y estado resistente). Cada prueba
// corresponde a un fallo reproducido en el diagnóstico (EVAL/SENS/APR/EST/FAIL/MEM) y fija el comportamiento correcto.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { project, tmp, REPO } = require('./helpers');
process.env.SDD_HOME = tmp('sdd-home-');
const core = require('../src/core');
const S = require('../src/state');
const { loadConfig } = require('../src/config');
const { Policy, writeTargets, expandPath } = require('../src/policy');

const NODE = process.execPath;
// Credenciales falsas armadas en tiempo de ejecución (el propio harness no deja escribirlas literales en el código)
const FAKE_GH = ['gh', 'p_', 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef0123'].join('');
const FAKE_SK = ['sk', '-ant-', 'api03-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789AbCdEf'].join('');
const node = code => `"${NODE}" -e "${code}"`;
const E = (root, sid, event, extra = {}) => core.handle({ event, root, sessionId: sid, host: 'codex', nativeAsk: false, ...extra });
const shell = command => ({ tool: { kind: 'shell', name: 'Bash', command, paths: [], contents: [] } });
const edit = (p, content = 'x') => ({ tool: { kind: 'edit', name: 'Write', paths: [p], contents: [content] } });
const mcp = args => ({ tool: { kind: 'mcp', name: 'mcp__notion__notion-update-page', server: 'notion', tool: 'notion-update-page', args, paths: [], contents: [] } });
const other = { tool: { kind: 'other', name: 'herramienta_nueva', args: {}, paths: [], contents: [] } };
const cfgFile = (dir, c) => { fs.mkdirSync(path.join(dir, '.sdd'), { recursive: true }); fs.writeFileSync(path.join(dir, '.sdd', 'harness.json'), JSON.stringify(c)); };
const decision = o => (o ? o.decision : 'permitido');

// ---------- Lote 1: resultados y verificación ----------

test('SENS-5: código sin controles aplicables queda «no verificado» (no limpio) y se informa una vez por contenido', async () => {
  const d = project({ 'x.js': 'module.exports = 1' });
  await E(d, 's', 'post', edit('x.js'));
  const first = await E(d, 's', 'stop', { lastMessage: 'Listo.' });
  assert.match(first.notice, /No verificado: no hay controles aplicables/);
  const st = S.readState(d, 's');
  assert.strictEqual(st.sucio, true, 'sigue pendiente');
  assert.strictEqual(st.sensores.estado, 'no_verificado');
  const second = await E(d, 's', 'stop', { lastMessage: 'Listo.' });
  assert.ok(!second || (!second.notice && !second.block), 'no se repite para el mismo contenido');
});

test('SENS-6: al agotar reintentos el fallo sigue pendiente; la excepción del usuario vale solo para ese contenido', async () => {
  const d = project({ 'a.js': '' });
  cfgFile(d, { sensores: { alTerminar: ['tests'], comandos: { tests: node('process.exit(1)') } } });
  await E(d, 's', 'post', edit('a.js'));
  const outs = [];
  for (let i = 0; i < 4; i++) outs.push(await E(d, 's', 'stop', { lastMessage: 'Listo.' }));
  assert.deepStrictEqual(outs.map(o => (o && o.block ? 'B' : o && o.notice ? 'N' : '-')).join(''), 'BBN-');
  assert.match(outs[2].notice, /siguen sin verificar/);
  let st = S.readState(d, 's');
  assert.strictEqual(st.sucio, true, 'agotar reintentos no libera el pendiente');
  assert.strictEqual(st.sensores.estado, 'fallido');
  assert.strictEqual(st.aprobaciones.pendientes[0].tipo, 'excepcion');
  const ctx = (await E(d, 's', 'prompt', { prompt: 'sí' })).context;
  assert.match(ctx, /Excepción registrada para tests/);
  st = S.readState(d, 's');
  assert.strictEqual(st.sensores.estado, 'excepcion');
  assert.strictEqual(st.sucio, false);
  fs.writeFileSync(path.join(d, 'a.js'), 'cambio');
  await E(d, 's', 'post', edit('a.js', 'cambio'));
  const again = await E(d, 's', 'stop', { lastMessage: 'Listo.' });
  assert.ok(again.block, 'con otro contenido la excepción ya no vale');
});

test('SENS-7: un archivo modificado por shell se detecta con git y se verifica', async () => {
  const d = project({ 'a.js': 'uno' });
  cfgFile(d, { sensores: { alTerminar: ['tests'], comandos: { tests: node('process.exit(0)') } } });
  await E(d, 's', 'session', { source: 'startup' });
  fs.writeFileSync(path.join(d, 'a.js'), 'dos'); // como si fuera «sed -i»
  const o = await E(d, 's', 'stop', { lastMessage: 'Listo.' });
  assert.match(o.notice, /Verificado: ✓ tests/);
  assert.ok(S.readState(d, 's').cambios.includes('a.js'));
});

// ---------- Lote 2: aprobaciones exactas ----------

test('APR-1: una aprobación MCP vale solo para esos argumentos y una vez', async () => {
  const d = project({});
  assert.match((await E(d, 's', 'pre', mcp({ page: 'A', modo: 1 }))).reason, /Requiere confirmación/);
  await E(d, 's', 'prompt', { prompt: 'sí' });
  assert.strictEqual(decision(await E(d, 's', 'pre', mcp({ page: 'B', borrar: true }))), 'deny', 'otros argumentos no comparten la aprobación');
  assert.strictEqual(await E(d, 's', 'pre', mcp({ modo: 1, page: 'A' })), null, 'los mismos argumentos (en cualquier orden de claves) sí');
  assert.strictEqual(decision(await E(d, 's', 'pre', mcp({ page: 'A', modo: 1 }))), 'deny', 'una sola vez');
});

test('D3: con varias pendientes, «sí» solo no aprueba ninguna; «sí 2» aprueba solo esa; «sí a todas», todas', async () => {
  const d = project({});
  await E(d, 's', 'pre', shell('git push origin main'));
  await E(d, 's', 'pre', shell('npm install left-pad'));
  assert.match((await E(d, 's', 'prompt', { prompt: 'sí' })).context, /Hay 2 acciones esperando confirmación/);
  assert.strictEqual(decision(await E(d, 's', 'pre', shell('git push origin main'))), 'deny');
  await E(d, 's', 'prompt', { prompt: 'sí 2' });
  assert.strictEqual(await E(d, 's', 'pre', shell('npm install left-pad')), null);
  assert.strictEqual(decision(await E(d, 's', 'pre', shell('git push origin main'))), 'deny');
  await E(d, 's', 'pre', shell('npm install left-pad'));
  await E(d, 's', 'prompt', { prompt: 'sí a todas' });
  assert.strictEqual(await E(d, 's', 'pre', shell('git push origin main')), null);
  assert.strictEqual(await E(d, 's', 'pre', shell('npm install left-pad')), null);
});

test('APR-3/D2: escribir fuera del proyecto pide confirmación (salvo temporales); lo desconocido solo en modo estricto', async () => {
  const d = project({});
  const outside = path.join(os.homedir(), `sdd-prueba-fuera-${process.pid}.txt`);
  assert.match((await E(d, 's', 'pre', edit(outside))).reason, /escribe fuera del proyecto/);
  assert.strictEqual(await E(d, 's', 'pre', edit(path.join(os.tmpdir(), 'borrador.txt'))), null);
  assert.strictEqual(await E(d, 's', 'pre', shell('herramienta-desconocida --hacer')), null, 'modo normal: lo decide el cliente');
  assert.strictEqual(await E(d, 's', 'pre', other), null);
  cfgFile(d, { modo: 'estricto' });
  assert.match((await E(d, 's', 'pre', shell('herramienta-desconocida --hacer'))).reason, /modo estricto/);
  assert.match((await E(d, 's', 'pre', other)).reason, /herramienta desconocida/);
});

test('APR-4: dos procesos en paralelo no consumen la misma aprobación', async () => {
  const trials = 6;
  for (let i = 0; i < trials; i++) {
    const d = project({}); const sid = `r${i}`;
    await E(d, sid, 'pre', shell('git push origin main'));
    await E(d, sid, 'prompt', { prompt: 'sí' });
    const at = Date.now() + 1500;
    const code = `const c=require(${JSON.stringify(path.join(REPO, 'harness', 'src', 'core'))});while(Date.now()<${at});c.handle({event:'pre',root:${JSON.stringify(d)},sessionId:'${sid}',host:'codex',nativeAsk:false,tool:{kind:'shell',name:'Bash',command:'git push origin main',paths:[]}}).then(o=>console.log(o?o.decision:'permitido'))`;
    const rs = await Promise.all([0, 1].map(() => new Promise(res => { const k = spawn(NODE, ['-e', code], { env: process.env }); let s = ''; k.stdout.on('data', x => { s += x; }); k.on('close', () => res(s.trim())); })));
    assert.strictEqual(rs.filter(x => x === 'permitido').length, 1, `intento ${i}: ${rs.join(', ')}`);
  }
});

test('APR-5/6/7: Bash no se salta las protecciones de las ediciones ni las decisiones del usuario', async () => {
  const d = project({});
  assert.match((await E(d, 's', 'pre', shell('echo {} > .sdd/harness.json'))).reason, /configuración del harness/);
  assert.strictEqual(decision(await E(d, 's', 'pre', shell("sed -i 's/a/b/' .git/config"))), 'deny');
  assert.strictEqual((await E(d, 's', 'pre', { ...shell('echo {} > .sdd/harness.json'), host: 'claude', nativeAsk: true })).decision, 'ask');
  assert.match((await E(d, 's', 'pre', shell(`echo const k = "${FAKE_SK}" > src.js`))).reason, /secreto en un comando/);
  for (const c of ['node "$HOME/.sdd-orquestador/bin/sdd-state.js" x --approve', 'node "$HOME/.sdd-orquestador/bin/sdd-harness.js" excepcion --motivo x', 'node "$HOME/.sdd-orquestador/bin/sdd-harness.js" aprobar']) {
    assert.match((await E(d, 's', 'pre', shell(c))).reason, /solo el usuario/, c);
  }
  assert.deepStrictEqual(writeTargets('cat a | tee b.txt > "c d.txt" 2>&1; cp x y/z; sed -i -e s/a/b/ f1 f2; echo "a > b"'), ['c d.txt', 'b.txt', 'y/z', 'f1', 'f2']);
  assert.strictEqual(new Policy({ root: d }).checkCommand('echo hola > nota.txt').decision, 'ask', 'dentro del proyecto sigue igual');
});

test('APR-8: «~» y las variables de home no esquivan las rutas protegidas; un destino sin resolver es crítico', async () => {
  const d = project({});
  const p = new Policy({ root: d });
  // El shell expande «~» y path.resolve no: sin expandir, «~/.claude/settings.json» se tomaba por un archivo
  // interno llamado «~» y la escritura quedaba en «ask» no crítico (la decidía el cliente, no el usuario).
  for (const c of ['echo {} > ~/.claude/settings.json', 'tee ~/.cursor/hooks.json', 'cp evil.json ~/.claude/settings.json',
    "sed -i 's/a/b/' ~/.codex/config.toml", 'bash -lc "echo {} > ~/.claude/settings.json"',
    'echo {} > $HOME/.claude/settings.json', 'echo {} > %USERPROFILE%/.claude/settings.json',
    'echo {} > $env:USERPROFILE/.gemini/settings.json']) {
    const r = p.checkCommand(c);
    assert.strictEqual(r.decision, 'ask', c);
    assert.ok(r.critical, `${c}: debe ser decisión del usuario`);
  }
  // El estado del harness se deniega por nombre, con o sin expandir
  assert.strictEqual(p.checkCommand('echo {} > ~/.sdd-orquestador/estado/x.json').decision, 'deny');
  // Un destino que no se puede resolver aquí no se omite en silencio: se trata como escritura fuera del proyecto
  assert.ok(p.checkCommand('echo x > $LOG_DIR/out.txt').critical, 'variable desconocida');
  assert.strictEqual(expandPath('$LOG_DIR/out.txt'), null);
  assert.strictEqual(expandPath('nota.txt'), 'nota.txt');
  assert.strictEqual(expandPath('~'), os.homedir());
  // Lo que ya funcionaba no se endurece: temporal del sistema y archivos del proyecto
  assert.ok(!p.checkCommand(`echo x > "${path.join(os.tmpdir(), 'borrador.txt')}"`).critical, 'temporal del sistema no es crítico');
  assert.strictEqual(new Policy({ root: d }).checkPath(path.join(os.tmpdir(), 'borrador.txt'), 'write').decision, 'allow');
  assert.strictEqual(p.checkCommand('echo hola > nota.txt').decision, 'ask');
  assert.ok(!p.checkCommand('echo hola > nota.txt').critical, 'dentro del proyecto no es crítico');
  // Y por el núcleo completo, con el GATE ya aprobado (antes se permitía sin más)
  await E(d, 's', 'prompt', { prompt: 'directo' });
  const o = await E(d, 's', 'pre', shell('echo {} > ~/.claude/settings.json'));
  assert.match(o.reason, /configuración del harness|servidores MCP|fuera del proyecto|no puede resolver/);
});
// ---------- Lote 2: estado resistente ----------

test('EST-1: estado corrupto → GATE requerido, sin aprobaciones, contenido externo marcado y archivo en cuarentena', async () => {
  const d = project({ 'a.js': '' });
  await E(d, 's', 'prompt', { prompt: 'agrega un botón de exportar' });
  await E(d, 's', 'stop', { lastMessage: 'Plan…\n¿Apruebo la implementación? (sí / no / ajustes)' });
  await E(d, 's', 'prompt', { prompt: 'sí' });
  assert.strictEqual(await E(d, 's', 'pre', edit('a.js')), null, 'plan aprobado');
  fs.writeFileSync(S.sessionFile(d, 's'), '{ roto');
  assert.strictEqual(decision(await E(d, 's', 'pre', edit('a.js'))), 'deny', 'un estado dañado no concede nada');
  const ctx = (await E(d, 's', 'prompt', { prompt: '¿qué pasó?' })).context;
  assert.match(ctx, /estaba dañado/);
  const st = S.readState(d, 's');
  assert.strictEqual(st.gate.estado, 'requerido');
  assert.ok(st.externo);
  assert.ok(fs.readdirSync(path.dirname(S.sessionFile(d, 's'))).some(f => /\.corrupto-\d+$/.test(f)), 'el archivo dañado queda en cuarentena');
});

test('EST-1b: si hay respaldo válido se recupera de él, igual en modo restrictivo', () => {
  const d = project({});
  S.updateState(d, 's', s => { s.cambios = ['src/a.js']; s.aprobaciones.aprobadas = [{ id: 'x', huella: 'ab'.repeat(32), tipo: 'comando' }]; });
  S.updateState(d, 's', s => { s.turno = 2; });
  fs.writeFileSync(S.sessionFile(d, 's'), '{"v":2,');
  const { state, problema } = S.load(d, 's');
  assert.strictEqual(problema.respaldo, true);
  assert.deepStrictEqual(state.cambios, ['src/a.js'], 'conserva lo que no da permisos');
  assert.strictEqual(state.aprobaciones.aprobadas.length, 0, 'las aprobaciones no sobreviven a la recuperación');
  assert.strictEqual(state.gate.estado, 'requerido');
});

test('EST-2: sin candado no se escribe; la acción crítica se deniega en vez de seguir sin exclusión mutua', async () => {
  const d = project({});
  const file = S.sessionFile(d, 's');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.lock`, JSON.stringify({ pid: process.pid, token: 'otro', en: Date.now() }));
  assert.throws(() => S.updateState(d, 's', s => { s.x = 1; }), e => e.code === 'candado');
  assert.strictEqual(S.readState(d, 's').x, undefined);
  assert.match((await E(d, 's', 'pre', shell('git push origin main'))).reason, /estado del harness no está disponible/);
  fs.writeFileSync(`${file}.lock`, JSON.stringify({ pid: 2 ** 22 + 12345, token: 'muerto', en: Date.now() }));
  const t0 = Date.now();
  S.updateState(d, 's', s => { s.x = 2; });
  assert.ok(Date.now() - t0 < 1000, 'el candado de un proceso que ya no existe se libera de inmediato');
});

test('EST-3: harness.json corrupto: se usa su última versión válida y se avisa', async () => {
  const d = project({});
  cfgFile(d, { permisos: { denegar: ['herramienta-x'] } });
  assert.strictEqual(decision(await E(d, 's', 'pre', shell('herramienta-x --borrar'))), 'deny');
  fs.writeFileSync(path.join(d, '.sdd', 'harness.json'), '{ "permisos": { "denegar": ["herramienta-x"] ');
  assert.strictEqual(decision(await E(d, 's', 'pre', shell('herramienta-x --borrar'))), 'deny', 'la regla sigue vigente');
  assert.match(loadConfig(d).problemas[0], /JSON inválido.*última versión válida/);
  assert.match((await E(d, 's', 'session', { source: 'startup' })).context, /Configuración: .*JSON inválido/);
});

test('FAIL-1/D4: error interno → lo crítico se deniega (o se pregunta con diálogo nativo); lo demás sigue', () => {
  const home = tmp('sdd-home-roto-');
  fs.writeFileSync(path.join(home, 'estado'), 'no soy una carpeta');
  const d = project({ 'a.js': '' });
  const run = (tool, extra = {}) => {
    const code = `process.env.SDD_HOME=${JSON.stringify(home)};require(${JSON.stringify(path.join(REPO, 'harness', 'src', 'core'))}).handle(${JSON.stringify({ event: 'pre', root: d, sessionId: 'x', host: 'codex', nativeAsk: false, tool, ...extra })}).then(o=>console.log(JSON.stringify(o)))`;
    return JSON.parse(spawnSync(NODE, ['-e', code], { encoding: 'utf8' }).stdout.trim() || 'null');
  };
  assert.strictEqual(decision(run(shell('git push --force origin main').tool)), 'deny');
  assert.strictEqual(decision(run(shell('git push origin main').tool, { host: 'claude', nativeAsk: true })), 'ask');
  assert.strictEqual(run({ kind: 'read', name: 'Read', paths: ['a.js'], contents: [] }), null);
  assert.strictEqual(run(shell('npm test').tool), null, 'lo no crítico sigue (falla abierta registrada)');
  cfgFile(d, { modo: 'estricto' });
  assert.strictEqual(decision(run(edit('a.js').tool)), 'deny', 'en modo estricto, todo salvo lecturas');
});

test('falla inyectada en el hook: lo crítico se deniega y lo demás sigue', async () => {
  const d = project({});
  process.env.SDD_HARNESS_FALLA_INTERNA = 'pre';
  try {
    assert.match((await E(d, 's', 'pre', shell('git push origin main'))).reason, /error interno del harness/);
    assert.strictEqual(await E(d, 's', 'pre', shell('ls')), null);
  } finally { delete process.env.SDD_HARNESS_FALLA_INTERNA; }
});

test('error en el adaptador (antes del núcleo): lo crítico se deniega igual; una lectura sigue', () => {
  const d = project({ 'a.js': '' });
  const hook = payload => {
    const r = spawnSync(NODE, [path.join(REPO, 'bin', 'sdd-hook.js'), 'codex', 'PreToolUse'], { cwd: d, input: JSON.stringify(payload), encoding: 'utf8', env: process.env });
    return r.stdout.trim() ? JSON.parse(r.stdout) : null;
  };
  // cwd numérico: el adaptador falla al resolver la raíz
  const crit = hook({ cwd: 123, session_id: 'x', tool_name: 'Bash', tool_input: { command: 'git push --force origin main' } });
  assert.strictEqual(crit.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(crit.hookSpecificOutput.permissionDecisionReason, /error interno del harness/);
  assert.strictEqual(hook({ cwd: 123, session_id: 'x', tool_name: 'Read', tool_input: { file_path: 'a.js' } }), null);
  assert.ok(fs.existsSync(path.join(process.env.SDD_HOME, 'ultimo-error.json')), 'el error queda para doctor');
});

test('versión más nueva del estado: no se sobrescribe y se trabaja en modo restrictivo', async () => {
  const d = project({ 'a.js': '' });
  const file = S.sessionFile(d, 's');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ v: 99, gate: { estado: 'aprobado' } }));
  assert.strictEqual(decision(await E(d, 's', 'pre', edit('a.js'))), 'deny');
  await E(d, 's', 'prompt', { prompt: 'hola' });
  assert.strictEqual(JSON.parse(fs.readFileSync(file, 'utf8')).v, 99, 'el estado nuevo queda intacto');
});

test('migración v1 → v2: se conserva el GATE y se descartan las aprobaciones sin identidad', () => {
  const d = project({});
  const file = S.sessionFile(d, 's');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ v: 1, gate: { estado: 'aprobado' }, aprobaciones: { pendientes: [], aprobadas: [{ clave: 'git push', en: new Date().toISOString() }] } }));
  const { state, problema } = S.load(d, 's');
  assert.strictEqual(problema, null);
  assert.strictEqual(state.v, 2);
  assert.strictEqual(state.gate.estado, 'aprobado');
  assert.strictEqual(state.aprobaciones.aprobadas.length, 0);
  assert.strictEqual(state.migrado.desde, 1);
});

test('interrupción: matar un proceso a mitad de escrituras no deja el estado ilegible ni el candado tomado', async () => {
  const d = project({});
  for (let round = 0; round < 3; round++) {
    const code = `const S=require(${JSON.stringify(path.join(REPO, 'harness', 'src', 'state'))});console.log('listo');for(let i=0;i<1e6;i++)S.updateState(${JSON.stringify(d)},'s',s=>{s.n=i;s.relleno='x'.repeat(50000)})`;
    const k = spawn(NODE, ['-e', code], { env: process.env, stdio: ['ignore', 'pipe', 'ignore'] });
    await new Promise(res => k.stdout.once('data', res));
    await new Promise(res => setTimeout(res, 250 + round * 150));
    k.kill('SIGKILL');
    await new Promise(res => k.on('close', res));
    const { state, problema } = S.load(d, 's');
    assert.strictEqual(problema, null, `ronda ${round}: el estado quedó legible`);
    assert.strictEqual(typeof state.n, 'number');
    const t0 = Date.now();
    S.updateState(d, 's', s => { s.n = -1; });
    assert.ok(Date.now() - t0 < 2500, `ronda ${round}: el candado del proceso muerto no bloquea`);
  }
});

test('reglas propias también sobre lo cambiado por shell; lo que ya estaba en el último commit no se atribuye al cambio', async () => {
  const d = project({ 'src/a.js': 'console.log("viejo")\n', 'src/b.js': '' });
  cfgFile(d, { sensores: { alTerminar: [] }, reglas: [{ nombre: 'sin-console', archivos: 'src/**', prohibido: 'console\\.log', mensaje: 'usa el logger' }] });
  for (const a of [['add', '-A'], ['commit', '-qm', 'base']]) spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd: d });
  await E(d, 's', 'session', { source: 'startup' });
  fs.appendFileSync(path.join(d, 'src/a.js'), 'const x = 1\n'); // ya tenía la violación en el commit
  fs.writeFileSync(path.join(d, 'src/b.js'), 'console.log("nuevo")\n'); // como si fuera «echo … > src/b.js»
  const o = await E(d, 's', 'stop', { lastMessage: 'Listo.' });
  assert.match(o.block, /src\/b\.js: regla «sin-console»/);
  assert.doesNotMatch(o.block, /src\/a\.js: regla/);
});

test('MEM-1: un secreto en el pedido no llega al estado ni a sesion.md', async () => {
  const d = project({ 'a.md': '' });
  await E(d, 's', 'prompt', { prompt: `agrega el cliente usando la clave ${FAKE_GH} en el config` });
  await E(d, 's', 'post', edit('a.md'));
  await E(d, 's', 'stop', { lastMessage: 'Listo.' });
  const leak = new RegExp(FAKE_GH.slice(0, 12));
  assert.doesNotMatch(JSON.stringify(S.readState(d, 's')), leak);
  assert.doesNotMatch(fs.readFileSync(path.join(d, '.sdd', 'memoria', 'sesion.md'), 'utf8'), leak);
});
