'use strict';
// Cursor (editor y CLI): hooks en ~/.cursor/hooks.json. Claves de salida en snake_case.
// "ask" no es confiable en Cursor: las decisiones críticas se confirman en el chat.
const { resolveRoot, normalizeTool, json, first, registrados } = require('./common');

const EVENTS = { sessionStart: 'session', beforeSubmitPrompt: 'prompt', beforeShellExecution: 'pre', beforeReadFile: 'pre', beforeMCPExecution: 'pre', preToolUse: 'pre',
  postToolUse: 'post', afterFileEdit: 'post', afterAgentResponse: 'response', stop: 'stop', preCompact: 'compact' };
const EDIT_TOOLS = /^(write|edit|multiedit|strreplace|str_replace|delete|create|apply_patch|editfile|edit_file|search_replace)$/i;

function toolFor(native, input) {
  if (native === 'beforeShellExecution') return { kind: 'shell', name: 'Shell', command: String(input.command || ''), paths: [], contents: [] };
  if (native === 'beforeReadFile') return { kind: 'read', name: 'Read', paths: [input.file_path].filter(Boolean), contents: [] };
  if (native === 'beforeMCPExecution') {
    let args = input.tool_input || {};
    if (typeof args === 'string') { try { args = JSON.parse(args); } catch { args = {}; } }
    return { kind: 'mcp', name: String(input.tool_name || ''), server: String(input.server || input.server_name || input.url || input.command || ''), tool: String(input.tool_name || ''), args, paths: [], contents: [] };
  }
  if (native === 'afterFileEdit') return { kind: 'edit', name: 'Write', paths: [input.file_path].filter(Boolean), contents: [] };
  const name = String(input.tool_name || '');
  if (/^task$/i.test(name)) return normalizeTool('task', input.tool_input || {});
  if (/^(web_?fetch|web_?search|fetch)$/i.test(name)) return normalizeTool(name, input.tool_input || {}); // contenido externo
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
    transcriptPath: input.transcript_path,
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

// Capacidades que declara este adaptador según su código (contrato en capacidades.js). Que el cliente real las respete
// no se comprueba aquí: doctor las cruza con la prueba sintética y con los eventos reales observados.
const capacidades = {
  hooks: registrados('cursor'),
  bloqueoPrevio: 'si', aprobacion: 'chat', finDeTurno: 'reintenta', compactacion: 'aviso-previo', resultados: 'ediciones', sesion: 'si', consumo: 'no_disponible', aislamiento: 'desconocido',
  notas: {
    bloqueoPrevio: 'permission deny + salida 2 en beforeShellExecution, beforeReadFile, beforeMCPExecution y preToolUse (cursor.js:45-46); preToolUse solo evalúa ediciones, task y web (cursor.js:20-22)',
    aprobacion: '"ask" no es confiable en Cursor: deny + confirmación en el chat (cursor.js:3, cursor.js:33)',
    finDeTurno: 'stop → followup_message: un mensaje nuevo al agente, no un bloqueo (cursor.js:50), máx. 3 veces (hooks-config.js:63)',
    compactacion: 'preCompact sin salida (cursor.js:52): el núcleo guarda la sesión antes de compactar, pero no reinyecta contexto',
    resultados: 'postToolUse y afterFileEdit solo para ediciones (cursor.js:18, cursor.js:22, hooks-config.js:60-61)',
    sesion: 'conversation_id del payload (cursor.js:35)',
    consumo: 'usage.js solo entiende el transcript de Claude Code (usage.js:2)',
    aislamiento: 'los hooks no aíslan; su sandbox no se verificó en documentación',
  },
};

module.exports = { parse, format, EVENTS, capacidades };
