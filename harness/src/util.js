'use strict';
// Utilidades compartidas del harness. Sin dependencias externas: debe correr en cualquier equipo
// que tenga Node.js (los hooks se ejecutan en cada acción del agente).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const IS_WIN = process.platform === 'win32';

/** Recorta texto largo conservando inicio y final (donde suelen estar el comando y el error). */
function truncateMiddle(text, max = 30000) {
  const s = String(text ?? '');
  if (s.length <= max) return s;
  const head = Math.floor(max * 0.6);
  const tail = max - head;
  return `${s.slice(0, head)}\n[… ${s.length - max} caracteres omitidos …]\n${s.slice(-tail)}`;
}

/** Raíz del proyecto: el directorio con .git más cercano; si no hay git, el directorio de inicio. */
function findProjectRoot(start) {
  let d = path.resolve(start);
  const first = d;
  while (true) {
    if (fs.existsSync(path.join(d, '.git'))) return d;
    const up = path.dirname(d);
    if (up === d) return first;
    d = up;
  }
}

/** ¿`target` está dentro de `root` (o es root)? Insensible a mayúsculas en Windows. */
function isInside(root, target) {
  const norm = p => {
    const r = path.resolve(p);
    return IS_WIN ? r.toLowerCase() : r;
  };
  const rel = path.relative(norm(root), norm(target));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/** Ruta relativa con separadores "/" (legible y estable entre sistemas). */
function relPosix(root, target) {
  return path.relative(root, target).split(path.sep).join('/') || '.';
}

function shortHash(s) {
  return crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 10);
}

module.exports = { IS_WIN, truncateMiddle, findProjectRoot, isInside, relPosix, shortHash };
