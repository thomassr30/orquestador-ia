#!/usr/bin/env node
/*
 * Orquestador SDD — instalador GLOBAL multi-IA
 * Herramientas: Claude Code, OpenCode, Gemini CLI, Codex CLI, Cursor, VS Code Copilot
 *
 * Uso:
 *   node install.js                      instala en las herramientas detectadas (o las de la instalación anterior)
 *   node install.js --detect             vuelve a detectar herramientas instaladas
 *   node install.js --targets=all        instala en todas
 *   node install.js --targets=claude,opencode
 *   node install.js --dry-run            muestra qué haría, sin escribir
 *   node install.js --no-mcp             no registra servidores MCP
 *   node install.js --no-deps            no instala pdfjs-dist / mammoth
 *   node install.js --auto-edits         Claude Code acepta ediciones de archivos sin preguntar (modo acceptEdits)
 *   node install.js --no-permissions     no agrega permisos preaprobados en Claude Code (git/gh siempre piden aprobación)
 *   node install.js --no-hooks           no instala el hook de memoria de Claude Code
 *   node install.js --force              sobrescribe skills/agentes con el mismo nombre que no son del orquestador
 *   node install.js --uninstall          desinstala todo lo instalado
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

// ---------- opciones ----------
const argv = process.argv.slice(2);
const opt = n => argv.includes(`--${n}`);
const val = n => { const a = argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : undefined; };
const DRY = opt('dry-run'); const FORCE = opt('force');

// ---------- rutas ----------
const ROOT = __dirname;
const CORE = path.join(ROOT, 'core');
const HOME = os.homedir();
const IS_WIN = process.platform === 'win32';
const SDD_HOME = path.join(HOME, '.sdd-orquestador');
const SDD_HOME_FWD = SDD_HOME.replace(/\\/g, '/');
const MANIFEST = path.join(SDD_HOME, 'manifest.json');
const VERSION = require(path.join(ROOT, 'package.json')).version;
const MARK_START = '<!-- sdd-orquestador:inicio -->';
const MARK_END = '<!-- sdd-orquestador:fin -->';

function vscodeUserDir() {
  if (IS_WIN) return path.join(process.env.APPDATA || path.join(HOME, 'AppData', 'Roaming'), 'Code', 'User');
  if (process.platform === 'darwin') return path.join(HOME, 'Library', 'Application Support', 'Code', 'User');
  return path.join(HOME, '.config', 'Code', 'User');
}
const CODEX_HOME = process.env.CODEX_HOME || path.join(HOME, '.codex');
const SHARED_SKILLS = path.join(HOME, '.agents', 'skills'); // estándar leído por OpenCode, Gemini, Codex, Cursor, Copilot

const TARGETS = {
  claude: {
    label: 'Claude Code', detect: [path.join(HOME, '.claude')], cli: 'claude',
    skills: path.join(HOME, '.claude', 'skills'),
    agents: path.join(HOME, '.claude', 'agents'), agentFmt: 'claude',
    rules: path.join(HOME, '.claude', 'CLAUDE.md'),
    settings: path.join(HOME, '.claude', 'settings.json'),
    mcp: { kind: 'claude' }
  },
  opencode: {
    label: 'OpenCode', detect: [path.join(HOME, '.config', 'opencode')], cli: 'opencode',
    skills: SHARED_SKILLS,
    agents: path.join(HOME, '.config', 'opencode', 'agents'), agentFmt: 'opencode',
    commands: path.join(HOME, '.config', 'opencode', 'commands'), cmdFmt: 'opencode',
    rules: path.join(HOME, '.config', 'opencode', 'AGENTS.md'),
    mcp: { kind: 'opencode', file: path.join(HOME, '.config', 'opencode', 'opencode.json') }
  },
  gemini: {
    label: 'Gemini CLI', detect: [path.join(HOME, '.gemini')], cli: 'gemini',
    skills: SHARED_SKILLS,
    agents: path.join(HOME, '.gemini', 'agents'), agentFmt: 'gemini',
    commands: path.join(HOME, '.gemini', 'commands'), cmdFmt: 'gemini',
    rules: path.join(HOME, '.gemini', 'GEMINI.md'),
    mcp: { kind: 'json', key: 'mcpServers', file: path.join(HOME, '.gemini', 'settings.json') }
  },
  codex: {
    label: 'Codex CLI', detect: [CODEX_HOME], cli: 'codex',
    skills: SHARED_SKILLS,
    agents: path.join(CODEX_HOME, 'agents'), agentFmt: 'codex',
    rules: path.join(CODEX_HOME, 'AGENTS.md'),
    mcp: { kind: 'codex', file: path.join(CODEX_HOME, 'config.toml') }
  },
  cursor: {
    label: 'Cursor', detect: [path.join(HOME, '.cursor')], cli: null,
    skills: SHARED_SKILLS,
    agents: path.join(HOME, '.cursor', 'agents'), agentFmt: 'cursor',
    rules: null, // Cursor guarda las User Rules en su configuración (manual)
    mcp: { kind: 'json', key: 'mcpServers', file: path.join(HOME, '.cursor', 'mcp.json'), stdioType: true }
  },
  copilot: {
    label: 'VS Code Copilot', detect: [path.join(HOME, '.copilot'), vscodeUserDir()], cli: null,
    skills: SHARED_SKILLS,
    agents: path.join(HOME, '.copilot', 'agents'), agentFmt: 'copilot',
    rules: path.join(HOME, '.copilot', 'copilot-instructions.md'),
    mcp: { kind: 'json', key: 'servers', file: path.join(vscodeUserDir(), 'mcp.json'), stdioType: true, requireDir: true }
  }
};

// ---------- utilidades ----------
const log = (...a) => console.log(...a);
const warn = m => console.log(`  ⚠ ${m}`);
const notes = [];
const manifest = { version: VERSION, source: ROOT, installedAt: new Date().toISOString(), targets: [], files: [], dirs: [], rules: [], mcp: [] };

// Ejecuta un comando sin el aviso DEP0190: en Windows se pasa una sola línea al shell (necesario para .cmd)
function run(cmd, args, opts = {}) {
  if (!IS_WIN) return spawnSync(cmd, args, opts);
  const line = [cmd, ...args].map(a => /[\s"&|<>^]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a).join(' ');
  return spawnSync(line, { ...opts, shell: true });
}
function hasCli(cmd) {
  const r = run(IS_WIN ? 'where' : 'which', [cmd], { stdio: 'ignore' });
  return r.status === 0;
}
function mkdirp(d) { if (!DRY) fs.mkdirSync(d, { recursive: true }); }
function writeFile(f, content) {
  if (DRY) { log(`  [dry] escribir ${f}`); return; }
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content, 'utf8');
}
function backup(f) {
  if (DRY || !fs.existsSync(f)) return;
  const b = `${f}.bak-sdd`;
  if (!fs.existsSync(b)) fs.copyFileSync(f, b);
}
const SDD_SOURCE_FWD = ROOT.replace(/\\/g, '/');
function render(text) {
  let out = text.split('{{SDD_HOME}}').join(SDD_HOME_FWD).split('{{SDD_SOURCE}}').join(SDD_SOURCE_FWD);
  // Frontmatter YAML seguro: entrecomilla descripciones con ": " (evita skills inválidas)
  out = out.replace(/^(---\r?\n[\s\S]*?^description: )(?!["'])(.*: .*)$/m, (_, pre, v) => pre + JSON.stringify(v));
  return out;
}
function copyDir(src, dst) {
  mkdirp(dst);
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name); const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (/\.(md|txt|json|ya?ml|toml)$/i.test(e.name)) writeFile(d, render(fs.readFileSync(s, 'utf8')));
    else if (!DRY) fs.copyFileSync(s, d);
  }
}
function rmrf(p) { if (!DRY && fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); }
function prevManifest() { try { return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch { return null; } }
const q = s => JSON.stringify(String(s)); // string YAML/TOML segura (comillas dobles)

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error('Frontmatter no encontrado');
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^([\w-]+):\s*(.*)$/);
    if (!mm) continue;
    let v = mm[2].trim();
    if (v.startsWith('[') && v.endsWith(']')) v = v.slice(1, -1).split(',').map(x => x.trim()).filter(Boolean);
    meta[mm[1]] = v;
  }
  return { meta, body: m[2].trim() + '\n' };
}

function modelFor(target, tier) {
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'models.json'), 'utf8')); } catch { /* sin config */ }
  const m = (cfg[target] || {})[tier || 'strong'];
  return m && m !== 'inherit' ? m : null;
}

