#!/usr/bin/env node
// Memoria del proyecto (.sdd/memoria). Uso:
//   node sdd-memory.js init                       crea la estructura (no sobrescribe)
//   node sdd-memory.js stats                      tamaños vs presupuesto (sin gastar tokens leyendo)
//   node sdd-memory.js history <id> <tipo> "resumen" ["archivos clave"]
//   node sdd-memory.js backup                     copia la memoria a .sdd/memoria/.respaldo/<fecha>/
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = path.join(process.cwd(), '.sdd', 'memoria');
const BUDGET = { 'MEMORIA.md': 60, 'decisiones.md': 300, 'pendientes.md': 80, 'historial.md': 200, 'sesion.md': 40, tema: 150 };
const today = () => new Date().toISOString().slice(0, 10);
const lines = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split(/\r?\n/).length : 0;
const [cmd, ...rest] = process.argv.slice(2);

const TEMPLATES = {
  'MEMORIA.md': `# Memoria — ${path.basename(process.cwd())}\n_Actualizada: ${today()}_\n\n## Qué es\n\n## Stack\n\n## Mapa de módulos\n\n## Convenciones clave\n\n## Comandos\n\n## Temas disponibles\n\n## Decisiones vigentes más importantes\n`,
  'decisiones.md': '# Decisiones\n',
  'pendientes.md': '# Pendientes (deuda, riesgos, preguntas abiertas)\n',
  'historial.md': '# Historial de cambios\n',
};

function init() {
  fs.mkdirSync(path.join(DIR, 'temas'), { recursive: true });
  const created = [];
  for (const [f, t] of Object.entries(TEMPLATES)) {
    const p = path.join(DIR, f);
    if (!fs.existsSync(p)) { fs.writeFileSync(p, t); created.push(f); }
  }
  console.log(JSON.stringify({ dir: path.relative(process.cwd(), DIR).replace(/\\/g, '/'), created }));
}

function stats() {
  if (!fs.existsSync(DIR)) { console.log('Sin memoria en este proyecto. Crea con: node sdd-memory.js init'); return; }
  const rows = [];
  for (const f of Object.keys(TEMPLATES).concat('sesion.md')) {
    const p = path.join(DIR, f); if (!fs.existsSync(p)) continue;
    rows.push([f, lines(p), BUDGET[f]]);
  }
  const tdir = path.join(DIR, 'temas');
  if (fs.existsSync(tdir)) for (const f of fs.readdirSync(tdir).filter(x => x.endsWith('.md'))) rows.push([`temas/${f}`, lines(path.join(tdir, f)), BUDGET.tema]);
  const over = rows.filter(r => r[1] > r[2]);
  const sesion = path.join(DIR, 'sesion.md');
  const sesionAge = fs.existsSync(sesion) ? Math.round((Date.now() - fs.statSync(sesion).mtimeMs) / 86400000) : null;
  for (const r of rows) console.log(`${r[1] > r[2] ? '⚠' : '·'} ${r[0].padEnd(34)} ${String(r[1]).padStart(4)} / ${r[2]} líneas`);
  if (sesionAge !== null) console.log(`· sesion.md actualizada hace ${sesionAge} día(s)${sesionAge > 14 ? ' (antigua: verificar antes de usar)' : ''}`);
  console.log(over.length ? `\nSobre presupuesto: ${over.map(r => r[0]).join(', ')} → sugerir compactación al usuario.` : '\nDentro de presupuesto.');
}

function history() {
  const [id, tipo, resumen, archivos] = rest;
  if (!id || !tipo || !resumen) { console.error('Uso: history <id> <tipo> "resumen" ["archivos"]'); process.exit(1); }
  init();
  fs.appendFileSync(path.join(DIR, 'historial.md'), `- ${today()} · ${id} · ${tipo} · ${resumen}${archivos ? ' · ' + archivos : ''}\n`);
  console.log('ok');
}

function backup() {
  if (!fs.existsSync(DIR)) { console.log('Sin memoria.'); return; }
  const dst = path.join(DIR, '.respaldo', today());
  const copy = (s, d) => { fs.mkdirSync(d, { recursive: true }); for (const e of fs.readdirSync(s, { withFileTypes: true })) { if (e.name === '.respaldo') continue; const a = path.join(s, e.name), b = path.join(d, e.name); e.isDirectory() ? copy(a, b) : fs.copyFileSync(a, b); } };
  copy(DIR, dst);
  console.log(JSON.stringify({ backup: path.relative(process.cwd(), dst).replace(/\\/g, '/') }));
}

({ init, stats, history, backup }[cmd] || (() => { console.error('Comandos: init | stats | history | backup'); process.exit(1); }))();
