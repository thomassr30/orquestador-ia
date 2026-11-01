'use strict';
// Sensores del harness (retroalimentación determinista):
//  - rápidos, por archivo, después de cada edición (JSON, YAML, conflictos de merge, sintaxis Go);
//  - del proyecto, al terminar el turno, solo sobre lo modificado (lint, tipos, tests relacionados).
// Se detectan por stack y por módulo (monorepos), o se fijan en .sdd/harness.json → sensores.comandos.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { runShell, hasCommand } = require('./proc');
const { isInside, relPosix, IS_WIN, truncateMiddle } = require('./util');

const CODE_EXT = /\.(m?[jt]sx?|cjs|cts|mts|vue|svelte|go|java|kt|kts|swift|scss|sass|css|less|html|json|ya?ml|sql|graphql|gql|prisma)$/i;
const JS_EXT = /\.(m?[jt]sx?|cjs|cts|mts|vue|svelte)$/i;
const TS_EXT = /\.(m?tsx?|cts|mts)$/i;
const MANIFESTS = ['package.json', 'go.mod', 'gradlew', 'build.gradle', 'build.gradle.kts', 'Package.swift', 'pom.xml'];

const exists = p => { try { fs.accessSync(p); return true; } catch { return false; } };
const readJson = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
const quote = f => `"${String(f).replace(/"/g, '\\"')}"`;

/** Directorio del módulo (package.json, go.mod…) más cercano al archivo, sin salir de la raíz. */
function moduleRootFor(root, rel) {
  let d = path.dirname(path.resolve(root, rel));
  while (isInside(root, d)) {
    if (MANIFESTS.some(m => exists(path.join(d, m)))) return d;
    if (path.resolve(d) === path.resolve(root)) break;
    d = path.dirname(d);
  }
  return path.resolve(root);
}

/** Busca hacia arriba (hasta la raíz) el primero de los archivos indicados. */
function findUp(root, start, names) {
  let d = start;
  while (true) {
    for (const n of names) if (exists(path.join(d, n))) return path.join(d, n);
    if (path.resolve(d) === path.resolve(root) || !isInside(root, d)) return null;
    d = path.dirname(d);
  }
}

function packageManager(root, dir) {
  const lock = findUp(root, dir, ['pnpm-lock.yaml', 'yarn.lock', 'bun.lockb', 'bun.lock', 'package-lock.json']);
  if (!lock) return 'npm';
  const b = path.basename(lock);
  return b.startsWith('pnpm') ? 'pnpm' : b.startsWith('yarn') ? 'yarn' : b.startsWith('bun') ? 'bun' : 'npm';
}
const runScript = (pm, s) => (pm === 'npm' ? `npm run ${s}` : pm === 'yarn' ? `yarn ${s}` : `${pm} run ${s}`);
const localBin = (root, dir, name) => !!findUp(root, dir, [path.join('node_modules', '.bin', IS_WIN ? `${name}.cmd` : name)]);

/** Lista de archivos para la línea de comandos (con tope para no exceder el límite de Windows). */
function fileArgs(files, max = 40) {
  const list = files.slice(0, max).map(quote).join(' ');
  return list.length > 6000 ? files.slice(0, 10).map(quote).join(' ') : list;
}

