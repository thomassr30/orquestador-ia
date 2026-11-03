'use strict';
// Presupuestos por código.
//  - Sub-agentes: cada sub-agente parte de cero y relee lo que necesita, así que lanzar muchos multiplica el consumo.
//    Se cuentan los lanzados desde el último mensaje del usuario y, al superar el tope, se pide confirmación.
//  - Tiempo por pedido (presupuesto.maxMinutosPorPedido): al agotarse, el harness deja de exigir reintentos en ese
//    turno (la verificación queda pendiente, no aprobada). Se reinicia con el siguiente mensaje del usuario.
//  - Tokens por sesión (presupuesto.maxTokensSesion): solo donde el cliente los expone (hoy, el transcript de Claude
//    Code: «medido»); en el resto, «no disponible» y no se aplica. Agotado: estado explícito, se frenan escrituras y
//    sub-agentes hasta que el usuario confirme otro tramo.
//  - Costo: ningún cliente lo informa por sesión en sus hooks; solo sdd-eval lo limita (--max-costo-usd).
// Los presupuestos nuevos vienen desactivados (null): no se inventan topes.

// Se comparan sin mayúsculas, '_' ni '-': run_subagent (Codex/Gemini) = runSubagent (VS Code Copilot).
const AGENT_TOOLS = new Set(['task', 'agent', 'spawnagent', 'delegate', 'delegatetask', 'runsubagent']);
const isAgentTool = name => AGENT_TOOLS.has(String(name || '').toLowerCase().replace(/[_-]/g, ''));

function limitFor(cfg) {
  const p = cfg.presupuesto || {};
  if (p.modo === 'libre') return 0; // sin tope
  const n = Number(p.maxSubagentes);
  return Number.isFinite(n) && n > 0 ? n : (p.modo === 'ahorro' ? 3 : 6);
}

/**
 * Registra un intento de lanzar un sub-agente. Se llama dentro de updateState (atómico: los lanzamientos
 * en paralelo no se saltan el tope). Devuelve {ok} o {ok:false, usados, tope}.
 */
function tryLaunch(state, cfg) {
  const tope = limitFor(cfg);
  const b = state.subagentes || (state.subagentes = { lanzados: 0, libre: false });
  if (!tope || b.libre || b.lanzados < tope) { b.lanzados += 1; return { ok: true, usados: b.lanzados, tope }; }
  return { ok: false, usados: b.lanzados, tope };
}

const recurso = a => (a.datos && a.datos.recurso) || 'subagentes';
/** Tokens de la sesión medidos en el transcript (principal + sub-agentes; entrada, caché y salida) o null si no hay medición. */
const part = x => (x ? (x.entrada || 0) + (x.cacheEscritura || 0) + (x.cacheLectura || 0) + (x.salida || 0) : 0);
const tokensOf = consumo => (consumo && consumo.principal ? part(consumo.principal) + part(consumo.subagentes) : null);

/** Nuevo mensaje del usuario: se reinicia la cuenta de sub-agentes y el reloj del pedido; se aplican tramos aprobados. */
function onPrompt(state) {
  const notes = [];
  const take = r => { const i = state.aprobaciones.aprobadas.findIndex(a => a.tipo === 'presupuesto' && recurso(a) === r); return i >= 0 ? state.aprobaciones.aprobadas.splice(i, 1)[0] : null; };
  const libre = !!take('subagentes');
  state.subagentes = { lanzados: 0, libre };
  if (take('tokens')) {
    state.presupuesto = { ...(state.presupuesto || {}), baseTokens: tokensOf(state.consumo) || 0, agotado: null };
    notes.push('El usuario aprobó otro tramo de tokens: puedes continuar.');
  }
  state.pedido = { inicio: new Date().toISOString() };
  return notes;
}

/** Minutos que lleva el pedido actual y si superó su presupuesto. */
function timeStatus(state, cfg) {
  const max = Number((cfg.presupuesto || {}).maxMinutosPorPedido);
  const since = state.pedido && Date.parse(state.pedido.inicio);
  const minutos = since ? (Date.now() - since) / 60000 : 0;
  return { minutos, tope: max > 0 ? max : null, agotado: max > 0 && minutos > max };
}

/**
 * Revisa el presupuesto de tokens (dentro de updateState). Devuelve el agotamiento nuevo o null.
 * Sin medición del cliente no se aplica (y así se informa).
 */
function checkTokens(state, cfg) {
  const max = Number((cfg.presupuesto || {}).maxTokensSesion);
  const used = tokensOf(state.consumo);
  if (!(max > 0) || used === null) return null;
  const p = state.presupuesto || (state.presupuesto = {});
  const spent = used - (p.baseTokens || 0);
  if (spent <= max || p.agotado) return null;
  p.agotado = { recurso: 'tokens', valor: spent, tope: max, fuente: 'medido (transcript del cliente)', en: new Date().toISOString() };
  return p.agotado;
}

/** Agotamiento vigente (o null). */
const exhausted = state => (state.presupuesto && state.presupuesto.agotado) || null;

const modeNote = cfg => {
  const p = cfg.presupuesto || {};
  if (p.modo !== 'ahorro') return null;
  return `Modo ahorro: trata este pedido como pequeño o mediano y anuncia el tamaño elegido antes de empezar. Máximo ${limitFor(cfg)} sub-agentes por mensaje del usuario; si de verdad necesitas el flujo completo, explica cuántos agentes y para qué, y pide aprobación. Lo que puedas resolver tú mismo, hazlo sin sub-agentes.`;
};

module.exports = { isAgentTool, tryLaunch, onPrompt, limitFor, modeNote, timeStatus, checkTokens, exhausted, tokensOf };
