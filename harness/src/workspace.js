'use strict';
// Espacio de trabajo: lo que el usuario abrió en su herramienta, sea cual sea su forma.
//   · una carpeta con varios proyectos adentro (repos separados o subcarpetas)
//   · un workspace multi-raíz de VS Code (*.code-workspace)
//   · un workspace declarado (.sdd/workspace.json)
//   · un monorepo (un repo con apps/, services/, packages/…)
//   · un solo proyecto
// Detecta los proyectos por sus marcadores, su stack y si tienen memoria. Cada archivo pertenece al proyecto más
// cercano que lo contiene: su memoria, sus reglas, sus sensores y sus puntos de restauración son los de ese proyecto.
// Por defecto recorre todos los niveles de carpetas; los topes se ajustan en .sdd/harness.json → espacio.
const fs = require('fs');
const path = require('path');
const { isInside, relPosix, shortHash } = require('./util');
const { STATE_DIR, fwd } = require('./paths');
const { loadConfig, DEFAULTS } = require('./config');

const MAX_PROJECTS = 60;
const CACHE_MS = 20 * 60000;
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'target', 'vendor', 'coverage', '.next', '.nuxt', '.angular', '.svelte-kit',
  '.venv', 'venv', '__pycache__', 'Pods', 'DerivedData', '.gradle', '.idea', '.vscode', 'bin', 'obj', '.terraform', '.dart_tool', '.turbo',
  '.cache', 'tmp', 'temp', 'logs', '.sdd', '.github', '.husky', 'public', 'assets', 'static', 'docs', 'test', 'tests', '__tests__', 'e2e']);
const MARKERS = ['.git', 'Chart.yaml', 'kustomization.yaml', 'main.tf', 'package.json', 'angular.json', 'go.mod', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'settings.gradle', 'settings.gradle.kts',
  'pyproject.toml', 'requirements.txt', 'setup.py', 'composer.json', 'pubspec.yaml', 'Cargo.toml', 'Gemfile', 'Package.swift', 'deno.json', 'nx.json'];
const MARKER_EXT = /\.(sln|csproj|fsproj|vbproj|xcodeproj|xcworkspace)$/i;

const readJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
/** JSON con comentarios y comas finales (archivos .code-workspace). */
function readJsonc(f) {
  try {
    const t = fs.readFileSync(f, 'utf8').replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (m, s) => s || '').replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(t);
  } catch { return null; }
}

function entries(dir) { try { return fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; } }

function markersIn(dir, list) {
  const names = new Set(list.map(e => e.name));
  const found = MARKERS.filter(m => names.has(m));
  for (const e of list) if (MARKER_EXT.test(e.name)) found.push(e.name);
  if (names.has('.sdd') && (fs.existsSync(path.join(dir, '.sdd', 'memoria')) || fs.existsSync(path.join(dir, '.sdd', 'harness.json')))) found.push('.sdd');
  return found;
}

/** Stack legible a partir de los marcadores y del package.json. */
function stackOf(dir, markers) {
  const s = [];
  const has = m => markers.includes(m) || markers.some(x => x.endsWith(m));
  const pkg = has('package.json') ? readJson(path.join(dir, 'package.json')) : null;
  const deps = pkg ? { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) } : {};
  if (has('angular.json') || deps['@angular/core']) s.push('Angular');
  if (deps['react-native'] || deps.expo) s.push(deps.expo ? 'Expo' : 'React Native');
  else if (deps.next) s.push('Next.js');
  else if (deps.react) s.push('React');
  if (deps.vue) s.push('Vue');
  if (deps['@nestjs/core']) s.push('NestJS');
  if (deps['@adonisjs/core']) s.push('AdonisJS');
  if (deps.express && !deps['@nestjs/core']) s.push('Express');
  if (pkg && !s.length) s.push(deps.typescript ? 'TypeScript' : 'Node.js');
  if (has('go.mod')) s.push('Go');
  if (has('pom.xml')) s.push('Java (Maven)');
  if (has('build.gradle') || has('build.gradle.kts')) s.push(fs.existsSync(path.join(dir, 'app', 'src', 'main', 'AndroidManifest.xml')) ? 'Android' : 'Gradle');
  if (has('.sln') || has('.csproj')) s.push('.NET');
  if (has('pyproject.toml') || has('requirements.txt') || has('setup.py')) s.push('Python');
  if (has('composer.json')) s.push('PHP');
  if (has('pubspec.yaml')) s.push('Flutter');
  if (has('Cargo.toml')) s.push('Rust');
  if (has('Package.swift') || has('.xcodeproj') || has('.xcworkspace')) s.push('iOS/Swift');
  if (has('Chart.yaml')) s.push('Helm');
  if (has('kustomization.yaml')) s.push('Kustomize');
  if (has('main.tf')) s.push('Terraform');
  return [...new Set(s)];
}

