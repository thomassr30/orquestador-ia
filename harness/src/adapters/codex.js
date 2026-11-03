'use strict';
// Codex (CLI y extensión): hooks en ~/.codex/hooks.json (formato compatible con Claude Code).
// Diferencias: PreToolUse no admite "ask" (se confirma en el chat) y cubre Bash, apply_patch y MCP.
const { resolveRoot, toText, lastFromTranscript, normalizeTool, json, registrados } = require('./common');

const EVENTS = { SessionStart: 'session', UserPromptSubmit: 'prompt', PreToolUse: 'pre', PostToolUse: 'post', Stop: 'stop', PreCompact: 'compact' };

function parse(native, input) {
  const event = EVENTS[native];
  if (!event) return null;
  return {
    host: 'codex', event, nativeAsk: false, nativeGitAsk: true, canRewrite: true, toolInput: input.tool_input,
    root: resolveRoot(input.cwd),
    sessionId: input.session_id,
    source: input.source,
    prompt: input.prompt,
    transcriptPath: input.transcript_path,
    tool: input.tool_name ? normalizeTool(input.tool_name, input.tool_input) : null,
    lastMessage: toText(input.last_assistant_message) || (event === 'stop' ? lastFromTranscript(input.transcript_path) : ''),
    stopActive: !!input.stop_hook_active,
  };
}

function format(native, r, ev) {
  if (native === 'PreToolUse' && r.rewrite) {
    return { stdout: json({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', updatedInput: { ...((ev && ev.toolInput) || {}), command: r.rewrite } } }) };
  }
  if (native === 'PreToolUse' && r.decision) {
    return { stdout: json({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: r.reason } }) };
  }
  if (native === 'PostToolUse' && r.feedback) return { stdout: json({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: r.feedback } }) };
  if (native === 'Stop') {
    if (r.block) return { stdout: json({ decision: 'block', reason: r.block }) };
    if (r.notice) return { stdout: json({ systemMessage: r.notice }) };
  }
  if ((native === 'SessionStart' || native === 'UserPromptSubmit') && r.context) {
    return { stdout: json({ hookSpecificOutput: { hookEventName: native, additionalContext: r.context } }) };
  }
  return {};
}

// Capacidades que declara este adaptador según su código (contrato en capacidades.js). Que el cliente real las respete
// no se comprueba aquí: doctor las cruza con la prueba sintética y con los eventos reales observados.
const capacidades = {
  hooks: registrados('codex'),
  bloqueoPrevio: 'parcial', aprobacion: 'chat', finDeTurno: 'bloquea', compactacion: 'reinyecta', resultados: 'ediciones', sesion: 'si', consumo: 'no_disponible', aislamiento: 'desconocido',
  notas: {
    bloqueoPrevio: 'PreToolUse → permissionDecision deny (codex.js:29), pero el hook cubre Bash, apply_patch y MCP (codex.js:3); Codex no ejecuta hooks nuevos hasta aprobarlos en /hooks (install.js:360)',
    aprobacion: 'sin "ask" en PreToolUse: deny + confirmación en el chat ligada a la acción (codex.js:12, codex.js:29); git de escritura lo confirma Codex con sus reglas "prompt" (codex.js:12 nativeGitAsk, hooks-config.js:95)',
    finDeTurno: 'Stop → decision block (codex.js:33)',
    compactacion: 'SessionStart con matcher compact recibe el contexto de nuevo (hooks-config.js:28, codex.js:36-37)',
    resultados: 'PostToolUse solo en apply_patch|Edit|Write (hooks-config.js:31)',
    sesion: 'session_id del payload (codex.js:14)',
    consumo: 'usage.js solo entiende el transcript de Claude Code (usage.js:2)',
    aislamiento: 'los hooks no aíslan; doctor lee sandbox_mode de ~/.codex/config.toml',
  },
};

module.exports = { parse, format, EVENTS, capacidades };
