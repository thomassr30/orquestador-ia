'use strict';
// Aprobaciones de acciones críticas confirmadas en el chat (Codex, Gemini, Cursor y OpenCode; Claude y Copilot usan su
// diálogo nativo, que pregunta en cada llamada). Cada aprobación queda ligada a la acción EXACTA: tipo, herramienta,
// operación, argumentos normalizados, proyecto y sesión. Del estado solo se guarda un HMAC con una clave local
// aleatoria y una etiqueta sin valores (nunca el comando ni los argumentos). Vence (30 min por defecto) y se consume
// una sola vez, dentro del candado del estado: dos llamadas en paralelo no pueden usar la misma aprobación.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { SDD_HOME } = require('./paths');
const { IS_WIN } = require('./util');

const KEY_FILE = path.join(SDD_HOME, 'clave-aprobaciones');
const sleepSync = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
let cachedKey = null;

/** Clave local del HMAC (32 bytes aleatorios, solo legible por el usuario). */
function key() {
  if (cachedKey) return cachedKey;
  const read = () => { try { const k = Buffer.from(fs.readFileSync(KEY_FILE, 'utf8').trim(), 'hex'); return k.length >= 32 ? k : null; } catch { return null; } };
  let k = read();
  if (!k) {
    fs.mkdirSync(SDD_HOME, { recursive: true });
    try { fs.writeFileSync(KEY_FILE, crypto.randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 }); } catch (e) { if (e.code !== 'EEXIST') throw e; }
    for (let i = 0; i < 20 && !(k = read()); i++) sleepSync(10); // otro proceso la está creando
  }
  if (!k) throw new Error('no se pudo leer la clave local de aprobaciones');
  cachedKey = k;
  return k;
}

/** JSON con claves ordenadas: dos objetos iguales dan el mismo texto sin importar el orden de sus claves. */
function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  return JSON.stringify(v === undefined ? null : v);
}
const normRoot = r => { const x = path.resolve(String(r || '.')); return IS_WIN ? x.toLowerCase() : x; };
const normCommand = c => String(c || '').trim().replace(/\s+/g, ' ');
const sha256 = s => crypto.createHash('sha256').update(String(s)).digest('hex');

/**
 * Identidad de una acción.
 * @param {{tipo:string, herramienta?:string, operacion?:string, args?:any, root:string, sesion:string, etiqueta?:string}} a
 * @returns {{huella:string, tipo:string, etiqueta:string}}
 */
function identity(a) {
  const material = canonical([a.tipo, a.herramienta || '', a.operacion || '', a.args === undefined ? null : a.args, normRoot(a.root), String(a.sesion || 'default')]);
  return { huella: crypto.createHmac('sha256', key()).update(material).digest('hex'), tipo: a.tipo, etiqueta: String(a.etiqueta || a.tipo).slice(0, 140) };
}

// Etiquetas legibles SIN valores: primera palabra y subcomando (si parece uno), claves de argumentos, rutas relativas.
const commandLabel = cmd => { const [a, b] = normCommand(cmd).split(' '); return `comando ${a || ''}${b && /^[a-z][\w:-]{0,30}$/i.test(b) ? ` ${b}` : ''}`.trim(); };
const forCommand = (ev, cmd) => identity({ tipo: 'comando', herramienta: 'shell', args: normCommand(cmd), root: ev.root, sesion: ev.sessionId, etiqueta: commandLabel(cmd) });
const forMcp = (ev, t) => identity({ tipo: 'mcp', herramienta: String(t.server || ''), operacion: String(t.tool || ''), args: t.args || {}, root: ev.root, sesion: ev.sessionId,
  etiqueta: `mcp ${t.server ? `${t.server}/` : ''}${t.tool}${t.args && typeof t.args === 'object' && Object.keys(t.args).length ? ` · args: ${Object.keys(t.args).sort().join(', ').slice(0, 80)}` : ''}` });
const forEdit = (ev, rel, contents) => identity({ tipo: 'edicion', operacion: String(rel), args: sha256((contents || []).join('\u0000')), root: ev.root, sesion: ev.sessionId, etiqueta: `editar ${rel}` });
const forSend = (ev, t, host, url) => identity({ tipo: 'envio', herramienta: String(t.name || ''), args: String(url || ''), root: ev.root, sesion: ev.sessionId, etiqueta: `envío de datos a ${host}` });
const forBudget = (ev, recurso = 'subagentes') => identity({ tipo: 'presupuesto', operacion: recurso, root: ev.root, sesion: ev.sessionId, etiqueta: recurso === 'subagentes' ? 'más sub-agentes' : `presupuesto: ${recurso}` });
const forException = (ev, control, huella) => identity({ tipo: 'excepcion', operacion: control, args: huella, root: ev.root, sesion: ev.sessionId, etiqueta: `excepción del control ${control}` });

