'use strict';
// Matriz de capacidades por cliente y nivel de evidencia. Cada adaptador declara sus capacidades a partir de su
// código; aquí se combinan con lo que doctor pudo comprobar:
//   (a) configuración encontrada · (b) hook ejecutable · (c) prueba sintética aprobada · (d) eventos reales del cliente.
// Una prueba sintética usa payloads simulados: NO es una integración confirmada. Solo (d) dice que el cliente real
// invoca los hooks; que respete cada respuesta (bloquear, preguntar) no se puede comprobar desde el hook.
const fs = require('fs');
const path = require('path');
const { HOME } = require('./paths');
const A = require('./adapters');
const O = require('./observado');

const CLIENTES = {
  claude: { nombre: 'Claude Code', mod: A.claude },
  codex: { nombre: 'Codex', mod: A.codex },
  gemini: { nombre: 'Gemini CLI', mod: A.gemini },
  cursor: { nombre: 'Cursor', mod: A.cursor },
  copilot: { nombre: 'Copilot', mod: A.copilot },
  opencode: { nombre: 'OpenCode', mod: require('./adapters/opencode') },
};
const DIMENSIONES = ['bloqueoPrevio', 'aprobacion', 'finDeTurno', 'compactacion', 'resultados', 'sesion', 'consumo', 'aislamiento'];
const VALORES = {
  bloqueoPrevio: ['si', 'parcial', 'no'], aprobacion: ['nativa', 'chat'], finDeTurno: ['bloquea', 'reintenta', 'aviso', 'no'],
  compactacion: ['reinyecta', 'aviso-previo', 'no'], resultados: ['todas', 'ediciones', 'no'], sesion: ['si', 'no'],
  consumo: ['medido', 'no_disponible'], aislamiento: ['desconocido', 'sandbox', 'sin-sandbox'],
};
// Valor pleno de cada dimensión: lo demás se informa como no disponible o degradado.
const PLENO = { bloqueoPrevio: 'si', aprobacion: 'nativa', finDeTurno: 'bloquea', compactacion: 'reinyecta', resultados: 'todas', sesion: 'si', consumo: 'medido', aislamiento: 'sandbox' };
// Evento común que tiene que llegar del cliente para respaldar cada dimensión.
const EVENTO_DE = { bloqueoPrevio: 'pre', aprobacion: 'pre', finDeTurno: 'stop', compactacion: 'compact', resultados: 'post', sesion: 'session', consumo: 'stop' };
// Chequeo de la prueba sintética que respalda cada dimensión.
const PRUEBA_DE = { bloqueoPrevio: 'deny', aprobacion: 'critica', finDeTurno: 'fin' };
const SIN_CONFIRMAR = 'declarado por el adaptador, sin confirmar en el cliente real';
const ORDEN = ['ninguno', 'configuracion', 'ejecutable', 'sintetica', 'confirmada'];
const NIVEL = {
  ninguno: 'sin hooks del harness',
  configuracion: 'configuración encontrada',
  ejecutable: 'hook ejecutable',
  sintetica: 'prueba sintética aprobada (no es una integración confirmada)',
  confirmada: 'integración confirmada en el cliente real',
};
const AVISO = 'los hooks no son un sandbox: el aislamiento de archivos, procesos y red depende del cliente';

const fecha = iso => String(iso || '').replace('T', ' ').slice(0, 16);
const readText = f => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };

/** Capacidades declaradas por cada adaptador: { id: { nombre, hooks, bloqueoPrevio, …, notas } }. */
function matriz() {
  return Object.fromEntries(Object.entries(CLIENTES).map(([id, c]) => [id, { nombre: c.nombre, ...c.mod.capacidades }]));
}

/**
 * Aislamiento según la configuración del cliente, solo donde la documentación oficial respalda la clave:
 * Claude Code `sandbox.enabled` (code.claude.com/docs/en/settings-reference) y Codex `sandbox_mode`
 * (github.com/openai/codex, config.schema.json: read-only | workspace-write | danger-full-access). El resto: desconocido.
 */
