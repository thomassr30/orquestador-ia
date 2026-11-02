'use strict';
// GitHub Copilot (modo agente de VS Code y Copilot CLI): hooks en ~/.copilot/hooks/*.json.
// Formato camelCase: entrada toolName/toolArgs; salida permissionDecision, additionalContext, decision.
const { resolveRoot, toText, lastFromTranscript, normalizeTool, json, first } = require('./common');

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

module.exports = { parse, format, EVENTS };
