'use strict';
// Configuración del harness: valores por defecto ← ~/.sdd-orquestador/harness.json ← <proyecto>/.sdd/harness.json
// (el proyecto manda). Las listas de permisos se suman; el resto se reemplaza.
const fs = require('fs');
const path = require('path');
const { GLOBAL_CONFIG } = require('./paths');

const DEFAULTS = {
  gate: 'auto',                    // auto: pedidos de cambio requieren plan aprobado · siempre · nunca
  sensores: {
    alEditar: true,                // chequeos rápidos por archivo (JSON, YAML, conflictos de merge, gofmt)
    alTerminar: ['lint', 'tipos', 'tests'],
    comandos: {},                  // { "lint": "...", "tipos": "...", "tests": "..." } — {archivos} = archivos cambiados
    timeoutSeg: 240,               // por comando
    presupuestoSeg: 600,           // total al terminar el turno
    maxBloqueos: 2,                // veces seguidas que se impide terminar con sensores en rojo
  },
  permisos: { permitir: [], preguntar: [], denegar: [], mcpLibres: [], mcpBloquear: [] },
  salida: { compactar: true, maxCaracteres: 4000 }, // salidas largas de tests/lint/build → errores + resumen
  presupuesto: { modo: 'ahorro', maxSubagentes: 3 }, // ahorro | normal | libre · tope de sub-agentes por mensaje del usuario
  reglas: [], // reglas propias: [{ nombre, archivos, prohibido (regex) | noImportar | nombreArchivo | maxLineas, mensaje, excepto }]
  deshacer: { activo: true, maxPuntos: 30, excluir: [] }, // puntos de restauración antes de cada turno que modifica archivos
  seguridad: { contenidoExterno: true, secretosEnCodigo: true }, // envío de datos tras leer contenido externo · secretos en ediciones
};

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function merge(base, over) {
  if (!over || typeof over !== 'object') return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (k.startsWith('_')) continue;
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) out[k] = merge(base[k], v);
    else out[k] = v;
  }
  return out;
}

const projectFile = dir => (dir ? readJson(path.join(dir, '.sdd', 'harness.json')) : null);
const same = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

/**
 * Configuración efectiva. Con `projectDir` (un proyecto dentro de la carpeta abierta), su .sdd/harness.json manda
 * sobre el de la raíz: global ← raíz ← proyecto. Las listas de permisos y las reglas se suman.
 */
function loadConfig(root, projectDir) {
  const layers = [readJson(GLOBAL_CONFIG), projectFile(root)];
  if (projectDir && root && !same(projectDir, root)) layers.push(projectFile(projectDir));
  const cfg = layers.reduce((acc, l) => merge(acc, l), DEFAULTS);
  const lists = k => layers.flatMap(l => (l && l.permisos && l.permisos[k]) || []);
  cfg.permisos = { ...cfg.permisos, permitir: lists('permitir'), preguntar: lists('preguntar'), denegar: lists('denegar'), mcpLibres: lists('mcpLibres'), mcpBloquear: lists('mcpBloquear') };
  cfg.reglas = layers.flatMap(l => (l && l.reglas) || []);
  if (!['auto', 'siempre', 'nunca'].includes(cfg.gate)) cfg.gate = 'auto';
  if (!Array.isArray(cfg.sensores.alTerminar)) cfg.sensores.alTerminar = [];
  return cfg;
}

/**
 * Reglas propias con la carpeta contra la que se evalúan sus rutas ("archivos", "noImportar"):
 *   globales → el proyecto del archivo · las de la raíz → la raíz · las de un proyecto con su propio harness.json → ese proyecto.
 * @returns {{base: string, reglas: object[]}[]}
 */
function rulesFor(root, { project, owner } = {}) {
  const g = readJson(GLOBAL_CONFIG);
  const out = [{ base: project || root, reglas: (g && g.reglas) || [] }, { base: root, reglas: (projectFile(root) || {}).reglas || [] }];
  if (owner && !same(owner, root)) out.push({ base: owner, reglas: (projectFile(owner) || {}).reglas || [] });
  return out.filter(x => Array.isArray(x.reglas) && x.reglas.length);
}

module.exports = { loadConfig, rulesFor, DEFAULTS };
