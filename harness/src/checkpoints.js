'use strict';
// Puntos de restauración ("deshacer lo que hizo la IA").
// Antes de la primera modificación de cada turno, el harness guarda una copia del proyecto en un repositorio git
// INTERNO: ~/.sdd-orquestador/puntos/<proyecto>. Es un almacén aparte: el .git del proyecto nunca se toca y en tu
// historial no aparece nada. Respeta el .gitignore del proyecto y nunca copia secretos (.env, claves, certificados).
// `sdd-harness.js deshacer` muestra qué cambió desde un punto y, con --confirmar, deja los archivos como estaban.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { SDD_HOME } = require('./paths');
const { shortHash, isInside } = require('./util');

const MAX_DEFAULT = 30;
// Por si el proyecto no tiene .gitignore: dependencias y salidas de compilación no se copian.
const EXCLUDE = ['node_modules/', '.venv/', 'venv/', '__pycache__/', '.gradle/', '.angular/', '.next/', '.nuxt/', '.svelte-kit/', '.turbo/',
  '.parcel-cache/', 'coverage/', 'Pods/', 'DerivedData/', '.terraform/', '.dart_tool/', '*.log', '.DS_Store', 'Thumbs.db'];
// Secretos: nunca salen del proyecto, tampoco hacia la copia interna.
const SECRETS = ['.env', '.env.*', '!.env.example', '!.env.sample', '!.env.template', '*.pem', '*.key', '*.pfx', '*.p12', 'id_rsa*', 'id_ed25519*', 'id_ecdsa*',
  '.npmrc', 'credentials', 'credentials.json', '*.keystore', '*.jks'];

const dirFor = root => path.join(SDD_HOME, 'puntos', shortHash(path.resolve(root)));

let gitOk = null;
function hasGit() {
  if (gitOk === null) { const r = spawnSync('git', ['--version'], { windowsHide: true, encoding: 'utf8' }); gitOk = r.status === 0; }
  return gitOk;
}

function cleanEnv(dir) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (!/^GIT_/.test(k)) env[k] = v;
  return { ...env, GIT_INDEX_FILE: path.join(dir, 'index'), GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0',
    GIT_AUTHOR_NAME: 'harness-sdd', GIT_AUTHOR_EMAIL: 'harness@sdd.local', GIT_COMMITTER_NAME: 'harness-sdd', GIT_COMMITTER_EMAIL: 'harness@sdd.local' };
}

function git(root, args, { timeout = 8000, input } = {}) {
  const dir = dirFor(root);
  return spawnSync('git', ['--git-dir', dir, '--work-tree', path.resolve(root), '-c', 'core.autocrlf=false', '-c', 'core.safecrlf=false',
    '-c', 'core.fsmonitor=false', '-c', 'core.quotepath=false', '-c', 'core.hooksPath=', '-c', 'gc.auto=0', '-c', 'safe.directory=*', ...args],
  { cwd: path.resolve(root), encoding: 'utf8', timeout, input, windowsHide: true, maxBuffer: 64 * 1024 * 1024, env: cleanEnv(dir) });
}

function ensureRepo(root, extra = []) {
  if (!hasGit()) return false;
  const dir = dirFor(root);
  if (!fs.existsSync(path.join(dir, 'HEAD'))) {
    fs.mkdirSync(dir, { recursive: true });
    const r = spawnSync('git', ['init', '-q', '--bare', dir], { windowsHide: true, encoding: 'utf8', env: cleanEnv(dir) });
    if (r.status !== 0) return false;
    spawnSync('git', ['--git-dir', dir, 'config', 'core.bare', 'false'], { windowsHide: true, env: cleanEnv(dir) });
    fs.writeFileSync(path.join(dir, 'proyecto.txt'), path.resolve(root));
  }
  const exclude = [...EXCLUDE, ...SECRETS, ...extra].join('\n') + '\n';
  const file = path.join(dir, 'info', 'exclude');
  try { if (fs.readFileSync(file, 'utf8') !== exclude) throw new Error(); } catch { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, exclude); }
  // Un "git add" cortado por tiempo puede dejar el índice bloqueado
  const lock = path.join(dir, 'index.lock');
  try { if (Date.now() - fs.statSync(lock).mtimeMs > 30000) fs.unlinkSync(lock); } catch { /* sin bloqueo */ }
  return true;
}