/** Comandos detectados para un módulo y sus archivos cambiados. */
function detect(root, modRoot, files) {
  const out = {};
  const relFiles = files.map(f => relPosix(modRoot, path.resolve(root, f)));
  const pkg = readJson(path.join(modRoot, 'package.json'));
  if (pkg) {
    const scripts = pkg.scripts || {};
    const pm = packageManager(root, modRoot);
    const js = relFiles.filter(f => JS_EXT.test(f));
    const eslintCfg = findUp(root, modRoot, ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts', 'eslint.config.mts',
      '.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.yaml']) || (pkg.eslintConfig ? 'pkg' : null);
    if (js.length && eslintCfg && localBin(root, modRoot, 'eslint')) out.lint = { cmd: `npx --no-install eslint --no-error-on-unmatched-pattern ${fileArgs(js)}`, scoped: true };
    else if (scripts.lint && js.length) out.lint = { cmd: runScript(pm, 'lint'), scoped: false };
    const ts = relFiles.filter(f => TS_EXT.test(f));
    const tcScript = ['typecheck', 'type-check', 'check-types', 'tsc'].find(s => scripts[s]);
    const angular = exists(path.join(modRoot, 'angular.json'));
    const ngTouched = relFiles.some(f => /\.(m?ts|html|scss|css)$/i.test(f));
    if (angular && ngTouched && !tcScript && localBin(root, modRoot, 'ng')) {
      // Angular: el build revisa también las plantillas HTML (tsc no las ve)
      out.tipos = { cmd: 'npx --no-install ng build --configuration development', scoped: false };
    } else if (ts.length) {
      if (tcScript) out.tipos = { cmd: runScript(pm, tcScript), scoped: false };
      else if (localBin(root, modRoot, 'tsc')) {
        const app = exists(path.join(modRoot, 'angular.json')) && exists(path.join(modRoot, 'tsconfig.app.json')) ? 'tsconfig.app.json' : exists(path.join(modRoot, 'tsconfig.json')) ? 'tsconfig.json' : null;
        if (app) out.tipos = { cmd: `npx --no-install tsc --noEmit -p ${app}`, scoped: false };
      }
    }
    const test = String(scripts.test || '');
    if (angular && js.length && /\b(ng test|karma)\b/.test(test) && localBin(root, modRoot, 'ng')) {
      // Karma sin modo watch y con Chrome headless (si no hay Chrome, queda omitido)
      out.tests = { cmd: 'npx --no-install ng test --watch=false --browsers=ChromeHeadless', scoped: true };
    } else if (js.length && test && !/no test specified/i.test(test) && !/\b(ng test|karma|--watch)\b/.test(test)) {
      if (/\bvitest\b/.test(test)) out.tests = { cmd: `npx --no-install vitest related --run --passWithNoTests ${fileArgs(js)}`, scoped: true };
      else if (/\bjest\b/.test(test)) out.tests = { cmd: `npx --no-install jest --ci --passWithNoTests --findRelatedTests ${fileArgs(js)}`, scoped: true };
      else out.tests = { cmd: pm === 'npm' ? 'npm test' : `${pm} test`, scoped: true };
    }
    return out;
  }
  if (exists(path.join(modRoot, 'go.mod'))) {
    const pkgs = [...new Set(relFiles.filter(f => f.endsWith('.go')).map(f => { const d = path.posix.dirname(f); return d === '.' ? '.' : `./${d}`; }))];
    if (pkgs.length && hasCommand('go')) {
      const list = pkgs.slice(0, 30).join(' ');
      out.tipos = { cmd: `go vet ${list}`, scoped: true };
      out.tests = { cmd: `go test ${list}`, scoped: true };
      if (hasCommand('golangci-lint') && findUp(root, modRoot, ['.golangci.yml', '.golangci.yaml', '.golangci.toml', '.golangci.json'])) out.lint = { cmd: `golangci-lint run ${list}`, scoped: true };
    }
  }
  return out;
}

/** Plan de sensores para los archivos cambiados: [{nombre, cmd, cwd, modulo}] */
function plan(root, changed, cfg) {
  const sc = cfg.sensores;
  const names = sc.alTerminar.filter(n => typeof n === 'string');
  const files = changed.filter(f => CODE_EXT.test(f) && exists(path.resolve(root, f)));
  if (!files.length || !names.length) return [];
  const steps = [];
  for (const n of names) {
    if (sc.comandos && sc.comandos[n]) steps.push({ nombre: n, cmd: String(sc.comandos[n]).replace(/\{archivos\}/g, fileArgs(files)), cwd: root, modulo: '.', scoped: true, files });
  }
  const pending = names.filter(n => !(sc.comandos && sc.comandos[n]));
  if (pending.length) {
    const groups = new Map();
    for (const f of files) { const m = moduleRootFor(root, f); if (!groups.has(m)) groups.set(m, []); groups.get(m).push(f); }
    for (const [mod, gfiles] of groups) {
      const det = detect(root, mod, gfiles);
      for (const n of pending) if (det[n]) steps.push({ nombre: n, cmd: det[n].cmd, scoped: det[n].scoped, cwd: mod, modulo: relPosix(root, mod), files: gfiles.map(f => relPosix(mod, path.resolve(root, f))) });
    }
  }
  return steps;
}

const MISSING_TOOL = /(No binary for ChromeHeadless|Cannot start ChromeHeadless|CHROME_BIN|could not determine executable to run|is not recognized as an internal or external command|no se reconoce como un comando interno o externo|command not found|: not found|npm ERR! missing script|npm error missing script|Oops! Something went wrong!.*ESLint|Cannot find module '(?:eslint|typescript|vitest|jest)')/is;
const mentionsAny = (output, files = []) => { const o = String(output || '').replace(/\\/g, '/'); return files.some(f => o.includes(f)); };

/** Ejecuta los sensores en secuencia respetando el presupuesto de tiempo. */
async function runSensors(root, changed, cfg) {
  const steps = plan(root, changed, cfg);
  const results = [];
  const deadline = Date.now() + cfg.sensores.presupuestoSeg * 1000;
  for (const s of steps) {
    const left = deadline - Date.now();
    if (left < 5000) { results.push({ ...s, omitido: true, ok: true, motivo: 'sin tiempo' }); continue; }
    const r = await runShell(s.cmd, { cwd: s.cwd, timeoutMs: Math.min(cfg.sensores.timeoutSeg * 1000, left) });
    if (r.code !== 0 && MISSING_TOOL.test(r.output.slice(0, 2000))) results.push({ ...s, omitido: true, ok: true, motivo: 'herramienta no instalada o sin configurar', ms: r.ms });
    else if (r.timedOut) results.push({ ...s, ok: true, omitido: true, motivo: `excedió ${Math.round(r.ms / 1000)} s`, ms: r.ms });
    else if (r.code !== 0 && !s.scoped && !mentionsAny(r.output, s.files)) {
      // Chequeo de todo el proyecto con errores solo en archivos que no se tocaron: no es culpa de este cambio.
      results.push({ ...s, ok: true, omitido: true, motivo: 'hay errores previos en archivos no modificados', ms: r.ms });
    } else results.push({ ...s, ok: r.code === 0, code: r.code, ms: r.ms, output: r.output });
  }
  return { ran: steps.length > 0, ok: results.every(r => r.ok), results };
}