const same = (a, b) => { const x = Buffer.from(String(a), 'hex'); const y = Buffer.from(String(b), 'hex'); return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y); };
const alive = (e, now) => !e.vence || Date.parse(e.vence) > now;

/** Quita pendientes y aprobadas vencidas. */
function purge(state, now = Date.now()) {
  const a = state.aprobaciones;
  a.pendientes = (a.pendientes || []).filter(e => e.huella && alive(e, now));
  a.aprobadas = (a.aprobadas || []).filter(e => e.huella && alive(e, now));
}

/** Registra (o renueva) una solicitud pendiente de confirmación. */
function request(state, ident, { vigenciaMin = 30, datos } = {}) {
  const now = Date.now();
  purge(state, now);
  const p = state.aprobaciones.pendientes;
  const prev = p.find(x => same(x.huella, ident.huella));
  const entry = { id: prev ? prev.id : crypto.randomBytes(3).toString('hex'), huella: ident.huella, tipo: ident.tipo, etiqueta: ident.etiqueta, en: new Date(now).toISOString(), vence: new Date(now + vigenciaMin * 60000).toISOString(), ...(datos ? { datos } : {}) };
  // Una solicitud repetida conserva su lugar: los números que vio el usuario («sí 2») no cambian de significado
  state.aprobaciones.pendientes = prev ? p.map(x => (x === prev ? entry : x)) : [...p, entry].slice(-10);
  return entry;
}

/** Consume (una vez) la aprobación vigente de esta acción exacta. Llamar dentro de updateState. */
function consume(state, huella) {
  purge(state);
  const a = state.aprobaciones.aprobadas;
  const i = a.findIndex(e => same(e.huella, huella));
  if (i < 0) return null;
  return a.splice(i, 1)[0];
}

const fold = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** ¿Qué pendientes eligió el usuario? 'todas', una lista de números (1 = la más antigua) o null si no lo dijo. */
function selection(text) {
  const t = fold(text);
  if (/(?<![\p{L}])(?:a todas|todas|todos|a todo|todo|all)(?![\p{L}])/u.test(t)) return 'todas';
  const nums = [...t.matchAll(/(?<![\p{L}\p{N}])(\d{1,2})(?![\p{L}\p{N}])/gu)].map(m => Number(m[1])).filter(n => n > 0);
  return nums.length ? [...new Set(nums)] : null;
}

/**
 * Mensaje del usuario con solicitudes pendientes. Con una sola, un «sí» la aprueba; con varias, el usuario debe decir
 * cuáles («sí 1,3» o «sí a todas»): un «sí» sin más no aprueba ninguna. Otro mensaje que no aprueba las descarta.
 * @returns {{notas:string[], habia:boolean, aprobadas:object[], ambiguo?:boolean}}
 */
function onUserReply(state, text, approval, { vigenciaMin = 30 } = {}) {
  const now = Date.now();
  purge(state, now);
  const pend = state.aprobaciones.pendientes;
  if (!pend.length) return { notas: [], habia: false, aprobadas: [] };
  if (!approval) { state.aprobaciones.pendientes = []; return { notas: [], habia: true, aprobadas: [] }; }
  const sel = pend.length > 1 ? selection(text) : null;
  if (pend.length > 1 && !sel) {
    return { habia: true, ambiguo: true, aprobadas: [], notas: [`Hay ${pend.length} acciones esperando confirmación y el «sí» del usuario no dice cuál: ${pend.map((p, i) => `${i + 1}) ${p.etiqueta}`).join(' · ')}. Muéstraselas numeradas (con el comando o cambio exacto de cada una) y pídele que responda «sí 1,3» o «sí a todas». No ejecutes ninguna hasta entonces.`] };
  }
  const chosen = sel === 'todas' || pend.length === 1 ? pend : sel.map(n => pend[n - 1]).filter(Boolean);
  const vence = new Date(now + vigenciaMin * 60000).toISOString();
  state.aprobaciones.aprobadas = [...state.aprobaciones.aprobadas, ...chosen.map(p => ({ id: p.id, huella: p.huella, tipo: p.tipo, etiqueta: p.etiqueta, en: new Date(now).toISOString(), vence, ...(p.datos ? { datos: p.datos } : {}) }))].slice(-20);
  state.aprobaciones.pendientes = [];
  if (!chosen.length) return { habia: true, aprobadas: [], notas: ['El usuario respondió con números que no corresponden a ninguna acción pendiente: no se aprobó nada.'] };
  return { habia: true, aprobadas: chosen, notas: [`El usuario aprobó (una vez, vence en ${vigenciaMin} min): ${chosen.map(p => p.etiqueta).join(' · ')}. Ejecútalo exactamente igual: si cambias el comando, los argumentos o el contenido, hará falta una nueva confirmación.`] };
}

module.exports = { identity, canonical, forCommand, forMcp, forEdit, forSend, forBudget, forException, request, consume, purge, onUserReply, selection, normCommand };
