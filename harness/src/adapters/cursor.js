'use strict';
// Cursor (editor y CLI): hooks en ~/.cursor/hooks.json. Claves de salida en snake_case.
// "ask" no es confiable en Cursor: las decisiones críticas se confirman en el chat.
const { resolveRoot, normalizeTool, json, first } = require('./common');

const EVENTS = { sessionStart: 'session', beforeSubmitPrompt: 'prompt', beforeShellExecution: 'pre', beforeReadFile: 'pre', beforeMCPExecution: 'pre', preToolUse: 'pre',
  postToolUse: 'post', afterFileEdit: 'post', afterAgentResponse: 'response', stop: 'stop', preCompact: 'compact' };
const EDIT_TOOLS = /^(write|edit|multiedit|strreplace|str_replace|delete|create|apply_patch|editfile|edit_file|search_replace)$/i;

function toolFor(native, input) {
  if (native === 'beforeShellExecution') return { kind: 'shell', name: 'Shell', command: String(input.command || ''), paths: [], contents: [] };
  if (native === 'beforeReadFile') return { kind: 'read', name: 'Read', paths: [input.file_path].filter(Boolean), contents: [] };
  if (native === 'beforeMCPExecution') return { kind: 'mcp', name: String(input.tool_name || ''), server: String(input.server || input.server_name || input.url || input.command || ''), tool: String(input.tool_name || ''), paths: [], contents: [] };
  if (native === 'afterFileEdit') return { kind: 'edit', name: 'Write', paths: [input.file_path].filter(Boolean), contents: [] };
  const name = String(input.tool_name || '');
  if (/^task$/i.test(name)) return normalizeTool('task', input.tool_input || {});
  if (!EDIT_TOOLS.test(name)) return null; // Shell y Read ya tienen su hook específico
  const t = normalizeTool('write', input.tool_input || {});
  return t.paths.length ? t : null;
}

function parse(native, input) {
  const event = EVENTS[native];
  if (!event) return null;
  const tool = event === 'pre' || event === 'post' ? toolFor(native, input) : null;
  if ((event === 'pre' || event === 'post') && !tool) return null;
  return {
    host: 'cursor', event, nativeAsk: false,
    root: resolveRoot(Array.isArray(input.workspace_roots) ? input.workspace_roots[0] : null, input.cwd),
    sessionId: first(input.conversation_id, input.session_id),
    prompt: input.prompt,
    tool,
    lastMessage: first(input.text, input.response, input.message, ''),
    aborted: input.status === 'aborted' || input.status === 'error',
  };
}

function format(native, r) {
  if ((native === 'beforeShellExecution' || native === 'beforeReadFile' || native === 'beforeMCPExecution' || native === 'preToolUse') && r.decision) {
    return { stdout: json({ permission: 'deny', user_message: r.reason, agent_message: r.reason }), stderr: `${r.reason}\n`, code: 2 };
  }
  if (native === 'beforeSubmitPrompt') return { stdout: json({ continue: true }) };
  if (native === 'postToolUse' && r.feedback) return { stdout: json({ additional_context: r.feedback }) };
  if (native === 'stop' && r.block) return { stdout: json({ followup_message: r.block }) };
  if (native === 'sessionStart' && r.context) return { stdout: json({ additional_context: r.context }) };
  return {};
}

module.exports = { parse, format, EVENTS };
