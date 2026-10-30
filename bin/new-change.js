#!/usr/bin/env node
// Crea changes/<AAAA-MM-DD-slug>/state.json en el proyecto actual.
// Uso: node new-change.js --type <feature|fix|trivial|browser|review|test|refactor|doc|deploy-check|analysis|qa|deps|prototype> "título del cambio"
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let type = 'feature';
const words = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--type') type = args[++i];
  else if (args[i].startsWith('--type=')) type = args[i].slice(7);
  else words.push(args[i]);
}
const FLOWS = {
  feature: ['ingest', 'explore', 'analysis', 'propose', 'spec', 'design', 'test-plan', 'tasks', 'gate', 'test-write', 'apply', 'verify', 'ui-review', 'qa'],
  fix: ['ingest', 'explore', 'test-plan', 'tasks', 'gate', 'test-write', 'apply', 'verify', 'ui-review', 'qa'],
  analysis: ['ingest', 'explore', 'analysis'],
  qa: ['qa'],
  deps: ['explore', 'deps-audit', 'gate', 'apply', 'verify'],
  prototype: ['explore', 'prototype'],
  trivial: ['apply', 'verify'],
  browser: ['browser'],
  review: ['explore', 'review'],
  test: ['explore', 'test-plan', 'gate', 'test-write', 'verify'],
  refactor: ['explore', 'test-plan', 'tasks', 'gate', 'test-write', 'apply', 'verify'],
  doc: ['explore', 'doc'],
  'deploy-check': ['deploy-check']
};
if (!FLOWS[type]) { console.error(`Tipo inválido: ${type}. Usa: ${Object.keys(FLOWS).join(', ')}`); process.exit(1); }
const title = words.join(' ').trim() || 'cambio';
const slug = title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'cambio';
const d = new Date();
const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const base = path.join(process.cwd(), 'changes');
let id = `${date}-${slug}`; let n = 2;
while (fs.existsSync(path.join(base, id))) id = `${date}-${slug}-${n++}`;
const dir = path.join(base, id);
fs.mkdirSync(dir, { recursive: true });
const now = d.toISOString();
const state = {
  id, title, type, created: now, updated: now,
  approved: false, retries: 0, closed: false,
  phases: Object.fromEntries(FLOWS[type].map(p => [p, 'pending'])),
  log: [{ at: now, msg: `Cambio creado (${type})` }]
};
fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify(state, null, 2));
console.log(JSON.stringify({ id, dir: path.relative(process.cwd(), dir).replace(/\\/g, '/'), type, phases: FLOWS[type] }));
