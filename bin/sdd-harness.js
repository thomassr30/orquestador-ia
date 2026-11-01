#!/usr/bin/env node
// Diagnóstico del harness SDD (solo lectura, salvo que "sensores" ejecuta los chequeos del proyecto).
// Uso:
//   node sdd-harness.js estado   [ruta]   GATE, archivos modificados y últimos sensores de este proyecto
//   node sdd-harness.js doctor   [ruta]   hooks instalados por herramienta, configuración y sensores detectados
//   node sdd-harness.js sensores [ruta]   ejecuta ahora los sensores sobre lo modificado (git status)
//   node sdd-harness.js registro [n]      últimas decisiones del harness en este proyecto
//   node sdd-harness.js aprobar  [ruta]   (tú, desde tu terminal) aprueba el plan pendiente de la última sesión
//   node sdd-harness.js consumo  [ruta]   en qué se fueron los tokens de la última sesión (Claude Code)
//   node sdd-harness.js reglas   [ruta]   revisa TODO el proyecto contra las reglas propias (harness.json → reglas)
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SRC = path.join(__dirname, '..', 'harness', 'src');
const { findProjectRoot, relPosix } = require(path.join(SRC, 'util'));
const { loadConfig } = require(path.join(SRC, 'config'));
const S = require(path.join(SRC, 'state'));
const { plan, runSensors, summarize } = require(path.join(SRC, 'sensors'));
const { HOME, SDD_HOME, fwd } = require(path.join(SRC, 'paths'));

const [cmd = 'estado', arg] = process.argv.slice(2);
const root = findProjectRoot(cmd === 'registro' ? process.cwd() : (arg || process.cwd()));
const GATE = { inicial: 'sin cambio en curso', requerido: 'pedido de cambio: plan sin presentar (ediciones bloqueadas)', pendiente: 'plan presentado: esperando tu aprobación (ediciones bloqueadas)', aprobado: 'plan aprobado: puede implementar', libre: 'pedido directo (sin plan)' };

function changedFiles() {
  const r = spawnSync('git', ['-C', root, 'status', '--porcelain', '--untracked-files=all'], { encoding: 'utf8' });
  if (r.status === 0) return r.stdout.split('\n').filter(Boolean).map(l => l.slice(3).replace(/^.* -> /, '').replace(/^"|"$/g, '')).filter(f => !f.startsWith('.sdd/'));
  const last = S.listSessions(root)[0];
  return last ? last.cambios.filter(f => !f.startsWith('.sdd/')) : [];
}

function estado() {
  const sessions = S.listSessions(root);
  console.log(`Proyecto: ${fwd(root)}`);
  if (!sessions.length) { console.log('Sin actividad registrada del harness en este proyecto.'); return; }
  const s = sessions[0];
  console.log(`Última sesión: ${s.sesion} (${s.herramienta || '—'}) · actualizada ${String(s.actualizado || '').replace('T', ' ').slice(0, 16)}`);
  console.log(`GATE: ${GATE[s.gate.estado] || s.gate.estado}`);
  const files = s.cambios.filter(f => !f.startsWith('.sdd/'));
  console.log(`Archivos modificados: ${files.length ? files.join(', ') : '—'}`);
  console.log(`Sensores: ${s.sensores ? `${s.sensores.ok ? 'en verde' : 'con errores'} — ${s.sensores.resumen.map(r => `${r.omitido ? '•' : r.ok ? '✓' : '✗'} ${r.nombre}`).join(' · ')}` : 'sin ejecutar'}${s.sucio ? ' (hay cambios sin verificar)' : ''}`);
  if (s.subagentes) console.log(`Sub-agentes en el último pedido: ${s.subagentes.lanzados}${s.subagentes.libre ? ' (sin tope: aprobaste más)' : ''}`);
  if (s.aprobaciones.pendientes.length) console.log(`Esperando confirmación en el chat: ${s.aprobaciones.pendientes.map(p => p.clave).join(' · ')}`);
  if (sessions.length > 1) console.log(`Otras sesiones recientes: ${sessions.slice(1, 4).map(x => `${x.sesion} (${x.herramienta || '—'}, GATE ${x.gate.estado})`).join(', ')}`);
}

