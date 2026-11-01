#!/usr/bin/env node
// Evaluación del harness con tareas reales (práctica de Anthropic/OpenAI: medir antes y después de cada cambio).
// Ejecuta cada tarea con la IA en modo no interactivo sobre una COPIA temporal del proyecto (tu carpeta no se
// toca), verifica el resultado con un comando y registra éxito, turnos, tokens y costo. Compara con la corrida
// anterior. Consume tokens de tu plan: úsalo con pocas tareas representativas.
// Uso:  node sdd-eval.js tareas.json [--repeticiones=1]
// tareas.json:
// { "proyecto": "C:/dev/mi-app", "preparar": "npm ci", "modelo": "sonnet",
//   "tareas": [ { "nombre": "fix-alerta", "pedido": "En /muestras al guardar no aparece la alerta. Corrígelo, directo.",
//                 "verificar": "npx vitest run src/app/muestras", "maxTurnos": 30 } ] }
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const reps = Number((args.find(a => a.startsWith('--repeticiones=')) || '=1').split('=')[1]) || 1;
if (!file) { console.error('Uso: node sdd-eval.js tareas.json [--repeticiones=N]'); process.exit(1); }
const spec = JSON.parse(fs.readFileSync(file, 'utf8'));
const project = path.resolve(path.dirname(file), spec.proyecto || '.');
const sh = (cmd, cwd, timeout = 30 * 60000, input) => spawnSync(cmd, { cwd, shell: true, encoding: 'utf8', timeout, input, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
const q = s => `"${String(s).replace(/"/g, '\\"')}"`;

function runTask(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-eval-'));
  const clone = sh(`git clone --quiet --local --no-hardlinks ${q(project)} ${q(dir)}`, os.tmpdir());
  if (clone.status !== 0) return { nombre: t.nombre, ok: false, error: `no se pudo copiar el proyecto: ${(clone.stderr || '').trim().slice(0, 200)}` };
  // Sin usuario que apruebe: GATE apagado y presupuesto del proyecto respetado (solo en la copia temporal).
  const cfgFile = path.join(dir, '.sdd', 'harness.json');
  let cfg = {}; try { cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8')); } catch { /* sin config */ }
  fs.mkdirSync(path.dirname(cfgFile), { recursive: true });
  fs.writeFileSync(cfgFile, JSON.stringify({ ...cfg, gate: 'nunca' }, null, 2));
  if (spec.preparar) { const p = sh(spec.preparar, dir); if (p.status !== 0) return { nombre: t.nombre, ok: false, error: 'falló "preparar"' }; }
  const started = Date.now();
  const flags = ['-p', '--output-format', 'json', '--permission-mode', 'acceptEdits', '--max-turns', String(t.maxTurnos || 40)];
  if (spec.modelo) flags.push('--model', spec.modelo);
  const env = { ...process.env }; if (!spec.usarApiKey) delete env.ANTHROPIC_API_KEY; // usa tu suscripción
  const r = spawnSync('claude', flags, { cwd: dir, input: t.pedido, encoding: 'utf8', timeout: (t.timeoutMin || 30) * 60000, shell: process.platform === 'win32', env, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  let out = {}; try { out = JSON.parse(r.stdout); } catch { /* salida no JSON */ }
  const v = t.verificar ? sh(t.verificar, dir) : { status: 0 };
  const u = out.usage || {};
  const res = {
    nombre: t.nombre, ok: v.status === 0 && !out.is_error, turnos: out.num_turns || null,
    tokens: (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.output_tokens || 0),
    salida: u.output_tokens || 0, costoUsd: out.total_cost_usd || null, segundos: Math.round((Date.now() - started) / 1000),
    error: r.status !== 0 && !r.stdout ? (r.stderr || 'la IA no respondió').trim().slice(0, 200) : undefined,
  };
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* temporal */ }
  return res;
}

const results = [];
for (let i = 0; i < reps; i++) for (const t of spec.tareas || []) { process.stdout.write(`• ${t.nombre}${reps > 1 ? ` (#${i + 1})` : ''}… `); const r = runTask(t); results.push(r); console.log(r.ok ? '✓' : `✗${r.error ? ` (${r.error})` : ''}`); }

const n = x => (x == null ? '—' : Math.round(x).toLocaleString('es-CL'));
const avg = (arr, k) => { const v = arr.map(x => x[k]).filter(x => typeof x === 'number'); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const summary = { fecha: new Date().toISOString(), exito: results.filter(r => r.ok).length / (results.length || 1), tokensPromedio: avg(results, 'tokens'), turnosPromedio: avg(results, 'turnos'), costoPromedio: avg(results, 'costoUsd'), resultados: results };
const histFile = file.replace(/\.json$/i, '') + '.resultados.json';
let hist = []; try { hist = JSON.parse(fs.readFileSync(histFile, 'utf8')); } catch { /* primera corrida */ }
const prev = hist[hist.length - 1];
console.log(`\nÉxito: ${Math.round(summary.exito * 100)}% · tokens promedio: ${n(summary.tokensPromedio)} · turnos promedio: ${n(summary.turnosPromedio)}${summary.costoPromedio != null ? ` · costo promedio: US$ ${summary.costoPromedio.toFixed(3)}` : ''}`);
if (prev) console.log(`Antes:  ${Math.round(prev.exito * 100)}% · tokens promedio: ${n(prev.tokensPromedio)} · turnos promedio: ${n(prev.turnosPromedio)} (${prev.fecha.slice(0, 10)})`);
fs.writeFileSync(histFile, JSON.stringify([...hist, summary], null, 2));
console.log(`Historial: ${histFile}`);