// ---------- generadores de agentes ----------
function renderAgent(fmt, target, a) {
  const { meta, body } = a; const model = modelFor(target, meta.tier);
  const b = render(body);
  switch (fmt) {
    case 'claude':
      return `---\nname: ${meta.name}\ndescription: ${q(meta.description)}\nmodel: ${model || 'inherit'}\n---\n${b}`;
    case 'opencode':
      return `---\ndescription: ${q(meta.description)}\nmode: subagent\n${model ? `model: ${model}\n` : ''}---\n${b}`;
    case 'gemini':
      return `---\nname: ${meta.name}\ndescription: ${q(meta.description)}\n${model ? `model: ${model}\n` : ''}---\n${b}`;
    case 'cursor':
      return `---\nname: ${meta.name}\ndescription: ${q(meta.description)}\nmodel: ${model || 'inherit'}\nreadonly: false\n---\n${b}`;
    case 'copilot':
      return `---\nname: ${meta.name}\ndescription: ${q(meta.description)}\nuser-invocable: false\n${model ? `model: ${q(model)}\n` : ''}---\n${b}`;
    case 'codex': {
      const esc = b.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"');
      return `name = ${q(meta.name)}\ndescription = ${q(meta.description)}\n${model ? `model = ${q(model)}\n` : ''}developer_instructions = """\n${esc}"""\n`;
    }
  }
  throw new Error(`Formato desconocido ${fmt}`);
}
const agentFile = (fmt, dir, name) =>
  path.join(dir, fmt === 'codex' ? `${name}.toml` : fmt === 'copilot' ? `${name}.agent.md` : `${name}.md`);

