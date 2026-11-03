'use strict';
// Gemini CLI: hooks en ~/.gemini/settings.json. La salida debe ser SOLO JSON.
// AfterAgent con decision "deny" hace que el agente reintente con el motivo como nuevo mensaje.
const { resolveRoot, toText, normalizeTool, json, registrados } = require('./common');

const EVENTS = { SessionStart: 'session', BeforeAgent: 'prompt', BeforeTool: 'pre', AfterTool: 'post', AfterAgent: 'stop', PreCompress: 'compact' };

function parse(native, input, env) {
  const event = EVENTS[native];
  if (!event) return null;
  return {
    host: 'gemini', event, nativeAsk: false, canRewrite: true,
    reinjectOnPrompt: true, // tras comprimir, Gemini no emite SessionStart: la memoria se reinyecta en el siguiente mensaje
    root: resolveRoot(env.GEMINI_PROJECT_DIR, env.CLAUDE_PROJECT_DIR, input.cwd),
    sessionId: input.session_id || env.GEMINI_SESSION_ID,
    source: input.source,
    prompt: input.prompt,
    transcriptPath: input.transcript_path,
    tool: input.tool_name ? normalizeTool(input.tool_name, input.tool_input) : null,
    lastMessage: toText(input.prompt_response),
    stopActive: !!input.stop_hook_active,
  };
}

function format(native, r) {
  if (native === 'BeforeTool' && r.rewrite) return { stdout: json({ hookSpecificOutput: { tool_input: { command: r.rewrite } } }) };
  if (native === 'BeforeTool' && r.decision) return { stdout: json({ decision: 'deny', reason: r.reason }) };
  if (native === 'AfterTool' && r.feedback) return { stdout: json({ hookSpecificOutput: { additionalContext: r.feedback } }) };
  if (native === 'AfterAgent') {
    if (r.block) return { stdout: json({ decision: 'deny', reason: r.block }) };
    if (r.notice) return { stdout: json({ systemMessage: r.notice }) };
  }
  if ((native === 'SessionStart' || native === 'BeforeAgent') && r.context) return { stdout: json({ hookSpecificOutput: { additionalContext: r.context } }) };
  return {};
}

// Capacidades que declara este adaptador según su código (contrato en capacidades.js). Que el cliente real las respete
// no se comprueba aquí: doctor las cruza con la prueba sintética y con los eventos reales observados.
const capacidades = {
  hooks: registrados('gemini'),
  bloqueoPrevio: 'si', aprobacion: 'chat', finDeTurno: 'reintenta', compactacion: 'reinyecta', resultados: 'ediciones', sesion: 'si', consumo: 'no_disponible', aislamiento: 'desconocido',
  notas: {
    bloqueoPrevio: 'BeforeTool → decision deny (gemini.js:27) en las herramientas del matcher (hooks-config.js:43)',
    aprobacion: 'sin diálogo nativo: deny + confirmación en el chat (gemini.js:12 nativeAsk false, gemini.js:27)',
    finDeTurno: 'AfterAgent con deny no bloquea: el agente reintenta con el motivo como mensaje nuevo (gemini.js:3, gemini.js:30)',
    compactacion: 'sin SessionStart tras comprimir: el contexto vuelve en el siguiente mensaje (gemini.js:13 reinjectOnPrompt, gemini.js:33)',
    resultados: 'AfterTool solo en write_file|replace|edit|smart_edit (hooks-config.js:44)',
    sesion: 'session_id del payload o GEMINI_SESSION_ID (gemini.js:15)',
    consumo: 'usage.js solo entiende el transcript de Claude Code (usage.js:2)',
    aislamiento: 'los hooks no aíslan; su sandbox no se verificó en documentación',
  },
};

module.exports = { parse, format, EVENTS, capacidades };
