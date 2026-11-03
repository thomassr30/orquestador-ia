'use strict';
// Estado del harness por proyecto y sesión, FUERA del proyecto (~/.sdd-orquestador/estado/<hash>/),
// para no dejar archivos de trabajo en el repositorio. Los hooks pueden correr en paralelo, así que:
//  - toda modificación pasa por un candado con dueño; si no se obtiene, se lanza StateError (nunca se sigue sin él);
//  - la escritura es atómica (temporal + fsync + rename) y conserva la versión válida anterior en .bak;
//  - la lectura distingue estado ausente, corrupto y de versión incompatible. Un estado dañado se recupera en modo
//    restrictivo: nunca concede permisos (GATE requerido, sin aprobaciones, contenido externo marcado).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { STATE_DIR } = require('./paths');
const { shortHash, IS_WIN } = require('./util');
const eventos = require('./eventos');

const VERSION = 2;
const LOCK_STALE_MS = 30000;

class StateError extends Error {
  /** @param {'candado'|'escritura'|'version'} code */
  constructor(code, message) { super(message); this.code = code; this.name = 'StateError'; }
}

const normRoot = root => { const r = path.resolve(root); return IS_WIN ? r.toLowerCase() : r; };
const projectDir = root => path.join(STATE_DIR, shortHash(normRoot(root)));
const safeId = id => String(id || 'default').replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 80) || 'default';
const sessionFile = (root, sid) => path.join(projectDir(root), `sesion-${safeId(sid)}.json`);

function emptyState(root, sid) {
  return {
    v: VERSION, root: path.resolve(root), sesion: String(sid || 'default'), creado: new Date().toISOString(), actualizado: null,
    gate: { estado: 'inicial', desde: null },  // inicial | requerido | pendiente | aprobado | libre
    cambios: [],                                // archivos modificados en la sesión (relativos a la raíz)
    huellas: null,                              // archivos con cambios en git y su huella, vistos en el último control
    sucio: false,                               // hay cambios sin verificar por los sensores
    sensores: null,                             // último resultado { estado, ok, motivo, en, huella, resumen: [...] }
    bloqueos: 0,                                // veces seguidas que se impidió terminar
    excepciones: [],                            // excepciones de controles autorizadas por el usuario { control, huella, motivo, en }
    aprobaciones: { pendientes: [], aprobadas: [] },
    compactado: false,
    herramienta: null,
  };
}

/** Estado de recuperación: conserva lo que no da permisos y exige volver a aprobar. */
function restrictive(base, motivo) {
  const now = new Date().toISOString();
  const s = { ...base };
  // No se sabe si lo perdido era un pedido de cambio sin aprobar: se exige aprobar de nuevo.
  s.gate = { estado: 'requerido', desde: now, recuperado: true };
  s.aprobaciones = { pendientes: [], aprobadas: [] };
  s.externo = s.externo || { fuente: 'desconocida (estado recuperado)', en: now };
  s.recuperacion = { motivo, en: now };
  return s;
}

/** Migra estados de versiones anteriores (v1: aprobaciones por texto, sin huellas). */
function migrate(s) {
  if ((s.v || 1) >= VERSION) return s;
  // Las aprobaciones v1 no tienen identidad exacta: se descartan (no se concede nada al migrar).
  return { ...s, v: VERSION, aprobaciones: { pendientes: [], aprobadas: [] }, migrado: { desde: s.v || 1, en: new Date().toISOString() } };
}

function normalize(root, sid, s) {
  const e = emptyState(root, sid);
  return { ...e, ...s, gate: { ...e.gate, ...(s.gate || {}) }, aprobaciones: { pendientes: [], aprobadas: [], ...(s.aprobaciones || {}) }, excepciones: s.excepciones || [] };
}

/**
 * Lee el estado con su diagnóstico.
 * @returns {{state: object, problema: null|{tipo:'corrupto'|'version', detalle:string, respaldo?:boolean}}}
 */
function load(root, sid) {
  const file = sessionFile(root, sid);
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch (e) {
    if (e.code === 'ENOENT') return { state: emptyState(root, sid), problema: null };
    return { state: restrictive(emptyState(root, sid), `no se pudo leer el estado (${e.code})`), problema: { tipo: 'corrupto', detalle: e.code } };
  }
  let s;
  try { s = JSON.parse(raw); if (!s || typeof s !== 'object' || Array.isArray(s)) throw new Error('no es un objeto'); } catch (e) {
    let bak = null;
    try { bak = JSON.parse(fs.readFileSync(`${file}.bak`, 'utf8')); } catch { /* sin respaldo válido */ }
    if (bak && typeof bak === 'object' && (bak.v || 1) <= VERSION) {
      return { state: restrictive(normalize(root, sid, migrate(bak)), 'estado dañado: se usó la versión anterior guardada'), problema: { tipo: 'corrupto', detalle: e.message, respaldo: true } };
    }
    return { state: restrictive(emptyState(root, sid), 'estado dañado sin respaldo válido'), problema: { tipo: 'corrupto', detalle: e.message, respaldo: false } };
  }
  if ((s.v || 1) > VERSION) {
    return { state: restrictive(emptyState(root, sid), `estado de una versión más nueva del harness (v${s.v})`), problema: { tipo: 'version', detalle: `v${s.v}` } };
  }
  return { state: normalize(root, sid, migrate(s)), problema: null };
}

const readState = (root, sid) => load(root, sid).state;

const sleepSync = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

/**
 * Un candado es viejo si su dueño ya no existe, si lleva más de 30 s (un hook lo tiene milisegundos) o si quedó vacío
 * más de 1 s (el proceso murió entre crearlo y escribir su pid).
 */
