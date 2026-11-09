'use strict';
// Trabajo en paralelo con git worktrees: una carpeta por tarea, cada una con su rama, compartiendo el historial
// del repositorio. Resuelve tener varias ventanas del agente en el mismo proyecto sin que cambiar de rama obligue
// a revertir o perder lo que está en curso.
//  - lo commiteado en una carpeta existe al instante para las demás: no hay que copiar archivos entre ellas;
//  - el estado del harness ya queda separado por worktree, porque se guarda según la ruta del proyecto;
//  - nada descarta cambios sin commitear: si el árbol está sucio, se niega y lo dice.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { relPosix } = require('./util');

const git = (root, args, timeout = 30000) => spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true, timeout, maxBuffer: 32 * 1024 * 1024 });
const ok = r => r.status === 0;
const out = r => String(r.stdout || '').trim();
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'rama';

/** ¿Hay git y estamos dentro de un repositorio? */
function check(root) {
  const r = git(root, ['rev-parse', '--git-dir']);
  if (!ok(r)) throw new Error('acá no hay un repositorio git (los worktrees son de git)');
}

/** Rama base del flujo: la que se indique, o la primera que exista de develop, main o master. */
function baseBranch(root, pedida) {
  if (pedida) {
    if (!ok(git(root, ['rev-parse', '--verify', `refs/heads/${pedida}`])) && !ok(git(root, ['rev-parse', '--verify', `refs/remotes/origin/${pedida}`]))) {
      throw new Error(`no existe la rama «${pedida}» ni local ni en origin`);
    }
    return pedida;
  }
  for (const b of ['develop', 'main', 'master']) {
    if (ok(git(root, ['rev-parse', '--verify', `refs/heads/${b}`])) || ok(git(root, ['rev-parse', '--verify', `refs/remotes/origin/${b}`]))) return b;
  }
  throw new Error('no encontré la rama base (develop, main ni master). Indícala con --desde <rama>');
}

/** Trae la rama base de origin. Sin red no es un error: se sigue con la copia local y se avisa. */
function fetchBase(root, base) {
  if (!out(git(root, ['remote']))) return { remoto: false, aviso: 'el repositorio no tiene remoto: se usa la rama local' };
  const r = git(root, ['fetch', 'origin', base, '--quiet'], 60000);
  if (!ok(r)) return { remoto: false, aviso: `no se pudo traer origin/${base} (¿sin red?): se usa la rama local` };
  return { remoto: true, aviso: '' };
}
const baseRef = (root, base, remoto) => (remoto && ok(git(root, ['rev-parse', '--verify', `refs/remotes/origin/${base}`])) ? `origin/${base}` : base);

/** Archivos con cambios sin commitear (incluye los no seguidos). */
// Ojo: el estado de git empieza con un espacio cuando el cambio no está preparado (« M archivo»), así que acá no
// se puede recortar la salida antes de partirla por líneas: se comería ese espacio y el nombre saldría cortado.
const dirty = root => String(git(root, ['status', '--porcelain', '--untracked-files=all']).stdout || '').split(/\r?\n/).filter(Boolean).map(l => l.slice(3).replace(/^.* -> /, '').replace(/^"|"$/g, ''));

/** Worktrees del repositorio, con su estado. El primero es el principal. */
function list(root) {
  check(root);
  const porcelain = out(git(root, ['worktree', 'list', '--porcelain']));
  const items = [];
  let cur = null;
  for (const line of porcelain.split('\n')) {
    if (line.startsWith('worktree ')) { cur = { dir: line.slice(9).trim(), rama: null, detached: false }; items.push(cur); }
    else if (cur && line.startsWith('branch ')) cur.rama = line.slice(7).replace('refs/heads/', '').trim();
    else if (cur && line.trim() === 'detached') cur.detached = true;
  }
  return items.map((w, i) => {
    const sucio = fs.existsSync(w.dir) ? dirty(w.dir) : [];
    let sinSubir = [];
    if (w.rama) {
      const up = git(w.dir, ['rev-parse', '--abbrev-ref', `${w.rama}@{upstream}`]);
      sinSubir = ok(up) ? out(git(w.dir, ['log', '--oneline', `${out(up)}..${w.rama}`])).split('\n').filter(Boolean)
        : out(git(w.dir, ['log', '--oneline', '-20', w.rama])).split('\n').filter(Boolean).length ? ['(la rama no está en origin)'] : [];
    }
    return { ...w, principal: i === 0, sucio, sinSubir, existe: fs.existsSync(w.dir) };
  });
}

/**
 * Carpeta nueva con una rama nacida de la base actualizada. No toca la carpeta actual: lo que tengas en curso
 * se queda donde está.
 */
function create(root, rama, { desde = null, ruta = null } = {}) {
  check(root);
  if (!String(rama || '').trim()) throw new Error('indica el nombre de la rama: worktree nuevo <rama>');
  const yaEsta = list(root).find(w => w.rama === rama);
  if (yaEsta) throw new Error(`la rama «${rama}» ya está en el worktree ${yaEsta.dir}`);
  if (ok(git(root, ['rev-parse', '--verify', `refs/heads/${rama}`]))) throw new Error(`la rama «${rama}» ya existe: úsala con «git worktree add <carpeta> ${rama}» o elige otro nombre`);
  const base = baseBranch(root, desde);
  const { remoto, aviso } = fetchBase(root, base);
  const dir = path.resolve(ruta ? path.resolve(root, ruta) : path.join(path.dirname(root), `${path.basename(root)}-${slug(rama)}`));
  if (fs.existsSync(dir)) throw new Error(`${dir} ya existe: indica otra ruta con --ruta`);
  const r = git(root, ['worktree', 'add', '-b', rama, dir, baseRef(root, base, remoto)], 120000);
  if (!ok(r)) throw new Error(`git no pudo crear el worktree: ${String(r.stderr || r.stdout).trim().slice(0, 300)}`);
  // La memoria del proyecto vive dentro del repo: la carpeta nueva nace con la de la rama base
  const memoria = ok(git(dir, ['ls-files', '--error-unmatch', '.sdd/memoria/sesion.md']));
  return { dir, rama, base, remoto, aviso, memoria };
}

