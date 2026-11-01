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
  presupuesto: { modo: 'ahorro', maxSubagentes: 3 },
  reglas: [], // reglas propias: [{ nombre, archivos, prohibido (regex), mensaje, excepto }] // ahorro | normal | libre · tope de sub-agentes por mensaje del usuario
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

function loadConfig(root) {
  const global = readJson(GLOBAL_CONFIG);
  const project = root ? readJson(path.join(root, '.sdd', 'harness.json')) : null;
  let cfg = merge(merge(DEFAULTS, global), project);
  const lists = k => [...((global && global.permisos && global.permisos[k]) || []), ...((project && project.permisos && project.permisos[k]) || [])];
  cfg.permisos = { ...cfg.permisos, permitir: lists('permitir'), preguntar: lists('preguntar'), denegar: lists('denegar'), mcpLibres: lists('mcpLibres'), mcpBloquear: lists('mcpBloquear') };
  cfg.reglas = [...((global && global.reglas) || []), ...((project && project.reglas) || [])];
  if (!['auto', 'siempre', 'nunca'].includes(cfg.gate)) cfg.gate = 'auto';
  if (!Array.isArray(cfg.sensores.alTerminar)) cfg.sensores.alTerminar = [];
  return cfg;
}

module.exports = { loadConfig, DEFAULTS };