function aislamiento(id, { home = HOME } = {}) {
  if (id === 'claude') {
    let s = null; try { s = JSON.parse(readText(path.join(home, '.claude', 'settings.json')) || 'null'); } catch { s = null; }
    const sb = s && s.sandbox;
    if (sb && sb.enabled === true) {
      return { valor: 'sandbox', nota: `sandbox.enabled en ~/.claude/settings.json: aísla los comandos Bash, no las herramientas de edición${sb.allowUnsandboxedCommands === false ? '' : '; el modelo puede pedir ejecutar fuera del sandbox (allowUnsandboxedCommands)'}` };
    }
    return { valor: 'desconocido', nota: 'sin sandbox.enabled en ~/.claude/settings.json (puede estar activo en la configuración del proyecto o de la organización)' };
  }
  if (id === 'codex') {
    const toml = readText(path.join(process.env.CODEX_HOME || path.join(home, '.codex'), 'config.toml'));
    const top = (toml || '').split(/^\s*\[/m)[0]; // solo claves de primer nivel (no perfiles ni tablas)
    if (/^\s*default_permissions\s*=/m.test(top)) return { valor: 'desconocido', nota: 'config.toml usa perfiles de permisos (default_permissions): no se interpretan' };
    const m = /^\s*sandbox_mode\s*=\s*["']([\w-]+)["']/m.exec(top);
    if (m && m[1] === 'danger-full-access') return { valor: 'sin-sandbox', nota: 'sandbox_mode = "danger-full-access" en ~/.codex/config.toml' };
    if (m && (m[1] === 'read-only' || m[1] === 'workspace-write')) return { valor: 'sandbox', nota: `sandbox_mode = "${m[1]}" en ~/.codex/config.toml (--sandbox, -c o un perfil al abrir Codex pueden cambiarlo)` };
    return { valor: 'desconocido', nota: 'sin sandbox_mode en ~/.codex/config.toml (lo decide Codex al abrir: perfil, opciones o confianza del proyecto)' };
  }
  return { valor: 'desconocido', nota: 'su sandbox no se verificó en documentación oficial' };
}

/** Respaldo de una dimensión: eventos reales recibidos, prueba sintética o solo lo que declara el adaptador. */
function respaldo(d, eventos, obs, sint, ais) {
  if (d === 'aislamiento') return ais.valor === 'desconocido' ? { tipo: [], texto: 'sin verificar' } : { tipo: ['configuracion-cliente'], texto: 'leído de la configuración del cliente' };
  const tipo = []; const partes = [];
  if (sint && PRUEBA_DE[d] && sint[PRUEBA_DE[d]]) { tipo.push('sintetica'); partes.push('prueba sintética aprobada (payload simulado: no prueba el cliente real)'); }
  const vistos = obs ? obs.nombres.filter(n => eventos[n] === EVENTO_DE[d]) : [];
  if (vistos.length) {
    tipo.push('evento-real');
    partes.push(`el cliente real envió ${vistos.join(', ')} (último: ${fecha(vistos.map(n => obs.eventos[n].ultima).sort().pop())}); que respete la respuesta no se comprueba desde el hook`);
  }
  return { tipo, texto: partes.length ? partes.join(' · ') : SIN_CONFIRMAR };
}

/**
 * Combina las capacidades declaradas con la evidencia de doctor.
 * @param {string} id cliente
 * @param {{configuracion?:boolean, ejecutable?:boolean, sintetica?:{ok:boolean, deny?:boolean, critica?:boolean, fin?:boolean}|null}} ev
 * @param {{observado?:object, home?:string}} opts
 */
function evaluar(id, ev = {}, opts = {}) {
  const c = CLIENTES[id];
  const caps = c.mod.capacidades;
  const obs = O.resumen(id, opts.observado || O.read());
  const sint = ev.sintetica || null;
  const niveles = { configuracion: !!ev.configuracion, ejecutable: !!ev.ejecutable, sintetica: !!(sint && sint.ok), eventosReales: !!obs };
  let nivel = 'ninguno';
  for (const n of ['configuracion', 'ejecutable', 'sintetica']) { if (!niveles[n]) break; nivel = n; }
  if (nivel === 'sintetica' && obs) nivel = 'confirmada';
  const ais = aislamiento(id, opts);
  const capacidades = {};
  for (const d of DIMENSIONES) {
    const valor = d === 'aislamiento' ? ais.valor : caps[d];
    const r = respaldo(d, c.mod.EVENTS || {}, obs, sint, ais);
    capacidades[d] = { valor, nota: d === 'aislamiento' ? ais.nota : caps.notas[d], respaldo: r.tipo, texto: r.texto };
  }
  const limitaciones = DIMENSIONES.filter(d => capacidades[d].valor !== PLENO[d]).map(d => ({ dimension: d, valor: capacidades[d].valor, nota: capacidades[d].nota }));
  return {
    id, nombre: c.nombre, hooks: caps.hooks, nivel, nivelTexto: NIVEL[nivel], niveles,
    confirmacion: obs ? `el harness recibió eventos reales de ${c.nombre} el ${fecha(obs.ultima)}` : null,
    observado: obs ? { ultima: obs.ultima, eventos: obs.eventos } : null,
    capacidades, limitaciones,
  };
}

module.exports = { CLIENTES, DIMENSIONES, VALORES, PLENO, EVENTO_DE, SIN_CONFIRMAR, NIVEL, ORDEN, AVISO, matriz, aislamiento, evaluar, fecha };