/**
 * Archivos que quedarían en conflicto al traer `ref`, sin dejar nada a medias.
 * Con git 2.38+ se calcula sin tocar el árbol (`merge-tree --write-tree`). Con git más antiguo se hace una mezcla
 * en seco y se aborta siempre: solo se llama con el árbol limpio, así que abortar lo deja como estaba.
 * @returns {string[]|null} los archivos, o null si no se pudo prever.
 */
function preview(root, ref) {
  const mt = git(root, ['merge-tree', '--write-tree', '--name-only', 'HEAD', ref], 60000);
  if (ok(mt)) return [];
  if (!/unknown option|usage: git merge-tree/i.test(String(mt.stderr || ''))) return out(mt).split('\n').slice(1).filter(Boolean);
  // Respaldo para git < 2.38
  if (dirty(root).length) return null; // nunca se ensucia un árbol con cambios del usuario
  const m = git(root, ['merge', '--no-commit', '--no-ff', ref], 120000);
  const enConflicto = out(git(root, ['diff', '--name-only', '--diff-filter=U'])).split('\n').filter(Boolean);
  const abort = git(root, ['merge', '--abort'], 60000);
  if (!ok(abort) && ok(git(root, ['rev-parse', '--verify', 'MERGE_HEAD']))) {
    throw new Error('la vista previa dejó una mezcla a medio hacer y «git merge --abort» falló: revísalo con «git status» antes de seguir');
  }
  if (ok(m)) return [];
  // La mezcla en seco puede fallar por algo que no son conflictos (sin identidad de git, un hook que la rechaza):
  // entonces no se sabe, y decir «sin conflictos» sería peor que decirlo.
  return enConflicto.length ? enConflicto : null;
}

/** * Trae la base actualizada a este worktree y muestra qué entraría y qué choca. Solo mezcla con confirmar: así se
 * puede ver antes, y nunca se pierde lo que está sin commitear.
 */
function sync(root, { desde = null, confirmar = false } = {}) {
  check(root);
  const sucio = dirty(root);
  if (sucio.length) return { bloqueado: `hay ${sucio.length} archivo(s) sin commitear (${sucio.slice(0, 5).join(', ')}${sucio.length > 5 ? '…' : ''}). Haz commit o guárdalos antes de traer la base: traer cambios encima se puede perder trabajo.` };
  const base = baseBranch(root, desde);
  const rama = out(git(root, ['rev-parse', '--abbrev-ref', 'HEAD']));
  if (rama === base) return { bloqueado: `estás en «${base}», que es la propia rama base: cámbiate a tu rama de trabajo` };
  const { remoto, aviso } = fetchBase(root, base);
  const ref = baseRef(root, base, remoto);
  const entran = out(git(root, ['log', '--oneline', `HEAD..${ref}`])).split('\n').filter(Boolean);
  const tuyos = out(git(root, ['log', '--oneline', `${ref}..HEAD`])).split('\n').filter(Boolean);
  const archivos = out(git(root, ['diff', '--name-only', `HEAD...${ref}`])).split('\n').filter(Boolean);
  const conflictos = preview(root, ref);
  const r = { rama, base, ref, entran, tuyos, archivos, conflictos, aviso, mezclado: false };
  if (!entran.length) return { ...r, nada: true };
  if (!confirmar) return r;
  if (conflictos && conflictos.length) return { ...r, bloqueado: `la mezcla deja ${conflictos.length} archivo(s) en conflicto: resuélvelos tú con «git merge ${ref}» para verlos en el editor` };
  const m = git(root, ['merge', '--no-edit', ref], 120000);
  if (!ok(m)) return { ...r, bloqueado: `git no pudo mezclar: ${String(m.stderr || m.stdout).trim().slice(0, 300)}` };
  return { ...r, mezclado: true };
}

/** Quita un worktree terminado. Avisa si tiene cambios sin commitear o commits sin subir; solo quita con confirmar. */
function close(root, ref, { confirmar = false } = {}) {
  check(root);
  const ws = list(root);
  const w = ws.find(x => !x.principal && (x.rama === ref || path.resolve(x.dir) === path.resolve(root, ref || '')));
  if (!w) throw new Error(`no encontré ese worktree. Abiertos: ${ws.filter(x => !x.principal).map(x => `${x.rama || '(sin rama)'} → ${x.dir}`).join(' · ') || 'ninguno'}`);
  const riesgos = [];
  if (w.sucio.length) riesgos.push(`${w.sucio.length} archivo(s) sin commitear`);
  if (w.sinSubir.length) riesgos.push(`${w.sinSubir.length} commit(s) sin subir`);
  if (!confirmar) return { worktree: w, riesgos, quitado: false };
  if (riesgos.length) return { worktree: w, riesgos, quitado: false, bloqueado: `no se quita con ${riesgos.join(' y ')}: súbelos o descártalos tú primero` };
  const r = git(root, ['worktree', 'remove', w.dir], 60000);
  if (!ok(r)) return { worktree: w, riesgos, quitado: false, bloqueado: `git no pudo quitarlo: ${String(r.stderr || r.stdout).trim().slice(0, 200)}` };
  return { worktree: w, riesgos, quitado: true };
}

module.exports = { list, create, sync, close, baseBranch, dirty, relPosix };
