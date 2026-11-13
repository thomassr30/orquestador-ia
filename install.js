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
 *   node install.js --mcp=figma          registra también servidores MCP apagados en config/mcp.json (enabled:false)
 *   node install.js --mcp=azure-devops --org=<organización>   servidor remoto por organización (dev.azure.com/<organización>)
 *   node install.js --mcp=azure-devops --org=<org> --alcance=proyecto   registra el MCP SOLO en este repositorio
 *                                        (córrelo desde cualquier carpeta con ~/.sdd-orquestador/install.js)
 *   node install.js --mcp=azure-devops --org=<org> --nombre=azure-sag --alcance=proyecto
 *                                        --nombre: alias corto del servidor (si no, queda azure-devops-<organización>)
 *                                        (para dos repos con dos organizaciones). «--proyecto» es un alias; no lleva
 *                                        valor: la carpeta donde lo corres decide el proyecto.
 *   node install.js --skills=sdd-*,stack-angular    instala SOLO esas skills (patrones con * al final)
 *   node install.js --sin-skills=ci-*,tracker-jira  no instala esas (se suma a config/skills.json → excluir)
 *   node install.js --no-deps            no instala pdfjs-dist / mammoth
 *   node install.js --auto-edits         Claude Code acepta ediciones de archivos sin preguntar (modo acceptEdits)
 *   node install.js --no-permissions     no agrega permisos preaprobados en Claude Code (git/gh siempre piden aprobación)
 *   node install.js --no-hooks           no instala los hooks del harness (permisos por código, GATE, sensores, memoria)
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
// La copia que vive en ~/.sdd-orquestador no trae el package.json del repositorio: la versión se lee del manifiesto
// de la última instalación, que es justamente de dónde viene esa copia.
const VERSION = (() => {
  for (const p of [path.join(ROOT, 'package.json'), MANIFEST]) {
    try { const j = JSON.parse(fs.readFileSync(p, 'utf8')); if (j && j.version) return j.version; } catch { /* sigue */ }
  }
  return 'desconocida';
})();
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
  // --mcp=figma,otro activa servidores con enabled:false
  const extra = (val('mcp') || '').split(',').map(s => s.trim()).filter(Boolean);
  const unknown = extra.filter(n => n.startsWith('_') || !cfg[n]);
  if (unknown.length) warn(`--mcp: servidores desconocidos en config/mcp.json: ${unknown.join(', ')}`);
  const org = val('org');
  return Object.entries(cfg).filter(([k, v]) => !k.startsWith('_') && (v.enabled !== false || extra.includes(k)))
    .map(([name, v]) => {
      if (v.url && v.url.includes('{org}')) {
        // Servidor remoto por organización (Azure DevOps): sin --org no se puede armar la URL.
        if (!org) { warn(`${name}: necesita tu organización. Regístralo con: node install.js --mcp=${name} --org=<organización> [--proyecto]`); return null; }
        // El nombre lleva la organización: dos organizaciones distintas son dos cuentas, y con el mismo nombre
        // el inicio de sesión de una pisaría el de la otra. Con --nombre se le pone un alias corto: ese nombre
        // aparece en cada nombre de herramienta MCP, así que uno largo se paga en tokens en todas las sesiones.
        const slug = x => String(x).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
        const alias = val('nombre');
        return { key: name, name: alias ? slug(alias) : `${name}-${slug(org)}`, url: v.url.replace('{org}', encodeURIComponent(org)) };
      }
      if (v.url) return { key: name, name, url: v.url }; // servidor remoto (HTTP)
      // En Windows, npx es npx.cmd: se envuelve con cmd /c para que lo lancen todas las herramientas
      const wrap = IS_WIN && v.command === 'npx';
      return { key: name, name, command: wrap ? 'cmd' : v.command, args: wrap ? ['/c', 'npx', ...v.args] : v.args };
    }).filter(Boolean);
}
function readJson(file) {
  if (!fs.existsSync(file)) return {};
  const raw = fs.readFileSync(file, 'utf8');
  if (!raw.trim()) return {};
  return JSON.parse(raw); // lanza si tiene comentarios (JSONC) → se informa al usuario
}
// Cómo inicia sesión cada herramienta en un servidor remoto (OAuth)
const MCP_LOGIN = {
  claude: n => `Claude Code: /mcp → ${n} → Authenticate`,
  codex: n => `Codex: codex mcp login ${n}`,
  gemini: n => `Gemini CLI: /mcp auth ${n}`,
  cursor: n => `Cursor: Settings → MCP → ${n} → Login`,
  copilot: n => `VS Code Copilot: en mcp.json, Start sobre ${n} y acepta el inicio de sesión`,
  opencode: n => `OpenCode: opencode mcp auth ${n}`
};
const loginPending = new Map(); // servidor remoto → herramientas donde se registró
function remoteAdded(tkey, s) { if (s.url) loginPending.set(s.name, [...(loginPending.get(s.name) || []), tkey]); }
// Entrada JSON de un servidor remoto según la herramienta
function remoteJson(tkey, url) {
  if (tkey === 'opencode') return { type: 'remote', url, enabled: true };
  if (tkey === 'gemini') return { httpUrl: url };
  if (tkey === 'copilot') return { type: 'http', url };
  return { url };
}
const claudeMcpArgs = s => s.url ? ['--transport', 'http', s.name, s.url] : [s.name, '--', s.command, ...s.args];
function registerMcp(tkey, t) {
  const servers = mcpServers();
  const m = t.mcp;
  if (m.kind === 'claude') {
    if (!hasCli('claude')) { notes.push(`Claude Code: CLI no encontrada; registra los MCP manualmente:\n${servers.map(s => `  claude mcp add -s user ${claudeMcpArgs(s).join(' ')}`).join('\n')}`); return; }
    for (const s of servers) {
      const exists = run('claude', ['mcp', 'get', s.name], { stdio: 'ignore' }).status === 0;
      if (exists) { log(`  · MCP ${s.name} ya existe en Claude Code`); continue; }
      if (DRY) { log(`  [dry] claude mcp add -s user ${s.name}`); continue; }
      const r = run('claude', ['mcp', 'add', '-s', 'user', ...claudeMcpArgs(s)], { stdio: 'pipe' });
      if (r.status === 0) { log(`  ✓ MCP ${s.name}`); manifest.mcp.push({ target: tkey, name: s.name }); remoteAdded(tkey, s); }
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
      add += s.url ? `\n[mcp_servers.${s.name}]\nurl = ${q(s.url)}\n` : `\n[mcp_servers.${s.name}]\ncommand = ${q(s.command)}\nargs = [${s.args.map(q).join(', ')}]\n`;
      manifest.mcp.push({ target: tkey, name: s.name, file: m.file });
      remoteAdded(tkey, s);
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
    json[key][s.name] = s.url ? remoteJson(tkey, s.url)
      : m.kind === 'opencode'
        ? { type: 'local', command: [s.command, ...s.args], enabled: true }
        : { ...(m.stdioType ? { type: 'stdio' } : {}), command: s.command, args: s.args };
    manifest.mcp.push({ target: tkey, name: s.name, file: m.file });
    remoteAdded(tkey, s);
    changed = true;
  }
  if (changed) { backup(m.file); writeFile(m.file, JSON.stringify(json, null, 2) + '\n'); log(`  ✓ MCP en ${m.file}`); }
}

// ---------- permisos preaprobados (Claude Code) ----------
// Tests, lint, build y scripts del orquestador. Nada que borre, publique o despliegue.
function permissionRules() {
  const bin = `${SDD_HOME_FWD}/bin`;
  return [
    ...['new-change.js', 'sdd-state.js', 'sdd-status.js', 'to-md.js', 'sdd-memory.js', 'sdd-context.js', 'sdd-workspace.js', 'sdd-harness.js'].map(f => `Bash(node "${bin}/${f}":*)`),
    'Bash(npm test:*)', 'Bash(npm run test:*)', 'Bash(npm run lint:*)', 'Bash(npm run build:*)', 'Bash(npm run typecheck:*)', 'Bash(npm audit:*)',
    'Bash(npx vitest:*)', 'Bash(npx jest:*)', 'Bash(npx playwright test:*)', 'Bash(npx tsc --noEmit:*)', 'Bash(npx eslint:*)', 'Bash(npx stylelint:*)',
    'Bash(ng test:*)', 'Bash(ng lint:*)', 'Bash(ng build:*)', 'Bash(npx ng test:*)', 'Bash(npx ng lint:*)', 'Bash(npx ng build:*)',
    'Bash(node ace test:*)',
    'Bash(go test:*)', 'Bash(go vet:*)', 'Bash(go build:*)', 'Bash(golangci-lint run:*)', 'Bash(govulncheck:*)', 'Bash(gosec:*)',
    'Bash(semgrep scan:*)', 'Bash(docker ps:*)'
  ];
}
// ---------- git: lectura libre, escritura y commit con aprobación (deny > ask > allow en Claude Code) ----------
// Fuente única: harness/src/rules.js (las mismas reglas que aplican los hooks del harness)
const { GIT_READ, GIT_COMMIT, COMMIT_TOOLS, GIT_WRITE, FORGE_READ, FORGE_WRITE, INFRA_ASK } = require('./harness/src/rules');
const HC = require('./harness/src/hooks-config');

const CLAUDE_RULES = {
  allow: [...GIT_READ.map(c => `Bash(git ${c}:*)`), 'Bash(git branch)', 'Bash(git remote)', 'Bash(git stash list)', ...FORGE_READ.map(c => `Bash(${c}:*)`)],
  deny: [...FORGE_WRITE.map(c => `Bash(${c}:*)`)],
  // (no se pone 'git:*' en ask: ask tiene prioridad sobre allow y bloquearía la lectura; lo no listado ya pregunta por defecto)
  ask: [...INFRA_ASK.map(c => `Bash(${c}:*)`), ...GIT_WRITE.map(c => `Bash(git ${c}:*)`), 'Bash(git stash)',
    ...GIT_COMMIT.filter(c => !GIT_WRITE.includes(c)).map(c => `Bash(git ${c}:*)`), ...COMMIT_TOOLS.map(c => `Bash(${c}:*)`)],
};
// OpenCode: el último patrón que coincide gana → orden: general (ask) → lectura (allow) → commit (ask) → escritura en la forja (deny)
const OPENCODE_RULES = [
  ...['git *', 'gh *', 'glab *', ...INFRA_ASK.map(c => `${c} *`)].map(k => [k, 'ask']),
  ...GIT_READ.map(c => [`git ${c}*`, 'allow']), ['git branch', 'allow'], ...FORGE_READ.map(c => [`${c}*`, 'allow']),
  ...GIT_COMMIT.map(c => [`git ${c}*`, 'ask']), ...COMMIT_TOOLS.map(c => [`${c}*`, 'ask']), ...FORGE_WRITE.map(c => [`${c}*`, 'deny']),
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
  // Sin "Co-Authored-By: Claude" ni "Generated with Claude Code" en commits y PR (si el usuario no lo configuró ya)
  let attribution = !!prevP.attribution;
  if (json.attribution === undefined && json.includeCoAuthoredBy === undefined) { json.attribution = { commit: '', pr: '' }; attribution = true; }
  let previousMode = prevP.previousMode ?? null;
  if (opt('auto-edits') && P.defaultMode !== 'acceptEdits') { previousMode = P.defaultMode || 'default'; P.defaultMode = 'acceptEdits'; }
  backup(file); writeFile(file, JSON.stringify(json, null, 2) + '\n');
  manifest.permissions = { file, added: added.allow, addedAsk: added.ask, addedDeny: added.deny, previousMode, attribution };
  log(`  ✓ permisos: git y commit con aprobación · gh/glab solo lectura · infraestructura con aprobación${P.defaultMode === 'acceptEdits' ? ' · ediciones automáticas' : ''} → ${file}`);
}
// ---------- harness: hooks en cada herramienta (permisos por código, GATE, sensores, memoria) ----------
const HOOK_FILES = {
  claude: () => path.join(HOME, '.claude', 'settings.json'),
  codex: () => path.join(CODEX_HOME, 'hooks.json'),
  gemini: () => path.join(HOME, '.gemini', 'settings.json'),
  cursor: () => path.join(HOME, '.cursor', 'hooks.json'),
};
const HOOK_LABEL = 'permisos por código · GATE · sensores al editar y al terminar · memoria al iniciar y tras compactar';
function mergeHooksFile(target, file) {
  let json;
  try { json = readJson(file); } catch { notes.push(`${TARGETS[target].label}: ${file} no es JSON puro (¿tiene comentarios?); hooks del harness no configurados.`); return false; }
  json.hooks = HC.mergeHooks(json.hooks, HC[target](SDD_HOME_FWD));
  if (target === 'cursor') json.version = json.version || 1;
  backup(file); writeFile(file, JSON.stringify(json, null, 2) + '\n');
  manifest.hooks.push({ target, file });
  return true;
}
function configureHooks(k) {
  if (HOOK_FILES[k]) {
    const file = HOOK_FILES[k]();
    if (mergeHooksFile(k, file)) log(`  ✓ harness (${HOOK_LABEL}) → ${file}`);
    if (k === 'codex') {
      const rules = path.join(CODEX_HOME, 'rules', 'sdd-orquestador.rules');
      writeFile(rules, HC.codexRules()); manifest.files.push(rules);
      log(`  ✓ reglas nativas de Codex: git y GitHub/GitLab solo lectura → ${rules}`);
      notes.push('Codex: abre Codex y ejecuta /hooks para revisar y aprobar los hooks del harness (Codex no ejecuta hooks nuevos sin tu aprobación). Reinicia Codex para cargar las reglas.');
    }
    if (k === 'cursor') notes.push('Cursor: los hooks se recargan solos; en Cursor → Settings → Hooks puedes ver que estén activos.');
    return;
  }
  if (k === 'copilot') {
    const file = path.join(process.env.COPILOT_HOME || path.join(HOME, '.copilot'), 'hooks', 'sdd-orquestador.json');
    writeFile(file, JSON.stringify(HC.copilot(SDD_HOME_FWD), null, 2) + '\n'); manifest.files.push(file);
    log(`  ✓ harness (${HOOK_LABEL}) → ${file}`);
    notes.push('VS Code Copilot: los hooks están en vista previa; se aplican en sesiones con destino "Copilot" (si usas Claude dentro de VS Code, aplica el harness de Claude Code).');
    return;
  }
  if (k === 'opencode') {
    const file = path.join(HOME, '.config', 'opencode', 'plugins', 'sdd-harness.js');
    const tpl = fs.readFileSync(path.join(ROOT, 'harness', 'opencode', 'sdd-harness.js'), 'utf8');
    writeFile(file, tpl.split('{{SDD_HOME}}').join(SDD_HOME_FWD)); manifest.files.push(file);
    log(`  ✓ harness como plugin de OpenCode (${HOOK_LABEL}) → ${file}`);
  }
}
function removeHooks(list) {
  // v1.x guardaba { file } con el hook de memoria de Claude Code
  const entries = Array.isArray(list) ? list : list && list.file ? [{ target: 'claude', file: list.file }] : [];
  for (const h of entries) {
    if (!h.file || !fs.existsSync(h.file)) continue;
    let json; try { json = readJson(h.file); } catch { continue; }
    if (!json.hooks) continue;
    json.hooks = HC.mergeHooks(json.hooks, null);
    if (!Object.keys(json.hooks).length) delete json.hooks;
    if (h.target === 'cursor' && !json.hooks && Object.keys(json).length === 1 && json.version) { if (!DRY) fs.rmSync(h.file, { force: true }); continue; }
    writeFile(h.file, JSON.stringify(json, null, 2) + '\n');
  }
}
function removeClaudePermissions(p) {
  if (!p || !fs.existsSync(p.file)) return;
  let json; try { json = readJson(p.file); } catch { return; }
  if (p.attribution && json.attribution && json.attribution.commit === '' && json.attribution.pr === '') delete json.attribution;
  const P = json.permissions || {};
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
  removeHooks(prev.hooks);
  removeOpencodeGit(prev.opencodePerm);
  const userCfg = path.join(SDD_HOME, 'harness.json');
  const keep = fs.existsSync(userCfg) ? fs.readFileSync(userCfg) : null;
  rmrf(SDD_HOME);
  if (keep && !DRY) { fs.mkdirSync(SDD_HOME, { recursive: true }); fs.writeFileSync(userCfg, keep); log(`Se conserva tu configuración del harness: ${userCfg}`); }
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

// Archivos de MCP por PROYECTO de cada herramienta (los globales están en TARGETS[*].mcp).
const PROJECT_MCP = {
  claude: { label: 'Claude Code', file: ['.mcp.json'], key: 'mcpServers' },
  cursor: { label: 'Cursor', file: ['.cursor', 'mcp.json'], key: 'mcpServers', stdioType: true },
  copilot: { label: 'VS Code Copilot', file: ['.vscode', 'mcp.json'], key: 'servers', stdioType: true },
  opencode: { label: 'OpenCode', file: ['opencode.json'], key: 'mcp' },
  gemini: { label: 'Gemini CLI', file: ['.gemini', 'settings.json'], key: 'mcpServers' },
};

/** Raíz del proyecto: el directorio con .git más cercano; si no hay, el actual. */
function repoRoot(start) {
  let d = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(d, '.git'))) return d;
    const up = path.dirname(d);
    if (up === d) return path.resolve(start);
    d = up;
  }
}

