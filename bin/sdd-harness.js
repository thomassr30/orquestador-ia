#!/usr/bin/env node
// Diagnóstico del harness SDD (solo lectura, salvo que "sensores" ejecuta los chequeos del proyecto).
// Uso:
//   node sdd-harness.js estado   [ruta]   GATE, archivos modificados y últimos sensores de este proyecto
//   node sdd-harness.js doctor   [ruta]   hooks instalados por herramienta, configuración y sensores detectados
//   node sdd-harness.js sensores [ruta]   ejecuta ahora los sensores sobre lo modificado (git status)
//   node sdd-harness.js registro [n]      últimas decisiones del harness en este proyecto
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
  if (s.aprobaciones.pendientes.length) console.log(`Esperando confirmación en el chat: ${s.aprobaciones.pendientes.map(p => p.clave).join(' · ')}`);
  if (sessions.length > 1) console.log(`Otras sesiones recientes: ${sessions.slice(1, 4).map(x => `${x.sesion} (${x.herramienta || '—'}, GATE ${x.gate.estado})`).join(', ')}`);
}

function hookStatus() {
  const has = (file, test) => { try { return test(fs.readFileSync(file, 'utf8')); } catch { return null; } };
  const mark = t => t.includes('sdd-hook.js');
  const rows = [
    ['Claude Code', path.join(HOME, '.claude', 'settings.json'), mark],
    ['Codex', path.join(process.env.CODEX_HOME || path.join(HOME, '.codex'), 'hooks.json'), mark],
    ['Gemini CLI', path.join(HOME, '.gemini', 'settings.json'), mark],
    ['Cursor', path.join(HOME, '.cursor', 'hooks.json'), mark],
    ['Copilot', path.join(process.env.COPILOT_HOME || path.join(HOME, '.copilot'), 'hooks', 'sdd-orquestador.json'), mark],
    ['OpenCode', path.join(HOME, '.config', 'opencode', 'plugins', 'sdd-harness.js'), t => t.includes('SddHarness')],
  ];
  for (const [label, file, test] of rows) {
    const r = has(file, test);
    console.log(`  ${r ? '✓' : r === null ? '·' : '✗'} ${label.padEnd(12)} ${r ? fwd(file) : r === null ? 'no instalado' : `${fwd(file)} (sin hooks del harness)`}`);
  }
}

function doctor() {
  console.log(`Harness SDD · Node ${process.version} · ${fwd(SDD_HOME)}`);
  console.log('\nHooks por herramienta:');
  hookStatus();
  const cfg = loadConfig(root);
  console.log(`\nProyecto: ${fwd(root)}`);
  console.log(`Configuración: GATE ${cfg.gate} · sensores al editar ${cfg.sensores.alEditar ? 'sí' : 'no'} · al terminar: ${cfg.sensores.alTerminar.join(', ') || 'ninguno'} · máx. ${cfg.sensores.maxBloqueos} bloqueos`);
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

const cmds = { estado, doctor, sensores, registro, hooks: () => { console.log('Hooks por herramienta:'); hookStatus(); } };
if (!cmds[cmd]) { console.error('Comandos: estado | doctor | sensores | registro'); process.exit(1); }
Promise.resolve(cmds[cmd]()).catch(e => { console.error(e.message); process.exit(1); });
