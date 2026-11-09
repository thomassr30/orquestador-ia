'use strict';
// Contexto que el harness reinyecta al iniciar y tras compactar: su tamaño es visible y, si no se puede leer,
// el agente recibe qué hacer en vez de nada (antes reconstruía el contexto explorando el proyecto completo).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { project, tmp } = require('./helpers');
process.env.SDD_HOME = tmp('sdd-home-');
const core = require('../src/core');
const memory = require('../src/memory');

const E = (root, sid, event, extra = {}) => core.handle({ event, root, sessionId: sid, host: 'codex', nativeAsk: false, ...extra });
const mem = (dir, files) => { const d = path.join(dir, '.sdd', 'memoria'); fs.mkdirSync(d, { recursive: true }); for (const [f, c] of Object.entries(files)) fs.writeFileSync(path.join(d, f), c); };

test('el tamaño del contexto y el recorte son visibles (no se recorta en silencio)', () => {
  const chico = project({});
  mem(chico, { 'MEMORIA.md': '# Proyecto\nStack: NestJS\n', 'sesion.md': 'Objetivo: x\n' });
  const s = memory.contextStats(chico);
  assert.strictEqual(s.recortado, false);
  assert.ok(s.chars > 0 && s.chars < s.max);
  assert.deepStrictEqual(s.archivos.map(a => a.nombre).sort(), ['MEMORIA.md', 'sesion.md']);

  // Un sesion.md que creció sin parar: se avisa cuántas líneas quedan fuera
  const largo = project({});
  mem(largo, { 'MEMORIA.md': '# P\n', 'sesion.md': Array.from({ length: 200 }, (_, i) => `linea ${i}`).join('\n') });
  const l = memory.contextStats(largo);
  const ses = l.archivos.find(a => a.nombre === 'sesion.md');
  assert.strictEqual(ses.recortado, true);
  assert.strictEqual(ses.lineas, 200);
  assert.ok(ses.max < 200);
  assert.match(memory.contextBlock(largo, { source: 'compact' }), /líneas más en sesion\.md/);

  // Pasado el tope de caracteres, el texto lo dice y apunta a los archivos
  const enorme = project({});
  mem(enorme, { 'MEMORIA.md': Array.from({ length: 70 }, () => 'x'.repeat(200)).join('\n') });
  const e = memory.contextStats(enorme);
  assert.strictEqual(e.recortado, true);
  assert.ok(e.chars <= e.max + 300, `recortado al tope: ${e.chars}`);
  assert.match(memory.contextBlock(enorme, { source: 'compact' }), /memoria recortada en \d+ caracteres/);
});

test('si la memoria no se puede leer, el agente recibe qué hacer y no explora el proyecto completo', async () => {
  const d = project({});
  mem(d, { 'MEMORIA.md': '# P\n' });
  const real = memory.contextBlock;
  memory.contextBlock = () => { throw new Error('EIO al leer la memoria'); };
  try {
    const out = await E(d, 's', 'session', { source: 'startup' });
    assert.match(out.context, /No se pudo leer la memoria del proyecto \(EIO al leer la memoria\)/);
    assert.match(out.context, /Lee \.sdd\/memoria\/MEMORIA\.md y sesion\.md/);
    assert.match(out.context, /no reconstruyas el contexto explorando todo el proyecto/);
  } finally { memory.contextBlock = real; }
});
