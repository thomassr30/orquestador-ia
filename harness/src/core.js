'use strict';
// Núcleo del harness: decide qué hacer en cada evento del agente, igual para todas las herramientas.
// Recibe un evento normalizado por el adaptador de la herramienta y devuelve una decisión neutra:
//   { decision: 'deny'|'ask'|null, reason, context, feedback, block, notice }
const path = require('path');
const { Policy } = require('./policy');
const { loadConfig } = require('./config');
const S = require('./state');
const gate = require('./gate');
const { runSensors, summarize, quickCheck } = require('./sensors');
const memory = require('./memory');
const { findSecret } = require('./secrets');
const { classifyMcp } = require('./mcp');
const { isCompactable } = require('./output');
const { sessionUsage } = require('./usage');
const budget = require('./budget');
const { violation } = require('./project-rules');
const { gateReply } = require('./transcript');
const { SDD_HOME, fwd } = require('./paths');
const { isInside, relPosix, shortHash } = require('./util');

const tag = s => `[harness] ${s}`;
const deny = reason => ({ decision: 'deny', reason: tag(reason) });
const firstWord = c => String(c || '').trim().split(/\s+/)[0] || '';
const isMemory = rel => rel === '.sdd/memoria' || rel.startsWith('.sdd/memoria/');

/** Decisión para algo crítico: aprobación nativa de la herramienta o confirmación en el chat. */
function criticalDecision(ev, st, key, reason) {
  if (st.aprobaciones.aprobadas.some(a => a.clave === key)) {
    S.updateState(ev.root, ev.sessionId, s => { const i = s.aprobaciones.aprobadas.findIndex(a => a.clave === key); if (i >= 0) s.aprobaciones.aprobadas.splice(i, 1); });
    return null;
  }
  if (ev.nativeAsk) return { decision: 'ask', reason: tag(reason) };
  S.updateState(ev.root, ev.sessionId, s => {
    s.aprobaciones.pendientes = [...s.aprobaciones.pendientes.filter(p => p.clave !== key), { clave: key, en: new Date().toISOString() }].slice(-5);
  });
  return deny(`Requiere confirmación del usuario (${reason}). Muéstrale exactamente lo que vas a ejecutar o modificar y pregúntale si lo aprueba; si responde que sí, vuelve a intentarlo igual.`);
}

function onSession(ev) {
  S.cleanupOld(ev.root);
  const st = S.updateState(ev.root, ev.sessionId, s => { s.herramienta = ev.host; s.compactado = false; });
  const parts = [memory.contextBlock(ev.root, { source: ev.source })];
  if (st.gate.estado === 'requerido' || st.gate.estado === 'pendiente') parts.push(tag('Hay un pedido de cambio con el plan sin aprobar: no edites código hasta que el usuario lo apruebe.'));
  if (st.sensores && !st.sensores.ok) parts.push(tag(`Los últimos sensores quedaron con errores: ${st.sensores.resumen.filter(r => !r.ok).map(r => r.nombre).join(', ')}.`));
  return { context: parts.filter(Boolean).join('\n\n') || null };
}

/**
 * Respaldo del GATE: ¿la conversación guardada por la herramienta muestra la pregunta del GATE seguida solo de
 * aprobaciones del usuario? Cubre hooks de mensaje que no llegan o llegan con otro formato.
 */
function transcriptApproves(ev, current) {
  if (!ev.transcriptPath) return false;
  const tr = gateReply(ev.transcriptPath);
  const replies = current ? [...tr.replies, current] : tr.replies;
  return tr.asked && replies.length > 0 && replies.every(gate.isPureApproval);
}

