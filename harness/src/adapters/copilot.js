'use strict';
// GitHub Copilot (modo agente de VS Code y Copilot CLI): hooks en ~/.copilot/hooks/*.json.
// Formato camelCase: entrada toolName/toolArgs; salida permissionDecision, additionalContext, decision.
const { resolveRoot, toText, lastFromTranscript, normalizeTool, json, first, registrados } = require('./common');

const EVENTS = { sessionStart: 'session', userPromptSubmitted: 'prompt', preToolUse: 'pre', postToolUse: 'post', agentStop: 'stop', preCompact: 'compact' };

function parse(native, input) {
  const event = EVENTS[native];
  if (!event) return null;
  const toolName = first(input.toolName, input.tool_name);
  return {
    host: 'copilot', event, nativeAsk: true,
    root: resolveRoot(input.cwd),
    sessionId: first(input.sessionId, input.session_id),
    source: input.source,
    prompt: input.prompt,
    transcriptPath: first(input.transcriptPath, input.transcript_path),
    tool: toolName ? normalizeTool(toolName, first(input.toolArgs, input.tool_input, {})) : null,
    lastMessage: toText(first(input.lastAssistantMessage, input.last_assistant_message)) || (event === 'stop' ? lastFromTranscript(first(input.transcriptPath, input.transcript_path)) : ''),
    stopActive: !!input.stop_hook_active,
  };
}

function format(native, r) {
  if (native === 'preToolUse' && r.decision) return { stdout: json({ permissionDecision: r.decision, permissionDecisionReason: r.reason }) };
  if (native === 'postToolUse' && r.feedback) return { stdout: json({ additionalContext: r.feedback }) };
  if (native === 'agentStop' && r.block) return { stdout: json({ decision: 'block', reason: r.block }) };
  if (native === 'sessionStart' && r.context) return { stdout: json({ additionalContext: r.context }) };
  return {};
}

// Capacidades que declara este adaptador según su código (contrato en capacidades.js). Que el cliente real las respete
// no se comprueba aquí: doctor las cruza con la prueba sintética y con los eventos reales observados.
const capacidades = {
  hooks: registrados('copilot'),
  bloqueoPrevio: 'si', aprobacion: 'nativa', finDeTurno: 'bloquea', compactacion: 'aviso-previo', resultados: 'todas', sesion: 'si', consumo: 'no_disponible', aislamiento: 'desconocido',
  notas: {
    bloqueoPrevio: 'preToolUse → permissionDecision (copilot.js:26) para todas las herramientas (hooks-config.js:76); los hooks de Copilot están en vista previa (install.js:369)',
    aprobacion: 'pasa "ask" tal cual (copilot.js:13 nativeAsk, copilot.js:26); que el host muestre el diálogo no está verificado',
    finDeTurno: 'agentStop → decision block (copilot.js:28); los avisos sin bloqueo no tienen salida',
    compactacion: 'preCompact sin salida (copilot.js:30): el núcleo guarda la sesión, pero el contexto solo se entrega al iniciar (copilot.js:29)',
    resultados: 'postToolUse sin matcher → additionalContext (hooks-config.js:77, copilot.js:27)',
    sesion: 'sessionId del payload (copilot.js:15)',
    consumo: 'usage.js solo entiende el transcript de Claude Code (usage.js:2)',
    aislamiento: 'los hooks no aíslan; su sandbox no se verificó en documentación',
  },
};

module.exports = { parse, format, EVENTS, capacidades };
