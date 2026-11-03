'use strict';
// Eventos reales recibidos de cada cliente (sin contenido del payload) y último error interno del hook.
// Sirven a doctor para distinguir una prueba sintética de una integración confirmada en el cliente real.
// Costo mínimo: solo se escribe la primera vez o si pasó ≥ 1 h para ese cliente/evento. Nunca rompe el hook.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { SDD_HOME } = require('./paths');

const FILE = path.join(SDD_HOME, 'observado.json');
const ERROR_FILE = path.join(SDD_HOME, 'ultimo-error.json');
const HORA = 3600 * 1000;
const NOMBRE = /^(?!(?:__proto__|constructor|prototype)$)[\w.:-]{1,60}$/;

const readJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1));
  fs.renameSync(tmp, file);
}

/** Registra que el cliente envió el evento nativo. Las pruebas sintéticas de doctor (SDD_DOCTOR=1) no cuentan. */
function record(cliente, evento, now = Date.now()) {
  try {
    if (process.env.SDD_DOCTOR === '1' || !NOMBRE.test(String(cliente)) || !NOMBRE.test(String(evento))) return false;
    const data = readJson(FILE) || {};
    const prev = Object.prototype.hasOwnProperty.call(data, cliente) ? data[cliente] : {};
    const e = Object.prototype.hasOwnProperty.call(prev, evento) ? prev[evento] : null;
    if (e && now - Date.parse(e.ultima) < HORA) return false;
    const at = new Date(now).toISOString();
    data[cliente] = { ...prev, [evento]: { primera: (e && e.primera) || at, ultima: at, n: ((e && Number(e.n)) || 0) + 1 } };
    writeJson(FILE, data);
    return true;
  } catch { return false; }
}

/** Eventos observados: { cliente: { eventoNativo: { primera, ultima, n } } } (n = registros, máx. uno por hora). */
const read = () => { const d = readJson(FILE); return d && typeof d === 'object' ? d : {}; };

/** Resumen de un cliente: última fecha y eventos vistos, o null si nunca envió eventos. */
function resumen(cliente, data = read()) {
  const evs = Object.prototype.hasOwnProperty.call(data, cliente) ? data[cliente] || {} : {};
  const nombres = Object.keys(evs).filter(k => evs[k] && evs[k].ultima);
  if (!nombres.length) return null;
  const ultima = nombres.map(k => evs[k].ultima).sort().pop();
  return { ultima, eventos: evs, nombres };
}

/** Quita rutas del usuario de un mensaje de error y lo recorta. */
function limpiar(msg) {
  let t = String(msg || '');
  const home = os.homedir();
  for (const h of [home, home.replace(/\\/g, '/')]) if (h && h.length > 3) t = t.split(h).join('~');
  t = t.replace(/(?:[A-Za-z]:)?[\\/](?:Users|home)[\\/][^\\/\s'"]+/gi, '~');
  return t.replace(/\s+/g, ' ').trim().slice(0, 300);
}

/** Guarda el último error interno del hook (catch de sdd-hook.js) para que doctor lo muestre. */
function recordError(cliente, evento, err) {
  try {
    writeJson(ERROR_FILE, { en: new Date().toISOString(), cliente: String(cliente || '').slice(0, 40), evento: String(evento || '').slice(0, 60), mensaje: limpiar((err && err.message) || err) });
  } catch { /* nunca rompe el hook */ }
}
const readError = () => readJson(ERROR_FILE);

module.exports = { record, read, resumen, recordError, readError, limpiar, FILE, ERROR_FILE, HORA };
