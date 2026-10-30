#!/usr/bin/env node
// Registro de mejora continua del orquestador.
//   log <tipo> <alta|media|baja> <componente> "<descripción>" "<proyecto/cambio>"
//   summary [--candidates]     agrupa por componente+tipo y marca candidatos (≥2 ocurrencias o severidad alta)
//   resolve <n,n,...> "<nota>"  marca líneas (n° de entrada) como resueltas
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

function sourceDir() {
  try { const m = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.sdd-orquestador', 'manifest.json'), 'utf8')); if (m.source) return m.source; } catch { /* sin manifest */ }
  return path.resolve(__dirname, '..');
}
const FILE = path.join(sourceDir(), 'mejora', 'registro.md');
const TYPES = ['regla-violada', 'correccion-usuario', 'gate-fallido', 'reintentos', 'conocimiento-faltante'];
const SEV = ['alta', 'media', 'baja'];
const [cmd, ...a] = process.argv.slice(2);
const today = () => new Date().toISOString().slice(0, 10);

function read() {
  if (!fs.existsSync(FILE)) return [];
  return fs.readFileSync(FILE, 'utf8').split(/\r?\n/).filter(l => /^- \[[ x]\] #\d+/.test(l)).map(l => {
    const m = l.match(/^- \[([ x])\] #(\d+) · (\S+) · (\S+) · (\S+) · (\S+) · (.*?) · (.*?)(?: → (.*))?$/);
    return m && { done: m[1] === 'x', n: +m[2], fecha: m[3], tipo: m[4], sev: m[5], comp: m[6], desc: m[7], origen: m[8], nota: m[9], raw: l };
  }).filter(Boolean);
}
function ensure() {
  if (!fs.existsSync(FILE)) { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, '# Registro de mejora continua\n\nFormato: estado · #n · fecha · tipo · severidad · componente · descripción · origen (→ resolución)\n\n'); }
}
const cmds = {
  log() {
    const [tipo, sev, comp, desc, origen] = a;
    if (!TYPES.includes(tipo) || !SEV.includes(sev) || !comp || !desc) { console.error(`Uso: log <${TYPES.join('|')}> <${SEV.join('|')}> <componente> "<descripción>" "<proyecto/cambio>"`); process.exit(1); }
    ensure(); const n = Math.max(0, ...read().map(e => e.n)) + 1;
    fs.appendFileSync(FILE, `- [ ] #${n} · ${today()} · ${tipo} · ${sev} · ${comp} · ${desc.replace(/·/g, '-')} · ${origen || '-'}\n`);
    console.log(JSON.stringify({ registrado: n }));
  },
  summary() {
    const open = read().filter(e => !e.done);
    if (!open.length) return console.log('Sin incidentes abiertos.');
    const g = {};
    for (const e of open) { const k = `${e.comp} · ${e.tipo}`; (g[k] = g[k] || []).push(e); }
    const rows = Object.entries(g).map(([k, es]) => ({ k, n: es.length, alta: es.some(e => e.sev === 'alta'), ids: es.map(e => '#' + e.n).join(','), orig: new Set(es.map(e => e.origen)).size }));
    const cand = rows.filter(r => (r.n >= 2 && r.orig >= 2) || r.alta);
    const show = a.includes('--candidates') ? cand : rows;
    for (const r of show.sort((x, y) => y.n - x.n)) console.log(`${cand.includes(r) ? '★' : '·'} ${r.k}  (${r.n} ocurrencias${r.alta ? ', severidad alta' : ''})  ${r.ids}`);
    console.log(cand.length ? `\nCandidatos a mejora: ${cand.length} (★). Revisar con /sdd-improve.` : '\nSin candidatos: aún no hay evidencia suficiente para cambiar skills.');
  },
  resolve() {
    const ids = (a[0] || '').split(',').map(Number).filter(Boolean); const nota = a[1] || 'resuelto';
    if (!ids.length || !fs.existsSync(FILE)) { console.error('Uso: resolve <n,n,...> "<nota>"'); process.exit(1); }
    let s = fs.readFileSync(FILE, 'utf8');
    for (const e of read()) if (ids.includes(e.n) && !e.done) s = s.replace(e.raw, e.raw.replace('- [ ]', '- [x]') + ` → ${nota}`);
    fs.writeFileSync(FILE, s); console.log('ok');
  }
};
(cmds[cmd] || (() => { console.error('Comandos: log | summary [--candidates] | resolve'); process.exit(1); }))();
