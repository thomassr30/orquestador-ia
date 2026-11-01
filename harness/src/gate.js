'use strict';
// GATE por código: en un pedido de cambio, las ediciones quedan bloqueadas hasta que el USUARIO
// aprueba el plan en el chat. El modelo no puede abrirlo: solo cambia con los mensajes del usuario.
//   inicial ──(pedido de cambio)──► requerido ──(el agente pregunta)──► pendiente ──(usuario: "sí")──► aprobado
//   cualquier estado ──("directo" / "sin plan")──► libre

// Límites de palabra que entienden tildes y ñ (\b de JavaScript solo considera ASCII).
const W = '[\\p{L}\\p{N}_]';
const words = (list, flags = 'iu') => new RegExp(`(?<!${W})(?:${list})(?!${W})`, flags);
const startsWith = (list) => new RegExp(`^[\\s¡!"'«]*(?:${list})(?!${W})`, 'iu');

const APPROVAL = startsWith('s[ií]|ok(?:ay|ey|i)?|dale|apruebo|aprobad[oa]|adelante|procede[r]?|h[aá]zlo|hacelo|h[aá]gale|de acuerdo|perfecto|listo|vamos|correcto|conforme|claro|genial|excelente|me parece bien|est[aá] bien|metele|m[aá]ndale|de una|yes|yep|go|lgtm');
const NEGATED = /^[\s¡!"'«]*[\p{L}]+\s+que\s+no(?![\p{L}])/iu; // "claro que no", "obvio que no"
const CONDITIONAL_SI = /^[\s¡!"'«]*si\s+(?:puedes|pod[eé]s|podr[ií]as|quieres|quer[eé]s|hay|es|est[aá]n?|tienes|ten[eé]s|no|se|me|te|lo|la|los|las|el|ella|ellos|existe|falla|funciona|fuera|fuese|necesitas|ves)(?![\p{L}\p{N}_])/iu;
const ESCAPE = words('directo|directamente|sin plan|sin sdd|sin gate|no (?:necesito|hace falta) (?:el |un )?plan');
const CHANGE = words(`agreg${W}*|añad${W}*|anad${W}*|incorpor${W}*|cre(?:a|ar|ame|alo|ala|ate|en|emos)|implement${W}*|desarroll${W}*|constru${W}*|codific${W}*|corrig${W}*|corrij${W}*|arregl${W}*|solucion${W}*|repar${W}*|refactori${W}*|reorganiz${W}*|reestructur${W}*|reescrib${W}*|migr[ae]${W}*|actualiz${W}*|modific${W}*|cambi[ae]${W}*|elimin${W}*|borr[ae]${W}*|quit[ae]${W}*|renombr${W}*|muev[ae]${W}*|integr[ae]${W}*|conect[ae]${W}*|configur[ae]${W}*|optimiz${W}*|ajust[ae]${W}*|add|create|implement${W}*|build|fix${W}*|refactor${W}*|migrate|update|upgrade|change|remove|delete|rename|rewrite|optimi[sz]e`);
const FIX = words("no funciona|no anda|no carga|no compila|no levanta|no guarda|falla|fallan|fallando|error|errores|bug|bugs|se rompe|se cae|roto|rota|rompi[oó]|se ve mal|crash\\w*|excepci[oó]n|exception|stack ?trace|traceback|broken|not working|doesn'?t work");
const TICKET = /(?<![A-Za-z0-9_])[A-Z][A-Z0-9]{1,9}-\d+(?![A-Za-z0-9_])/; // LAB-123: trabajar un ticket
const WORK = words(`resuelv${W}*|resolv${W}*|trabaj[ae]${W}*`);
const NON_CODE = words('prototipo|prototipos|maqueta|maquetas|mockup|mockups|wireframe|wireframes'); // solo genera el prototipo
const GATE_QUESTION = /¿\s*apruebo la implementaci[oó]n\s*\?/i;

const isApproval = text => APPROVAL.test(text) && !CONDITIONAL_SI.test(text) && !NEGATED.test(text);
const isChangeRequest = text => !NON_CODE.test(text) && (CHANGE.test(text) || FIX.test(text) || TICKET.test(text) || WORK.test(text));

/** ¿El último mensaje del agente termina pidiendo algo al usuario? */
function asksUser(lastMessage) {
  const t = String(lastMessage || '').trim();
  if (!t) return false;
  return GATE_QUESTION.test(t) || t.slice(-400).includes('?');
}

/**
 * Actualiza el estado con el mensaje del usuario. Devuelve avisos para el agente.
 * @param {object} state estado de la sesión (se modifica)
 * @param {string} prompt
 * @param {{gate: string}} cfg
 */
function onPrompt(state, prompt, cfg) {
  const text = String(prompt || '');
  const notes = [];
  const g = state.gate;
  const approval = isApproval(text);
  const now = new Date().toISOString();

  // Comandos críticos que esperaban confirmación en el chat
  const commandsPending = state.aprobaciones.pendientes.length > 0;
  if (approval && commandsPending) {
    const recent = state.aprobaciones.pendientes.filter(p => Date.now() - Date.parse(p.en) < 30 * 60000);
    state.aprobaciones.aprobadas = [...state.aprobaciones.aprobadas, ...recent.map(p => ({ clave: p.clave, en: now }))].slice(-10);
    state.aprobaciones.pendientes = [];
    if (recent.length) notes.push(`El usuario aprobó: ${recent.map(p => p.clave).join(' · ')}. Puedes ejecutarlo tal cual (una vez).`);
  } else if (!approval && commandsPending) {
    state.aprobaciones.pendientes = [];
  }

  if (cfg.gate === 'nunca') return notes;
  // Un "sí" a un comando no aprueba el plan, salvo que el agente haya mostrado la pregunta del GATE.
  const approvesPlan = approval && ((g.estado === 'pendiente' && (g.conPlan || !commandsPending)) || (g.estado === 'requerido' && !commandsPending));
  if (ESCAPE.test(text)) {
    state.gate = { estado: 'libre', desde: now };
    notes.push('Pedido marcado como directo: puedes editar sin presentar plan (igual valida con tests/lint).');
  } else if (approvesPlan) {
    state.gate = { estado: 'aprobado', desde: now };
    notes.push('Plan aprobado por el usuario: puedes implementar. Los sensores revisarán el código al terminar.');
  } else if (isChangeRequest(text) && !(approval && (g.estado === 'aprobado' || commandsPending))) {
    state.gate = { estado: 'requerido', desde: now };
    notes.push('Pedido de cambio: las ediciones de código quedan bloqueadas hasta que presentes el plan y el usuario lo apruebe con «¿Apruebo la implementación? (sí / no / ajustes)». Si es trivial, pregunta si lo aplicas directo.');
  }
  return notes;
}

/** Al terminar el turno: si el agente quedó preguntando, el GATE pasa a "pendiente" (conPlan: mostró la pregunta del GATE). */
function onStop(state, lastMessage) {
  const e = state.gate.estado;
  const withPlan = GATE_QUESTION.test(String(lastMessage || ''));
  if (e === 'requerido' && asksUser(lastMessage)) state.gate = { estado: 'pendiente', desde: new Date().toISOString(), conPlan: withPlan };
  else if (e === 'pendiente' && withPlan) state.gate.conPlan = true;
}

/** Motivo de bloqueo para editar, o null si se puede. */
function editBlockReason(state, cfg) {
  if (cfg.gate === 'nunca') return null;
  const e = state.gate.estado;
  if (e === 'requerido' || e === 'pendiente' || (cfg.gate === 'siempre' && e === 'inicial')) {
    return 'GATE del harness: el plan de este cambio aún no está aprobado por el usuario. Presenta el plan (qué y por qué, archivos por capa, tests previstos, riesgos) y termina con «¿Apruebo la implementación? (sí / no / ajustes)». Si el cambio es trivial, pregunta si lo aplicas directo. No intentes editar por otra vía hasta la aprobación.';
  }
  return null;
}

module.exports = { onPrompt, onStop, editBlockReason, isApproval, isChangeRequest, asksUser, GATE_QUESTION };
