'use strict';
// Configuración de hooks que el instalador registra en cada herramienta. Todas apuntan al mismo
// punto de entrada (bin/sdd-hook.js) con el nombre de la herramienta y del evento nativo.
const R = require('./rules');

const MARKS = ['sdd-hook.js', 'sdd-context.js']; // sdd-context.js: hook de memoria de versiones 1.x
const STOP_MSG = 'Harness SDD: verificando lint, tipos y tests de lo modificado…';

const cmd = (home, host, ev) => `node "${home}/bin/sdd-hook.js" ${host} ${ev}`;

/** Claude Code — ~/.claude/settings.json → hooks (timeout en segundos). */
function claude(home) {
  const h = (ev, timeout, extra = {}) => ({ type: 'command', command: cmd(home, 'claude', ev), timeout, ...extra });
  return {
    SessionStart: [{ hooks: [h('SessionStart', 15)] }],
    UserPromptSubmit: [{ hooks: [h('UserPromptSubmit', 10)] }],
    PreToolUse: [{ matcher: 'Bash|Edit|Write|MultiEdit|NotebookEdit|Read|Grep', hooks: [h('PreToolUse', 15)] }],
    PostToolUse: [{ matcher: 'Edit|Write|MultiEdit|NotebookEdit', hooks: [h('PostToolUse', 30)] }],
    Stop: [{ hooks: [h('Stop', 900, { statusMessage: STOP_MSG })] }],
    PreCompact: [{ hooks: [h('PreCompact', 15)] }],
  };
}

/** Codex — ~/.codex/hooks.json (mismo formato que Claude Code; timeout en segundos). */
function codex(home) {
  const h = (ev, timeout, extra = {}) => ({ type: 'command', command: cmd(home, 'codex', ev), timeout, ...extra });
  return {
    SessionStart: [{ matcher: 'startup|resume|clear|compact', hooks: [h('SessionStart', 15)] }],
    UserPromptSubmit: [{ hooks: [h('UserPromptSubmit', 10)] }],
    PreToolUse: [{ matcher: 'Bash|apply_patch|Edit|Write', hooks: [h('PreToolUse', 15, { statusMessage: 'Harness SDD: revisando permisos' })] }],
    PostToolUse: [{ matcher: 'apply_patch|Edit|Write', hooks: [h('PostToolUse', 30)] }],
    Stop: [{ hooks: [h('Stop', 900, { statusMessage: STOP_MSG })] }],
    PreCompact: [{ hooks: [h('PreCompact', 15)] }],
  };
}

/** Gemini CLI — ~/.gemini/settings.json → hooks (timeout en milisegundos). */
function gemini(home) {
  const h = (ev, timeout) => ({ name: `sdd-${ev}`, type: 'command', command: cmd(home, 'gemini', ev), timeout });
  return {
    SessionStart: [{ hooks: [h('SessionStart', 15000)] }],
    BeforeAgent: [{ hooks: [h('BeforeAgent', 10000)] }],
    BeforeTool: [{ matcher: 'run_shell_command|write_file|replace|edit|smart_edit|read_file|read_many_files', hooks: [h('BeforeTool', 15000)] }],
    AfterTool: [{ matcher: 'write_file|replace|edit|smart_edit', hooks: [h('AfterTool', 30000)] }],
    AfterAgent: [{ hooks: [h('AfterAgent', 900000)] }],
    PreCompress: [{ hooks: [h('PreCompress', 15000)] }],
  };
}

/** Cursor — ~/.cursor/hooks.json (version 1; timeout en segundos; matcher = regex JavaScript). */
function cursor(home) {
  const h = (ev, timeout, extra = {}) => ({ command: cmd(home, 'cursor', ev), timeout, ...extra });
  return {
    sessionStart: [h('sessionStart', 15)],
    beforeSubmitPrompt: [h('beforeSubmitPrompt', 10)],
    beforeShellExecution: [h('beforeShellExecution', 15)],
    beforeReadFile: [h('beforeReadFile', 10)],
    preToolUse: [h('preToolUse', 15, { matcher: '^(?!(Shell|Read|Grep|Glob|Task|LS)$)(?!MCP).+' })],
    postToolUse: [h('postToolUse', 30, { matcher: '^(?!(Shell|Read|Grep|Glob|Task|LS)$)(?!MCP).+' })],
    afterFileEdit: [h('afterFileEdit', 15)],
    afterAgentResponse: [h('afterAgentResponse', 10)],
    stop: [h('stop', 900, { loop_limit: 3 })],
    preCompact: [h('preCompact', 15)],
  };
}

/** GitHub Copilot (VS Code y CLI) — archivo propio en ~/.copilot/hooks/ (timeoutSec). */
function copilot(home) {
  const h = (ev, timeoutSec) => ({ type: 'command', command: cmd(home, 'copilot', ev), timeoutSec });
  return {
    version: 1,
    hooks: {
      sessionStart: [h('sessionStart', 15)],
      userPromptSubmitted: [h('userPromptSubmitted', 10)],
      preToolUse: [h('preToolUse', 15)],
      postToolUse: [h('postToolUse', 30)],
      agentStop: [h('agentStop', 900)],
      preCompact: [h('preCompact', 15)],
    },
  };
}

/** Reglas nativas de Codex (~/.codex/rules/): red de seguridad aunque los hooks aún no estén aprobados. */
function codexRules() {
  const rule = (words, decision, why) => `prefix_rule(pattern = ${JSON.stringify(words)}, decision = "${decision}", justification = ${JSON.stringify(why)})`;
  const git = 'Orquestador SDD: git es solo lectura. Sugiere el comando al usuario como texto para que lo ejecute él.';
  const forge = 'Orquestador SDD: la escritura en GitHub/GitLab la hace el usuario. Sugiérelo como texto.';
  return [
    '# Orquestador SDD — reglas de comandos para Codex. Generado por install.js; se reemplaza al reinstalar.',
    '# git solo lectura y escritura en GitHub/GitLab bloqueada. Las confirmaciones críticas las pide el hook del harness.',
    ...R.GIT_WRITE.map(c => rule(['git', ...c.split(' ')], 'forbidden', git)),
    rule(['git', 'stash'], 'forbidden', git),
    ...R.FORGE_WRITE.map(c => rule(c.split(' '), 'forbidden', forge)),
    '',
  ].join('\n');
}

/** ¿Este grupo/entrada de hooks es del orquestador? */
function isOurs(entry) {
  const has = c => MARKS.some(m => String(c || '').includes(m));
  if (!entry || typeof entry !== 'object') return false;
  return has(entry.command) || (Array.isArray(entry.hooks) && entry.hooks.some(h => has(h && h.command)));
}

/** Quita nuestros hooks de un objeto { Evento: [grupos] } y agrega los nuevos (si se pasan). */
function mergeHooks(hooks, wanted) {
  const out = { ...(hooks || {}) };
  for (const ev of Object.keys(out)) {
    if (!Array.isArray(out[ev])) continue;
    out[ev] = out[ev].filter(g => !isOurs(g));
    if (!out[ev].length) delete out[ev];
  }
  for (const [ev, groups] of Object.entries(wanted || {})) out[ev] = [...(out[ev] || []), ...groups];
  return out;
}

module.exports = { claude, codex, gemini, cursor, copilot, codexRules, mergeHooks, isOurs, MARKS };