/** Descripción corta: primera línea útil de la memoria o la descripción del package.json. */
function describe(dir) {
  try {
    const lines = fs.readFileSync(path.join(dir, '.sdd', 'memoria', 'MEMORIA.md'), 'utf8').split(/\r?\n/).map(l => l.trim());
    const l = lines.find(x => x && !x.startsWith('#') && !x.startsWith('<!--') && !/^[-*|>]?\s*$/.test(x));
    if (l) return l.replace(/^[-*>]\s*/, '').replace(/\*\*/g, '').slice(0, 90);
  } catch { /* sin memoria */ }
  const pkg = readJson(path.join(dir, 'package.json'));
  return pkg && pkg.description ? String(pkg.description).slice(0, 90) : '';
}

function projectInfo(dir, markers, base) {
  const pkg = markers.includes('package.json') ? readJson(path.join(dir, 'package.json')) : null;
  return {
    nombre: path.basename(dir),
    paquete: pkg && pkg.name && pkg.name !== path.basename(dir) ? String(pkg.name) : undefined,
    ruta: path.resolve(dir),
    rel: relPosix(base, dir) || '.',
    stack: stackOf(dir, markers),
    git: markers.includes('.git'),
    memoria: fs.existsSync(path.join(dir, '.sdd', 'memoria', 'MEMORIA.md')),
    config: fs.existsSync(path.join(dir, '.sdd', 'harness.json')),
    descripcion: describe(dir),
  };
}

/** Límites del recorrido: espacio.profundidad (entero ≥ 1; null = sin límite) y espacio.maxCarpetas (entero ≥ 1). Lo inválido usa el valor por defecto. */
function limits(root) {
  let e = null;
  try { e = loadConfig(root).espacio; } catch { /* configuración ilegible: valores por defecto */ }
  const o = e && typeof e === 'object' ? e : {};
  const ok = v => Number.isInteger(v) && v >= 1;
  return { profundidad: ok(o.profundidad) ? o.profundidad : DEFAULTS.espacio.profundidad, maxCarpetas: ok(o.maxCarpetas) ? o.maxCarpetas : DEFAULTS.espacio.maxCarpetas };
}

/** Proyectos dentro de una carpeta (ella incluida si es un proyecto), por niveles, hasta la profundidad o el total de carpetas de `lim`. */
function scan(folder, base, out, budget, lim) {
  const queue = [[path.resolve(folder), 0]];
  while (queue.length && budget.dirs < lim.maxCarpetas && out.length < MAX_PROJECTS) {
    const [dir, depth] = queue.shift();
    budget.dirs++;
    const list = entries(dir);
    const markers = markersIn(dir, list);
    if (markers.length) out.push(projectInfo(dir, markers, base));
    if (lim.profundidad != null && depth >= lim.profundidad) continue;
    for (const e of list) {
      if (!e.isDirectory() || e.name.startsWith('.') || SKIP.has(e.name)) continue;
      queue.push([path.join(dir, e.name), depth + 1]);
    }
  }
}

