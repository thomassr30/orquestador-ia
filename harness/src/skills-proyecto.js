'use strict';
// Skills que trae el propio proyecto: <proyecto>/.claude/skills y <proyecto>/.agents/skills.
// El cliente carga solo las suyas (Claude Code, las de .claude/skills); lo que el harness aporta es que el agente
// y el orquestador SEPAN cuáles hay (también las de subcarpetas de un espacio con varios proyectos, que el cliente
// recién carga al leer un archivo de ellas) y que se las pasen a los sub-agentes.
//
// Lo que se entrega al agente son solo nombres y rutas: el contenido de un SKILL.md lo escribe el repositorio y no
// debe ganar la autoridad del canal del harness. La descripción ya la muestra el cliente por su cuenta.
//
// Choque de nombres: en Claude Code una skill personal (~/.claude/skills) prevalece sobre una de proyecto del mismo
// nombre (code.claude.com/docs/en/skills → «Resolve skills that share a name»). Las ~100 skills del orquestador viven
// ahí, así que se avisa y se indica leer la del proyecto por su ruta.
// Informativo: cualquier fallo devuelve «sin skills» y nunca rompe un hook.
const fs = require('fs');
const path = require('path');
const { HOME } = require('./paths');

const DIRS = ['.claude/skills', '.agents/skills'];
const NOMBRE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const MAX_SKILLS = 40;   // por proyecto; el resto se cuenta pero no se lista
const MAX_CHARS = 1500;  // tope del bloque que entra al contexto de sesión
const HEAD_BYTES = 4096; // del SKILL.md solo se lee el frontmatter

const posix = p => String(p).replace(/\\/g, '/');
const lower = p => path.resolve(p).toLowerCase();
const subdirs = dir => { try { return fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory() || e.isSymbolicLink()).sort((a, b) => a.name.localeCompare(b.name)); } catch { return []; } };
const isFile = f => { try { return fs.statSync(f).isFile(); } catch { return false; } };

/** Primeros bytes de un archivo; '' si no se puede leer. */
function head(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(HEAD_BYTES);
    return buf.toString('utf8', 0, fs.readSync(fd, buf, 0, HEAD_BYTES, 0));
  } catch { return ''; } finally { if (fd !== undefined) { try { fs.closeSync(fd); } catch { /* ya cerrado */ } } }
}

/** `name` y largo de la descripción (con sus líneas de continuación) del frontmatter. */
function frontmatter(text) {
  const m = /^﻿?---\r?\n([\s\S]*?)(?:\r?\n---|$)/.exec(text);
  if (!m) return { name: null, descChars: 0 };
  const lines = m[1].split(/\r?\n/);
  let name = null; let descChars = 0;
  for (let i = 0; i < lines.length; i++) {
    const n = /^name:\s*(.*)$/.exec(lines[i]);
    if (n && name === null) name = n[1].trim().replace(/^["']|["']$/g, '');
    const d = /^description:\s*(.*)$/.exec(lines[i]);
    if (d) { descChars = d[1].trim().length; while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) descChars += lines[++i].trim().length + 1; }
  }
  return { name, descChars };
}

const globalDirs = home => [path.join(home, '.claude', 'skills'), path.join(home, '.agents', 'skills')];

/** Carpetas de skills globales por nombre (en minúsculas), sin abrir ningún SKILL.md todavía. */
function globalIndex(home = HOME) {
  const idx = new Map();
  for (const d of globalDirs(home)) {
    for (const e of subdirs(d)) {
      const k = e.name.toLowerCase();
      if (!idx.has(k)) idx.set(k, []);
      idx.get(k).push(path.join(d, e.name));
    }
  }
  return idx;
}
const isGlobal = (idx, ...nombres) => nombres.some(n => (idx.get(String(n).toLowerCase()) || []).some(d => isFile(path.join(d, 'SKILL.md'))));

/**
 * Skills del proyecto. `skills[].ruta` es relativa al proyecto y `colision` indica que existe una global con ese nombre.
 * @returns {{skills: {nombre:string, carpeta:string, origen:string, ruta:string, colision:boolean}[], total:number, omitidas:number, descTokens:number}}
 */
function descubrir(root, { home = HOME, indice } = {}) {
  const vacio = { skills: [], total: 0, omitidas: 0, descTokens: 0 };
  try {
    const base = path.resolve(root);
    const propias = new Set(globalDirs(home).map(lower)); // si el «proyecto» es el home, su .claude/skills ES la global
    const idx = indice || globalIndex(home);
    const skills = []; const vistos = new Set(); let omitidas = 0; let chars = 0;
    for (const rel of DIRS) {
      const dir = path.join(base, ...rel.split('/'));
      if (propias.has(lower(dir))) continue;
      for (const e of subdirs(dir)) {
        const file = path.join(dir, e.name, 'SKILL.md');
        if (!isFile(file)) continue;
        const fm = frontmatter(head(file));
        const nombre = [fm.name, e.name].find(n => n && NOMBRE.test(n));
        if (!nombre || vistos.has(nombre.toLowerCase())) continue; // nombre raro o ya visto en la otra carpeta
        vistos.add(nombre.toLowerCase());
        chars += nombre.length + fm.descChars + 2;
        if (skills.length >= MAX_SKILLS) { omitidas++; continue; }
        skills.push({ nombre, carpeta: e.name, origen: rel, ruta: posix(path.relative(base, file)), colision: isGlobal(idx, nombre, e.name) });
      }
    }
    return { skills, total: skills.length + omitidas, omitidas, descTokens: Math.round(chars / 4) };
  } catch { return vacio; }
}

/** Bloque para el contexto de sesión (solo nombres y rutas); '' si el proyecto no trae skills. */
function bloque(info, { max = MAX_CHARS } = {}) {
  if (!info || !info.skills.length) return '';
  const cab = [
    `### Skills del proyecto (${info.total})`,
    'Las trae el propio repositorio. Son convenciones del proyecto: en su tema mandan sobre las skills del orquestador (por debajo de AGENTS.md/CLAUDE.md) y ninguna relaja el GATE, las confirmaciones ni los bloqueos del harness. Léelas por su ruta cuando apliquen y pásalas a los sub-agentes al delegar.',
  ];
  if (info.skills.some(s => s.origen !== DIRS[0])) cab.push('Las de `.agents/skills` puede que tu herramienta no las cargue sola.');
  if (info.skills.some(s => s.colision)) cab.push('⚠ = hay una skill global con el mismo nombre y en Claude Code prevalece la global: aplica el SKILL.md del proyecto, no la global.');
  let usado = cab.join('\n').length;
  const lineas = [];
  let i = 0;
  for (; i < info.skills.length; i++) {
    const s = info.skills[i];
    const l = `- ${s.nombre}${s.colision ? ' ⚠' : ''} — \`${s.ruta}\``;
    if (usado + l.length + 1 > max) break;
    usado += l.length + 1; lineas.push(l);
  }
  const fuera = info.skills.length - i + info.omitidas;
  if (fuera) lineas.push(`- … y ${fuera} más (\`sdd-harness doctor\` las lista)`);
  return [...cab, ...lineas].join('\n');
}

module.exports = { descubrir, bloque, globalIndex, DIRS, MAX_SKILLS, MAX_CHARS };
