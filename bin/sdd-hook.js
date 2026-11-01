#!/usr/bin/env node
// Punto de entrada de los hooks del harness para todas las herramientas.
// Uso (lo registra install.js):  node sdd-hook.js <herramienta> <evento-nativo>
//   herramienta: claude | codex | gemini | cursor | copilot
// Lee el JSON del hook por stdin y responde en el formato de cada herramienta.
// Sin red, sin claves y sin dependencias. Ante un error interno no bloquea nada (falla abierta).
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'harness', 'src');
const [host, native] = process.argv.slice(2);

function readInput() {
  try {
    if (process.stdin.isTTY) return {};
    const raw = fs.readFileSync(0, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch { return {}; }
}

(async () => {
  let out = {};
  try {
    const adapter = require(path.join(SRC, 'adapters'))[host];
    if (adapter) {
      const ev = adapter.parse(native, readInput(), process.env);
      if (ev) out = adapter.format(native, (await require(path.join(SRC, 'core')).handle(ev)) || {}, ev) || {};
    }
  } catch { out = {}; }
  if (out.stderr) process.stderr.write(out.stderr);
  if (out.stdout) process.stdout.write(out.stdout);
  process.exitCode = out.code || 0;
})();