/** Carpetas extra: las de un *.code-workspace que incluya la raíz y las de .sdd/workspace.json. */
function extraFolders(root) {
  const r = path.resolve(root);
  const extra = []; const fuentes = []; let comun = null;
  const candidates = [r, path.dirname(r), path.dirname(path.dirname(r))];
  for (const d of [...new Set(candidates)]) {
    for (const e of entries(d)) {
      if (!e.isFile() || !/\.code-workspace$/i.test(e.name)) continue;
      const w = readJsonc(path.join(d, e.name));
      const folders = ((w && w.folders) || []).map(f => f && f.path && path.resolve(d, f.path)).filter(Boolean);
      if (!folders.some(f => isInside(f, r) || isInside(r, f))) continue;
      fuentes.push(fwd(path.join(d, e.name)));
      if (!comun && d !== r) comun = d;
      for (const f of folders) if (!isInside(r, f) && !isInside(f, r)) extra.push(f);
    }
    const ws = readJson(path.join(d, '.sdd', 'workspace.json'));
    if (ws && Array.isArray(ws.repos)) {
      const repos = ws.repos.map(x => x && x.ruta && path.resolve(d, x.ruta)).filter(Boolean);
      if (d === r || repos.some(x => isInside(x, r))) {
        fuentes.push(fwd(path.join(d, '.sdd', 'workspace.json')));
        if (!comun && d !== r) comun = d;
        for (const x of repos) if (!isInside(r, x)) extra.push(x);
      }
    }
  }
  return { extra: [...new Set(extra.map(x => path.resolve(x)))].filter(x => fs.existsSync(x)), fuentes, comun };
}