function staleLock(lock) {
  try {
    const age = Date.now() - fs.statSync(lock).mtimeMs;
    if (age > LOCK_STALE_MS) return true;
    let owner = null;
    try { owner = JSON.parse(fs.readFileSync(lock, 'utf8')); } catch { /* vacío o a medio escribir */ }
    if (!owner || owner.pid === undefined) return age > 1000;
    return !pidAlive(owner.pid);
  } catch { return false; }
}

/** Ejecuta fn con el candado del archivo. Si no lo obtiene en timeoutMs, lanza StateError('candado'). */
function withLock(file, fn, { timeoutMs = 3000 } = {}) {
  const lock = `${file}.lock`;
  const token = crypto.randomBytes(6).toString('hex');
  const start = Date.now();
  for (;;) {
    try {
      const fd = fs.openSync(lock, 'wx');
      try { fs.writeSync(fd, JSON.stringify({ pid: process.pid, token, en: Date.now() })); } finally { fs.closeSync(fd); }
      break;
    } catch (e) {
      if (e.code !== 'EEXIST' && e.code !== 'EPERM') throw new StateError('candado', `no se pudo crear el candado del estado (${e.code})`);
      // EPERM en Windows: el candado está «borrándose» (otro proceso lo soltó) o lo retiene un antivirus
      if (staleLock(lock)) { try { fs.unlinkSync(lock); } catch { /* otro lo liberó */ } continue; }
      if (Date.now() - start > timeoutMs) throw new StateError('candado', 'el estado de la sesión está ocupado por otro proceso');
      sleepSync(15);
    }
  }
  try { return fn(); } finally {
    try { if (JSON.parse(fs.readFileSync(lock, 'utf8')).token === token) fs.unlinkSync(lock); } catch { /* ya no existe */ }
  }
}

/** Escritura atómica: temporal con fsync y rename (con reintentos para Windows). Nunca escribe a medias. */
function writeAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  const fd = fs.openSync(tmp, 'w');
  try { fs.writeSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  let last;
  for (let i = 0; i < 20; i++) {
    try { fs.renameSync(tmp, file); return; } catch (e) { last = e; sleepSync(25); }
  }
  try { fs.unlinkSync(tmp); } catch { /* temporal */ }
  throw new StateError('escritura', `no se pudo guardar el estado (${last && last.code})`);
}

/**
 * Lee, modifica y guarda el estado de la sesión bajo candado. Devuelve el estado nuevo.
 * Lanza StateError si no hay candado, si no se puede escribir o si el estado es de una versión más nueva.
 */
function updateState(root, sid, fn) {
  const file = sessionFile(root, sid);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return withLock(file, () => {
    const { state: s, problema } = load(root, sid);
    if (problema && problema.tipo === 'version') throw new StateError('version', `el estado lo escribió una versión más nueva del harness (${problema.detalle}); actualiza el harness`);
    if (problema) {
      // El archivo dañado queda en cuarentena para diagnóstico; se sigue con el estado recuperado (restrictivo).
      try { fs.renameSync(file, `${file}.corrupto-${Date.now()}`); } catch { /* ya no existe */ }
      log(root, { herramienta: 'harness', sesion: String(sid || 'default'), evento: 'estado', decision: 'recuperado', recuperacion: { motivo: s.recuperacion.motivo, respaldo: !!problema.respaldo, tipo: problema.tipo } });
    } else if (fs.existsSync(file)) {
      try { fs.copyFileSync(file, `${file}.bak`); } catch { /* el respaldo es opcional */ }
    }
    const r = fn(s) || s;
    r.v = VERSION;
    r.actualizado = new Date().toISOString();
    writeAtomic(file, JSON.stringify(r, null, 1));
    return r;
  });
}

/** Borra estados de sesiones viejas de este proyecto (más de 14 días), con sus respaldos y cuarentenas. */
function cleanupOld(root, days = 14) {
  const dir = projectDir(root);
  try {
    for (const f of fs.readdirSync(dir)) {
      if (!/^sesion-.*\.(json|json\.bak|json\.corrupto-\d+)$/.test(f)) continue;
      const p = path.join(dir, f);
      if (Date.now() - fs.statSync(p).mtimeMs > days * 86400000) fs.unlinkSync(p);
    }
  } catch { /* sin estado previo */ }
}

/** Registro local de decisiones como eventos estructurados (ver eventos.js). Nunca rompe un hook. */
const log = (root, entry) => eventos.write(root, entry);

/** Últimas decisiones en texto (eventos; si no hay, el registro de texto de versiones anteriores). */
function readLog(root, lines = 40) {
  const evs = eventos.read(root, { limit: lines });
  if (evs.length) return evs.map(eventos.format);
  try { return fs.readFileSync(path.join(projectDir(root), 'registro.log'), 'utf8').trim().split('\n').slice(-lines); } catch { return []; }
}

/** Sesiones conocidas del proyecto, de la más reciente a la más antigua (las ilegibles se informan como dañadas). */
function listSessions(root) {
  const dir = projectDir(root);
  try {
    return fs.readdirSync(dir).filter(f => /^sesion-.*\.json$/.test(f))
      .map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t)
      .map(x => { try { return JSON.parse(fs.readFileSync(path.join(dir, x.f), 'utf8')); } catch { return { sesion: x.f.replace(/^sesion-|\.json$/g, ''), danado: true }; } })
      .filter(Boolean);
  } catch { return []; }
}

module.exports = { readState, load, updateState, cleanupOld, log, readLog, listSessions, projectDir, sessionFile, emptyState, withLock, writeAtomic, StateError, VERSION };
