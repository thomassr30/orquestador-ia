#!/usr/bin/env node
// Imprime la memoria SDD del PROYECTO ACTUAL (la misma que el harness inyecta al iniciar o tras compactar).
// Aislada por proyecto. Si no hay memoria, no imprime nada.
// Uso manual: node sdd-context.js [ruta-del-proyecto]
'use strict';
const path = require('path');
const { contextBlock } = require(path.join(__dirname, '..', 'harness', 'src', 'memory'));
const { findProjectRoot } = require(path.join(__dirname, '..', 'harness', 'src', 'util'));

// «source» opcional por stdin, leído como stream (fs.readFileSync(0) fallaba con EAGAIN en Linux/macOS si la entrada
// llegaba tarde). En uso manual con un stdin abierto que nadie cierra, a los 1 s sigue sin él.
function readSource() {
  return new Promise(resolve => {
    if (process.stdin.isTTY) { resolve(''); return; }
    let raw = '';
    const done = () => {
      clearTimeout(timer);
      process.stdin.destroy();
      try { resolve(raw.trim() ? JSON.parse(raw).source || '' : ''); } catch { resolve(''); }
    };
    const timer = setTimeout(done, 1000);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', c => { raw += c; });
    process.stdin.on('end', done);
    process.stdin.on('error', done);
  });
}

readSource().then(source => {
  const root = findProjectRoot(process.argv[2] || process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const out = contextBlock(root, { source });
  if (out) process.stdout.write(`${out}\n`);
});
