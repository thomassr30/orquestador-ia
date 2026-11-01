'use strict';
// Política de permisos aplicada POR CÓDIGO (no por instrucciones al modelo).
// Precedencia: deny > ask > allow. "critical" marca las decisiones que el usuario siempre debe confirmar.
const path = require('path');
const R = require('./rules');
const { HOME, SDD_HOME } = require('./paths');
const { isInside, relPosix } = require('./util');

/** Divide un comando compuesto en segmentos (&&, ||, ;, |, &, saltos de línea), respetando comillas. */
function splitSegments(cmd) {
  const out = [];
  let cur = '';
  let quote = null;
  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (quote) {
      cur += ch;
      if (ch === quote && cmd[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    const two = cmd.slice(i, i + 2);
    if (two === '&&' || two === '||') { out.push(cur); cur = ''; i++; continue; }
    if (ch === ';' || ch === '|' || ch === '&' || ch === '\n' || ch === '\r') {
      if (ch === '&' && /[0-9]?>$/.test(cur)) { cur += ch; continue; } // 2>&1, >&2
      out.push(cur); cur = ''; continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map(s => s.trim()).filter(Boolean);
}

/** Separa en tokens respetando comillas y las quita. */
function tokenize(s) {
  return (s.match(/"[^"]*"|'[^']*'|\S+/g) || []).map(t => t.replace(/^(["'])([\s\S]*)\1$/, '$2'));
}

const GIT_GLOBAL_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path']);
const GIT_GLOBAL_FLAGS = new Set(['--no-pager', '-P', '--paginate', '--no-optional-locks', '--bare', '--literal-pathspecs', '--no-replace-objects']);

/**
 * Normaliza un segmento para compararlo con las reglas: quita variables de entorno iniciales,
 * ruta y extensión del ejecutable, comillas y opciones globales de git. Devuelve {inner} si es
 * un envoltorio de shell (cmd /c, powershell -c, bash -c) para evaluar su contenido.
 */
function normalizeSegment(seg) {
  let s = seg.trim().replace(/[ \t]+/g, ' ');
  const wrap = /^(?:cmd(?:\.exe)?\s+\/[cCkK]|(?:powershell|pwsh)(?:\.exe)?\s+(?:-noprofile\s+|-noninteractive\s+|-executionpolicy\s+\S+\s+)*-(?:c|command)|(?:ba|z|da)?sh\s+-l?c|wsl(?:\.exe)?(?:\s+-e)?)\s+([\s\S]+)$/i.exec(s);
  if (wrap) return { inner: wrap[1].replace(/^(["'])([\s\S]*)\1$/, '$2') };
  while (/^[A-Za-z_][A-Za-z0-9_]*=("[^"]*"|'[^']*'|\S*)\s/.test(s)) s = s.replace(/^[A-Za-z_][A-Za-z0-9_]*=("[^"]*"|'[^']*'|\S*)\s/, '');
  s = s.replace(/^(?:call|start(?:\s+\/b)?|&|exec|env|time|nohup)\s+/i, '');
  const tokens = tokenize(s);
  if (!tokens.length) return { norm: '', tokens };
  const rawExe = tokens[0];
  let exe = /^\.\//.test(rawExe) ? rawExe : rawExe.split(/[\\/]/).pop();
  exe = exe.replace(/\.(exe|cmd|bat|ps1|com)$/i, '');
  if (/^(\.\/)?gradlew$/i.test(exe) && /\.bat$/i.test(rawExe)) exe = 'gradlew.bat';
  let rest = tokens.slice(1);
  if (exe.toLowerCase() === 'git') {
    const cleaned = [];
    for (let i = 0; i < rest.length; i++) {
      const t = rest[i];
      if (cleaned.length === 0 && GIT_GLOBAL_WITH_VALUE.has(t)) { i++; continue; }
      if (cleaned.length === 0 && (/^--(git-dir|work-tree|namespace|exec-path)=/.test(t) || GIT_GLOBAL_FLAGS.has(t) || /^-c\S/.test(t))) continue;
      cleaned.push(t);
    }
    rest = cleaned;
  }
  const norm = [exe, ...rest].join(' ').replace(/\\/g, '/').toLowerCase().trim();
  return { norm, tokens: [exe, ...rest] };
}

/** Coincidencia con una regla: exacta, prefijo + espacio, prefijo + ":" (scripts npm) o comodín final "*". */
function matchPattern(norm, pattern) {
  const q = String(pattern).toLowerCase().replace(/\\/g, '/').trim();
  if (!q) return false;
  if (q.endsWith('*')) return norm.startsWith(q.slice(0, -1));
  return norm === q || norm.startsWith(q + ' ') || norm.startsWith(q + ':');
}
const matchesAny = (norm, list) => list.some(p => matchPattern(norm, p));

const SEARCH_TOOLS = new Set(['grep', 'egrep', 'fgrep', 'rg', 'ag', 'ack', 'findstr', 'select-string', 'sls']);

/** ¿El comando usa un archivo con secretos? (.env, claves, credenciales). El patrón de búsqueda de grep/rg no cuenta. */
function secretReference(raw) {
  const isSecret = t => !R.SECRET_EXCEPTIONS.some(re => re.test(t)) && R.SECRET_FILES.some(re => re.test(t));
  for (const seg of splitSegments(String(raw))) {
    const tokens = tokenize(seg.replace(/[<>]+/g, ' '));
    let start = 1;
    const exe = (tokens[0] || '').split(/[\\/]/).pop().replace(/\.(exe|cmd)$/i, '').toLowerCase();
    if (exe === 'git' && (tokens[1] || '').toLowerCase() === 'grep') start = 2;
    const search = SEARCH_TOOLS.has(exe) || start === 2;
    let patternSkipped = !search;
    for (let i = start; i < tokens.length; i++) {
      const t = tokens[i];
      if (/^-/.test(t)) {
        if (search && /^(-e|--regexp|-f|--file|-g|--glob|--iglob|-t|--type|-m|--max-count|-A|-B|-C)$/.test(t)) {
          i++;
          if (/^(-f|--file)$/.test(t) && isSecret(tokens[i] || '')) return tokens[i]; // patrones leídos desde un archivo
          if (/^(-e|--regexp|-f|--file)$/.test(t)) patternSkipped = true;
        }
        const v = t.includes('=') ? t.slice(t.indexOf('=') + 1) : '';
        if (v && isSecret(v)) return v;
        continue;
      }
      if (!patternSkipped) { patternSkipped = true; continue; }
      for (const part of t.split(/[=,;()]+/).filter(Boolean)) if (isSecret(part)) return part;
    }
  }
  return null;
}

// Scripts propios del orquestador (estado, memoria, diagnóstico): siempre permitidos, también antes del GATE.
const OWN_SCRIPT = /(^|\/)\.sdd-orquestador\/bin\/(sdd-harness|sdd-status|sdd-memory|sdd-context|sdd-workspace|sdd-improve|to-md|new-change|sdd-state)\.js$/;
const ownScript = tokens => (tokens[0] || '').toLowerCase() === 'node' && OWN_SCRIPT.test(String(tokens[1] || '').replace(/\\/g, '/').toLowerCase());
const approvesGate = tokens => /sdd-harness\.js$/i.test(String(tokens[1] || '')) && /^(aprobar|directo|liberar)$/i.test(String(tokens[2] || ''));

/** sed y find solo son de lectura en ciertas formas. */
function readOnlyVariant(norm, tokens) {
  if (norm.startsWith('sed ')) return tokens.includes('-n') && !tokens.some(t => /^(-i|--in-place)/.test(t));
  if (norm.startsWith('find ')) return !tokens.some(t => /^-(delete|exec|execdir|ok|okdir|fprint|fprint0|fprintf|fls)$/.test(t));
  return false;
}

function classifySegment(seg, extra) {
  const n = normalizeSegment(seg);
  if (n.inner) return classifyCommand(n.inner, extra);
  const norm = n.norm;
  if (!norm) return { decision: 'allow' };
  if (matchesAny(norm, extra.deny)) return { decision: 'deny', reason: `bloqueado por configuración: "${norm}"` };
  if (/sdd-salida\.js$/i.test(String(n.tokens[1] || ''))) {
    // Comando envuelto por el compactador de salidas: se evalúa el comando real
    let inner = '';
    try { inner = Buffer.from(String(n.tokens[2] || ''), 'base64').toString('utf8'); } catch { /* inválido */ }
    return inner.trim() ? classifyCommand(inner, extra) : { decision: 'deny', reason: 'comando envuelto inválido' };
  }
  if (approvesGate(n.tokens)) return { decision: 'deny', reason: 'solo el usuario aprueba el plan (en el chat o desde su terminal); el agente no puede hacerlo' };
  const isGit = norm.startsWith('git ');
  const gitSub = isGit ? norm.slice(4) : '';
  if (isGit && matchesAny(gitSub, R.GIT_WRITE)) {
    return { decision: 'deny', reason: 'git solo lectura: la escritura en git está bloqueada (commit, push, merge, checkout, etc.). Sugiere el comando al usuario como texto para que lo ejecute él.' };
  }
  if (norm === 'git stash') return { decision: 'deny', reason: 'git solo lectura: "git stash" modifica el repositorio.' };
  if (matchesAny(norm, R.FORGE_WRITE)) return { decision: 'deny', reason: 'escritura en GitHub/GitLab bloqueada (PR, issues, comentarios, releases). Sugiérelo al usuario como texto.' };
  if (/^(sudo|runas|doas|su)\b/.test(norm)) return { decision: 'ask', critical: true, reason: 'requiere privilegios elevados' };
  if (matchesAny(norm, R.INFRA_ASK)) return { decision: 'ask', critical: true, reason: 'comando contra infraestructura, bases de datos o entornos reales (decisión crítica)' };
  if (matchesAny(norm, R.DELETE_ASK)) return { decision: 'ask', critical: true, reason: 'borra archivos o datos (decisión crítica)' };
  if (matchesAny(norm, R.DEPS_ASK)) return { decision: 'ask', critical: true, reason: 'agrega o modifica dependencias (decisión crítica)' };
  if (matchesAny(norm, extra.ask)) return { decision: 'ask', critical: true, reason: 'requiere aprobación por configuración' };
  // Redirecciones que escriben archivos (no cuentan 2>&1 ni descartes a null)
  const redirect = seg.replace(/"[^"]*"|'[^']*'/g, '').replace(/\d?>&\d|\d?>>?\s*(\/dev\/null|nul|\$null)\b/gi, '');
  if (/>/.test(redirect)) return { decision: 'ask', reason: 'redirige la salida a un archivo (escritura)' };
  if (isGit && (matchesAny(gitSub, R.GIT_READ) || gitSub === 'branch' || gitSub === 'remote' || gitSub === '--version' || gitSub === 'version')) return { decision: 'allow' };
  if (matchesAny(norm, R.FORGE_READ) || matchesAny(norm, R.SAFE_COMMANDS) || matchesAny(norm, extra.allow) || readOnlyVariant(norm, n.tokens) || ownScript(n.tokens)) return { decision: 'allow' };
  return { decision: extra.fallback, reason: 'comando no reconocido como seguro' };
}

/** Clasifica un comando completo (posiblemente compuesto). El peor segmento decide. */
function classifyCommand(cmd, extra) {
  const raw = String(cmd || '');
  for (const re of R.DANGEROUS) if (re.test(raw)) return { decision: 'deny', reason: 'comando destructivo bloqueado' };
  if (!extra.allowSecrets) {
    const ref = secretReference(raw);
    if (ref) return { decision: 'deny', reason: `el comando usa un archivo con secretos (${ref}): los secretos no se leen ni se escriben` };
  }
  if (/\.sdd-orquestador[\\/]+estado\b/i.test(raw)) return { decision: 'deny', reason: 'el estado del harness solo lo modifica el propio harness' };
  const hasSubst = /\$\(|`/.test(raw);
  if (hasSubst) {
    // Sustitución de comandos: se evalúa el interior; como mínimo se pregunta.
    const inner = [...raw.matchAll(/\$\(([^)]*)\)|`([^`]*)`/g)].map(m => m[1] || m[2] || '');
    const worst = inner.map(i => classifyCommand(i, extra)).find(r => r.decision === 'deny');
    if (worst) return worst;
  }
  let result = { decision: 'allow' };
  for (const seg of splitSegments(raw)) {
    const r = classifySegment(seg, extra);
    if (r.decision === 'deny') return r;
    if (r.decision === 'ask' && (result.decision !== 'ask' || (r.critical && !result.critical))) result = r;
  }
  if (hasSubst && result.decision === 'allow') return { decision: 'ask', reason: 'contiene sustitución de comandos' };
  return result;
}

// Configuración que protege al propio agente: cambiarla es decisión del usuario.
const AGENT_CONFIG_FILES = ['.claude/settings.json', '.claude/settings.local.json', '.codex/hooks.json', '.codex/config.toml',
  '.gemini/settings.json', '.cursor/hooks.json', '.config/opencode/opencode.json'];
const AGENT_CONFIG_DIRS = ['.codex/rules', '.copilot/hooks', '.github/hooks', '.config/opencode/plugins', '.config/opencode/plugin', '.opencode/plugins', '.opencode/plugin'];

class Policy {
  /**
   * @param {object} o
   * @param {string} o.root raíz del proyecto
   * @param {object} [o.config] sección "permisos" de la configuración del harness
   */
  constructor({ root, config = {} }) {
    this.root = path.resolve(root);
    this.extra = {
      allow: config.permitir || [],
      ask: config.preguntar || [],
      deny: config.denegar || [],
      fallback: config.porDefecto === 'deny' ? 'deny' : 'ask',
      allowSecrets: !!config.permitirSecretos,
    };
    const inHome = rel => path.join(HOME, rel);
    this.protectedFiles = [...AGENT_CONFIG_FILES.map(inHome), ...AGENT_CONFIG_FILES.map(f => path.join(this.root, f)), path.join(this.root, '.sdd', 'harness.json')];
    this.protectedDirs = [SDD_HOME, ...AGENT_CONFIG_DIRS.map(inHome), ...AGENT_CONFIG_DIRS.map(d => path.join(this.root, d))];
    this.stateDir = path.join(SDD_HOME, 'estado');
  }

  isSecret(abs) {
    if (this.extra.allowSecrets) return false;
    if (R.SECRET_EXCEPTIONS.some(re => re.test(abs))) return false;
    return R.SECRET_FILES.some(re => re.test(abs));
  }

  /**
   * Decide si un comando de shell puede ejecutarse.
   * @returns {{decision:'allow'|'ask'|'deny', reason?:string, critical?:boolean}}
   */
  checkCommand(command) {
    return classifyCommand(command, this.extra);
  }

  /**
   * Decide si una ruta puede leerse o escribirse.
   * @param {string} p ruta (relativa a la raíz o absoluta)
   * @param {'read'|'write'} mode
   */
  checkPath(p, mode) {
    const abs = path.resolve(this.root, String(p || '.'));
    const rel = relPosix(this.root, abs);
    const inside = isInside(this.root, abs);
    if (this.isSecret(abs)) return { decision: 'deny', abs, rel, inside, reason: `archivo con secretos (${path.basename(abs)}): no se lee ni se escribe` };
    if (mode === 'read') return { decision: inside ? 'allow' : 'ask', abs, rel, inside, reason: inside ? undefined : 'lectura fuera del proyecto' };
    if (isInside(this.stateDir, abs)) return { decision: 'deny', abs, rel, inside, reason: 'el estado del harness solo lo modifica el propio harness' };
    if (this.protectedFiles.some(f => isInside(f, abs)) || this.protectedDirs.some(d => isInside(d, abs))) {
      return { decision: 'ask', critical: true, abs, rel, inside, reason: 'modifica la configuración del harness o de los hooks del agente (el agente no cambia sus propias protecciones sin permiso del usuario)' };
    }
    if (inside && (rel === '.git' || rel.startsWith('.git/'))) return { decision: 'deny', abs, rel, inside, reason: 'no se escribe dentro de .git (git es solo lectura)' };
    if (!inside) return { decision: 'ask', abs, rel, inside, reason: 'escritura fuera del proyecto' };
    return { decision: 'allow', abs, rel, inside };
  }
}

module.exports = { Policy, splitSegments, normalizeSegment, classifyCommand, matchPattern, tokenize, secretReference };
