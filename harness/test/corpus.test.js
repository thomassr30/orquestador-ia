'use strict';
// Corpus determinista del harness (sin modelos): escenarios versionados en evals/corpus/*.json que se ejecutan contra el
// núcleo real (eventos ya normalizados, como los entrega cada adaptador), el CLI y procesos reales cuando hace falta.
// Corre en CI con «npm test». Las evaluaciones con modelos están aparte (bin/sdd-eval.js, solo con --confirmar).
//
// Paso de evento:  { "evento": "pre|prompt|post|stop|session|compact", "cliente": "codex", "herramienta": {...},
//                    "texto": "...", "ultimoMensaje": "...", "espera": {...} }
// Acciones:        { "accion": "escribir|corromper-estado|falla-interna|concurrente|cli|archivo|trabajo-plan|trabajo-verificar", ... }
// Expectativas:    decision ('permitido'|'deny'|'ask') · motivo · bloqueo · aviso · contexto (regex) · bloquea (bool) · estado {ruta.punteada: valor}
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { project, tmp, REPO } = require('./helpers');
process.env.SDD_HOME = tmp('sdd-home-');
const core = require('../src/core');
const S = require('../src/state');
const T = require('../src/trabajo');
const { loadConfig } = require('../src/config');

const NODE = process.execPath;
const CORPUS = path.join(REPO, 'evals', 'corpus');
const HOSTS = { claude: { nativeAsk: true }, copilot: { nativeAsk: true }, codex: { nativeAsk: false, nativeGitAsk: true }, opencode: { nativeAsk: false, nativeGitAsk: true }, gemini: { nativeAsk: false }, cursor: { nativeAsk: false } };
const TEMAS = ['cambio-sencillo', 'correccion-con-regresion', 'accion-critica', 'argumentos-cambiados', 'sensor-fallido-u-omitido', 'compactacion-y-reanudacion', 'concurrencia', 'estado-corrupto', 'herramienta-desconocida', 'fallo-de-hook', 'recuperacion-de-checkpoint'];

/** «{node}» en el escenario = ruta de este Node (los comandos de sensores no dependen del PATH). */
const expand = v => JSON.parse(JSON.stringify(v).split('{node}').join(JSON.stringify(NODE).slice(1, -1)));
const get = (o, p) => p.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
const commit = dir => { for (const a of [['add', '-A'], ['commit', '-qm', 'base']]) spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd: dir }); };

function eventOf(root, step, sc = {}) {
  const host = step.cliente || sc.cliente || 'codex';
  const tool = step.herramienta ? { paths: [], contents: [], args: {}, ...step.herramienta } : undefined;
  return { event: step.evento, root, sessionId: step.sesion || 's', host, ...HOSTS[host], tool, prompt: step.texto, lastMessage: step.ultimoMensaje, source: step.origen, wantsContext: step.evento === 'compact' };
}

function check(where, out, espera, root, sid) {
  if (!espera) return;
  const o = out || {};
  if ('decision' in espera) assert.strictEqual(o.decision || 'permitido', espera.decision, `${where}: decisión`);
  for (const [k, field] of [['motivo', 'reason'], ['bloqueo', 'block'], ['aviso', 'notice'], ['contexto', 'context']]) {
    if (espera[k]) assert.match(String(o[field] || ''), new RegExp(espera[k]), `${where}: ${k}`);
  }
  if ('bloquea' in espera) assert.strictEqual(!!o.block, espera.bloquea, `${where}: bloquea`);
  for (const [p, v] of Object.entries(espera.estado || {})) assert.deepStrictEqual(get(S.readState(root, sid), p), v, `${where}: estado.${p}`);
}