const slowFile = root => path.join(dirFor(root), 'lento');

/** Árbol del estado actual del proyecto (o null si no se pudo leer a tiempo). */
function currentTree(root, timeout) {
  const add = git(root, ['add', '-A', '--ignore-errors', '--', '.'], { timeout });
  if (add.error) {
    // Proyecto muy grande para el tiempo de un hook: se marca para no demorar cada turno (ver `puntos --iniciar`)
    if (add.error.code === 'ETIMEDOUT' || add.signal) { try { fs.writeFileSync(slowFile(root), new Date().toISOString()); } catch { /* sin permisos */ } }
    return null;
  }
  if (add.status !== 0 && !/warning|ignored/i.test(add.stderr || '')) return null;
  const w = git(root, ['write-tree']);
  return w.status === 0 ? w.stdout.trim() : null;
}

/** Puntos guardados, del más reciente al más antiguo. */
function list(root) {
  if (!fs.existsSync(path.join(dirFor(root), 'HEAD'))) return [];
  const r = git(root, ['for-each-ref', '--sort=-refname', '--format=%(refname:lstrip=2)%09%(objectname)%09%(tree)%09%(subject)', 'refs/puntos/']);
  if (r.status !== 0) return [];
  return r.stdout.split('\n').filter(Boolean).map(l => {
    const [id, commit, tree, ...label] = l.split('\t');
    const fecha = `${id.slice(0, 4)}-${id.slice(4, 6)}-${id.slice(6, 8)} ${id.slice(9, 11)}:${id.slice(11, 13)}:${id.slice(13, 15)}`;
    return { id, commit, tree, fecha, etiqueta: label.join('\t') };
  });
}

function prune(root, max) {
  for (const p of list(root).slice(Math.max(1, max))) git(root, ['update-ref', '-d', `refs/puntos/${p.id}`]);
}

