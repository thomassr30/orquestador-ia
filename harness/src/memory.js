'use strict';
// Memoria del proyecto (.sdd/memoria/): bloque de contexto para inyectar al iniciar o tras compactar,
// y checkpoint determinista de la sesión (bloque automático en sesion.md) para retomar sin pérdida.
// Aislada por proyecto: solo se lee la memoria del repositorio actual (y la del workspace multi-repo
// únicamente si ese workspace lista este repositorio).
const fs = require('fs');
const path = require('path');
const { fwd } = require('./paths');

const MAX_CHARS = 9000; // los hooks de contexto admiten ~10.000 caracteres
const MAX_LINES = { 'MEMORIA.md': 80, 'sesion.md': 60 };
const AUTO_START = '<!-- harness:inicio (bloque automático del harness; no editar) -->';
const AUTO_END = '<!-- harness:fin -->';

function readCapped(file, maxLines) {
  try {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    const out = lines.slice(0, maxLines).join('\n').trim();
    return lines.length > maxLines ? `${out}\n[… ${lines.length - maxLines} líneas más en ${path.basename(file)}]` : out;
  } catch { return null; }
}

function memoryBlock(dir, label) {
  const mem = path.join(dir, '.sdd', 'memoria');
  if (!fs.existsSync(mem)) return '';
  const parts = [];
  const idx = readCapped(path.join(mem, 'MEMORIA.md'), MAX_LINES['MEMORIA.md']);
  if (idx) parts.push(idx);
  const sesFile = path.join(mem, 'sesion.md');
  const ses = readCapped(sesFile, MAX_LINES['sesion.md']);
  if (ses) {
    const days = Math.round((Date.now() - fs.statSync(sesFile).mtimeMs) / 86400000);
    parts.push(`## Sesión de trabajo (actualizada hace ${days} día(s)${days > 14 ? ' — verificar si sigue vigente' : ''})\n${ses}`);
  }
  const tdir = path.join(mem, 'temas');
  if (fs.existsSync(tdir)) {
    const temas = fs.readdirSync(tdir).filter(f => f.endsWith('.md'));
    if (temas.length) parts.push(`Temas disponibles (leer solo si aplican): ${temas.map(t => `.sdd/memoria/temas/${t}`).join(', ')}`);
  }
  return parts.length ? `### ${label}\n${parts.join('\n\n')}` : '';
}

function workspaceBlock(root) {
  let d = path.dirname(root);
  while (true) {
    const ws = path.join(d, '.sdd', 'workspace.json');
    if (fs.existsSync(ws)) {
      try {
        const w = JSON.parse(fs.readFileSync(ws, 'utf8'));
        const included = (w.repos || []).some(r => path.resolve(d, r.ruta) === path.resolve(root));
        if (included) return memoryBlock(d, `Memoria del workspace "${w.nombre || path.basename(d)}" (transversal a sus repos)`);
      } catch { /* workspace inválido */ }
      return '';
    }
    const up = path.dirname(d);
    if (up === d) return '';
    d = up;
  }
}

/** Contexto de memoria del proyecto (o '' si no hay memoria). */
function contextBlock(root, { source } = {}) {
  const own = memoryBlock(root, `Memoria del proyecto ${path.basename(root)}`);
  const ws = workspaceBlock(root);
  if (!own && !ws) return '';
  const header = [
    `## Contexto SDD del proyecto: ${fwd(root)}`,
    source === 'compact' ? 'La conversación se acaba de compactar: retoma el trabajo desde aquí (objetivo, plan aprobado, estado y próximos pasos de la sesión).' : 'Memoria cargada automáticamente al iniciar.',
    'Esta memoria pertenece SOLO a este proyecto. No la apliques a otros proyectos ni mezcles información entre proyectos. Si el código la contradice, manda el código y corrige la memoria.',
  ].join('\n');
  let out = [header, own, ws].filter(Boolean).join('\n\n');
  if (out.length > MAX_CHARS) out = `${out.slice(0, MAX_CHARS)}\n[… memoria recortada; leer .sdd/memoria/MEMORIA.md y sesion.md si se necesita más]`;
  return out;
}

const GATE_LABEL = { inicial: 'sin cambio en curso', requerido: 'pedido de cambio, plan sin presentar', pendiente: 'plan presentado, esperando aprobación', aprobado: 'aprobado', libre: 'directo (sin plan)' };

/** Escribe el bloque automático de sesion.md (crea la memoria mínima si no existe). */
function checkpoint(root, state, host) {
  const mem = path.join(root, '.sdd', 'memoria');
  const file = path.join(mem, 'sesion.md');
  const files = state.cambios.filter(f => !f.startsWith('.sdd/'));
  const shown = files.slice(-15);
  const sens = state.sensores
    ? state.sensores.resumen.map(r => `${r.omitido ? '•' : r.ok ? '✓' : '✗'} ${r.nombre}`).join(' · ') + (state.sensores.ok ? '' : ' (con errores)')
    : 'sin ejecutar';
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const block = [
    AUTO_START,
    `Última actividad: ${stamp} (${host || 'agente'}) · Plan: ${GATE_LABEL[state.gate.estado] || state.gate.estado}`,
    ...(state.objetivo ? [`Pedido en curso: ${state.objetivo}`] : []),
    `Archivos modificados en la sesión: ${shown.length ? shown.join(', ') : '—'}${files.length > shown.length ? ` (+${files.length - shown.length} más)` : ''}`,
    `Sensores: ${sens}`,
    AUTO_END,
  ].join('\n');
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { text = null; }
  if (text === null) text = `Proyecto: ${fwd(root)}\n`;
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const re = new RegExp(`${AUTO_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${AUTO_END}\\r?\\n?`);
  if (re.test(text)) text = text.replace(re, block.split('\n').join(eol) + eol);
  else {
    const lines = text.split(/\r?\n/);
    const at = /^Proyecto:/i.test(lines[0] || '') ? 1 : 0;
    lines.splice(at, 0, ...block.split('\n'));
    text = lines.join(eol);
  }
  fs.mkdirSync(mem, { recursive: true });
  fs.writeFileSync(file, text);
}

/** ¿sesion.md tiene el bloque automático? (el agente pudo reescribir el archivo completo) */
function hasAutoBlock(root) {
  try { return fs.readFileSync(path.join(root, '.sdd', 'memoria', 'sesion.md'), 'utf8').includes(AUTO_START); } catch { return false; }
}

module.exports = { contextBlock, checkpoint, hasAutoBlock, AUTO_START, AUTO_END };