/** Extrae las líneas útiles de una salida de error. */
function relevantLines(output, maxChars = 3500) {
  const lines = String(output || '').split('\n').map(l => l.trimEnd()).filter(Boolean);
  const hit = /(error|warning|✗|×|✖|FAIL|failed|panic:|undefined:|cannot |expected|assert|\.(?:[jt]sx?|go|vue|html|scss|css):\d+|\(\d+,\d+\)|:\d+:\d+)/i;
  const picked = lines.filter(l => hit.test(l));
  const text = (picked.length >= 2 ? picked : lines.slice(-40)).join('\n');
  return truncateMiddle(text, maxChars);
}

/** Resumen para el agente (motivo de bloqueo) o para el usuario. */
function summarize(run, nFiles) {
  const out = [`Sensores del harness sobre lo que modificaste (${nFiles} archivo(s)):`];
  for (const r of run.results) {
    const where = r.modulo && r.modulo !== '.' ? ` [${r.modulo}]` : '';
    if (r.omitido) out.push(`• ${r.nombre}${where}: omitido (${r.motivo})`);
    else if (r.ok) out.push(`✓ ${r.nombre}${where} (${Math.round(r.ms / 1000)} s)`);
    else out.push(`✗ ${r.nombre}${where} — ${r.cmd} (código ${r.code}, ${Math.round(r.ms / 1000)} s)\n${relevantLines(r.output).split('\n').map(l => `  ${l}`).join('\n')}`);
  }
  return out.join('\n');
}

// ---------- chequeos rápidos por archivo ----------
// Archivos .json que admiten comentarios y comas finales (JSONC).
const JSONC_FILE = /(^|[\\/])(tsconfig[^\\/]*|jsconfig[^\\/]*|devcontainer|\.eslintrc|\.babelrc|\.swcrc|angular|nest-cli|biome|deno|settings|launch|tasks|extensions|keybindings)\.json$|[\\/]\.vscode[\\/][^\\/]+\.json$/i;

function jsonError(text, file) {
  const raw = text.replace(/^\uFEFF/, '');
  try { JSON.parse(raw); return null; } catch (e) {
    if (JSONC_FILE.test(file || '')) {
      const relaxed = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'\\])\/\/.*$/gm, '$1').replace(/,(\s*[}\]])/g, '$1');
      try { JSON.parse(relaxed); return null; } catch { /* error real */ }
    }
    const m = /position (\d+)/.exec(e.message);
    if (m) {
      const pos = Number(m[1]);
      const before = raw.slice(0, pos).split('\n');
      return `JSON inválido en línea ${before.length}, columna ${before[before.length - 1].length + 1}: ${e.message.replace(/ in JSON at position \d+.*$/, '')}`;
    }
    return `JSON inválido: ${e.message}`;
  }
}

/** Problemas detectables al instante en un archivo recién editado (o null). */
function quickCheck(abs) {
  let text;
  try {
    const st = fs.statSync(abs);
    if (!st.isFile() || st.size > 2e6) return null;
    text = fs.readFileSync(abs, 'utf8');
  } catch { return null; }
  if (text.includes('\u0000')) return null;
  const issues = [];
  if (/^<{7}(?: |$)/m.test(text) && /^>{7}(?: |$)/m.test(text)) issues.push('quedaron marcadores de conflicto de merge (<<<<<<< / >>>>>>>)');
  const ext = path.extname(abs).toLowerCase();
  if (ext === '.json') { const e = jsonError(text, abs); if (e) issues.push(e); }
  if (ext === '.yml' || ext === '.yaml') {
    const i = text.split(/\r?\n/).findIndex(l => /^\t/.test(l));
    if (i >= 0) issues.push(`línea ${i + 1}: YAML no admite tabulaciones para indentar`);
  }
  if (ext === '.go' && hasCommand('gofmt')) {
    const r = spawnSync('gofmt', ['-e', '-l', abs], { encoding: 'utf8', timeout: 10000, windowsHide: true });
    if (r.status && r.stderr) issues.push(r.stderr.trim().split('\n').slice(0, 5).join('\n'));
  }
  return issues.length ? issues : null;
}

module.exports = { runSensors, summarize, quickCheck, plan, detect, moduleRootFor, CODE_EXT, relevantLines };