/**
 * --proyecto: registra los servidores MCP SOLO en el proyecto actual, no en el usuario. Es lo que sirve cuando
 * cada repositorio apunta a una organización distinta (dos repos, dos organizaciones de Azure DevOps): cada
 * ventana ve únicamente la suya y el contexto no carga las herramientas de las demás. No toca nada más de la
 * instalación: para eso está «node install.js» sin --proyecto.
 */
function installProjectMcp() {
  const root = repoRoot(process.cwd());
  // Solo los servidores que se piden con --mcp: los de siempre (playwright, context7, chrome-devtools) ya están
  // registrados a nivel de usuario y repetirlos en el proyecto solo duplicaría herramientas en el contexto.
  const pedidos = (val('mcp') || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!pedidos.length) { console.error('Indica qué servidor registrar en este proyecto: --mcp=<nombre> (y --org=<organización> si lo pide). Los servidores de siempre ya están a nivel de usuario.'); process.exit(1); }
  const servers = mcpServers().filter(s => (s.url || s.command) && pedidos.includes(s.key || s.name));
  if (!servers.length) { console.error(`No quedó ningún servidor que registrar de: ${pedidos.join(', ')}. Revisa el aviso de más arriba.`); process.exit(1); }
  const tkeys = (val('targets') === 'all' ? Object.keys(PROJECT_MCP) : (val('targets') || 'claude').split(',').map(s => s.trim()).filter(Boolean));
  const bad = tkeys.filter(k => !PROJECT_MCP[k]);
  if (bad.length) { console.error(`Destinos sin configuración de MCP por proyecto: ${bad.join(', ')}. Válidos: ${Object.keys(PROJECT_MCP).join(', ')}, all. Codex solo admite MCP globales.`); process.exit(1); }
  // Puede ser un repositorio o una carpeta con varios: el servidor vale para lo que abras en la herramienta, así
  // que si todos esos repos son de la misma organización, registrarlo acá los cubre a todos.
  const esRepo = fs.existsSync(path.join(root, '.git'));
  const repos = esRepo ? [] : fs.readdirSync(root, { withFileTypes: true }).filter(e => e.isDirectory() && fs.existsSync(path.join(root, e.name, '.git'))).map(e => e.name);
  log(`Orquestador SDD v${VERSION}${DRY ? ' (simulación)' : ''} · MCP solo para esta carpeta (alcance: proyecto)`);
  log(`${esRepo ? 'Repositorio' : 'Carpeta'}: ${root.replace(/\\/g, '/')}`);
  if (repos.length) log(`Cubre los ${repos.length} repositorios de adentro: ${repos.slice(0, 8).join(', ')}${repos.length > 8 ? '…' : ''}`);
  for (const tkey of tkeys) {
    const m = PROJECT_MCP[tkey];
    const file = path.join(root, ...m.file);
    log(`\n• ${m.label} → ${path.relative(root, file).split(path.sep).join('/')}`);
    let json;
    try { json = readJson(file); } catch { warn(`${file} no es JSON puro (¿comentarios?): agrégalos a mano (${servers.map(s => s.name).join(', ')})`); continue; }
    json[m.key] = json[m.key] || {};
    let changed = false;
    for (const s of servers) {
      if (json[m.key][s.name]) { log(`  · MCP ${s.name} ya está en este proyecto`); continue; }
      json[m.key][s.name] = s.url ? remoteJson(tkey, s.url)
        : tkey === 'opencode' ? { type: 'local', command: [s.command, ...s.args], enabled: true }
          : { ...(m.stdioType ? { type: 'stdio' } : {}), command: s.command, args: s.args };
      log(`  ✓ MCP ${s.name}`); remoteAdded(tkey, s); changed = true;
    }
    if (changed && !DRY) { mkdirp(path.dirname(file)); backup(file); writeFile(file, JSON.stringify(json, null, 2) + '\n'); }
  }
  log(DRY ? '\n✅ Simulación completa (no se escribió nada).' : '\n✅ MCP registrados en este proyecto.');
  for (const [name, tkeys2] of loginPending) notes.push(`MCP ${name} necesita que inicies sesión una vez:\n${tkeys2.map(k => `  ${MCP_LOGIN[k](name)}`).join('\n')}`);
  notes.push('Anota la organización en la memoria de este proyecto (.sdd/memoria) para que el agente sepa cuál usa: lo pide la skill tracker-azure-boards.');
  if (esRepo) notes.push('El archivo que se acaba de escribir va al repositorio: si no quieres compartirlo con el equipo, agrégalo al .gitignore.');
  else notes.push('Se escribió en la carpeta que contiene los repositorios, así que vale para lo que abras ahí. Si abres un repositorio por separado, ese repositorio necesita su propio registro.');
  if (notes.length) { log('\nNotas:'); notes.forEach(n => log(`- ${n}`)); }
}

