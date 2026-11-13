'use strict';
// Perfiles de proyecto: la configuración de IA de un repositorio concreto (CLAUDE.md, .claude/agents, rules, skills,
// settings y el fragmento de .sdd/harness.json) mantenida en el harness y aplicada al proyecto con un comando.
// Así el núcleo (core/) sigue genérico y lo propio de un equipo o de un repo vive en perfiles/<nombre>/:
//   perfil.json   nombre, versión, descripción, detectar {archivo, contiene}, semillas [rutas], reemplaza [{ruta, motivo}]
//   harness.json  fragmento que se mezcla en <proyecto>/.sdd/harness.json (las claves que empiezan con _ son notas)
//   proyecto/     archivos tal cual van en la raíz del proyecto
// Aplicar nunca borra: lo que el perfil deja obsoleto (reemplaza) se informa para que la persona lo quite en una PR.
// Las semillas solo se crean si faltan (son del equipo: p. ej. la memoria). El resto lo gestiona el perfil y se
// reemplaza, salvo que tenga cambios sin commitear (se pide --forzar).
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { isInside } = require('./util');

const DIR = process.env.SDD_PERFILES_DIR || path.join(__dirname, '..', '..', 'perfiles');
const NOMBRE = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const CONFIG = '.sdd/harness.json';

const posix = p => String(p).replace(/\\/g, '/');
const lf = t => String(t).replace(/\r\n/g, '\n');
const readJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')); } catch { return null; } };
const sinNotas = o => (Array.isArray(o) ? o.map(sinNotas) : o && typeof o === 'object'
  ? Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('_')).map(([k, v]) => [k, sinNotas(v)])) : o);

/** Perfiles disponibles (los que tienen un perfil.json válido). */
function listar(dir = DIR) {
  let es; try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  return es.filter(e => e.isDirectory() && NOMBRE.test(e.name)).map(e => {
    const meta = readJson(path.join(dir, e.name, 'perfil.json'));
    return meta && meta.nombre === e.name ? { nombre: e.name, version: String(meta.version || '0'), descripcion: String(meta.descripcion || ''), ruta: path.join(dir, e.name) } : null;
  }).filter(Boolean).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/** Archivos de proyecto/ (rutas posix relativas), sin enlaces simbólicos ni el harness.json del proyecto. */
function archivosDe(base) {
  const out = [];
  const walk = (d, rel) => {
    let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of es.sort((a, b) => a.name.localeCompare(b.name))) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(d, e.name), r);
      else if (e.isFile() && r !== CONFIG) out.push(r);
    }
  };
  walk(base, '');
  return out;
}

/** Perfil completo o un error legible. */
function cargar(nombre, dir = DIR) {
  if (!NOMBRE.test(String(nombre || ''))) throw new Error(`nombre de perfil inválido: «${nombre}»`);
  const ruta = path.join(dir, nombre);
  const meta = readJson(path.join(ruta, 'perfil.json'));
  if (!meta || meta.nombre !== nombre) {
    const hay = listar(dir).map(p => p.nombre);
    throw new Error(`no existe el perfil «${nombre}»${hay.length ? ` (disponibles: ${hay.join(', ')})` : ''}`);
  }
  const fragmento = fs.existsSync(path.join(ruta, 'harness.json')) ? readJson(path.join(ruta, 'harness.json')) : {};
  if (!fragmento || typeof fragmento !== 'object' || Array.isArray(fragmento)) throw new Error(`perfiles/${nombre}/harness.json no es un objeto JSON válido`);
  return { meta, ruta, version: String(meta.version || '0'), archivos: archivosDe(path.join(ruta, 'proyecto')), fragmento: sinNotas(fragmento),
    semillas: new Set((meta.semillas || []).map(posix)), reemplaza: Array.isArray(meta.reemplaza) ? meta.reemplaza : [] };
}

/** Une dos listas: los objetos con «nombre» se reemplazan por nombre; lo demás se suma sin repetir. */
function unir(base, extra) {
  const out = [...base];
  for (const v of extra) {
    const i = v && typeof v === 'object' && v.nombre ? out.findIndex(x => x && x.nombre === v.nombre) : out.findIndex(x => JSON.stringify(x) === JSON.stringify(v));
    if (i >= 0) out[i] = v; else out.push(v);
  }
  return out;
}

/** Mezcla el fragmento del perfil en la configuración del proyecto: objetos por clave, listas sumadas, el resto lo fija el perfil. */
function mezclar(base, frag) {
  const out = { ...(base || {}) };
  for (const [k, v] of Object.entries(frag || {})) {
    if (Array.isArray(v)) out[k] = unir(Array.isArray(out[k]) ? out[k] : [], v);
    else if (v && typeof v === 'object') out[k] = mezclar(out[k] && typeof out[k] === 'object' && !Array.isArray(out[k]) ? out[k] : {}, v);
    else out[k] = v;
  }
  return out;
}

/** Archivos con cambios sin commitear entre `rels` (vacío fuera de git o sin git). */
function sinCommitear(root, rels) {
  if (!rels.length) return new Set();
  const r = spawnSync('git', ['-C', root, 'status', '--porcelain', '--untracked-files=all', '--', ...rels], { encoding: 'utf8', windowsHide: true, timeout: 15000 });
  if (r.status !== 0) return new Set();
  return new Set(String(r.stdout).split(/\r?\n/).filter(Boolean).map(l => posix(l.slice(3).replace(/^"|"$/g, '').split(' -> ').pop())));
}

/**
 * Qué haría aplicar el perfil en `root`, sin escribir nada.
 * archivos[].accion: crear | reemplazar | igual | semilla (la semilla ya existe y no se toca)
 */