const newId = () => {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}${String(d.getMilliseconds()).padStart(3, '0')}`;
};

/**
 * Guarda un punto con el estado actual de una carpeta (un repo). Si no cambió nada desde el último, no crea otro.
 * @param {{id?: string}} opts id compartido por todos los repos tocados en el mismo turno
 * @returns {{id:string, nuevo:boolean}|null} null si no hay git o no alcanzó el tiempo
 */
function snapshot(root, label, { timeout = 8000, max = MAX_DEFAULT, excluir = [], force = false, id } = {}) {
  try {
    if (!force) { try { if (Date.now() - fs.statSync(slowFile(root)).mtimeMs < 6 * 3600000) return null; } catch { /* no es lento */ } }
    if (!ensureRepo(root, excluir)) return null;
    const tree = currentTree(root, timeout);
    if (!tree) return null;
    const last = list(root)[0];
    if (last && last.tree === tree) return { id: last.id, nuevo: false };
    const c = git(root, ['commit-tree', tree, '-m', String(label || 'punto').replace(/\s+/g, ' ').slice(0, 120)]);
    if (c.status !== 0) return null;
    const pid = id || newId();
    if (git(root, ['update-ref', `refs/puntos/${pid}`, c.stdout.trim()]).status !== 0) return null;
    prune(root, max);
    try { fs.unlinkSync(slowFile(root)); } catch { /* no estaba marcado */ }
    return { id: pid, nuevo: true };
  } catch { return null; }
}

/** ¿El último intento no alcanzó el tiempo de un hook? */
const isSlow = root => { try { return Date.now() - fs.statSync(slowFile(root)).mtimeMs < 6 * 3600000; } catch { return false; } };

/** Compacta el almacén interno como mucho una vez al día (al iniciar sesión). */
function maintain(root) {
  const dir = dirFor(root);
  const mark = path.join(dir, 'mantenido');
  try {
    if (!fs.existsSync(path.join(dir, 'HEAD'))) return;
    try { if (Date.now() - fs.statSync(mark).mtimeMs < 24 * 3600000) return; } catch { /* nunca */ }
    fs.writeFileSync(mark, new Date().toISOString());
    git(root, ['gc', '--quiet', '--prune=now'], { timeout: 10000 });
  } catch { /* no es crítico */ }
}

// ---------- varios repos: una carpeta con proyectos adentro o un workspace ----------
// Cada repo (la raíz, cada repo interno y cada carpeta extra) tiene su propio almacén: git no copia el contenido de un
// repo anidado dentro de otro. Los puntos de un mismo turno comparten id, así "deshacer" vuelve todo atrás junto.

const REDO = /^antes de deshacer/;

/** Unidades de copia del espacio: carpetas y repos, cada una sin los repos anidados (que son unidades propias). */
function units(ws) {
  const dirs = [...new Set([...(ws.carpetas || [ws.raiz]), ...(ws.proyectos || []).filter(p => p.git).map(p => p.ruta)].map(d => path.resolve(d)))];
  return dirs.map(dir => ({ dir, excluir: dirs.filter(o => o !== dir && isInside(dir, o)).map(o => `/${path.relative(dir, o).replace(/\\/g, '/')}/`) }));
}

/** Unidad más profunda que contiene la ruta. */
const unitOf = (us, abs) => us.filter(u => isInside(u.dir, abs)).sort((a, b) => b.dir.length - a.dir.length)[0] || null;

/** Guarda un punto en cada unidad (mismo id), dentro de un presupuesto de tiempo. */
function snapshotUnits(us, label, { id = newId(), max = MAX_DEFAULT, excluir = [], budgetMs = 10000 } = {}) {
  const deadline = Date.now() + budgetMs;
  const hechos = []; let nuevos = 0;
  for (const u of us) {
    const left = deadline - Date.now();
    if (left < 300) break;
    const r = snapshot(u.dir, label, { id, max, excluir: [...excluir, ...u.excluir], timeout: Math.min(8000, left) });
    if (r) { hechos.push(u.dir); if (r.nuevo) nuevos++; }
  }
  return { id, hechos, nuevos };
}

/** Turnos guardados en todo el espacio (id común), del más reciente al más antiguo. */
function turns(us) {
  const m = new Map();
  for (const u of us) for (const p of list(u.dir)) {
    if (!m.has(p.id)) m.set(p.id, { id: p.id, fecha: p.fecha, etiqueta: p.etiqueta, rehacer: REDO.test(p.etiqueta), repos: [] });
    m.get(p.id).repos.push(u.dir);
  }
  return [...m.values()].sort((a, b) => (a.id < b.id ? 1 : -1));
}

/** Punto de una unidad para "volver a antes del turno T": el primero guardado desde T (o el exacto si es un rehacer). */
function pointFor(points, turn) {
  if (turn.rehacer) return points.find(p => p.id === turn.id) || null;
  return points.filter(p => !REDO.test(p.etiqueta) && p.id >= turn.id).sort((a, b) => (a.id < b.id ? -1 : 1))[0] || null;
}

/**
 * Plan para volver atrás: qué archivos se restauran o quitan en cada repo.
 * Sin indicar punto retrocede como una pila (si ya estás en un turno guardado, va al anterior).
 */
function planUnits(us, ref, { timeout = 30000 } = {}) {
  if (!hasGit()) return { error: 'git no está disponible: los puntos de restauración necesitan git instalado.' };
  const all = turns(us);
  if (!all.length) return { error: 'todavía no hay puntos de restauración en este proyecto.' };
  const state = us.map(u => { ensureRepo(u.dir, u.excluir); return { u, points: list(u.dir), cur: currentTree(u.dir, timeout) }; });
  if (state.some(x => !x.cur)) return { error: 'no se pudo leer el estado actual del proyecto a tiempo.' };
  const differs = t => state.some(x => { const p = pointFor(x.points, t); return p && p.tree !== x.cur; });
  let target;
  if (ref) {
    target = /^\d{1,3}$/.test(String(ref)) ? all[Number(ref) - 1] : all.find(t => t.id === ref || t.id.startsWith(String(ref)));
    if (!target) return { error: `no existe el punto "${ref}".` };
  } else {
    const regular = all.filter(t => !t.rehacer);
    const pos = regular.findIndex(t => !differs(t));
    target = (pos >= 0 ? regular.slice(pos + 1) : regular).find(differs);
    if (!target) return { error: 'no hay un punto anterior al que volver.' };
  }
  const repos = [];
  for (const x of state) {
    const p = pointFor(x.points, target);
    if (!p || p.tree === x.cur) continue;
    const d = git(x.u.dir, ['diff', '--name-status', '--no-renames', '-z', p.tree, x.cur], { timeout });
    if (d.status !== 0) return { error: 'no se pudo comparar con el punto.' };
    const parts = d.stdout.split('\0').filter(Boolean);
    const restaurar = []; const quitar = [];
    for (let i = 0; i < parts.length; i += 2) {
      if (parts[i] === 'A') quitar.push(parts[i + 1]); else restaurar.push({ archivo: parts[i + 1], estado: parts[i] === 'D' ? 'borrado' : 'modificado' });
    }
    repos.push({ dir: x.u.dir, punto: p, restaurar, quitar });
  }
  return { punto: target, repos };
}

/** Aplica el plan: antes guarda el estado actual de cada repo afectado (para rehacer). */
function restoreUnits(us, ref) {
  const plan = planUnits(us, ref);
  if (plan.error) return plan;
  const touched = us.filter(u => plan.repos.some(r => r.dir === u.dir));
  const antes = snapshotUnits(touched, `antes de deshacer (volver a ${plan.punto.id})`, { budgetMs: 120000 });
  for (const r of plan.repos) {
    if (r.restaurar.length) {
      const input = r.restaurar.map(x => x.archivo).join('\0') + '\0';
      const c = git(r.dir, ['checkout', r.punto.commit, '--pathspec-from-file=-', '--pathspec-file-nul'], { input, timeout: 60000 });
      if (c.status !== 0) return { error: `no se pudieron restaurar los archivos de ${r.dir}: ${(c.stderr || '').trim().split('\n')[0]}` };
    }
    r.quitados = [];
    for (const f of r.quitar) {
      const abs = path.resolve(r.dir, f);
      if (!isInside(r.dir, abs)) continue;
      try { fs.unlinkSync(abs); r.quitados.push(f); } catch { /* ya no existe */ }
    }
    currentTree(r.dir, 30000);
  }
  return { ...plan, rehacer: antes.hechos.length ? antes.id : null };
}

// ---------- una sola carpeta (compatibilidad) ----------
const single = root => [{ dir: path.resolve(root), excluir: [] }];

/** Punto por número (1 = más reciente), id o prefijo de id. */
function find(root, ref) {
  const all = list(root);
  if (ref === undefined || ref === null || ref === '') return null;
  if (/^\d{1,3}$/.test(String(ref))) return all[Number(ref) - 1] || null;
  return all.find(p => p.id === ref || p.id.startsWith(String(ref))) || null;
}

/** Vista previa en una sola carpeta: { punto, restaurar, quitar } */
function preview(root, ref) {
  const plan = planUnits(single(root), ref);
  if (plan.error) return plan;
  const r = plan.repos[0] || { restaurar: [], quitar: [] };
  return { punto: { ...plan.punto, commit: r.punto && r.punto.commit }, restaurar: r.restaurar, quitar: r.quitar };
}

/** Restaurar en una sola carpeta. */
function restore(root, ref) {
  const res = restoreUnits(single(root), ref);
  if (res.error) return res;
  const r = res.repos[0] || { restaurar: [], quitar: [], quitados: [] };
  return { punto: res.punto, restaurar: r.restaurar, quitar: r.quitar, quitados: r.quitados || [], rehacer: res.rehacer };
}

module.exports = { snapshot, list, preview, restore, find, dirFor, hasGit, isSlow, maintain, units, unitOf, snapshotUnits, turns, planUnits, restoreUnits, newId };
