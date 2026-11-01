'use strict';
// Compactación de salidas largas de comandos (tests, lint, build): lo que más contexto consume en una tarea.
// Se queda con lo que el modelo necesita (errores con su contexto, resumen final) y deja la salida completa
// en un archivo temporal que se puede consultar si hace falta ("compresión restaurable").
const { cleanOutput } = require('./proc');
const { truncateMiddle } = require('./util');

// Comandos de verificación cuya salida suele ser larga y repetitiva.
const NOISY = /^(npm|pnpm|yarn|bun)\s+(test|t|run\s+(test|lint|build|typecheck|type-check|check|e2e)[\w:-]*|lint|build)(\s|$)|^npx\s+(vitest|jest|eslint|tsc|ng|playwright\s+test|stylelint|prettier)(\s|$)|^ng\s+(test|build|lint)(\s|$)|^go\s+(test|build|vet)(\s|$)|^golangci-lint\s|^(\.\/)?gradlew(\.bat)?\s|^mvn\s|^dotnet\s+(test|build)(\s|$)|^cargo\s+(test|build|clippy)(\s|$)|^pytest(\s|$)|^node\s+--test(\s|$)/i;
// Solo comandos simples (sin tuberías, redirecciones, variables ni sustituciones): se pueden envolver con seguridad.
const SIMPLE = /^[\w@./:=+,"' -]+$/;

function isCompactable(command, { win = process.platform === 'win32' } = {}) {
  const c = String(command || '').trim();
  if (!c || c.length > 500 || !SIMPLE.test(c) || !NOISY.test(c)) return false;
  if (win && /^\.\//.test(c)) return false; // cmd.exe no entiende ./gradlew
  return true;
}

const ERR = /(error|fail|failed|failing|✗|×|✖|exception|panic|cannot|not found|expected|assert|TS\d{4}|ERR!|\bat .+:\d+|:\d+:\d+)/i;
const WARN = /\bwarn(ing)?\b/i;

/**
 * Compacta una salida. Devuelve {text, compacted, from, to}.
 * @param {string} raw salida combinada
 * @param {number} code código de salida
 */
function compact(raw, code, { max = 4000 } = {}) {
  const clean = cleanOutput(raw).trimEnd();
  const lines = clean.split('\n');
  if (clean.length <= max) return { text: clean, compacted: false, from: lines.length, to: lines.length };
  const keep = new Set();
  const add = (a, b) => { for (let k = Math.max(0, a); k <= Math.min(lines.length - 1, b); k++) keep.add(k); };
  add(0, 4);
  add(lines.length - 25, lines.length - 1);
  if (code !== 0) lines.forEach((l, i) => { if (ERR.test(l)) add(i - 2, i + 3); });
  else { let w = 0; lines.forEach((l, i) => { if (w < 20 && WARN.test(l)) { add(i, i); w++; } }); }
  const out = [];
  let last = -1;
  for (const i of [...keep].sort((a, b) => a - b)) {
    if (i > last + 1) out.push(`… [${i - last - 1} líneas omitidas] …`);
    out.push(lines[i]);
    last = i;
  }
  if (last < lines.length - 1) out.push(`… [${lines.length - 1 - last} líneas omitidas] …`);
  const text = truncateMiddle(out.join('\n'), code !== 0 ? max * 3 : max);
  return { text, compacted: true, from: lines.length, to: text.split('\n').length };
}

module.exports = { isCompactable, compact, NOISY };
