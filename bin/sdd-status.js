#!/usr/bin/env node
// Lista los cambios SDD del proyecto actual. Uso: node sdd-status.js [--all]
'use strict';
const fs = require('fs');
const path = require('path');
const all = process.argv.includes('--all');
const base = path.join(process.cwd(), 'changes');
if (!fs.existsSync(base)) { console.log('No hay cambios SDD en este proyecto (carpeta changes/ no existe).'); process.exit(0); }
const rows = [];
for (const id of fs.readdirSync(base).sort()) {
  const f = path.join(base, id, 'state.json');
  if (!fs.existsSync(f)) continue;
  try {
    const s = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (s.closed && !all) continue;
    const next = Object.entries(s.phases).find(([, v]) => v !== 'done' && v !== 'skipped');
    rows.push([id, s.type, next ? `${next[0]} (${next[1]})` : 'completo', s.approved ? 'sí' : 'no', String(s.retries), (s.updated || '').slice(0, 16).replace('T', ' ')]);
  } catch { rows.push([id, '?', 'state.json inválido', '-', '-', '-']); }
}
if (!rows.length) { console.log(all ? 'No hay cambios.' : 'No hay cambios abiertos (usa --all para ver cerrados).'); process.exit(0); }
const head = ['ID', 'Tipo', 'Fase actual', 'Aprobado', 'Reintentos', 'Actualizado'];
const w = head.map((h, i) => Math.max(h.length, ...rows.map(r => r[i].length)));
const line = r => '| ' + r.map((c, i) => c.padEnd(w[i])).join(' | ') + ' |';
console.log([line(head), '|' + w.map(n => '-'.repeat(n + 2)).join('|') + '|', ...rows.map(line)].join('\n'));
