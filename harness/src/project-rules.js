'use strict';
// Reglas propias del proyecto ("linters con mensaje de corrección", como describe OpenAI en harness engineering):
// cada error que no debe repetirse se convierte en una regla, y el mensaje le enseña a la IA cómo hacerlo bien.
// Se definen en harness.json → "reglas". Cada regla aplica a "archivos" (glob) salvo "excepto", y usa uno de:
//   prohibido      regex que no puede aparecer en el contenido nuevo         → se revisa ANTES de escribir
//   noImportar     módulos o rutas que esos archivos no pueden importar      → ANTES de escribir (arquitectura por capas)
//   nombreArchivo  regex que debe cumplir el nombre de un archivo nuevo      → al crearlo
//   maxLineas      tamaño máximo del archivo                                → después de editar (aviso)
//   soloLectura    true: esos archivos no se crean ni se modifican          → ANTES de escribir (p. ej. un kit copiado de una plantilla)
// Ejemplos:
//   { "nombre": "trusted-types", "archivos": "src/**/*.{ts,html}", "prohibido": "innerHTML|DOMParser", "mensaje": "…" }
//   { "nombre": "dominio-sin-infra", "archivos": "src/domain/**", "noImportar": ["src/infra/**", "axios", "@angular/common/http"],
//     "mensaje": "El dominio no depende de infraestructura: define un puerto en src/domain/ports y el adaptador en src/infra." }
const path = require('path');
const { relPosix, isInside } = require('./util');

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

const safeRe = (src, flags) => { try { return new RegExp(src, flags); } catch { return null; } };

function compile(rules) {
  return (Array.isArray(rules) ? rules : []).map(r => {
    if (!r || typeof r !== 'object') return null;
    const base = { nombre: r.nombre || 'regla', mensaje: r.mensaje || 'Regla del proyecto',
      files: [].concat(r.archivos || '**/*').map(globToRegex), except: [].concat(r.excepto || []).map(globToRegex) };
    if (r.prohibido) { const re = safeRe(r.prohibido, r.mayusculas ? '' : 'i'); return re ? { ...base, tipo: 'prohibido', re } : null; }
    if (r.noImportar) return { ...base, tipo: 'noImportar', imports: [].concat(r.noImportar).map(String).filter(Boolean) };
    if (r.nombreArchivo) { const re = safeRe(r.nombreArchivo, ''); return re ? { ...base, tipo: 'nombreArchivo', re } : null; }
    if (Number(r.maxLineas) > 0) return { ...base, tipo: 'maxLineas', max: Number(r.maxLineas) };
    if (r.soloLectura === true) return { ...base, tipo: 'soloLectura' };
    return null;
  }).filter(Boolean);
}

const applies = (r, rel) => r.files.some(re => re.test(rel)) && !r.except.some(re => re.test(rel));

// Importaciones en JS/TS, CSS/SCSS, Go, Python, Java/Kotlin, C#, Dart y Swift.
const IMPORT_RES = [
  /\bimport\s+(?:type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?['"]([^'"\n]+)['"]/g,
  /\bexport\s+(?:type\s+)?(?:\*|\{[^}]*\})\s*(?:as\s+\w+\s+)?from\s+['"]([^'"\n]+)['"]/g,
  /\brequire\(\s*['"]([^'"\n]+)['"]\s*\)/g,
  /\bimport\(\s*['"]([^'"\n]+)['"]\s*\)/g,
  /@(?:import|use|forward)\s+(?:url\()?['"]([^'"\n]+)['"]/g,
  /^[ \t]*import\s+(?:[\w.]+\s+)?"([^"\n]+)"/gm,
  /^[ \t]*from\s+([\w.]+)\s+import\b/gm,
  /^[ \t]*import\s+(?:static\s+)?([A-Za-z_][\w.]*?)(?:\.\*)?[ \t]*;?[ \t]*$/gm,
  /^[ \t]*using\s+(?:static\s+)?([A-Za-z_][\w.]*)[ \t]*;/gm,
];

/** Módulos importados en un texto (sin duplicados). */
function importsOf(text) {
  const s = String(text || '');
  const out = new Set();
  for (const re of IMPORT_RES) { re.lastIndex = 0; let m; while ((m = re.exec(s))) out.add(m[1]); }
  const go = /\bimport\s*\(([\s\S]*?)\)/g; let b;
  while ((b = go.exec(s))) { const q = /"([^"\n]+)"/g; let m; while ((m = q.exec(b[1]))) out.add(m[1]); }
  return [...out];
}

