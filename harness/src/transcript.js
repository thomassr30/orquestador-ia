'use strict';
// Respaldo del GATE: si la herramienta no le avisó al harness del "sí" del usuario (hook de mensaje que no se
// disparó, sesión retomada, contexto antepuesto en otro formato…), la conversación guardada por la propia
// herramienta dice si el agente pidió aprobación y qué respondió el usuario después.
// Formatos: Claude Code (type/message.role), Codex (response_item / event_msg), Copilot CLI (user.message /
// assistant.message) y genéricos { role, content }.
const fs = require('fs');
const { GATE_QUESTION, userText } = require('./gate');

const TAIL = 512 * 1024;

function readTail(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const len = Math.min(size, TAIL);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    const text = buf.toString('utf8');
    return len < size ? text.slice(text.indexOf('\n') + 1) : text; // descarta la primera línea, que puede venir cortada
  } finally { fs.closeSync(fd); }
}

const TEXT_TYPES = new Set(['text', 'input_text', 'output_text']);
function textOf(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.filter(c => c && TEXT_TYPES.has(c.type) && typeof c.text === 'string').map(c => c.text).join('\n');
}

const ROLE = { user: 'user', user_message: 'user', 'user.message': 'user', human: 'user', assistant: 'assistant', agent_message: 'assistant', 'assistant.message': 'assistant', model: 'assistant', gemini: 'assistant' };

/** Una línea del transcript → { role, text } o null. */
function entry(o) {
  if (!o || typeof o !== 'object' || o.isMeta || o.isSidechain) return null;
  const m = o.message && typeof o.message === 'object' ? o.message : null;
  const p = o.payload && typeof o.payload === 'object' ? o.payload : null;
  const d = o.data && typeof o.data === 'object' ? o.data : null;
  const role = ROLE[(m && m.role) || (p && (p.role || p.type)) || o.role || o.type];
  if (!role) return null;
  const text = m ? textOf(m.content)
    : p ? (typeof p.message === 'string' ? p.message : textOf(p.content))
      : d ? textOf(d.content) : textOf(o.content);
  return text && text.trim() ? { role, text } : null;
}

/**
 * Última pregunta del GATE del agente y lo último que respondió el usuario después.
 * @returns {{asked: boolean, replies: string[]}} mensajes del usuario posteriores a esa pregunta (sin contexto antepuesto)
 */
function gateReply(file) {
  if (!file) return { asked: false, replies: [] };
  let lines;
  try { lines = readTail(file).split('\n'); } catch { return { asked: false, replies: [] }; }
  const entries = [];
  for (const l of lines) {
    if (!l.trim()) continue;
    try { const e = entry(JSON.parse(l)); if (e) entries.push(e); } catch { /* línea no JSON */ }
  }
  let g = -1;
  entries.forEach((e, i) => { if (e.role === 'assistant' && GATE_QUESTION.test(e.text)) g = i; });
  if (g < 0) return { asked: false, replies: [] };
  const replies = entries.slice(g + 1).filter(e => e.role === 'user').map(e => userText(e.text)).filter(t => t && !/^\[harness\]/.test(t)); // avisos del harness que la herramienta guarda como mensaje
  return { asked: true, replies };
}

module.exports = { gateReply, entry };