function onPrompt(ev) {
  // Los mensajes que genera el propio harness (p. ej. "corrige los sensores") no son del usuario.
  const said = gate.userText(ev.prompt);
  if (/^\[harness\]/.test(said)) return null;
  const cfg = loadConfig(ev.root);
  let notes = [];
  let compacted = false;
  let estado = '';
  const backup = gate.isPureApproval(said) && transcriptApproves(ev, said);
  S.updateState(ev.root, ev.sessionId, s => {
    notes = gate.onPrompt(s, ev.prompt, cfg);
    if (backup && gate.approveFromTranscript(s, cfg)) notes.push('Plan aprobado por el usuario: puedes implementar. Los sensores revisarán el código al terminar.');
    budget.onPrompt(s);
    if (s.subagentes.libre) notes.push('El usuario aprobó usar más sub-agentes en este pedido.');
    else if (s.gate.estado === 'requerido' && budget.modeNote(cfg)) notes.push(budget.modeNote(cfg));
    compacted = s.compactado;
    s.compactado = false;
    s.bloqueos = 0;
    s.herramienta = ev.host;
    estado = s.gate.estado;
  });
  // Registro de cómo se entendió cada mensaje (tipo y estado del GATE, nunca el texto)
  S.log(ev.root, { herramienta: ev.host, evento: 'mensaje', decision: estado, detalle: gate.classify(said) });
  const parts = [];
  if (compacted && ev.reinjectOnPrompt) parts.push(memory.contextBlock(ev.root, { source: 'compact' }));
  parts.push(...notes.map(tag));
  if (notes.length) S.log(ev.root, { herramienta: ev.host, evento: 'prompt', decision: 'gate', detalle: notes[0].slice(0, 80) });
  return { context: parts.filter(Boolean).join('\n') || null };
}

function onPre(ev) {
  const t = ev.tool || {};
  const cfg = loadConfig(ev.root);
  const policy = new Policy({ root: ev.root, config: cfg.permisos });
  let st = S.readState(ev.root, ev.sessionId);
  let out = null;
  // Bloqueo del GATE, con respaldo: si la herramienta no avisó el "sí" pero quedó en la conversación, se aprueba.
  const gateBlock = () => {
    const g = gate.editBlockReason(st, cfg);
    if (!g || !transcriptApproves(ev)) return g;
    st = S.updateState(ev.root, ev.sessionId, s => { gate.approveFromTranscript(s, cfg); });
    S.log(ev.root, { herramienta: ev.host, evento: 'gate', decision: 'aprobado', detalle: 'aprobación leída de la conversación (la herramienta no avisó tu mensaje)' });
    return gate.editBlockReason(st, cfg);
  };
  if (t.kind === 'shell' && t.command) {
    const r = policy.checkCommand(t.command);
    if (r.decision === 'deny') out = deny(r.reason);
    else if (r.decision === 'ask' && r.critical) out = criticalDecision(ev, st, t.command.trim(), r.reason);
    else {
      const g = r.decision !== 'allow' && gateBlock();
      if (g) out = deny(`${g} Antes de la aprobación solo se permiten comandos de lectura, tests y lint.`);
    }
    if (out) S.log(ev.root, { herramienta: ev.host, evento: 'comando', decision: out.decision, detalle: `${firstWord(t.command)}: ${out.reason}` });
    if (!out && r.decision === 'allow' && ev.canRewrite && !t.background && cfg.salida.compactar && isCompactable(t.command)) {
      // Comando ruidoso y seguro: se envuelve para que la IA reciba errores y resumen, no miles de líneas.
      const b64 = Buffer.from(t.command.trim(), 'utf8').toString('base64');
      return { rewrite: `node "${fwd(SDD_HOME)}/bin/sdd-salida.js" ${b64} ${Number(cfg.salida.maxCaracteres) || 4000}` };
    }
    return out;
  }
  if (t.kind === 'edit') {
    for (const p of t.paths || []) {
      const r = policy.checkPath(p, 'write');
      if (r.decision === 'deny') out = deny(r.reason);
      else if (r.decision === 'ask' && r.critical) out = criticalDecision(ev, st, `editar ${r.inside ? r.rel : r.abs}`, r.reason);
      else if (r.inside && isMemory(r.rel)) {
        const sec = (t.contents || []).map(findSecret).find(Boolean);
        if (sec) out = deny(`la memoria del proyecto no guarda secretos (${sec}). Describe el dato sin su valor (por ejemplo: "la clave está en el vault, ruta X").`);
      } else if (r.inside) {
        const g = gateBlock();
        if (g) out = deny(g);
        else {
          const v = violation(ev.root, p, t.contents, cfg.reglas);
          if (v) out = deny(`regla del proyecto «${v.regla}» en ${v.archivo} (encontré "${v.coincidencia}"): ${v.mensaje}`);
        }
      }
      if (out) { S.log(ev.root, { herramienta: ev.host, evento: 'edición', decision: out.decision, detalle: `${r.rel}: ${out.reason}` }); return out; }
    }
    return null;
  }
  if (t.kind === 'agent') {
    let r = null;
    S.updateState(ev.root, ev.sessionId, s => { r = budget.tryLaunch(s, cfg); });
    if (r.ok) return null;
    const what = [t.agente, t.descripcion].filter(Boolean).join(': ');
    const reason = `presupuesto de sub-agentes: este pedido ya lanzó ${r.usados} (tope ${r.tope}${(cfg.presupuesto || {}).modo === 'ahorro' ? ', modo ahorro' : ''})${what ? `. Quiere lanzar ${what}` : ''}`;
    S.log(ev.root, { herramienta: ev.host, evento: 'sub-agente', decision: ev.nativeAsk ? 'ask' : 'deny', detalle: reason });
    if (ev.nativeAsk) return { decision: 'ask', reason: tag(`${reason}. ¿Permitir uno más?`) };
    S.updateState(ev.root, ev.sessionId, s => {
      s.aprobaciones.pendientes = [...s.aprobaciones.pendientes.filter(p => p.clave !== 'más sub-agentes'), { clave: 'más sub-agentes', en: new Date().toISOString() }].slice(-5);
    });
    return deny(`${reason}. Continúa tú mismo con lo que ya tienes, o explica al usuario cuántos agentes más necesitas y para qué, y pídele que responda "sí".`);
  }
  if (t.kind === 'mcp') {
    const r = classifyMcp(t, cfg.permisos);
    if (r.decision === 'deny') out = deny(r.reason);
    else if (r.decision === 'ask') out = criticalDecision(ev, st, `mcp ${t.server}/${t.tool}`, r.reason);
    if (out) S.log(ev.root, { herramienta: ev.host, evento: 'mcp', decision: out.decision, detalle: `${t.server}/${t.tool}` });
    return out;
  }
  if (t.kind === 'read') {
    for (const p of t.paths || []) {
      const r = policy.checkPath(p, 'read');
      if (r.decision === 'deny') { S.log(ev.root, { herramienta: ev.host, evento: 'lectura', decision: 'deny', detalle: r.rel }); return deny(r.reason); }
    }
  }
  return null;
}

