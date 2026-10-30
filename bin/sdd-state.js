#!/usr/bin/env node
// Actualiza changes/<id>/state.json sin que la IA edite JSON a mano.
// Uso:
//   node sdd-state.js <id> --phase <fase> --status <pending|running|done|failed|skipped> [--note "texto"]
//   node sdd-state.js <id> --approve | --retry | --close | --show
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const id = args[0];
if (!id || id.startsWith('--')) { console.error('Uso: node sdd-state.js <id> [--phase f --status s] [--note t] [--approve|--retry|--close|--show]'); process.exit(1); }
const file = path.join(process.cwd(), 'changes', id, 'state.json');
if (!fs.existsSync(file)) { console.error(`No existe ${file}`); process.exit(1); }
const s = JSON.parse(fs.readFileSync(file, 'utf8'));
const get = k => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : undefined; };
const now = new Date().toISOString();
const STATUSES = ['pending', 'running', 'done', 'failed', 'skipped'];

if (args.includes('--show')) { console.log(JSON.stringify(s, null, 2)); process.exit(0); }
const phase = get('--phase'); const status = get('--status'); const note = get('--note');
if (phase) {
  if (!STATUSES.includes(status)) { console.error(`--status debe ser: ${STATUSES.join(', ')}`); process.exit(1); }
  s.phases[phase] = status;
  s.log.push({ at: now, msg: `${phase}: ${status}${note ? ' — ' + note : ''}` });
} else if (note) s.log.push({ at: now, msg: note });
if (args.includes('--approve')) { s.approved = true; if ('gate' in s.phases) s.phases.gate = 'done'; s.log.push({ at: now, msg: 'Aprobado por el usuario' }); }
if (args.includes('--retry')) { s.retries += 1; s.log.push({ at: now, msg: `Reintento ${s.retries}` }); }
if (args.includes('--close')) { s.closed = true; s.log.push({ at: now, msg: 'Cambio cerrado' }); }
s.updated = now;
fs.writeFileSync(file, JSON.stringify(s, null, 2));
const next = Object.entries(s.phases).find(([, v]) => v !== 'done' && v !== 'skipped');
console.log(JSON.stringify({ id, next: next ? next[0] : null, approved: s.approved, retries: s.retries, closed: s.closed }));
