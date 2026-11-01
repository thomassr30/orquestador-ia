'use strict';
// Gemini CLI: hooks en ~/.gemini/settings.json. La salida debe ser SOLO JSON.
// AfterAgent con decision "deny" hace que el agente reintente con el motivo como nuevo mensaje.
const { resolveRoot, toText, normalizeTool, json } = require('./common');

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

module.exports = { parse, format, EVENTS };