// Prueba en vivo: ejecuta el comando EXACTO registrado en cada herramienta con un "git push" simulado
// y comprueba que el hook lo bloquee (valida Node en el PATH, comillas de la ruta y el adaptador).
const LIVE = {
  'Claude Code': { ev: 'PreToolUse', input: d => ({ session_id: 'doctor', cwd: d, tool_name: 'Bash', tool_input: { command: 'git push' } }), denied: o => /"permissionDecision":"deny"/.test(o) },
  Codex: { ev: 'PreToolUse', input: d => ({ session_id: 'doctor', cwd: d, tool_name: 'Bash', tool_input: { command: 'git push' } }), denied: o => /"permissionDecision":"deny"/.test(o) },
  'Gemini CLI': { ev: 'BeforeTool', input: d => ({ session_id: 'doctor', cwd: d, tool_name: 'run_shell_command', tool_input: { command: 'git push' } }), denied: o => /"decision":"deny"/.test(o) },
  Cursor: { ev: 'beforeShellExecution', input: d => ({ conversation_id: 'doctor', workspace_roots: [d], command: 'git push', cwd: d }), denied: o => /"permission":"deny"/.test(o) },
  Copilot: { ev: 'preToolUse', input: d => ({ sessionId: 'doctor', cwd: d, toolName: 'bash', toolArgs: { command: 'git push' } }), denied: o => /"permissionDecision":"deny"/.test(o) },
};

function findCommand(text, ev) {
  const re = /"command"\s*:\s*"((?:[^"\\]|\\.)*sdd-hook\.js(?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(text))) { const c = JSON.parse(`"${m[1]}"`); if (c.trim().endsWith(` ${ev}`)) return c; }
  return null;
}

function liveTest(label, text) {
  const t = LIVE[label];
  const cmd = t && findCommand(text, t.ev);
  if (!cmd) return 'sin prueba en vivo';
  const os = require('os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-doctor-'));
  const r = spawnSync(cmd, { shell: true, input: JSON.stringify(t.input(dir)), encoding: 'utf8', timeout: 20000, windowsHide: true, env: { ...process.env, SDD_HOME: path.join(dir, '.estado') } });
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* temporal */ }
  if (r.error) return `✗ no se pudo ejecutar (${r.error.message})`;
  if (t.denied(r.stdout || '')) return 'prueba en vivo OK (bloqueó "git push")';
  return `✗ la prueba en vivo no bloqueó "git push"${r.stderr ? `: ${r.stderr.trim().split('\n')[0]}` : ''}`;
}

function hookStatus() {
  const read = file => { try { return fs.readFileSync(file, 'utf8'); } catch { return null; } };
  const rows = [
    ['Claude Code', path.join(HOME, '.claude', 'settings.json')],
    ['Codex', path.join(process.env.CODEX_HOME || path.join(HOME, '.codex'), 'hooks.json')],
    ['Gemini CLI', path.join(HOME, '.gemini', 'settings.json')],
    ['Cursor', path.join(HOME, '.cursor', 'hooks.json')],
    ['Copilot', path.join(process.env.COPILOT_HOME || path.join(HOME, '.copilot'), 'hooks', 'sdd-orquestador.json')],
    ['OpenCode', path.join(HOME, '.config', 'opencode', 'plugins', 'sdd-harness.js')],
  ];
  let failures = 0;
  for (const [label, file] of rows) {
    const text = read(file);
    const ours = text && (label === 'OpenCode' ? text.includes('SddHarness') : text.includes('sdd-hook.js'));
    if (text === null) { console.log(`  · ${label.padEnd(12)} no instalado`); continue; }
    if (!ours) { console.log(`  ✗ ${label.padEnd(12)} ${fwd(file)} (sin hooks del harness)`); failures++; continue; }
    let live = 'plugin instalado (se carga al abrir OpenCode)';
    if (label === 'OpenCode') {
      const m = /const SDD_HOME = '([^']+)'/.exec(text);
      if (m && !fs.existsSync(path.join(m[1], 'harness', 'src', 'core.js'))) { live = `✗ el plugin apunta a ${m[1]}, donde no está el harness`; failures++; }
    } else {
      live = liveTest(label, text);
      if (live.startsWith('✗')) failures++;
    }
    console.log(`  ${live.startsWith('✗') ? '✗' : '✓'} ${label.padEnd(12)} ${fwd(file)} — ${live.replace(/^✗ /, '')}`);
  }
  return failures;
}

