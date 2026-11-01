'use strict';
// Claude Code (CLI, extensión de VS Code/JetBrains y app de escritorio): hooks en ~/.claude/settings.json.
const { resolveRoot, toText, lastFromTranscript, normalizeTool, json } = require('./common');

const EVENTS = { SessionStart: 'session', UserPromptSubmit: 'prompt', PreToolUse: 'pre', PostToolUse: 'post', Stop: 'stop', PreCompact: 'compact' };

function parse(native, input, env) {
  const event = EVENTS[native];
  if (!event) return null;
  return {
    host: 'claude', event, nativeAsk: true,
    root: resolveRoot(env.CLAUDE_PROJECT_DIR, input.cwd),
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
    return { stdout: json({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: r.decision, permissionDecisionReason: r.reason } }) };
  }
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

module.exports = { parse, format, EVENTS };
