'use strict';
// Presupuesto de sub-agentes por código: cada sub-agente parte de cero y relee lo que necesita, así que
// lanzar muchos multiplica el consumo. El harness cuenta los sub-agentes lanzados desde el último mensaje
// del usuario y, al superar el tope, pide confirmación (diálogo nativo o "sí" en el chat).

const AGENT_TOOLS = new Set(['task', 'agent', 'spawn_agent', 'delegate', 'delegate_task', 'run_subagent']);
const isAgentTool = name => AGENT_TOOLS.has(String(name || '').toLowerCase());

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

/** Nuevo mensaje del usuario: se reinicia la cuenta (o queda libre si aprobó más agentes). */
function onPrompt(state) {
  const i = state.aprobaciones.aprobadas.findIndex(a => a.clave === 'más sub-agentes');
  const libre = i >= 0;
  if (libre) state.aprobaciones.aprobadas.splice(i, 1);
  state.subagentes = { lanzados: 0, libre };
}

const modeNote = cfg => {
  const p = cfg.presupuesto || {};
  if (p.modo !== 'ahorro') return null;
  return `Modo ahorro: trata este pedido como pequeño o mediano y anuncia el tamaño elegido antes de empezar. Máximo ${limitFor(cfg)} sub-agentes por mensaje del usuario; si de verdad necesitas el flujo completo, explica cuántos agentes y para qué, y pide aprobación. Lo que puedas resolver tú mismo, hazlo sin sub-agentes.`;
};

module.exports = { isAgentTool, tryLaunch, onPrompt, limitFor, modeNote };
