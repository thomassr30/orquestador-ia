#!/usr/bin/env node
// Ejecuta un comando de verificación (tests, lint, build) y devuelve su salida compactada.
// El harness envuelve con esto los comandos ruidosos de la IA: la IA recibe errores y resumen, no miles de líneas.
// La salida completa queda en un archivo temporal (se indica la ruta) por si se necesita el detalle.
// Uso (lo arma el hook): node sdd-salida.js <comando-en-base64>
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const SRC = path.join(__dirname, '..', 'harness', 'src');
const { compact } = require(path.join(SRC, 'output'));
const { OutputBuffer } = require(path.join(SRC, 'proc'));

let command = '';
try { command = Buffer.from(String(process.argv[2] || ''), 'base64').toString('utf8'); } catch { /* inválido */ }
if (!command.trim()) { console.error('sdd-salida: comando vacío o inválido'); process.exit(2); }

const dir = path.join(os.tmpdir(), 'sdd-salidas');
try { fs.mkdirSync(dir, { recursive: true }); } catch { /* sin permisos */ }
const logFile = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}.log`);
let log = null;
try { log = fs.createWriteStream(logFile); } catch { log = null; }

const buf = new OutputBuffer(4 * 1024 * 1024, 64 * 1024);
const child = spawn(command, { shell: true, stdio: ['inherit', 'pipe', 'pipe'], env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' }, windowsHide: true });
const onData = d => { buf.push(d); if (log) log.write(d); };
child.stdout.on('data', onData);
child.stderr.on('data', onData);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { try { child.kill(sig); } catch { /* terminó */ } });
child.on('error', e => { process.stdout.write(`No se pudo ejecutar: ${e.message}\n`); process.exitCode = 127; });
child.on('close', code => {
  const exit = code === null ? 1 : code;
  const done = () => {
    const r = compact(buf.text(), exit, { max: Number(process.argv[3]) || 4000 });
    if (r.compacted) process.stdout.write(`[harness] Salida compactada (${r.from} → ${r.to} líneas). Completa en: ${logFile.replace(/\\/g, '/')}\n`);
    process.stdout.write(`${r.text}\n`);
    if (!r.compacted && log) { try { fs.unlinkSync(logFile); } catch { /* temporal */ } }
    process.exitCode = exit;
  };
  if (log) log.end(done); else done();
});