// Las skills del flujo nunca se excluyen: no son una tecnología que se pueda no usar.
const SKILLS_FIJAS = /^(sdd-|tracker-common$)/;
const matchSkill = (name, pat) => (pat.endsWith('*') ? name.startsWith(pat.slice(0, -1)) : name === pat);

/**
 * Qué skills instalar. El nombre y la descripción de cada una entran en el contexto de TODAS las sesiones, así que
 * no instalar las de tecnologías que no se usan es lo que baja ese costo fijo. El contenido completo no entra:
 * el cliente lo lee recién cuando el agente usa la skill.
 */
function selectSkills(todas) {
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'skills.json'), 'utf8')); } catch { cfg = {}; }
  const lista = n => (val(n) || '').split(',').map(x => x.trim()).filter(Boolean);
  const solo = lista('skills');
  const excluir = [...(Array.isArray(cfg.excluir) ? cfg.excluir : []), ...lista('sin-skills')].filter(x => typeof x === 'string' && !x.startsWith('_'));
  const instalar = todas.filter(n => SKILLS_FIJAS.test(n)
    || ((!solo.length || solo.some(p => matchSkill(n, p))) && !excluir.some(p => matchSkill(n, p))));
  const desconocidos = [...solo, ...excluir].filter(p => !todas.some(n => matchSkill(n, p)));
  if (desconocidos.length) warn(`skills que no existen: ${desconocidos.join(', ')} (revisa config/skills.json o --skills/--sin-skills)`);
  return { instalar, fuera: todas.filter(n => !instalar.includes(n)) };
}

