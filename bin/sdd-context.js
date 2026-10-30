#!/usr/bin/env node
// Inyecta la memoria SDD del PROYECTO ACTUAL en el contexto (hook SessionStart de Claude Code:
// al iniciar, reanudar, limpiar o después de compactar). Aislado por proyecto: solo lee la
// memoria del repositorio actual (y la del workspace multi-repo SOLO si ese workspace lista
// este repositorio). Si no hay memoria, no imprime nada.
// Uso manual: node sdd-context.js [ruta-del-proyecto]
'use strict';
const fs = require('fs');
const path = require('path');

const MAX_CHARS = 9000;          // límite del hook: 10.000 caracteres
const MAX_LINES = { 'MEMORIA.md': 80, 'sesion.md': 60 };

let source = '';
try { const input = fs.readFileSync(0, 'utf8'); if (input.trim()) source = (JSON.parse(input).source || ''); } catch { /* sin stdin */ }

const start = path.resolve(process.argv[2] || process.env.CLAUDE_PROJECT_DIR || process.cwd());

// Raíz del proyecto: el directorio con .git más cercano (sin salir de él). Si no hay git, el de inicio.
function projectRoot(dir) {
  let d = dir;
  while (true) {
    if (fs.existsSync(path.join(d, '.git'))) return d;
    const up = path.dirname(d);
    if (up === d) return dir;
    d = up;
  }
}
const root = projectRoot(start);

function readCapped(file, maxLines) {
  if (!fs.existsSync(file)) return null;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const out = lines.slice(0, maxLines).join('\n').trim();
  return lines.length > maxLines ? `${out}\n[… ${lines.length - maxLines} líneas más en ${path.basename(file)}]` : out;
}
function memoryBlock(dir, label) {
  const mem = path.join(dir, '.sdd', 'memoria');
  if (!fs.existsSync(mem)) return '';
  const parts = [];
  const idx = readCapped(path.join(mem, 'MEMORIA.md'), MAX_LINES['MEMORIA.md']);
  if (idx) parts.push(idx);
  const ses = readCapped(path.join(mem, 'sesion.md'), MAX_LINES['sesion.md']);
  if (ses) {
    const days = Math.round((Date.now() - fs.statSync(path.join(mem, 'sesion.md')).mtimeMs) / 86400000);
    parts.push(`## Sesión de trabajo (actualizada hace ${days} día(s)${days > 14 ? ' — verificar si sigue vigente' : ''})\n${ses}`);
  }
  const tdir = path.join(mem, 'temas');
  if (fs.existsSync(tdir)) {
    const temas = fs.readdirSync(tdir).filter(f => f.endsWith('.md'));
    if (temas.length) parts.push(`Temas disponibles (leer solo si aplican): ${temas.map(t => `.sdd/memoria/temas/${t}`).join(', ')}`);
  }
  return parts.length ? `### ${label}\n${parts.join('\n\n')}` : '';
}

// Workspace multi-repo: solo si un .sdd/workspace.json de un directorio padre incluye ESTE repo.
function workspaceBlock() {
  let d = path.dirname(root);
  while (true) {
    const ws = path.join(d, '.sdd', 'workspace.json');
    if (fs.existsSync(ws)) {
      try {
        const w = JSON.parse(fs.readFileSync(ws, 'utf8'));
        const included = (w.repos || []).some(r => path.resolve(d, r.ruta) === root);
        if (included) return memoryBlock(d, `Memoria del workspace "${w.nombre || path.basename(d)}" (transversal a sus repos)`);
      } catch { /* workspace inválido */ }
      return '';
    }
    const up = path.dirname(d);
    if (up === d) return '';
    d = up;
  }
}

const own = memoryBlock(root, `Memoria del proyecto ${path.basename(root)}`);
const ws = workspaceBlock();
if (!own && !ws) process.exit(0);

const header = [
  `## Contexto SDD del proyecto: ${root.replace(/\\/g, '/')}`,
  source === 'compact' ? 'La conversación se acaba de compactar: retoma el trabajo desde aquí (objetivo, plan aprobado, estado y próximos pasos de la sesión).' : 'Memoria cargada automáticamente al iniciar.',
  'Esta memoria pertenece SOLO a este proyecto. No la apliques a otros proyectos ni mezcles información entre proyectos. Si el código la contradice, manda el código y corrige la memoria.',
].join('\n');
let out = [header, own, ws].filter(Boolean).join('\n\n');
if (out.length > MAX_CHARS) out = out.slice(0, MAX_CHARS) + '\n[… memoria recortada; leer .sdd/memoria/MEMORIA.md y sesion.md si se necesita más]';
process.stdout.write(out + '\n');