/** Detecta el espacio de trabajo (sin caché). Un solo contador de carpetas para la raíz y las carpetas extra. */
function detect(root, lim = limits(root)) {
  const r = path.resolve(root);
  const { extra, fuentes, comun } = extraFolders(r);
  const proyectos = []; const budget = { dirs: 0 };
  for (const f of [r, ...extra]) scan(f, r, proyectos, budget, lim);
  const seen = new Set();
  const unique = proyectos.filter(p => { const k = p.ruta.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  // Memoria del espacio: la de la carpeta común del workspace, o la de la raíz si es una carpeta contenedora
  const espacio = comun && fs.existsSync(path.join(comun, '.sdd', 'memoria')) ? comun : null;
  return { raiz: r, carpetas: [r, ...extra], fuentes, espacio, proyectos: unique, recortado: proyectos.length >= MAX_PROJECTS || budget.dirs >= lim.maxCarpetas,
    limites: { profundidad: lim.profundidad, maxCarpetas: lim.maxCarpetas }, en: Date.now() };
}

const cacheFile = root => path.join(STATE_DIR, shortHash(path.resolve(root).toLowerCase()), 'espacio.json');

/** Espacio de trabajo con caché (se recalcula al iniciar sesión, cada 20 minutos o si cambian los límites de `espacio`). */
function load(root, { fresh = false } = {}) {
  const f = cacheFile(root);
  const lim = limits(root);
  if (!fresh) {
    const c = readJson(f); const l = (c && c.limites) || {};
    if (c && c.raiz === path.resolve(root) && Date.now() - c.en < CACHE_MS && l.profundidad === lim.profundidad && l.maxCarpetas === lim.maxCarpetas) return c;
  }
  const ws = detect(root, lim);
  try { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(ws)); } catch { /* sin permisos */ }
  return ws;
}

/** ¿Hay más de un proyecto o carpetas extra? (si no, todo funciona como un proyecto único) */
const isMulti = ws => ws.carpetas.length > 1 || ws.proyectos.filter(p => p.ruta !== ws.raiz).length > 0;

/** Carpeta del espacio que contiene la ruta (la raíz o una carpeta extra), o null si está fuera. */
const folderOf = (ws, abs) => ws.carpetas.filter(f => isInside(f, abs)).sort((a, b) => b.length - a.length)[0] || null;

/** Proyecto más cercano que contiene la ruta (el más profundo), o null. */
function projectOf(ws, abs) {
  return ws.proyectos.filter(p => isInside(p.ruta, abs)).sort((a, b) => b.ruta.length - a.ruta.length)[0] || null;
}

/** Proyecto con configuración o memoria propia más cercano (para reglas, sensores y memoria). */
function ownerOf(ws, abs) {
  const c = ws.proyectos.filter(p => isInside(p.ruta, abs) && (p.config || p.memoria || p.git)).sort((a, b) => b.ruta.length - a.ruta.length);
  return c[0] || null;
}

/** Proyecto con su propio .sdd/harness.json más cercano que contiene la ruta (distinto de la raíz), o null. */
function configOwner(ws, abs) {
  return ws.proyectos.filter(p => p.config && p.ruta !== ws.raiz && isInside(p.ruta, abs)).sort((a, b) => b.ruta.length - a.ruta.length)[0] || null;
}

/** Proyectos mencionados en un texto (por nombre de carpeta o de paquete). */
function mentioned(ws, text) {
  const t = String(text || '').toLowerCase();
  return ws.proyectos.filter(p => p.ruta !== ws.raiz && [p.nombre, p.paquete].filter(n => n && n.length >= 3)
    .some(n => new RegExp(`(?<![\\p{L}\\p{N}_-])${n.toLowerCase().replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(?![\\p{L}\\p{N}_-])`, 'u').test(t)));
}

/** Mapa del espacio para la IA (una línea por proyecto; ~3.000 caracteres como máximo). */
function mapBlock(ws, maxChars = 3000) {
  if (!isMulti(ws)) return '';
  let used = 0; let cut = 0;
  const lines = ws.proyectos.filter(p => p.ruta !== ws.raiz || p.stack.length).map(p => {
    const ruta = isInside(ws.raiz, p.ruta) ? (p.rel === '.' ? '(raíz)' : p.rel) : fwd(p.ruta);
    const info = [p.stack.join(', ') || 'sin stack detectado', p.memoria ? 'con memoria' : null, p.git ? 'repo git' : null].filter(Boolean).join(' · ');
    return `- **${p.nombre}** — \`${ruta}\` — ${info}${p.descripcion ? ` — ${p.descripcion}` : ''}`;
  }).filter(l => { used += l.length + 1; if (used > maxChars) { cut++; return false; } return true; });
  const extra = ws.carpetas.slice(1).map(fwd);
  // Recortado por carpetas revisadas (no por el tope fijo de proyectos ni por el largo del mapa): se amplía en la configuración
  const fijo = ws.limites && ws.limites.profundidad != null;
  const hint = ws.recortado && ws.proyectos.length < MAX_PROJECTS ? `: para ampliarlo sube \`espacio.maxCarpetas\`${fijo ? ' o `espacio.profundidad`' : ''} en .sdd/harness.json` : '';
  return [
    `## Espacio de trabajo: ${ws.proyectos.length} proyecto(s)${extra.length ? ` en ${ws.carpetas.length} carpetas` : ''}`,
    ...lines,
    ...(ws.recortado || cut ? [`- … (${cut ? `${cut} proyecto(s) más` : 'hay más proyectos'}; el mapa se recortó${hint})`] : []),
    ...(extra.length ? [`Carpetas fuera de la raíz: ${extra.join(', ')}`] : []),
    'Cómo trabajar aquí: antes de responder, planificar o concluir que algo "no existe", busca en TODOS los proyectos que puedan estar involucrados (por ejemplo, rg sobre cada ruta), no solo en el primero. Cada proyecto tiene su propia memoria y reglas: antes de trabajar en uno, lee su `.sdd/memoria/MEMORIA.md` si existe. No mezcles la memoria de un proyecto con la de otro; lo que cruza proyectos (contratos, dependencias entre servicios) va en la memoria de la raíz del espacio. Al delegar, pasa a cada sub-agente este mapa y la ruta del proyecto que le toca.',
  ].join('\n');
}

module.exports = { load, detect, isMulti, folderOf, projectOf, ownerOf, configOwner, mentioned, mapBlock, readJsonc, extraFolders, stackOf };