/** El mismo paso en N procesos a la vez (barrera de tiempo): cuántos quedaron permitidos. */
async function concurrent(root, step, sc) {
  const ev = eventOf(root, step.paso, sc);
  const at = Date.now() + 1500;
  const code = `const c=require(${JSON.stringify(path.join(REPO, 'harness', 'src', 'core'))});while(Date.now()<${at});c.handle(${JSON.stringify(ev)}).then(o=>console.log(o&&o.decision?o.decision:'permitido'))`;
  const rs = await Promise.all(Array.from({ length: step.procesos || 2 }, () => new Promise(res => { const k = spawn(NODE, ['-e', code], { env: process.env }); let s = ''; k.stdout.on('data', x => { s += x; }); k.on('close', () => res(s.trim())); })));
  return rs.filter(x => x === 'permitido').length;
}

async function run(sc) {
  const root = project(sc.archivos || {});
  if (sc.config) { fs.mkdirSync(path.join(root, '.sdd'), { recursive: true }); fs.writeFileSync(path.join(root, '.sdd', 'harness.json'), JSON.stringify(sc.config)); }
  if (sc.commit) commit(root);
  for (const [i, step] of sc.pasos.entries()) {
    const where = `${sc.nombre} · paso ${i + 1}${step.nota ? ` (${step.nota})` : ''}`;
    const sid = step.sesion || 's';
    if (step.evento) { check(where, await core.handle(eventOf(root, step, sc)), step.espera, root, sid); continue; }
    switch (step.accion) {
      case 'escribir': fs.mkdirSync(path.dirname(path.join(root, step.archivo)), { recursive: true }); fs.writeFileSync(path.join(root, step.archivo), step.contenido); break;
      case 'corromper-estado': fs.writeFileSync(S.sessionFile(root, sid), '{ roto'); break;
      case 'falla-interna': if (step.valor) process.env.SDD_HARNESS_FALLA_INTERNA = step.valor; else delete process.env.SDD_HARNESS_FALLA_INTERNA; break;
      case 'concurrente': assert.strictEqual(await concurrent(root, step, sc), step.espera.permitidos, `${where}: permitidos en paralelo`); break;
      case 'cli': {
        const r = spawnSync(NODE, [path.join(REPO, 'bin', 'sdd-harness.js'), ...step.args], { cwd: root, encoding: 'utf8', env: process.env });
        if ('codigo' in step.espera) assert.strictEqual(r.status, step.espera.codigo, `${where}: código (${r.stdout}${r.stderr})`);
        if (step.espera.salida) assert.match(r.stdout, new RegExp(step.espera.salida), `${where}: salida`);
        break;
      }
      case 'archivo': assert.strictEqual(fs.readFileSync(path.join(root, step.archivo), 'utf8'), step.contenido, `${where}: contenido`); break;
      case 'trabajo-plan': assert.ok(T.setPlan(root, step.plan, { sesion: sid }).ok, `${where}: plan válido`); break;
      case 'trabajo-verificar': {
        const r = await T.verifyTask(root, step.tarea, { cfg: loadConfig(root), sesion: sid });
        assert.strictEqual(r.tarea.estado, step.espera.estado, `${where}: estado de la tarea`);
        break;
      }
      default: throw new Error(`${where}: acción desconocida «${step.accion}»`);
    }
  }
}

const scenarios = fs.readdirSync(CORPUS).filter(f => f.endsWith('.json')).sort().map(f => ({ archivo: f, ...expand(JSON.parse(fs.readFileSync(path.join(CORPUS, f), 'utf8'))) }));

test('el corpus cubre los escenarios acordados y cada uno declara su versión', () => {
  for (const t of TEMAS) assert.ok(scenarios.some(s => s.tema === t), `falta el escenario «${t}»`);
  for (const s of scenarios) assert.ok(Number.isInteger(s.version) && s.version > 0, `${s.archivo}: falta «version»`);
});

for (const sc of scenarios) {
  test(`corpus · ${sc.tema} · ${sc.nombre}`, async () => {
    try { await run(sc); } finally { delete process.env.SDD_HARNESS_FALLA_INTERNA; }
  });
}