function doctor() {
  console.log(`Harness SDD · Node ${process.version} · ${fwd(SDD_HOME)}`);
  console.log('\nHooks por herramienta (con prueba en vivo):');
  if (hookStatus()) { console.log('  → Hay hooks que no responden. Ejecuta: node install.js (y revisa que "node" funcione en una terminal nueva).'); process.exitCode = 1; }
  const cfg = loadConfig(root);
  console.log(`\nProyecto: ${fwd(root)}`);
  console.log(`Configuración: GATE ${cfg.gate} · sensores al editar ${cfg.sensores.alEditar ? 'sí' : 'no'} · al terminar: ${cfg.sensores.alTerminar.join(', ') || 'ninguno'} · máx. ${cfg.sensores.maxBloqueos} bloqueos`);
  const { limitFor } = require(path.join(SRC, 'budget'));
  console.log(`Presupuesto: modo ${(cfg.presupuesto || {}).modo || 'normal'} · ${limitFor(cfg) ? `máx. ${limitFor(cfg)} sub-agentes por mensaje` : 'sin tope de sub-agentes'} · salidas largas ${cfg.salida && cfg.salida.compactar ? 'compactadas' : 'completas'}`);
  const projCfg = path.join(root, '.sdd', 'harness.json');
  console.log(`Config. del proyecto: ${fs.existsSync(projCfg) ? fwd(projCfg) : 'no hay (.sdd/harness.json)'}`);
  const files = changedFiles();
  const sample = files.length ? files : guessSample();
  const steps = plan(root, sample, cfg);
  console.log(`\nSensores ${files.length ? `para los ${files.length} archivo(s) modificados` : '(ejemplo con un archivo del proyecto)'}:`);
  if (!steps.length) console.log('  ninguno detectado: configura sensores.comandos en .sdd/harness.json');
  for (const s of steps) console.log(`  • ${s.nombre}${s.modulo !== '.' ? ` [${s.modulo}]` : ''}: ${s.cmd}`);
}

function guessSample() {
  for (const d of ['src', 'app', 'lib', 'cmd', 'internal', 'pkg', '.']) {
    try {
      const f = fs.readdirSync(path.join(root, d)).find(x => /\.(m?[jt]sx?|go|vue)$/.test(x));
      if (f) return [relPosix(root, path.join(root, d, f))];
    } catch { /* no existe */ }
  }
  return [];
}

async function sensores() {
  const files = changedFiles();
  if (!files.length) { console.log('No hay archivos modificados (git status) para verificar.'); return; }
  const run = await runSensors(root, files, loadConfig(root));
  if (!run.ran) { console.log('No hay sensores aplicables a los archivos modificados.'); return; }
  console.log(summarize(run, files.length));
  process.exitCode = run.ok ? 0 : 1;
}

function registro() {
  const n = Number(arg) || 40;
  const lines = S.readLog(root, n);
  console.log(lines.length ? lines.join('\n') : 'Sin registro del harness en este proyecto.');
}

function aprobar() {
  const last = S.listSessions(root)[0];
  if (!last) { console.log('No hay sesiones del harness en este proyecto.'); return; }
  S.updateState(root, last.sesion, st => { st.gate = { estado: 'aprobado', desde: new Date().toISOString() }; });
  S.log(root, { herramienta: 'terminal', evento: 'gate', decision: 'aprobado', detalle: 'aprobado manualmente por el usuario' });
  console.log(`Plan aprobado para la sesión ${last.sesion} (${last.herramienta || '—'}). Pídele al agente que continúe.`);
}

