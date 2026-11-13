'use strict';
// Claude Code (CLI, extensión de VS Code/JetBrains y app de escritorio): hooks en ~/.claude/settings.json.
const { resolveRoot, toText, lastFromTranscript, normalizeTool, json, registrados } = require('./common');
const { permite } = require('./claude-permisos');

// SubagentStop: un sub-agente terminó. Con él se sabe cuándo quedan sub-agentes en segundo plano trabajando, para no
// verificar (ni retener el fin de turno) a mitad de su trabajo.
const EVENTS = { SessionStart: 'session', UserPromptSubmit: 'prompt', PreToolUse: 'pre', PostToolUse: 'post', Stop: 'stop', PreCompact: 'compact', SubagentStop: 'subagentStop' };

function parse(native, input, env) {
  const event = EVENTS[native];
  if (!event) return null;
  return {
    host: 'claude', event, nativeAsk: true, canRewrite: true, subagentStop: true, toolInput: input.tool_input,
    root: resolveRoot(env.CLAUDE_PROJECT_DIR, input.cwd),
    sessionId: input.session_id,
    source: input.source,
    prompt: input.prompt,
    tool: input.tool_name ? normalizeTool(input.tool_name, input.tool_input) : null,
    lastMessage: toText(input.last_assistant_message) || (event === 'stop' ? lastFromTranscript(input.transcript_path) : ''),
    stopActive: !!input.stop_hook_active,
    transcriptPath: input.transcript_path,
  };
}

function format(native, r, ev) {
  if (native === 'PreToolUse' && r.rewrite) {
    // Claude Code evalúa sus reglas contra el comando envuelto, no el original: solo se compacta lo que tus reglas ya
    // permiten y ninguna regla de preguntar o denegar toca (claude-permisos.js). Si no, el harness no opina y Claude
    // evalúa el comando original con tus reglas, como si el compactador no existiera.
    let allowed = false;
    try { allowed = permite(ev && ev.root, ((ev && ev.toolInput) || {}).command).ok; } catch { allowed = false; }
    if (!allowed) return {};
    return { stdout: json({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', permissionDecisionReason: '[harness] comando ya permitido por tus reglas; salida compactada', updatedInput: { ...((ev && ev.toolInput) || {}), command: r.rewrite } } }) };
  }
  if (native === 'PreToolUse' && r.decision) {
    return { stdout: json({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: r.decision, permissionDecisionReason: r.reason } }) };
  }
  if (native === 'PostToolUse' && r.feedback && r.soloContexto) return { stdout: json({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: r.feedback } }) };
  if (native === 'PostToolUse' && r.feedback) return { stdout: json({ decision: 'block', reason: r.feedback }) };
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
  hooks: registrados('claude'),
  bloqueoPrevio: 'si', aprobacion: 'nativa', finDeTurno: 'bloquea', compactacion: 'reinyecta', resultados: 'ediciones', sesion: 'si', consumo: 'medido', aislamiento: 'desconocido',
  notas: {
    bloqueoPrevio: 'PreToolUse → permissionDecision deny (claude.js:28) en las herramientas del matcher (hooks-config.js:17)',
    aprobacion: 'permissionDecision ask: diálogo nativo del cliente (claude.js:11 nativeAsk, claude.js:28)',
    finDeTurno: 'Stop → decision block (claude.js:33); si no bloquea, systemMessage (claude.js:34)',
    compactacion: 'SessionStart con source compact recibe el contexto de nuevo (claude.js:14, claude.js:36-38)',
    resultados: 'PostToolUse solo en Edit|Write|MultiEdit|NotebookEdit (hooks-config.js:18)',
    sesion: 'session_id del payload (claude.js:13)',
    consumo: 'transcript_path (claude.js:19) leído por usage.js en el formato de Claude Code (usage.js:2)',
    aislamiento: 'los hooks no aíslan; doctor lee sandbox.enabled de ~/.claude/settings.json',
  },
};

module.exports = { parse, format, EVENTS, capacidades };
