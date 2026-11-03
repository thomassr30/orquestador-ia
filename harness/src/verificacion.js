'use strict';
// ¿Lo que cambió en la sesión está verificado? Detección de cambios (hooks de edición + git, que también ve lo que se
// modificó por comandos de shell), huella del contenido verificado y excepciones autorizadas por el usuario.
// Una verificación vale para una huella: si el contenido cambia, deja de valer.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { CODE_EXT } = require('./sensors');
const { combinar, verificado, idControl } = require('./resultado');
const { relPosix, shortHash } = require('./util');

const MAX_FILES = 2000;
const isHarnessFile = f => /(^|\/)\.sdd\//.test(f);

/** Huella del contenido de un archivo ('borrado' si no existe). */
function fileHash(abs) {
  try {
    const st = fs.statSync(abs);
    if (!st.isFile()) return 'no-archivo';
    if (st.size > 5e6) return `t${st.size}:${Math.round(st.mtimeMs)}`;
    return crypto.createHash('sha1').update(fs.readFileSync(abs)).digest('hex').slice(0, 16);
  } catch { return 'borrado'; }
}

/** Huella de un conjunto de archivos (relativos a root): cambia si cambia el contenido de cualquiera. */
const fingerprint = (root, files) => shortHash([...new Set(files)].sort().map(f => `${f}:${fileHash(path.resolve(root, f))}`).join('|'));

/** Archivos de código con cambios en un repo git (también los no rastreados), relativos a root, con su huella. null si no es git. */
function gitChanges(repo, root = repo) {
  const r = spawnSync('git', ['status', '--porcelain', '-z', '--untracked-files=all'], { cwd: repo, encoding: 'utf8', windowsHide: true, timeout: 15000, maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0 || r.error) return null;
  const out = {};
  const parts = r.stdout.split('\0');
  for (let i = 0; i < parts.length; i++) {
    const e = parts[i];
    if (!e || e.length < 4) continue;
    if (/^[RC]/.test(e)) i++; // renombrado o copiado: el siguiente elemento es el origen
    const rel = relPosix(root, path.join(repo, e.slice(3)));
    if (!CODE_EXT.test(rel) || isHarnessFile(rel) || rel.startsWith('..')) continue;
    out[rel] = fileHash(path.resolve(root, rel));
    if (Object.keys(out).length > MAX_FILES) return null;
  }
  return out;
}

/** Cambios según git en todos los repos del espacio (o solo en la raíz). */
function spaceChanges(root, repos = [root]) {
  let found = false; const all = {};
  for (const repo of repos) { const c = gitChanges(repo, root); if (c) { found = true; Object.assign(all, c); } }
  return found ? all : null;
}

/** Archivos que cambiaron respecto de la foto anterior (contenido distinto, nuevos o vueltos atrás). */
function diffSnapshots(prev, now) {
  if (!prev || !now) return [];
  return [...new Set([...Object.keys(now).filter(f => prev[f] !== now[f]), ...Object.keys(prev).filter(f => !(f in now))])];
}

/**
 * Registra excepciones autorizadas por el usuario para controles de la verificación actual (misma huella) y
 * recalcula el resultado. Solo la llama el harness tras una confirmación del usuario (chat o terminal).
 * @returns {boolean} si con las excepciones la verificación quedó aprobada
 */
function addExceptions(state, controles, huella, motivo) {
  const now = new Date().toISOString();
  state.excepciones = [...(state.excepciones || []).filter(e => !(controles.includes(e.control) && e.huella === huella)),
    ...controles.map(control => ({ control, huella, motivo, en: now }))].slice(-30);
  return recombine(state);
}

/** Vuelve a combinar el último resultado con las excepciones vigentes para su huella. */
function recombine(state) {
  const s = state.sensores;
  if (!s || !Array.isArray(s.resumen) || !s.huella) return false;
  const c = combinar(s.resumen.map(r => ({ ...r, estado: r.estado === 'excepcion' ? (r.estadoOriginal || 'fallido') : r.estado })), { excepciones: state.excepciones, huella: s.huella });
  state.sensores = { ...s, estado: c.estado, ok: verificado(c.estado), motivo: c.motivo, resumen: c.controles.map((x, i) => ({ ...x, estadoOriginal: s.resumen[i].estadoOriginal || s.resumen[i].estado })) };
  if (verificado(c.estado)) { state.sucio = false; state.bloqueos = 0; state.sensores.pausado = false; }
  return verificado(c.estado);
}

/** Controles que impiden dar por verificado el resultado (fallidos u obligatorios sin verificar). */
const pendingControls = sensores => ((sensores && sensores.resumen) || []).filter(r => r.estado === 'fallido' || (r.estado === 'no_verificado' && r.obligatorio)).map(idControl);

module.exports = { fileHash, fingerprint, gitChanges, spaceChanges, diffSnapshots, addExceptions, recombine, pendingControls };