function planificar(root, nombre, { dir = DIR } = {}) {
  const p = cargar(nombre, dir);
  const base = path.resolve(root);
  let coincide = null;
  const det = p.meta.detectar;
  if (det && det.archivo) {
    let txt = null; try { txt = fs.readFileSync(path.join(base, det.archivo), 'utf8'); } catch { /* no existe */ }
    coincide = txt !== null && (!det.contiene || txt.includes(det.contiene));
  }
  const archivos = p.archivos.map(rel => {
    const destino = path.join(base, ...rel.split('/'));
    if (!isInside(base, destino)) throw new Error(`ruta fuera del proyecto en el perfil: ${rel}`);
    const nuevo = fs.readFileSync(path.join(p.ruta, 'proyecto', ...rel.split('/')), 'utf8');
    let actual = null; try { actual = fs.readFileSync(destino, 'utf8'); } catch { /* no existe */ }
    const accion = actual === null ? 'crear' : p.semillas.has(rel) ? 'semilla' : lf(actual) === lf(nuevo) ? 'igual' : 'reemplazar';
    return { rel, destino, nuevo, crlf: actual !== null && actual.includes('\r\n'), accion };
  });
  const dirty = sinCommitear(base, archivos.filter(a => a.accion === 'reemplazar').map(a => a.rel));
  for (const a of archivos) a.sinCommitear = dirty.has(a.rel);
  const cfgFile = path.join(base, ...CONFIG.split('/'));
  const existe = fs.existsSync(cfgFile);
  const actual = existe ? readJson(cfgFile) : {};
  let config;
  if (existe && (!actual || typeof actual !== 'object' || Array.isArray(actual))) config = { accion: 'invalida', archivo: cfgFile };
  else {
    const resultado = mezclar(actual, { ...p.fragmento, _perfil: { nombre, version: p.version } });
    const claves = Object.keys(resultado).filter(k => JSON.stringify(resultado[k]) !== JSON.stringify((actual || {})[k]));
    config = { accion: !existe ? 'crear' : claves.length ? 'actualizar' : 'igual', claves, resultado, archivo: cfgFile };
  }
  const obsoletos = p.reemplaza.filter(o => o && o.ruta && fs.existsSync(path.join(base, ...posix(o.ruta).split('/'))));
  return { perfil: { nombre, version: p.version, descripcion: String(p.meta.descripcion || ''), detectar: det || null }, root: base, coincide, archivos, config, obsoletos,
    previo: existe && actual && actual._perfil ? actual._perfil : null };
}

/** Archivos que se escribirían (crear o reemplazar) y si la configuración cambia. */
const pendientes = pl => pl.archivos.filter(a => a.accion === 'crear' || a.accion === 'reemplazar').length + (pl.config.accion === 'crear' || pl.config.accion === 'actualizar' ? 1 : 0);

/**
 * Aplica el perfil. Se niega (sin escribir nada) si el proyecto no es el del perfil, si .sdd/harness.json es
 * ilegible o si hay archivos por reemplazar con cambios sin commitear; `forzar` salta los dos chequeos de seguridad
 * del proyecto (nunca el del JSON inválido, que perdería la configuración).
 */
function aplicar(root, nombre, { dir = DIR, forzar = false } = {}) {
  const pl = planificar(root, nombre, { dir });
  if (pl.config.accion === 'invalida') return { ...pl, error: `${posix(pl.config.archivo)} no es JSON válido: corrígelo antes de aplicar el perfil` };
  if (pl.coincide === false && !forzar) return { ...pl, error: `este proyecto no parece el del perfil (${pl.perfil.detectar.archivo} no contiene ${pl.perfil.detectar.contiene || 'lo esperado'}); usa --forzar si es el correcto` };
  const sucios = pl.archivos.filter(a => a.sinCommitear).map(a => a.rel);
  if (sucios.length && !forzar) return { ...pl, error: `hay cambios sin commitear en archivos que el perfil reemplaza (${sucios.join(', ')}): commitéalos o descártalos, o usa --forzar` };
  const escritos = [];
  for (const a of pl.archivos) {
    if (a.accion !== 'crear' && a.accion !== 'reemplazar') continue;
    fs.mkdirSync(path.dirname(a.destino), { recursive: true });
    fs.writeFileSync(a.destino, a.crlf ? lf(a.nuevo).replace(/\n/g, '\r\n') : lf(a.nuevo));
    escritos.push(a.rel);
  }
  if (pl.config.accion === 'crear' || pl.config.accion === 'actualizar') {
    fs.mkdirSync(path.dirname(pl.config.archivo), { recursive: true });
    const tmp = `${pl.config.archivo}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(pl.config.resultado, null, 2)}\n`);
    fs.renameSync(tmp, pl.config.archivo);
    escritos.push(CONFIG);
  }
  return { ...pl, escritos };
}

/** Para doctor: el perfil aplicado al proyecto (según .sdd/harness.json → _perfil) y cuánto difiere hoy. */
function estado(root, { dir = DIR } = {}) {
  const cfg = readJson(path.join(root, ...CONFIG.split('/')));
  const prev = cfg && cfg._perfil;
  if (!prev || !prev.nombre) return null;
  try {
    const pl = planificar(root, prev.nombre, { dir });
    return { nombre: prev.nombre, aplicada: String(prev.version || '?'), disponible: pl.perfil.version, pendientes: pendientes(pl) };
  } catch (e) { return { nombre: prev.nombre, aplicada: String(prev.version || '?'), error: e.message }; }
}

module.exports = { DIR, listar, cargar, planificar, aplicar, estado, mezclar, pendientes };
