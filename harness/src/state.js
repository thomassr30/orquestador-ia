'use strict';
// Estado del harness por proyecto y sesión, FUERA del proyecto (~/.sdd-orquestador/estado/<hash>/),
// para no dejar archivos de trabajo en el repositorio. Escritura atómica con candado (los hooks
// pueden correr en paralelo cuando el agente edita varios archivos a la vez).
const fs = require('fs');
const path = require('path');
const { STATE_DIR } = require('./paths');
const { shortHash, IS_WIN } = require('./util');

const normRoot = root => { const r = path.resolve(root); return IS_WIN ? r.toLowerCase() : r; };
const projectDir = root => path.join(STATE_DIR, shortHash(normRoot(root)));
const safeId = id => String(id || 'default').replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 80) || 'default';
const sessionFile = (root, sid) => path.join(projectDir(root), `sesion-${safeId(sid)}.json`);

function emptyState(root, sid) {
  return {
    v: 1, root: path.resolve(root), sesion: String(sid || 'default'), creado: new Date().toISOString(), actualizado: null,
    gate: { estado: 'inicial', desde: null },  // inicial | requerido | pendiente | aprobado | libre
    cambios: [],                                // archivos modificados en la sesión (relativos a la raíz)
    sucio: false,                               // hay cambios sin verificar por los sensores
    sensores: null,                             // último resultado { ok, en, resumen: [{nombre, ok, ms}] }
    bloqueos: 0,                                // veces seguidas que se impidió terminar
    aprobaciones: { pendientes: [], aprobadas: [] },
    compactado: false,
    herramienta: null,
  };
}

const sleepSync = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function withLock(file, fn) {
  const lock = `${file}.lock`;
  const start = Date.now();
  let locked = false;
  while (!locked) {
    try { fs.closeSync(fs.openSync(lock, 'wx')); locked = true; } catch (e) {
      if (e.code !== 'EEXIST') break;
      try { if (Date.now() - fs.statSync(lock).mtimeMs > 10000) { fs.unlinkSync(lock); continue; } } catch { /* otro lo liberó */ }
      if (Date.now() - start > 3000) break; // mejor seguir sin candado que colgar al agente
      sleepSync(20);
    }
  }
  try { return fn(); } finally { if (locked) { try { fs.unlinkSync(lock); } catch { /* ya no existe */ } } }
}

function readState(root, sid) {
  try {
    const s = JSON.parse(fs.readFileSync(sessionFile(root, sid), 'utf8'));
    return { ...emptyState(root, sid), ...s, gate: { ...emptyState(root, sid).gate, ...(s.gate || {}) }, aprobaciones: { pendientes: [], aprobadas: [], ...(s.aprobaciones || {}) } };
  } catch { return emptyState(root, sid); }
}

function writeAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, data);
  for (let i = 0; i < 5; i++) {
    try { fs.renameSync(tmp, file); return; } catch { sleepSync(20); }
  }
  fs.writeFileSync(file, data);
  try { fs.unlinkSync(tmp); } catch { /* ya movido */ }
}

/** Lee, modifica y guarda el estado de la sesión bajo candado. Devuelve el estado nuevo. */
function updateState(root, sid, fn) {
  const file = sessionFile(root, sid);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return withLock(file, () => {
    const s = readState(root, sid);
    const r = fn(s) || s;
    r.actualizado = new Date().toISOString();
    writeAtomic(file, JSON.stringify(r, null, 1));
    return r;
  });
}

/** Borra estados de sesiones viejas de este proyecto (más de 14 días). */
function cleanupOld(root, days = 14) {
  const dir = projectDir(root);
  try {
    for (const f of fs.readdirSync(dir)) {
      if (!/^sesion-.*\.json$/.test(f)) continue;
      const p = path.join(dir, f);
      if (Date.now() - fs.statSync(p).mtimeMs > days * 86400000) fs.unlinkSync(p);
    }
  } catch { /* sin estado previo */ }
}

/** Registro local de decisiones (sin contenido de archivos ni prompts). Rota a 256 KB. */
function log(root, entry) {
  try {
    const file = path.join(projectDir(root), 'registro.log');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const line = `${new Date().toISOString()} · ${entry.herramienta || '-'} · ${entry.evento || '-'} · ${entry.decision || '-'} · ${String(entry.detalle || '').replace(/\s+/g, ' ').slice(0, 300)}\n`;
    fs.appendFileSync(file, line);
    const st = fs.statSync(file);
    if (st.size > 256 * 1024) {
      const keep = fs.readFileSync(file, 'utf8').slice(-128 * 1024);
      fs.writeFileSync(file, keep.slice(keep.indexOf('\n') + 1));
    }
  } catch { /* el registro nunca debe romper un hook */ }
}

function readLog(root, lines = 40) {
  try { return fs.readFileSync(path.join(projectDir(root), 'registro.log'), 'utf8').trim().split('\n').slice(-lines); } catch { return []; }
}

/** Sesiones conocidas del proyecto, de la más reciente a la más antigua. */
function listSessions(root) {
  const dir = projectDir(root);
  try {
    return fs.readdirSync(dir).filter(f => /^sesion-.*\.json$/.test(f))
      .map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t)
      .map(x => { try { return JSON.parse(fs.readFileSync(path.join(dir, x.f), 'utf8')); } catch { return null; } })
      .filter(Boolean);
  } catch { return []; }
}

module.exports = { readState, updateState, cleanupOld, log, readLog, listSessions, projectDir, sessionFile, emptyState };