function onPost(ev) {
  const t = ev.tool || {};
  if (t.kind !== 'edit' || !(t.paths || []).length) return null;
  const cfg = loadConfig(ev.root);
  const abs = t.paths.map(p => path.resolve(ev.root, p)).filter(a => isInside(ev.root, a));
  const rels = abs.map(a => relPosix(ev.root, a));
  if (!rels.length) return null;
  S.updateState(ev.root, ev.sessionId, s => {
    s.cambios = [...new Set([...s.cambios, ...rels])].slice(-200);
    if (rels.some(r => !r.startsWith('.sdd/'))) s.sucio = true;
    s.herramienta = ev.host;
  });
  if (!cfg.sensores.alEditar) return null;
  const issues = [];
  abs.forEach((a, i) => { const q = quickCheck(a); if (q) issues.push(`${rels[i]}: ${q.join('; ')}`); });
  if (!issues.length) return null;
  S.log(ev.root, { herramienta: ev.host, evento: 'sensor rápido', decision: 'aviso', detalle: issues[0] });
  return { feedback: tag(`Sensor rápido tras la edición:\n${issues.join('\n')}\nCorrígelo antes de seguir.`) };
}

async function onStop(ev) {
  const cfg = loadConfig(ev.root);
  let last = ev.lastMessage || '';
  let st = S.updateState(ev.root, ev.sessionId, s => {
    last = last || s.ultimoMensaje || '';
    if (last) s.conMensajes = true; // esta herramienta entrega el último mensaje: el "sí" solo vale tras una pregunta del agente
    gate.onStop(s, last);
    s.ultimoMensaje = null;
    s.herramienta = ev.host;
  });
  const result = {};
  const asks = gate.asksUser(last);
  if (st.sucio && !ev.aborted && !asks && cfg.sensores.alTerminar.length) {
    const code = st.cambios.filter(f => !f.startsWith('.sdd/'));
    const run = await runSensors(ev.root, code, cfg);
    if (!run.ran) {
      st = S.updateState(ev.root, ev.sessionId, s => { s.sucio = false; });
    } else {
      const resumen = run.results.map(r => ({ nombre: r.nombre, ok: r.ok, omitido: !!r.omitido, ms: r.ms || 0 }));
      const text = summarize(run, code.length);
      st = S.updateState(ev.root, ev.sessionId, s => {
        s.sensores = { ok: run.ok, en: new Date().toISOString(), resumen };
        if (run.ok) { s.sucio = false; s.bloqueos = 0; } else s.bloqueos += 1;
      });
      S.log(ev.root, { herramienta: ev.host, evento: 'sensores', decision: run.ok ? 'ok' : 'falla', detalle: resumen.map(r => `${r.nombre}:${r.omitido ? 'omitido' : r.ok ? 'ok' : 'falla'}`).join(' ') });
      if (!run.ok && st.bloqueos <= cfg.sensores.maxBloqueos) {
        result.block = tag(`${text}\n\nCorrige estos errores antes de terminar. Si alguno ya existía antes de tus cambios o no corresponde a tu tarea, dilo explícitamente en tu respuesta (no lo ocultes).`);
      } else if (!run.ok) {
        result.notice = `Sensores con errores tras ${cfg.sensores.maxBloqueos} intentos; no se insiste más. ${resumen.filter(r => !r.ok).map(r => r.nombre).join(', ')} siguen fallando.`;
        st = S.updateState(ev.root, ev.sessionId, s => { s.sucio = false; s.bloqueos = 0; });
      } else {
        result.notice = `Sensores en verde: ${resumen.map(r => `${r.omitido ? '•' : '✓'} ${r.nombre}`).join(' · ')}`;
      }
    }
  }
  // Consumo de tokens de la sesión (si la herramienta entrega el transcript): solo números, para `sdd-harness consumo`
  if (ev.transcriptPath) {
    const u = sessionUsage(ev.transcriptPath);
    if (u) S.updateState(ev.root, ev.sessionId, s => { s.consumo = { ...u, en: new Date().toISOString(), transcript: ev.transcriptPath }; });
  }
  // Checkpoint de la sesión en la memoria del proyecto (solo si hubo trabajo y algo cambió)
  if (st.cambios.length) {
    const sig = shortHash(JSON.stringify([st.gate.estado, st.objetivo, st.cambios, st.sensores && st.sensores.resumen]));
    if (sig !== st.checkpoint || !memory.hasAutoBlock(ev.root)) {
      try { memory.checkpoint(ev.root, st, ev.host); S.updateState(ev.root, ev.sessionId, s => { s.checkpoint = sig; }); } catch { /* sin permisos de escritura */ }
    }
  }
  return result;
}