/** Costo aproximado en tokens de las descripciones que entran en cada sesión (4 caracteres por token). */
function costoSkills(nombres) {
  let chars = 0;
  for (const n of nombres) {
    try { const t = fs.readFileSync(path.join(CORE, 'skills', n, 'SKILL.md'), 'utf8'); const m = /^description:\s*(.*)$/m.exec(t); chars += n.length + ((m && m[1]) || '').length + 2; } catch { /* sin SKILL.md */ }
  }
  return Math.round(chars / 4);
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
  manifest.hooks = [];
  removeHooks(prev?.hooks); // se vuelven a registrar los vigentes
  if (prev?.permissions) manifest.permissions = prev.permissions;
  if (prev?.opencodePerm) manifest.opencodePerm = prev.opencodePerm;
  removePrevious(prev, true); // reinstalación limpia (las reglas se reemplazan en su lugar)

  // 1. runtime: scripts, harness + dependencias
  log('• Runtime y harness en ~/.sdd-orquestador');
  copyDir(path.join(ROOT, 'bin'), path.join(SDD_HOME, 'bin'));
  rmrf(path.join(SDD_HOME, 'harness'));
  copyDir(path.join(ROOT, 'harness', 'src'), path.join(SDD_HOME, 'harness', 'src'));
  // El propio instalador y sus plantillas quedan en ~/.sdd-orquestador: así registrar un MCP en otro proyecto no
  // depende de dónde esté el repositorio (ni de que siga existiendo).
  writeFile(path.join(SDD_HOME, 'install.js'), fs.readFileSync(path.join(ROOT, 'install.js'), 'utf8'));
  rmrf(path.join(SDD_HOME, 'config'));
  copyDir(path.join(ROOT, 'config'), path.join(SDD_HOME, 'config'));
  // Perfiles de proyecto (sdd-harness.js perfil): se aplican desde la copia instalada, como el resto del runtime.
  rmrf(path.join(SDD_HOME, 'perfiles'));
  if (fs.existsSync(path.join(ROOT, 'perfiles'))) copyDir(path.join(ROOT, 'perfiles'), path.join(SDD_HOME, 'perfiles'));
  const userCfg = path.join(SDD_HOME, 'harness.json');
  if (!fs.existsSync(userCfg)) writeFile(userCfg, fs.readFileSync(path.join(ROOT, 'config', 'harness.json'), 'utf8'));
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
  const todas = fs.readdirSync(path.join(CORE, 'skills')).filter(n => fs.existsSync(path.join(CORE, 'skills', n, 'SKILL.md')));
  const { instalar: skillNames, fuera } = selectSkills(todas);
  const skillDirs = [...new Set(targets.map(k => TARGETS[k].skills))];
  if (fuera.length) log(`• Skills excluidas (${fuera.length}): ${fuera.join(", ")}`);
  for (const dir of skillDirs) {
    log(`• Skills (${skillNames.length} de ${todas.length}, ~${costoSkills(skillNames)} tokens de descripciones en cada sesión) → ${dir}`);
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
    if (t.settings) configureClaudePermissions(t.settings);
    if (!opt('no-hooks')) configureHooks(k);
    if (k === 'opencode') configureOpencodeGit(t.mcp.file);
    if (!opt('no-mcp')) registerMcp(k, t);
  }

  if (!DRY) { mkdirp(SDD_HOME); fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2)); }
  // registro de mejora continua (en el repo del orquestador; nunca se sobrescribe)
  const reg = path.join(ROOT, 'mejora', 'registro.md');
  if (!DRY && !fs.existsSync(reg)) { fs.mkdirSync(path.dirname(reg), { recursive: true }); fs.writeFileSync(reg, '# Registro de mejora continua\n\nFormato: estado · #n · fecha · tipo · severidad · componente · descripción · origen (→ resolución)\n\n'); }
  setupGitHooks();

  log(DRY ? '\n✅ Simulación completa (no se escribió nada).' : '\n✅ Instalación completa.');
  for (const [name, tkeys] of loginPending) notes.push(`MCP ${name} necesita que inicies sesión una vez en cada herramienta:\n${tkeys.map(k => `  ${MCP_LOGIN[k](name)}`).join('\n')}`);
  if (notes.length) { log('\nNotas:'); notes.forEach(n => log(`- ${n}`)); }
  log('\nPrueba en cualquier proyecto:');
  log('  Claude Code / Cursor / Copilot / OpenCode / Gemini:  /sdd-status   /sdd-ask <pregunta>');
  log('  Codex:                                               $sdd-status   $sdd-ask <pregunta>');
  if (!opt('no-hooks')) log(`  Harness (hooks por herramienta y sensores):         node "${SDD_HOME_FWD}/bin/sdd-harness.js" doctor`);
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

