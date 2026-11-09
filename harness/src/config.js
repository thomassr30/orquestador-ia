'use strict';
// Configuración del harness: valores por defecto ← ~/.sdd-orquestador/harness.json ← <proyecto>/.sdd/harness.json
// (el proyecto manda). Las listas de permisos se suman; el resto se reemplaza.
const fs = require('fs');
const path = require('path');
const { GLOBAL_CONFIG, STATE_DIR } = require('./paths');
const { shortHash } = require('./util');

const DEFAULTS = {
  gate: 'auto',                    // auto: todo exige plan salvo consulta, saludo o aprobación · pedido: solo pedidos reconocidos (anterior) · siempre · nunca
  modo: 'normal',                  // normal · estricto: falla cerrada salvo lecturas, herramientas desconocidas y "ask" no críticos piden aprobación
  sensores: {
    alEditar: true,                // chequeos rápidos por archivo (JSON, YAML, conflictos de merge, gofmt)
    alTerminar: ['lint', 'tipos', 'tests'],
    obligatorios: ['tests'],       // si el proyecto los tiene, deben correr y pasar; omitirlos deja el cambio «no verificado»
    comandos: {},                  // { "lint": "...", "tipos": "...", "tests": "..." } — {archivos} = archivos cambiados
    timeoutSeg: 240,               // por comando
    presupuestoSeg: 600,           // total al terminar el turno
    maxBloqueos: 2,                // veces seguidas que se impide terminar con sensores en rojo
  },
  permisos: { permitir: [], preguntar: [], denegar: [], mcpLibres: [], mcpBloquear: [], porDefecto: 'ask', permitirSecretos: false },
  salida: { compactar: true, maxCaracteres: 4000 }, // salidas largas de tests/lint/build → errores + resumen
  // ahorro | normal | libre · tope de sub-agentes por mensaje del usuario · minutos por pedido y tokens por sesión
  // (desactivados: null; los tokens solo se miden donde el cliente los expone, hoy Claude Code)
  presupuesto: { modo: 'ahorro', maxSubagentes: 3, maxMinutosPorPedido: null, maxTokensSesion: null },
  trabajo: { maxIntentosSinProgreso: 3 }, // intentos seguidos con el mismo resultado que dejan una tarea bloqueada
  reglas: [], // reglas propias: [{ nombre, archivos, prohibido (regex) | noImportar | nombreArchivo | maxLineas, mensaje, excepto }]
  deshacer: { activo: true, maxPuntos: 30, excluir: [] }, // puntos de restauración antes de cada turno que modifica archivos
  seguridad: { contenidoExterno: true, secretosEnCodigo: true }, // envío de datos tras leer contenido externo · secretos en ediciones
  aprobaciones: { vigenciaMin: 30 }, // minutos que vale una confirmación en el chat (solicitud pendiente o aprobada, un solo uso)
  espacio: { profundidad: null, maxCarpetas: 20000 }, // detección de proyectos: niveles (null = sin límite) y total de carpetas revisadas
};

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

/**
 * Configuración de un archivo con diagnóstico. Si existe pero no se puede leer, se usa la última versión válida
 * guardada (en el estado del harness, fuera del proyecto) para no perder en silencio sus restricciones.
 * @returns {{data: object|null, problema: string|null}}
 */
function readConfigFile(file) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch (e) { return { data: null, problema: e.code === 'ENOENT' ? null : `no se pudo leer ${file} (${e.code})` }; }
  const cache = path.join(STATE_DIR, 'config-valida', `${shortHash(path.resolve(file).toLowerCase())}.json`);
  try {
    const data = JSON.parse(raw.replace(/^﻿/, ''));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('no es un objeto JSON');
    try { if (!fs.existsSync(cache) || fs.readFileSync(cache, 'utf8') !== raw) { fs.mkdirSync(path.dirname(cache), { recursive: true }); fs.writeFileSync(cache, raw); } } catch { /* caché opcional */ }
    return { data, problema: null };
  } catch (e) {
    const prev = readJson(cache);
    return { data: prev, problema: `${file} tiene JSON inválido (${e.message.slice(0, 80)}); ${prev ? 'se usa su última versión válida' : 'no hay versión válida guardada: se usan los valores por defecto'}` };
  }
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

const projectFile = dir => (dir ? readConfigFile(path.join(dir, '.sdd', 'harness.json')).data : null);
const same = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

/**
 * Configuración efectiva. Con `projectDir` (un proyecto dentro de la carpeta abierta), su .sdd/harness.json manda
 * sobre el de la raíz: global ← raíz ← proyecto. Las listas de permisos y las reglas se suman.
 * `cfg.problemas` lista los archivos de configuración ilegibles (se informan al iniciar sesión y en doctor).
 */
function loadConfig(root, projectDir) {
  const files = [GLOBAL_CONFIG, root && path.join(root, '.sdd', 'harness.json')];
  if (projectDir && root && !same(projectDir, root)) files.push(path.join(projectDir, '.sdd', 'harness.json'));
  const read = files.filter(Boolean).map(readConfigFile);
  const layers = read.map(r => r.data);
  const cfg = layers.reduce((acc, l) => merge(acc, l), DEFAULTS);
  cfg.problemas = read.map(r => r.problema).filter(Boolean);
  if (!['normal', 'estricto'].includes(cfg.modo)) cfg.modo = 'normal';
  if (!Array.isArray(cfg.sensores.obligatorios)) cfg.sensores.obligatorios = [];
  const lists = k => layers.flatMap(l => (l && l.permisos && l.permisos[k]) || []);
  cfg.permisos = { ...cfg.permisos, permitir: lists('permitir'), preguntar: lists('preguntar'), denegar: lists('denegar'), mcpLibres: lists('mcpLibres'), mcpBloquear: lists('mcpBloquear') };
  cfg.reglas = layers.flatMap(l => (l && l.reglas) || []);
  if (!['auto', 'pedido', 'siempre', 'nunca'].includes(cfg.gate)) cfg.gate = 'auto';
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

module.exports = { loadConfig, rulesFor, readConfigFile, DEFAULTS };
