'use strict';
// Codex (CLI y extensión): hooks en ~/.codex/hooks.json (formato compatible con Claude Code).
// Diferencias: PreToolUse no admite "ask" (se confirma en el chat) y cubre Bash, apply_patch y MCP.
const { resolveRoot, toText, lastFromTranscript, normalizeTool, json } = require('./common');

const EVENTS = { SessionStart: 'session', UserPromptSubmit: 'prompt', PreToolUse: 'pre', PostToolUse: 'post', Stop: 'stop', PreCompact: 'compact' };

function parse(native, input) {
  const event = EVENTS[native];
  if (!event) return null;
  return {
    host: 'codex', event, nativeAsk: false,
    root: resolveRoot(input.cwd),
    sessionId: input.session_id,
    source: input.source,
    prompt: input.prompt,
    tool: input.tool_name ? normalizeTool(input.tool_name, input.tool_input) : null,
    lastMessage: toText(input.last_assistant_message) || (event === 'stop' ? lastFromTranscript(input.transcript_path) : ''),
    stopActive: !!input.stop_hook_active,
  };
}

function format(native, r) {
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

module.exports = { parse, format, EVENTS };
