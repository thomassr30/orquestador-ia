'use strict';
// Registro de eventos estructurado (JSONL), correlacionado por sesión, turno, tarea, acción y aprobación, para
// reconstruir por qué se tomó cada decisión sin volver a ejecutar nada. Por diseño no guarda prompts, argumentos ni
// contenido de archivos: los textos son del propio harness, pasan por redact() y se recortan; una acción se identifica
// por su etiqueta (sin valores) y su huella. Rotación por tamaño (eventos.1.jsonl … .N) y retención por días.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { STATE_DIR } = require('./paths');
const { shortHash, IS_WIN } = require('./util');
const { redact } = require('./secrets');

const LIMITS = { maxKB: 1024, archivos: 5, dias: 30 };
const STRUCTURED = ['accion', 'aprobacion', 'politica', 'verificacion', 'reintento', 'recuperacion', 'terminacion', 'tarea', 'presupuesto'];
// Fragmentos de secretos que el harness cita en sus motivos («sk-ant-api…»): tampoco se registran
const SECRET_FRAGMENT = /\b(?:sk-|rk_|gh[pousr]_|github_pat_|glpat-|AKIA|AIza|xox[abprs]-|eyJ|SG\.)[A-Za-z0-9_.-]*…/g;

const projectDir = root => { const r = path.resolve(root); return path.join(STATE_DIR, shortHash(IS_WIN ? r.toLowerCase() : r)); };
const fileOf = (root, n = 0) => path.join(projectDir(root), n ? `eventos.${n}.jsonl` : 'eventos.jsonl');
const clean = s => redact(String(s ?? '')).replace(SECRET_FRAGMENT, '[secreto omitido]').replace(/\s+/g, ' ').trim().slice(0, 300);

function rotate(root) {
  const f = fileOf(root);
  try {
    if (fs.statSync(f).size <= LIMITS.maxKB * 1024) return;
    for (let i = LIMITS.archivos - 1; i >= 1; i--) { try { fs.renameSync(fileOf(root, i), fileOf(root, i + 1)); } catch { /* no existe */ } }
    fs.renameSync(f, fileOf(root, 1));
  } catch { /* otro proceso rotó primero */ }
}

/**
 * Registra un evento. Nunca lanza (el registro no debe romper un hook). Devuelve el id del evento o null.
 * @param {string} root
 * @param {{herramienta?:string, sesion?:string, turno?:number, evento:string, decision?:string, detalle?:string}} e
 */
function write(root, e) {
  try {
    const ev = { v: 1, ts: new Date().toISOString(), id: crypto.randomBytes(4).toString('hex'), sesion: e.sesion || null, turno: e.turno ?? null, cliente: e.herramienta || e.cliente || null, evento: e.evento || null, decision: e.decision || null };
    for (const k of STRUCTURED) if (e[k] !== undefined) ev[k] = typeof e[k] === 'string' ? clean(e[k]) : JSON.parse(JSON.stringify(e[k], (key, v) => (typeof v === 'string' ? clean(v) : v)));
    if (e.detalle) ev.detalle = clean(e.detalle);
    fs.mkdirSync(projectDir(root), { recursive: true });
    fs.appendFileSync(fileOf(root), `${JSON.stringify(ev)}\n`);
    rotate(root);
    return ev.id;
  } catch { return null; }
}

/** Borra archivos rotados más viejos que la retención (y el registro de texto de versiones anteriores). */
function cleanup(root, dias = LIMITS.dias) {
  try {
    for (const f of fs.readdirSync(projectDir(root))) {
      if (!/^eventos\.\d+\.jsonl$|^registro\.log$/.test(f)) continue;
      const p = path.join(projectDir(root), f);
      if (Date.now() - fs.statSync(p).mtimeMs > dias * 86400000) fs.unlinkSync(p);
    }
  } catch { /* sin registro */ }
}

/** Eventos del proyecto, del más antiguo al más reciente (incluye los archivos rotados). */
function read(root, { sesion = null, limit = 0 } = {}) {
  const out = [];
  for (let i = LIMITS.archivos; i >= 0; i--) {
    let text = '';
    try { text = fs.readFileSync(fileOf(root, i), 'utf8'); } catch { continue; }
    for (const line of text.split('\n')) { if (!line.trim()) continue; try { const ev = JSON.parse(line); if (!sesion || ev.sesion === sesion) out.push(ev); } catch { /* línea cortada */ } }
  }
  return limit ? out.slice(-limit) : out;
}

/**
 * Cadena de decisiones de un evento: los de la misma sesión ligados por la misma acción (huella), la misma
 * aprobación o la misma tarea, en orden. Sirve para diagnosticar sin volver a ejecutar sus efectos.
 */
function explain(root, id) {
  const all = read(root);
  const ev = all.find(e => e.id === id);
  if (!ev) return null;
  const key = e => [e.accion && e.accion.huella && `a:${e.accion.huella}`, e.aprobacion && e.aprobacion.id && `p:${e.aprobacion.id}`, e.tarea && `t:${e.tarea}`].filter(Boolean);
  const keys = new Set(key(ev));
  const chain = all.filter(e => e.sesion === ev.sesion && (e.id === id || key(e).some(k => keys.has(k))));
  return { evento: ev, cadena: chain };
}

const format = e => `${e.ts} · ${e.cliente || '-'} · ${e.evento || '-'} · ${e.decision || '-'}${e.detalle ? ` · ${e.detalle}` : ''}${e.accion && e.accion.etiqueta ? ` · ${e.accion.etiqueta}` : ''}${e.aprobacion && e.aprobacion.id ? ` · solicitud ${e.aprobacion.id}` : ''} [${e.id}]`;

module.exports = { write, read, explain, cleanup, format, clean, LIMITS };