/** ¿El import (tal cual o resuelto a ruta del proyecto) cae en alguno de los patrones prohibidos? */
function forbiddenImport(spec, fileRel, patterns) {
  const candidates = [spec];
  if (spec.startsWith('.')) candidates.push(path.posix.normalize(path.posix.join(path.posix.dirname(fileRel), spec)));
  for (const p of patterns) {
    const pathLike = /[/*]/.test(p);
    const re = pathLike ? globToRegex(p) : null;
    for (const c of candidates) {
      if (c === p || c.startsWith(`${p}/`) || c.startsWith(`${p}.`)) return p;
      if (re && (re.test(c) || re.test(c.replace(/\.[a-z0-9]+$/i, '')))) return p;
    }
  }
  return null;
}

/**
 * Primera regla que viola el contenido nuevo de un archivo, o null.
 * @param {boolean} [creating] el archivo no existe todavía (para nombreArchivo)
 */
function violation(root, file, contents, rules, { creating = false } = {}) {
  const abs = path.resolve(root, file);
  if (!isInside(root, abs)) return null;
  const rel = relPosix(root, abs);
  for (const r of compile(rules)) {
    if (!applies(r, rel)) continue;
    if (r.tipo === 'soloLectura') return { regla: r.nombre, mensaje: r.mensaje, coincidencia: 'archivo de solo lectura', archivo: rel, tipo: r.tipo };
    if (r.tipo === 'nombreArchivo') {
      if (creating && !r.re.test(path.posix.basename(rel))) return { regla: r.nombre, mensaje: r.mensaje, coincidencia: path.posix.basename(rel), archivo: rel };
      continue;
    }
    for (const c of contents || []) {
      if (r.tipo === 'prohibido') {
        const m = r.re.exec(String(c || ''));
        if (m) return { regla: r.nombre, mensaje: r.mensaje, coincidencia: m[0].slice(0, 40), archivo: rel };
      } else if (r.tipo === 'noImportar') {
        for (const spec of importsOf(c)) {
          const p = forbiddenImport(spec, rel, r.imports);
          if (p) return { regla: r.nombre, mensaje: r.mensaje, coincidencia: `import ${spec}`.slice(0, 60), archivo: rel };
        }
      }
    }
  }
  return null;
}

/** Reglas de tamaño que el archivo (ya escrito) supera. */
function sizeViolations(root, file, text, rules) {
  const rel = relPosix(root, path.resolve(root, file));
  const lines = String(text || '').split(/\r?\n/).length;
  return compile(rules).filter(r => r.tipo === 'maxLineas' && applies(r, rel) && lines > r.max)
    .map(r => ({ regla: r.nombre, mensaje: r.mensaje, archivo: rel, lineas: lines, max: r.max }));
}

/** Todas las violaciones de un archivo completo (para revisar el proyecto entero). */
function scanFile(root, rel, text, rules) {
  const hits = [];
  const lines = String(text || '').split(/\r?\n/);
  for (const r of compile(rules)) {
    if (!applies(r, rel)) continue;
    if (r.tipo === 'prohibido') lines.forEach((l, i) => { if (r.re.test(l)) hits.push({ regla: r.nombre, linea: i + 1, texto: l.trim() }); });
    else if (r.tipo === 'noImportar') {
      for (const spec of importsOf(text)) {
        if (!forbiddenImport(spec, rel, r.imports)) continue;
        const i = lines.findIndex(l => l.includes(spec));
        hits.push({ regla: r.nombre, linea: i + 1, texto: (lines[i] || spec).trim() });
      }
    }
    else if (r.tipo === 'nombreArchivo') { if (!r.re.test(path.posix.basename(rel))) hits.push({ regla: r.nombre, linea: 0, texto: 'nombre de archivo' }); }
    else if (r.tipo === 'maxLineas' && lines.length > r.max) hits.push({ regla: r.nombre, linea: 0, texto: `${lines.length} líneas (máx. ${r.max})` });
  }
  return hits;
}

module.exports = { violation, sizeViolations, scanFile, compile, globToRegex, importsOf, forbiddenImport, applies };
