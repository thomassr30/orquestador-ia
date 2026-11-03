#!/usr/bin/env node
// Punto de entrada de los hooks del harness para todas las herramientas.
// Uso (lo registra install.js):  node sdd-hook.js <herramienta> <evento-nativo>
//   herramienta: claude | codex | gemini | cursor | copilot
// Lee el JSON del hook por stdin y responde en el formato de cada herramienta.
// Sin red, sin claves y sin dependencias. Ante un error interno antes de una acción, lo crítico no pasa sin
// confirmación (falla cerrada, como core.failSafe); lo demás sigue y el error queda en ultimo-error.json para doctor.
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

// Evento real recibido del cliente (sin contenido; las pruebas de doctor con SDD_DOCTOR=1 no cuentan).
function observe(adapter) {
  try { if (Object.prototype.hasOwnProperty.call(adapter.EVENTS || {}, native)) require(path.join(SRC, 'observado')).record(host, native); } catch { /* nunca rompe el hook */ }
}
function lastError(e) {
  try { require(path.join(SRC, 'observado')).recordError(host, native, e); } catch { /* nunca rompe el hook */ }
}

/**
 * Error antes de que el núcleo decida sobre una acción (en el adaptador o al cargar módulos): se arma lo mínimo desde
 * el payload crudo y se aplica la misma falla cerrada para lo crítico que en el núcleo. Si tampoco se puede, sigue.
 */
function failClosed(adapter, input, e) {
  try {
    if (!adapter || !adapter.EVENTS || adapter.EVENTS[native] !== 'pre') return null;
    const common = require(path.join(SRC, 'adapters', 'common'));
    const cwd = [input.cwd, process.env.CLAUDE_PROJECT_DIR, process.env.GEMINI_PROJECT_DIR].find(x => typeof x === 'string' && x);
    const ev = {
      event: 'pre', host, root: common.resolveRoot(cwd), sessionId: String(common.first(input.session_id, input.sessionId, input.conversation_id) || 'default'),
      nativeAsk: !!(adapter.capacidades && adapter.capacidades.aprobacion === 'nativa'),
      tool: common.normalizeTool(common.first(input.tool_name, input.toolName, input.tool), common.first(input.tool_input, input.toolArgs, input.tool_args) || {}),
    };
    const d = require(path.join(SRC, 'core')).failSafe(ev, e);
    return d ? adapter.format(native, d, ev) : null;
  } catch { return null; }
}

(async () => {
  let out = {};
  let adapter = null;
  let input = {};
  try {
    adapter = require(path.join(SRC, 'adapters'))[host];
    if (adapter) {
      observe(adapter);
      input = readInput();
      const ev = adapter.parse(native, input, process.env);
      if (ev) out = adapter.format(native, (await require(path.join(SRC, 'core')).handle(ev)) || {}, ev) || {};
    }
  } catch (e) { lastError(e); out = failClosed(adapter, input, e) || {}; }
  if (out.stderr) process.stderr.write(out.stderr);
  if (out.stdout) process.stdout.write(out.stdout);
  process.exitCode = out.code || 0;
})();
