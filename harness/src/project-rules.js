'use strict';
// Reglas propias del proyecto ("linters con mensaje de corrección", como describe OpenAI en harness engineering):
// cada error que no debe repetirse se convierte en una regla. El harness la revisa ANTES de escribir, solo sobre
// el contenido nuevo, y le dice a la IA cómo hacerlo bien. Se definen en harness.json → "reglas".
//   { "nombre": "trusted-types", "archivos": "src/**/*.{ts,html}", "prohibido": "innerHTML|DOMParser",
//     "mensaje": "Trusted Types lo bloquea: usa el componente de íconos propio.", "excepto": "**/*.spec.ts" }
const { relPosix, isInside } = require('./util');
const path = require('path');

function globToRegex(glob) {
  const conv = g => {
    let re = '';
    for (let i = 0; i < g.length; i++) {
      const ch = g[i];
      if (ch === '*') {
        if (g[i + 1] === '*') { if (g[i + 2] === '/') { re += '(?:.*/)?'; i += 2; } else { re += '.*'; i += 1; } } else re += '[^/]*';
      } else if (ch === '?') re += '[^/]';
      else if (ch === '{') { const end = g.indexOf('}', i); if (end > i) { re += `(?:${g.slice(i + 1, end).split(',').map(conv).join('|')})`; i = end; } else re += '\\{'; }
      else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
    return re;
  };
  const g = String(glob).replace(/\\/g, '/').replace(/^\.\//, '');
  return new RegExp(`^${g.includes('/') ? '' : '(?:.*/)?'}${conv(g)}$`, 'i');
}

function compile(rules) {
  return (Array.isArray(rules) ? rules : []).filter(r => r && r.prohibido).map(r => {
    try {
      return { nombre: r.nombre || 'regla', mensaje: r.mensaje || 'Regla del proyecto', re: new RegExp(r.prohibido, r.mayusculas ? '' : 'i'),
        files: [].concat(r.archivos || '**/*').map(globToRegex), except: [].concat(r.excepto || []).map(globToRegex) };
    } catch { return null; }
  }).filter(Boolean);
}

/** Primera regla que viola el contenido nuevo de un archivo, o null. */
function violation(root, file, contents, rules) {
  const abs = path.resolve(root, file);
  if (!isInside(root, abs)) return null;
  const rel = relPosix(root, abs);
  for (const r of compile(rules)) {
    if (!r.files.some(re => re.test(rel)) || r.except.some(re => re.test(rel))) continue;
    for (const c of contents || []) {
      const m = r.re.exec(String(c || ''));
      if (m) return { regla: r.nombre, mensaje: r.mensaje, coincidencia: m[0].slice(0, 40), archivo: rel };
    }
  }
  return null;
}

module.exports = { violation, compile, globToRegex };