function copilotOrchestrator(agentNames) {
  return `---\nname: sdd-orquestador\ndescription: ${q('Orquestador SDD: coordina sub-agentes sdd-* (explorar, especificar, diseñar, testear, implementar, verificar). Úsalo con /sdd-new o /sdd-fix.')}\nagents: [${agentNames.map(n => q(n)).join(', ')}]\n---\nCarga la skill \`sdd-orchestrator\` y actúa como ORQUESTADOR: delegas cada fase en el sub-agente sdd-* correspondiente y nunca implementas directamente.\n`;
}

// ---------- comandos ----------
function renderCommand(fmt, c) {
  const instr = `Carga la skill \`${c.skill}\` y sigue sus instrucciones al pie de la letra.`;
  if (fmt === 'opencode') return `---\ndescription: ${q(c.description)}\n---\n${instr}\n\nSolicitud del usuario: $ARGUMENTS\n`;
  if (fmt === 'gemini') return `description = ${q(c.description)}\nprompt = """\n${instr} (Activa la skill con tu herramienta de skills.)\n\nSolicitud del usuario: {{args}}\n"""\n`;
  throw new Error(fmt);
}

// ---------- reglas globales ----------
function upsertRules(file) {
  const block = `${MARK_START}\n${fs.readFileSync(path.join(CORE, 'rules', 'global.md'), 'utf8').trim()}\n${MARK_END}`;
  let cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const re = new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}`);
  const next = re.test(cur) ? cur.replace(re, block) : (cur.trim() ? `${cur.trimEnd()}\n\n${block}\n` : `${block}\n`);
  if (next !== cur) { backup(file); writeFile(file, next); }
  if (!manifest.rules.includes(file)) manifest.rules.push(file);
}
function removeRules(file) {
  if (!fs.existsSync(file)) return;
  const cur = fs.readFileSync(file, 'utf8');
  const re = new RegExp(`\\n*${MARK_START}[\\s\\S]*?${MARK_END}\\n?`);
  if (re.test(cur)) writeFile(file, cur.replace(re, '\n').replace(/^\n+/, ''));
}

// ---------- MCP ----------
function mcpServers() {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'mcp.json'), 'utf8'));
  return Object.entries(cfg).filter(([k, v]) => !k.startsWith('_') && v.enabled !== false)
    .map(([name, v]) => {
      // En Windows, npx es npx.cmd: se envuelve con cmd /c para que lo lancen todas las herramientas
      const wrap = IS_WIN && v.command === 'npx';
      return { name, command: wrap ? 'cmd' : v.command, args: wrap ? ['/c', 'npx', ...v.args] : v.args };
    });
}
function readJson(file) {
  if (!fs.existsSync(file)) return {};
  const raw = fs.readFileSync(file, 'utf8');
  if (!raw.trim()) return {};
  return JSON.parse(raw); // lanza si tiene comentarios (JSONC) → se informa al usuario
}
function registerMcp(tkey, t) {
  const servers = mcpServers();
  const m = t.mcp;
  if (m.kind === 'claude') {
    if (!hasCli('claude')) { notes.push(`Claude Code: CLI no encontrada; registra los MCP manualmente:\n${servers.map(s => `  claude mcp add -s user ${s.name} -- ${[s.command, ...s.args].join(' ')}`).join('\n')}`); return; }
    for (const s of servers) {
      const exists = run('claude', ['mcp', 'get', s.name], { stdio: 'ignore' }).status === 0;
      if (exists) { log(`  · MCP ${s.name} ya existe en Claude Code`); continue; }
      if (DRY) { log(`  [dry] claude mcp add -s user ${s.name}`); continue; }
      const r = run('claude', ['mcp', 'add', '-s', 'user', s.name, '--', s.command, ...s.args], { stdio: 'pipe' });
      if (r.status === 0) { log(`  ✓ MCP ${s.name}`); manifest.mcp.push({ target: tkey, name: s.name }); }
      else warn(`No se pudo registrar MCP ${s.name} en Claude Code: ${String(r.stderr || '').trim()}`);
    }
    return;
  }
  if (m.requireDir && !fs.existsSync(path.dirname(m.file))) { notes.push(`${t.label}: no se encontró ${path.dirname(m.file)}; MCP no registrados.`); return; }
  if (m.kind === 'codex') {
    let cur = fs.existsSync(m.file) ? fs.readFileSync(m.file, 'utf8') : '';
    let add = '';
    for (const s of servers) {
      if (cur.includes(`[mcp_servers.${s.name}]`)) { log(`  · MCP ${s.name} ya existe en Codex`); continue; }
      add += `\n[mcp_servers.${s.name}]\ncommand = ${q(s.command)}\nargs = [${s.args.map(q).join(', ')}]\n`;
      manifest.mcp.push({ target: tkey, name: s.name, file: m.file });
    }
    if (add) { backup(m.file); writeFile(m.file, cur.trimEnd() + '\n' + add); log(`  ✓ MCP en ${m.file}`); }
    return;
  }
  let json;
  try { json = readJson(m.file); } catch (e) {
    notes.push(`${t.label}: ${m.file} no es JSON puro (¿comentarios?). Agrega manualmente los MCP: ${servers.map(s => s.name).join(', ')}`); return;
  }
  const key = m.kind === 'opencode' ? 'mcp' : m.key;
  json[key] = json[key] || {};
  let changed = false;
  for (const s of servers) {
    if (json[key][s.name]) { log(`  · MCP ${s.name} ya existe en ${t.label}`); continue; }
    json[key][s.name] = m.kind === 'opencode'
      ? { type: 'local', command: [s.command, ...s.args], enabled: true }
      : { ...(m.stdioType ? { type: 'stdio' } : {}), command: s.command, args: s.args };
    manifest.mcp.push({ target: tkey, name: s.name, file: m.file });
    changed = true;
  }
  if (changed) { backup(m.file); writeFile(m.file, JSON.stringify(json, null, 2) + '\n'); log(`  ✓ MCP en ${m.file}`); }
}

// ---------- permisos preaprobados (Claude Code) ----------
// Tests, lint, build y scripts del orquestador. Nada que borre, publique o despliegue.
function permissionRules() {
  const bin = `${SDD_HOME_FWD}/bin`;
  return [
    ...['new-change.js', 'sdd-state.js', 'sdd-status.js', 'to-md.js', 'sdd-memory.js', 'sdd-context.js', 'sdd-workspace.js'].map(f => `Bash(node "${bin}/${f}":*)`),
    'Bash(npm test:*)', 'Bash(npm run test:*)', 'Bash(npm run lint:*)', 'Bash(npm run build:*)', 'Bash(npm run typecheck:*)', 'Bash(npm audit:*)',
    'Bash(npx vitest:*)', 'Bash(npx jest:*)', 'Bash(npx playwright test:*)', 'Bash(npx tsc --noEmit:*)', 'Bash(npx eslint:*)', 'Bash(npx stylelint:*)',
    'Bash(ng test:*)', 'Bash(ng lint:*)', 'Bash(ng build:*)', 'Bash(npx ng test:*)', 'Bash(npx ng lint:*)', 'Bash(npx ng build:*)',
    'Bash(node ace test:*)',
    'Bash(go test:*)', 'Bash(go vet:*)', 'Bash(go build:*)', 'Bash(golangci-lint run:*)', 'Bash(govulncheck:*)', 'Bash(gosec:*)',
    'Bash(semgrep scan:*)', 'Bash(docker ps:*)'
  ];
}
// ---------- git: lectura libre, escritura bloqueada (deny > ask > allow en Claude Code) ----------
const GIT_READ = ['status', 'diff', 'log', 'show', 'blame', 'ls-files', 'ls-tree', 'grep', 'rev-parse', 'describe', 'shortlog',
  'cat-file', 'merge-base', 'for-each-ref', 'name-rev', 'remote -v', 'remote show', 'branch --list', 'branch -a', 'branch -r',
  'branch -v', 'branch -vv', 'branch --show-current', 'stash list', 'stash show', 'worktree list', 'config --get', 'config --list', 'reflog show'];
const GIT_WRITE = ['commit', 'push', 'pull', 'merge', 'rebase', 'reset', 'checkout', 'switch', 'restore', 'add', 'rm', 'mv',
  'cherry-pick', 'revert', 'clean', 'am', 'apply', 'commit-tree', 'update-ref', 'update-index', 'filter-branch', 'filter-repo',
  'gc', 'prune', 'init', 'submodule add', 'submodule update', 'submodule deinit', 'worktree add', 'worktree remove', 'worktree prune',
  'remote add', 'remote remove', 'remote rm', 'remote rename', 'remote set-url', 'remote prune', 'notes add', 'notes remove', 'replace',
  'reflog expire', 'reflog delete', 'stash push', 'stash pop', 'stash apply', 'stash drop', 'stash clear', 'stash save', 'stash create', 'stash store',
  'tag -a', 'tag -s', 'tag -d', 'tag -f', 'tag --delete', 'tag --force', 'branch -d', 'branch -D', 'branch -m', 'branch -M', 'branch -c', 'branch -C',
  'branch --delete', 'branch --move', 'branch --copy', 'branch -f', 'branch --force', 'branch -u', 'branch --set-upstream-to', 'branch --unset-upstream'];
const FORGE_READ = ['gh pr view', 'gh pr list', 'gh pr diff', 'gh pr checks', 'gh pr status', 'gh issue view', 'gh issue list', 'gh issue status',
  'gh repo view', 'gh run list', 'gh run view', 'gh release list', 'gh release view', 'gh search', 'glab mr view', 'glab mr list', 'glab mr diff',
  'glab issue view', 'glab issue list', 'glab repo view', 'glab ci list', 'glab ci view'];
const FORGE_WRITE = ['gh pr create', 'gh pr merge', 'gh pr close', 'gh pr reopen', 'gh pr edit', 'gh pr comment', 'gh pr review', 'gh pr checkout', 'gh pr ready',
  'gh issue create', 'gh issue close', 'gh issue reopen', 'gh issue edit', 'gh issue comment', 'gh issue delete', 'gh issue transfer', 'gh issue lock',
  'gh release create', 'gh release delete', 'gh release edit', 'gh release upload', 'gh repo create', 'gh repo delete', 'gh repo fork', 'gh repo edit',
  'gh repo rename', 'gh repo archive', 'gh workflow run', 'gh run rerun', 'gh run cancel', 'gh secret set', 'gh variable set',
  'glab mr create', 'glab mr merge', 'glab mr close', 'glab mr approve', 'glab mr note', 'glab mr update', 'glab issue create', 'glab issue close',
  'glab issue note', 'glab issue update', 'glab release create', 'glab ci run'];
// Infraestructura y entornos: siempre con aprobación (decisiones críticas)
const INFRA_ASK = ['kubectl', 'oc', 'helm', 'terraform', 'docker push', 'consul', 'vault', 'az', 'aws', 'gcloud'];

const CLAUDE_RULES = {
  allow: [...GIT_READ.map(c => `Bash(git ${c}:*)`), 'Bash(git branch)', 'Bash(git remote)', 'Bash(git stash list)', ...FORGE_READ.map(c => `Bash(${c}:*)`)],
  deny: [...GIT_WRITE.map(c => `Bash(git ${c}:*)`), 'Bash(git stash)', ...FORGE_WRITE.map(c => `Bash(${c}:*)`)],
  ask: INFRA_ASK.map(c => `Bash(${c}:*)`), // (no se pone 'git:*' en ask: ask tiene prioridad sobre allow y bloquearía la lectura; lo no listado ya pregunta por defecto)
};
// OpenCode: el último patrón que coincide gana → orden: general (ask) → lectura (allow) → escritura (deny)
const OPENCODE_RULES = [
  ...['git *', 'gh *', 'glab *', ...INFRA_ASK.map(c => `${c} *`)].map(k => [k, 'ask']),
  ...GIT_READ.map(c => [`git ${c}*`, 'allow']), ['git branch', 'allow'], ...FORGE_READ.map(c => [`${c}*`, 'allow']),
  ...GIT_WRITE.map(c => [`git ${c}*`, 'deny']), ['git stash', 'deny'], ...FORGE_WRITE.map(c => [`${c}*`, 'deny']),
];

function configureClaudePermissions(file) {
  let json;
  try { json = readJson(file); } catch { notes.push(`Claude Code: ${file} no es JSON válido; permisos no configurados.`); return; }
  const P = json.permissions = json.permissions || {};
  const prevP = manifest.permissions || {};
  // quitar lo agregado por instalaciones anteriores (se vuelve a agregar lo vigente)
  const old = { allow: new Set(prevP.added || []), ask: new Set(prevP.addedAsk || []), deny: new Set(prevP.addedDeny || []) };
  for (const k of ['allow', 'ask', 'deny']) P[k] = (P[k] || []).filter(r => !old[k].has(r));
  const added = { allow: [], ask: [], deny: [] };
  const wanted = { allow: [...(opt('no-permissions') ? [] : permissionRules()), ...CLAUDE_RULES.allow], ask: CLAUDE_RULES.ask, deny: CLAUDE_RULES.deny };
  for (const k of ['allow', 'ask', 'deny']) for (const r of wanted[k]) if (!P[k].includes(r)) { P[k].push(r); added[k].push(r); }
  for (const k of ['allow', 'ask', 'deny']) if (!P[k].length) delete P[k];
  let previousMode = prevP.previousMode ?? null;
  if (opt('auto-edits') && P.defaultMode !== 'acceptEdits') { previousMode = P.defaultMode || 'default'; P.defaultMode = 'acceptEdits'; }
  backup(file); writeFile(file, JSON.stringify(json, null, 2) + '\n');
  manifest.permissions = { file, added: added.allow, addedAsk: added.ask, addedDeny: added.deny, previousMode };
  log(`  ✓ permisos: git y gh/glab solo lectura (escritura bloqueada) · infraestructura con aprobación${P.defaultMode === 'acceptEdits' ? ' · ediciones automáticas' : ''} → ${file}`);
}
// ---------- hooks de Claude Code: memoria del proyecto al iniciar/reanudar/después de compactar ----------
const HOOK_MARK = 'sdd-context.js';
function configureClaudeHooks(file) {
  let json;
  try { json = readJson(file); } catch { notes.push(`Claude Code: ${file} no es JSON válido; hooks no configurados.`); return; }
  json.hooks = json.hooks || {};
  const list = (json.hooks.SessionStart || []).filter(g => !(g.hooks || []).some(h => String(h.command || '').includes(HOOK_MARK)));
  list.push({ hooks: [{ type: 'command', command: `node "${SDD_HOME_FWD}/bin/sdd-context.js"`, timeout: 10 }] });
  json.hooks.SessionStart = list;
  backup(file); writeFile(file, JSON.stringify(json, null, 2) + '\n');
  manifest.hooks = { file };
  log(`  ✓ hook: memoria del proyecto al iniciar, reanudar y tras compactar → ${file}`);
}
function removeClaudeHooks(h) {
  if (!h || !fs.existsSync(h.file)) return;
  let json; try { json = readJson(h.file); } catch { return; }
  if (!json.hooks || !json.hooks.SessionStart) return;
  json.hooks.SessionStart = json.hooks.SessionStart.filter(g => !(g.hooks || []).some(x => String(x.command || '').includes(HOOK_MARK)));
  if (!json.hooks.SessionStart.length) delete json.hooks.SessionStart;
  if (!Object.keys(json.hooks).length) delete json.hooks;
  writeFile(h.file, JSON.stringify(json, null, 2) + '\n');
}
function removeClaudePermissions(p) {
  if (!p || !fs.existsSync(p.file)) return;
  let json; try { json = readJson(p.file); } catch { return; }
  const P = json.permissions; if (!P) return;
  const rm = { allow: new Set(p.added || []), ask: new Set(p.addedAsk || []), deny: new Set(p.addedDeny || []) };
  for (const k of ['allow', 'ask', 'deny']) if (P[k]) { P[k] = P[k].filter(r => !rm[k].has(r)); if (!P[k].length) delete P[k]; }
  if (p.previousMode !== null && p.previousMode !== undefined && P.defaultMode === 'acceptEdits') {
    if (p.previousMode === 'default') delete P.defaultMode; else P.defaultMode = p.previousMode;
  }
  writeFile(p.file, JSON.stringify(json, null, 2) + '\n');
}
function configureOpencodeGit(file) {
  let json;
  try { json = readJson(file); } catch { notes.push(`OpenCode: ${file} no es JSON puro; configura permission.bash manualmente (git lectura allow, escritura deny).`); return; }
  json.permission = json.permission || {};
  let bash = json.permission.bash;
  if (typeof bash === 'string') bash = { '*': bash };
  bash = bash || {};
  const prev = new Set((manifest.opencodePerm || {}).added || []);
  const ours = new Set(OPENCODE_RULES.map(([k]) => k));
  // reconstruir: primero lo del usuario (sin nuestras claves), luego nuestras reglas en orden
  const rebuilt = {};
  for (const [k, v] of Object.entries(bash)) if (!ours.has(k) && !prev.has(k)) rebuilt[k] = v;
  for (const [k, v] of OPENCODE_RULES) rebuilt[k] = v;
  json.permission.bash = rebuilt;
  backup(file); writeFile(file, JSON.stringify(json, null, 2) + '\n');
  manifest.opencodePerm = { file, added: [...ours] };
  log(`  ✓ git y gh/glab solo lectura (escritura bloqueada) · infraestructura con aprobación → ${file}`);
}
function removeOpencodeGit(p) {
  if (!p || !fs.existsSync(p.file)) return;
  let json; try { json = readJson(p.file); } catch { return; }
  const bash = json.permission && json.permission.bash;
  if (!bash || typeof bash !== 'object') return;
  for (const k of p.added || []) delete bash[k];
  if (!Object.keys(bash).length) delete json.permission.bash;
  if (json.permission && !Object.keys(json.permission).length) delete json.permission;
  writeFile(p.file, JSON.stringify(json, null, 2) + '\n');
}

// ---------- desinstalar ----------
function removePrevious(prev, quiet) {
  if (!prev) return;
  for (const f of prev.files || []) { if (!DRY && fs.existsSync(f)) fs.rmSync(f, { force: true }); }
  for (const d of prev.dirs || []) rmrf(d);
  if (!quiet) for (const r of prev.rules || []) removeRules(r);
}
function uninstall() {
  const prev = prevManifest();
  if (!prev) { log('No hay instalación registrada (falta ~/.sdd-orquestador/manifest.json).'); return; }
  log('Desinstalando Orquestador SDD...');
  removePrevious(prev, false);
  removeClaudePermissions(prev.permissions);
  removeClaudeHooks(prev.hooks);
  removeOpencodeGit(prev.opencodePerm);
  rmrf(SDD_HOME);
  log('✓ Skills, agentes, comandos y reglas globales eliminados.');
  if ((prev.mcp || []).length) log(`Los servidores MCP registrados se mantienen (pueden usarlos otras herramientas): ${[...new Set(prev.mcp.map(m => m.name))].join(', ')}`);
  log('Los respaldos *.bak-sdd de tus archivos de configuración se conservan.');
}

// ---------- instalar ----------
function selectTargets() {
  const t = val('targets');
  const prev = prevManifest();
  if (!t && !opt('detect') && prev && (prev.targets || []).length) return prev.targets.filter(k => TARGETS[k]);
  if (t === 'all') return Object.keys(TARGETS);
  if (t) {
    const list = t.split(',').map(s => s.trim()).filter(Boolean);
    const bad = list.filter(x => !TARGETS[x]);
    if (bad.length) { console.error(`Destinos desconocidos: ${bad.join(', ')}. Válidos: ${Object.keys(TARGETS).join(', ')}, all`); process.exit(1); }
    return list;
  }
  return Object.keys(TARGETS).filter(k => TARGETS[k].detect.some(p => fs.existsSync(p)) || (TARGETS[k].cli && hasCli(TARGETS[k].cli)));
}

function install() {
  const targets = selectTargets();
  if (!targets.length) {
    log('No se detectó ninguna herramienta. Usa --targets=claude,opencode,... o --targets=all');
    process.exit(1);
  }
  const before = prevManifest();
  log(`Orquestador SDD v${VERSION}${DRY ? ' (simulación)' : ''}${before && before.version !== VERSION ? ` (actualizando desde v${before.version})` : ''}`);
  log(`Destinos: ${targets.map(k => TARGETS[k].label).join(', ')}\n`);

  const prev = prevManifest();
  const owned = new Set([...(prev?.dirs || []), ...(prev?.files || [])]);
  const foreign = p => fs.existsSync(p) && !owned.has(p) && !FORCE;
  manifest.mcp = [...(prev?.mcp || [])];
  if (prev?.permissions) manifest.permissions = prev.permissions;
  if (prev?.opencodePerm) manifest.opencodePerm = prev.opencodePerm;
  removePrevious(prev, true); // reinstalación limpia (las reglas se reemplazan en su lugar)

  // 1. runtime: scripts + dependencias
  log('• Runtime en ~/.sdd-orquestador');
  copyDir(path.join(ROOT, 'bin'), path.join(SDD_HOME, 'bin'));
  if (!opt('no-deps')) {
    const pkg = { name: 'sdd-orquestador-runtime', private: true, dependencies: { 'pdfjs-dist': '4.10.38', mammoth: '1.8.0' } };
    writeFile(path.join(SDD_HOME, 'package.json'), JSON.stringify(pkg, null, 2));
    if (!DRY) {
      log('  instalando pdfjs-dist y mammoth (conversión de PDF/DOCX)...');
      const r = run('npm', ['install', '--omit=dev', '--no-fund', '--no-audit', '--loglevel=error'], { cwd: SDD_HOME, stdio: 'inherit' });
      if (r.status !== 0) warn('npm install falló; la ingesta de PDF/DOCX usará lectura directa del modelo.');
    }
  }

  // 2. skills (un directorio por destino distinto)
  const skillNames = fs.readdirSync(path.join(CORE, 'skills')).filter(n => fs.existsSync(path.join(CORE, 'skills', n, 'SKILL.md')));
  const skillDirs = [...new Set(targets.map(k => TARGETS[k].skills))];
  for (const dir of skillDirs) {
    log(`• Skills (${skillNames.length}) → ${dir}`);
    for (const n of skillNames) {
      const dst = path.join(dir, n);
      if (foreign(dst)) { warn(`ya existe una skill "${n}" que no es del orquestador; se omite (usa --force)`); continue; }
      rmrf(dst); copyDir(path.join(CORE, 'skills', n), dst); manifest.dirs.push(dst);
    }
  }
  if (skillDirs.length > 1) notes.push('Skills instaladas en ~/.claude/skills (Claude Code) y ~/.agents/skills (resto). OpenCode, Cursor y Copilot leen ambas: si ves skills duplicadas es normal y tienen el mismo contenido.');

  // 3. agentes, comandos, reglas, MCP por herramienta
  const agents = fs.readdirSync(path.join(CORE, 'agents')).filter(f => f.endsWith('.md'))
    .map(f => parseFrontmatter(fs.readFileSync(path.join(CORE, 'agents', f), 'utf8')));
  const commands = JSON.parse(fs.readFileSync(path.join(CORE, 'commands', 'commands.json'), 'utf8'));

  for (const k of targets) {
    const t = TARGETS[k];
    log(`\n• ${t.label}`);
    manifest.targets.push(k);
    for (const a of agents) {
      const f = agentFile(t.agentFmt, t.agents, a.meta.name);
      if (foreign(f)) { warn(`ya existe ${f}; se omite (usa --force)`); continue; }
      writeFile(f, renderAgent(t.agentFmt, k, a)); manifest.files.push(f);
    }
    if (t.agentFmt === 'copilot') {
      const f = path.join(t.agents, 'sdd-orquestador.agent.md');
      writeFile(f, copilotOrchestrator(agents.map(a => a.meta.name))); manifest.files.push(f);
    }
    log(`  ✓ ${agents.length} sub-agentes → ${t.agents}`);
    if (t.commands) {
      for (const c of commands) {
        const f = path.join(t.commands, `${c.name}.${t.cmdFmt === 'gemini' ? 'toml' : 'md'}`);
        writeFile(f, renderCommand(t.cmdFmt, c)); manifest.files.push(f);
      }
      log(`  ✓ ${commands.length} comandos → ${t.commands}`);
    }
    if (t.rules) {
      if (k === 'codex' && fs.existsSync(path.join(CODEX_HOME, 'AGENTS.override.md'))) notes.push('Codex: existe AGENTS.override.md, que tiene prioridad sobre AGENTS.md. Copia el bloque sdd-orquestador ahí si quieres que se aplique.');
      upsertRules(t.rules); log(`  ✓ reglas globales → ${t.rules}`);
    } else if (k === 'cursor') {
      notes.push(`Cursor: pega el contenido de core/rules/global.md en Cursor → Settings → Rules → User Rules.`);
    }
    if (t.settings) { configureClaudePermissions(t.settings); if (!opt('no-hooks')) configureClaudeHooks(t.settings); }
    if (k === 'opencode') configureOpencodeGit(t.mcp.file);
    if (!opt('no-mcp')) registerMcp(k, t);
  }

  if (!DRY) { mkdirp(SDD_HOME); fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2)); }
  // registro de mejora continua (en el repo del orquestador; nunca se sobrescribe)
  const reg = path.join(ROOT, 'mejora', 'registro.md');
  if (!DRY && !fs.existsSync(reg)) { fs.mkdirSync(path.dirname(reg), { recursive: true }); fs.writeFileSync(reg, '# Registro de mejora continua\n\nFormato: estado · #n · fecha · tipo · severidad · componente · descripción · origen (→ resolución)\n\n'); }
  setupGitHooks();

  log(DRY ? '\n✅ Simulación completa (no se escribió nada).' : '\n✅ Instalación completa.');
  if (notes.length) { log('\nNotas:'); notes.forEach(n => log(`- ${n}`)); }
  log('\nPrueba en cualquier proyecto:');
  log('  Claude Code / Cursor / Copilot / OpenCode / Gemini:  /sdd-status   /sdd-ask <pregunta>');
  log('  Codex:                                               $sdd-status   $sdd-ask <pregunta>');
}

// ---------- actualización automática tras git pull ----------
function setupGitHooks() {
  if (DRY || !fs.existsSync(path.join(ROOT, '.git')) || !fs.existsSync(path.join(ROOT, '.githooks'))) return;
  // En macOS/Linux git ignora hooks sin permiso de ejecución (p. ej. si se hizo commit desde Windows)
  if (!IS_WIN) for (const h of fs.readdirSync(path.join(ROOT, '.githooks'))) { try { fs.chmodSync(path.join(ROOT, '.githooks', h), 0o755); } catch { /* sin permisos */ } }
  const cur = run('git', ['-C', ROOT, 'config', '--get', 'core.hooksPath'], { encoding: 'utf8' });
  if (String(cur.stdout || '').trim() === '.githooks') return;
  const r = run('git', ['-C', ROOT, 'config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' });
  if (r.status === 0) log('\n• Git: actualización automática activada (cada "git pull" reinstala lo que cambie).');
}

if (opt('uninstall')) uninstall(); else install();
