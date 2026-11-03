'use strict';
// Contrato de cada adaptador con payloads SIMULADOS (fixtures/adaptadores/<cliente>/*.json):
// payload nativo → evento normalizado esperado → salida esperada en el formato del cliente.
// No prueba el cliente real: eso solo lo confirma doctor con eventos reales observados (observado.json).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { tmp, project, REPO } = require('./helpers');

process.env.SDD_HOME = tmp('sdd-home-');
const A = require('../src/adapters');

const DIR = path.join(__dirname, 'fixtures', 'adaptadores');
const fixtures = cliente => fs.readdirSync(path.join(DIR, cliente)).filter(f => f.endsWith('.json')).sort()
  .map(f => ({ f, x: JSON.parse(fs.readFileSync(path.join(DIR, cliente, f), 'utf8')) }));

/** Coincidencia parcial: solo se comparan las claves presentes en lo esperado. */
function parcial(real, esperado, ruta) {
  if (esperado === null || typeof esperado !== 'object' || Array.isArray(esperado)) { assert.deepStrictEqual(real, esperado, ruta); return; }
  assert.ok(real && typeof real === 'object', `${ruta}: se esperaba un objeto`);
  for (const [k, v] of Object.entries(esperado)) parcial(real[k], v, `${ruta}.${k}`);
}

for (const cliente of ['claude', 'codex', 'gemini', 'cursor', 'copilot']) {
  for (const { f, x } of fixtures(cliente)) {
    test(`contrato con payload simulado (no prueba el cliente real): ${cliente}/${f}`, () => {
      const ev = A[cliente].parse(x.eventoNativo, x.entrada, x.entorno || {});
      if (x.normalizado === null) { assert.strictEqual(ev, null, 'el adaptador debe ignorar este evento'); return; }
      parcial(ev, x.normalizado, 'normalizado');
      const out = A[cliente].format(x.eventoNativo, x.resultado || {}, ev) || {};
      assert.deepStrictEqual(out.stdout ? JSON.parse(out.stdout) : null, x.salida.stdout, 'stdout');
      assert.strictEqual(out.code || 0, x.salida.code || 0, 'código de salida');
      if (x.salida.stderr !== undefined) assert.strictEqual(out.stderr, x.salida.stderr, 'stderr');
    });
  }
}

test('contrato con payload simulado (no prueba el cliente real): cada cliente cubre bloqueo previo y fin de turno', () => {
  for (const cliente of ['claude', 'codex', 'gemini', 'cursor', 'copilot']) {
    const eventos = fixtures(cliente).filter(({ x }) => x.normalizado).map(({ x }) => A[cliente].EVENTS[x.eventoNativo]);
    assert.ok(eventos.includes('pre') && eventos.includes('stop'), `${cliente}: faltan fixtures de pre o stop`);
  }
});

// OpenCode: el plugin se carga como lo haría OpenCode (ESM) con un cliente simulado y el núcleo real.
let plugin = null;
async function cargarOpenCode() {
  if (plugin) return plugin;
  const dir = project({ 'src/a.js': '', '.sdd/memoria/MEMORIA.md': '# Memoria\n- Proyecto de prueba del contrato.\n' });
  const tpl = fs.readFileSync(path.join(REPO, 'harness', 'opencode', 'sdd-harness.js'), 'utf8').split('{{SDD_HOME}}').join(REPO.replace(/\\/g, '/'));
  const file = path.join(tmp('sdd-oc-'), 'sdd-harness.mjs');
  fs.writeFileSync(file, tpl);
  const { SddHarness } = await import(pathToFileURL(file).href);
  const client = { session: { messages: async () => ({ data: [] }), prompt: async () => {} } };
  plugin = await SddHarness({ client, directory: dir, worktree: dir });
  return plugin;
}

for (const { f, x } of fixtures('opencode')) {
  test(`contrato con payload simulado (no prueba el cliente real): opencode/${f}`, async () => {
    const h = await cargarOpenCode();
    const output = JSON.parse(JSON.stringify(x.output));
    const run = () => h[x.hook](x.input, output);
    if (x.esperado.rechaza) { await assert.rejects(run(), new RegExp(x.esperado.rechaza)); return; }
    await run();
    if (x.esperado.salida) assert.deepStrictEqual(output, x.esperado.salida);
    if (x.esperado.contexto) assert.match(String(output.context[0] || ''), new RegExp(x.esperado.contexto));
  });
}
