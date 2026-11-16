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
    PreToolUse: [{ matcher: 'Bash|Edit|Write|MultiEdit|NotebookEdit|Read|Grep|Task|Agent|WebFetch|WebSearch|mcp__.*', hooks: [h('PreToolUse', 15)] }],
    PostToolUse: [{ matcher: 'Edit|Write|MultiEdit|NotebookEdit', hooks: [h('PostToolUse', 30)] }],
    Stop: [{ hooks: [h('Stop', 900, { statusMessage: STOP_MSG })] }],
    SubagentStop: [{ hooks: [h('SubagentStop', 10)] }],
    PreCompact: [{ hooks: [h('PreCompact', 15)] }],
  };
}

/** Codex — ~/.codex/hooks.json (mismo formato que Claude Code; timeout en segundos). */
function codex(home) {
  const h = (ev, timeout, extra = {}) => ({ type: 'command', command: cmd(home, 'codex', ev), timeout, ...extra });
  return {
    SessionStart: [{ matcher: 'startup|resume|clear|compact', hooks: [h('SessionStart', 15)] }],
    UserPromptSubmit: [{ hooks: [h('UserPromptSubmit', 10)] }],
    PreToolUse: [{ matcher: 'Bash|apply_patch|Edit|Write|spawn_agent|Agent|web_search|web_fetch|mcp__.*', hooks: [h('PreToolUse', 15, { statusMessage: 'Harness SDD: revisando permisos' })] }],
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
    BeforeTool: [{ matcher: 'run_shell_command|write_file|replace|edit|smart_edit|read_file|read_many_files|web_fetch|google_web_search|mcp_.*', hooks: [h('BeforeTool', 15000)] }],
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
    beforeMCPExecution: [h('beforeMCPExecution', 15)],
    preToolUse: [h('preToolUse', 15, { matcher: '^(?!(Shell|Read|Grep|Glob|LS)$)(?!MCP).+' })],
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
function codexRules(home) {
  const rule = (words, decision, why) => `prefix_rule(pattern = ${JSON.stringify(words)}, decision = "${decision}", justification = ${JSON.stringify(why)})`;
  const commit = 'Orquestador SDD: crea un commit. Apruébalo solo si viste el mensaje (sin líneas de atribución de IA) y los archivos que incluye.';
  const git = 'Orquestador SDD: modifica el repositorio git. Apruébalo solo si entiendes el efecto.';
  const forge = 'Orquestador SDD: la escritura en GitHub/GitLab la hace el usuario. Sugiérelo como texto.';
  const own = home ? ownScriptPerms(home).codex : null;
  return [
    '# Orquestador SDD — reglas de comandos para Codex. Generado por install.js; se reemplaza al reinstalar.',
    '# commit y el resto de git con tu aprobación · escritura en GitHub/GitLab bloqueada.',
    ...R.GIT_COMMIT.map(c => rule(['git', ...c.split(' ')], 'prompt', commit)),
    ...R.COMMIT_TOOLS.map(c => rule(c.split(' '), 'prompt', commit)),
    ...R.GIT_WRITE.map(c => rule(['git', ...c.split(' ')], 'prompt', git)),
    ...R.FORGE_WRITE.map(c => rule(c.split(' '), 'forbidden', forge)),
    ...(own ? [
      '# Scripts propios del orquestador (estado, memoria, registro del trabajo) sin preguntar; lo que decide el usuario, con su aprobación.',
      ...own.allow.map(p => rule(p, 'allow', 'Orquestador SDD: script propio del harness (estado, memoria, diagnóstico o registro del trabajo).')),
      ...own.prompt.map(p => rule(p, 'prompt', 'Orquestador SDD: esta decisión es del usuario; el agente no la toma por él.')),
    ] : []),
    '',
  ].join('\n');
}

/**
 * Permiso nativo de cada cliente para los scripts propios del orquestador (`home` = SDD_HOME con barras normales).
 * El agente los escribe como `node "<home>/bin/<script>" …` (ver paths.harnessCmd): las reglas usan ese mismo texto.
 * Los subcomandos de HARNESS_USER_ONLY nunca quedan preaprobados.
 */
function ownScriptPerms(home) {
  const call = f => `node "${home}/bin/${f}"`;
  const userOnly = s => `${call('sdd-harness.js')} ${s}`;
  // Codex compara tokens (sin comillas); en Windows el agente puede escribir la ruta con barras invertidas.
  const tokens = f => [...new Set([`${home}/bin/${f}`, `${home.replace(/\//g, '\\')}\\bin\\${f}`])];
  return {
    claude: { allow: R.OWN_SCRIPTS.map(f => `Bash(${call(f)}:*)`), ask: R.HARNESS_USER_ONLY.map(s => `Bash(${userOnly(s)}:*)`) },
    codex: {
      allow: [['node', R.OWN_SCRIPTS.flatMap(tokens)]],
      prompt: R.HARNESS_USER_ONLY.map(s => ['node', tokens('sdd-harness.js'), ...s.split(' ')]),
    },
    // OpenCode: gana la última regla que coincide → primero lo permitido, después las excepciones del usuario.
    opencode: [...R.OWN_SCRIPTS.map(f => [`${call(f)}*`, 'allow']), ...R.HARNESS_USER_ONLY.map(s => [`${userOnly(s)}*`, 'ask'])],
    // Gemini CLI: tools.allowed saltea la confirmación por prefijo del comando. Lo de HARNESS_USER_ONLY lo bloquea el
    // hook BeforeTool del harness (el agente no puede aprobar ni aceptar por el usuario).
    gemini: R.OWN_SCRIPTS.map(f => `run_shell_command(${call(f)})`),
    // Cursor y VS Code Copilot guardan la lista en su propia configuración: el instalador solo indica qué agregar.
    prefijos: R.OWN_SCRIPTS.map(call),
  };
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

module.exports = { claude, codex, gemini, cursor, copilot, codexRules, ownScriptPerms, mergeHooks, isOurs, MARKS };