function onCompact(ev) {
  const st = S.updateState(ev.root, ev.sessionId, s => { s.compactado = true; });
  if (st.cambios.length) { try { memory.checkpoint(ev.root, st, ev.host); } catch { /* sin permisos */ } }
  if (!ev.wantsContext) return null;
  const extra = st.gate.estado === 'aprobado' ? 'El plan del cambio en curso está aprobado.' : (st.gate.estado === 'requerido' || st.gate.estado === 'pendiente') ? 'Hay un plan sin aprobar: no edites hasta la aprobación.' : '';
  return { context: [memory.contextBlock(ev.root, { source: 'compact' }), extra && tag(extra)].filter(Boolean).join('\n\n') || null };
}

function onResponse(ev) {
  if (!ev.lastMessage) return null;
  S.updateState(ev.root, ev.sessionId, s => { s.ultimoMensaje = String(ev.lastMessage).slice(-2000); });
  return null;
}

const HANDLERS = { session: onSession, prompt: onPrompt, pre: onPre, post: onPost, stop: onStop, compact: onCompact, response: onResponse };

/** Punto de entrada común. Nunca lanza: ante un error interno no bloquea (falla abierta). */
async function handle(ev) {
  const fn = HANDLERS[ev.event];
  if (!fn || !ev.root) return null;
  try {
    return (await fn(ev)) || null;
  } catch (e) {
    S.log(ev.root, { herramienta: ev.host, evento: ev.event, decision: 'error', detalle: e.message });
    return null;
  }
}

module.exports = { handle };