// Alcance: «usuario» (por defecto, todo el equipo) o «proyecto» (solo los MCP de este repositorio). El nombre del
// proyecto no se pasa: lo decide la carpeta donde se corre. Un «--proyecto=JUNJI» es el error natural, y antes caía
// en la instalación global sin avisar, así que acá se detiene con el comando correcto a la vista.
const alcance = val('alcance');
// La copia que vive en ~/.sdd-orquestador no trae core/ (skills, agentes, reglas): sirve para registrar los MCP de
// un proyecto y nada más. Decirlo es mejor que fallar a mitad de camino.
if (!fs.existsSync(CORE) && alcance !== 'proyecto' && !opt('proyecto') && !opt('uninstall')) {
  console.error(`Esta copia del instalador solo sirve para registrar servidores MCP de un proyecto:\n  node "${SDD_HOME_FWD}/install.js" --mcp=<servidor> [--org=<organización>] --alcance=proyecto\nPara instalar o actualizar el orquestador, córrelo desde su repositorio (donde está core/).`);
  process.exit(2);
}
if (val('proyecto') !== undefined) {
  console.error('«--proyecto» no lleva valor: la carpeta donde lo corres decide el proyecto.\nUsa: node install.js --mcp=azure-devops --org=<organización> --alcance=proyecto');
  process.exit(2);
}
if (alcance !== undefined && alcance !== 'proyecto' && alcance !== 'usuario') {
  console.error(`--alcance desconocido: «${alcance}». Valores: proyecto (solo este repositorio) o usuario (por defecto).`);
  process.exit(2);
}
if (opt('uninstall')) uninstall(); else if (alcance === 'proyecto' || opt('proyecto')) installProjectMcp(); else install();