function consumo() {
  const { sessionUsage } = require(path.join(SRC, 'usage'));
  const last = S.listSessions(root).find(x => x.consumo);
  if (!last) { console.log('Sin datos de consumo todavía (se registran al terminar cada turno en Claude Code).'); return; }
  const u = sessionUsage(last.consumo.transcript) || last.consumo;
  const n = x => Math.round(x).toLocaleString('es-CL');
  const tot = p => p.entrada + p.cacheEscritura + p.cacheLectura + p.salida;
  const p = u.principal; const s = u.subagentes;
  console.log(`Sesión ${last.sesion} (${last.herramienta || '—'})`);
  console.log(`\nConversación principal: ${n(tot(p))} tokens en ${p.mensajes} respuestas`);
  console.log(`  · leídos de caché (baratos, ~10% del precio): ${n(p.cacheLectura)} (${tot(p) ? Math.round(100 * p.cacheLectura / tot(p)) : 0}%)`);
  console.log(`  · escritos en caché: ${n(p.cacheEscritura)} · entrada sin caché: ${n(p.entrada)} · salida (lo que escribe la IA): ${n(p.salida)}`);
  if (s.agentes) console.log(`Sub-agentes (${s.agentes}): ${n(tot(s))} tokens (caché ${n(s.cacheLectura)}, salida ${n(s.salida)})`);
  const per = Object.entries(u.porHerramienta || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (per.length) console.log(`\nResultados de herramientas que entraron al contexto (aprox.): ${per.map(([k, v]) => `${k} ${n(v)}`).join(' · ')}`);
  if ((u.mayores || []).length) {
    console.log('Los más pesados:');
    for (const t of u.mayores) console.log(`  ${String(n(t.tokens)).padStart(8)}  ${t.nombre}${t.detalle ? `: ${t.detalle}` : ''}`);
  }
  console.log('\nCada respuesta vuelve a procesar todo el historial: si la mayoría es caché, el costo real es bajo; si crecen "entrada" o los sub-agentes, conviene /clear entre tareas y flujos más livianos.');
}

function reglas() {
  const { compile } = require(path.join(SRC, 'project-rules'));
  const rules = compile(loadConfig(root).reglas);
  if (!rules.length) { console.log('No hay reglas propias. Agrégalas en .sdd/harness.json → "reglas" (ver README, sección Reglas propias).'); return; }
  const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.angular', 'coverage', '.next', 'vendor', 'target', '.sdd']);
  const hits = [];
  const walk = d => {
    let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of es) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(p); continue; }
      const rel = relPosix(root, p);
      const rs = rules.filter(r => r.files.some(re => re.test(rel)) && !r.except.some(re => re.test(rel)));
      if (!rs.length) continue;
      let text; try { if (fs.statSync(p).size > 2e6) continue; text = fs.readFileSync(p, 'utf8'); } catch { continue; }
      text.split(/\r?\n/).forEach((line, i) => { for (const r of rs) if (r.re.test(line)) hits.push(`${rel}:${i + 1}  [${r.nombre}]  ${line.trim().slice(0, 100)}`); });
    }
  };
  walk(root);
  console.log(hits.length ? `${hits.length} coincidencia(s) con las reglas (${rules.map(r => r.nombre).join(', ')}):\n${hits.slice(0, 200).join('\n')}` : `Sin violaciones de ${rules.length} regla(s).`);
  process.exitCode = hits.length ? 1 : 0;
}

const cmds = { estado, doctor, sensores, registro, aprobar, consumo, reglas, hooks: () => { console.log('Hooks por herramienta:'); hookStatus(); } };
if (!cmds[cmd]) { console.error('Comandos: estado | doctor | sensores | registro | consumo | reglas | aprobar'); process.exit(1); }
Promise.resolve(cmds[cmd]()).catch(e => { console.error(e.message); process.exit(1); });
