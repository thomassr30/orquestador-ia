#!/usr/bin/env node
// Evaluación del harness con tareas reales (medir antes y después de cada cambio al orquestador).
// Cada tarea corre con la IA en modo no interactivo sobre una COPIA temporal de lo COMMITEADO del proyecto (tu carpeta
// no se toca) y la aprueba un criterio de aceptación independiente del agente. Consume tokens de tu plan.
// Uso:
//   node sdd-eval.js <tareas.json> [--confirmar] [--validar] [--repeticiones=N] [--linea-base]
//                    [--max-tareas=N] [--max-costo-usd=X] [--max-minutos=N]
//   --validar       solo valida el archivo de tareas (sale 0 si es válido, 2 si no); no clona ni ejecuta nada
//   sin --confirmar valida y muestra qué correría, sin ejecutar nada (sale 2): la IA solo se lanza con --confirmar
//   --linea-base    marca esta corrida como línea base: las siguientes compatibles detectan regresiones contra ella
//   --max-*         presupuesto: las ejecuciones (tarea × repetición) que no caben quedan «bloqueado»; una tarea en
//                   curso no se interrumpe. --max-costo-usd suma el costo que informa el cliente.
// tareas.json:
// { "proyecto": "C:/dev/mi-app", "version": "1", "cliente": "claude", "modelo": "sonnet", "modo": "sin-gate",
//   "preparar": "npm ci", "umbrales": { "maxRegresiones": 0 },
//   "tareas": [ { "nombre": "fix-alerta", "pedido": "En /muestras al guardar no aparece la alerta. Corrígelo.",
//                 "maxTurnos": 30, "timeoutMin": 20,
//                 "aceptacion": { "comando": "npx vitest run src/app/muestras", "archivos": ["src/app/muestras/a.spec.ts"],
//                                 "dir": "aceptacion/fix-alerta" } } ] }
//   modo        "sin-gate" (por defecto) apaga el GATE en la copia; "flujo" lo respeta y, si el agente deja la pregunta
//               del GATE, responde «sí» una vez (claude -p --resume) y lo registra como intervención guionada.
//   aceptacion  comando obligatorio (corre sin ANTHROPIC_API_KEY). «archivos» (relativos al proyecto) se guardan antes
//               del agente y se restauran antes del comando: si el agente los tocó, la tarea falla. «dir» (relativa a
//               este archivo y fuera del proyecto) se copia sobre la copia recién cuando el agente terminó: nunca la ve.
//               El formato viejo "verificar": "cmd" se acepta como aceptacion.comando (obsoleto).
// Estados por tarea (harness/src/resultado.js): aprobado, fallido (causa agente | aceptacion | infraestructura),
// no_verificado (la aceptación no pudo correr) y bloqueado (presupuesto).
// Salida: 0 todo aprobado y sin regresiones · 1 alguna tarea no aprobada o regresiones sobre umbrales.maxRegresiones
//         · 2 uso o archivo inválido o falta --confirmar · 3 falla de infraestructura (precedencia 2 > 3 > 1 > 0).
// Historial: <tareas>.resultados.json (entradas v:2 con dataset, commit, versiones de harness y cliente, modelo y modo);
// solo se compara con la última corrida compatible (mismo dataset, cliente, modelo, modo y configuración del harness).
// Pruebas: SDD_EVAL_CLAUDE_BIN=<ejecutable> reemplaza a `claude` (en Windows un .cmd se lanza con el shell).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const SRC = path.join(__dirname, '..', 'harness', 'src');
const { ESTADOS, SIMBOLO, ETIQUETA } = require(path.join(SRC, 'resultado'));
const { redact } = require(path.join(SRC, 'secrets'));
const { killTree, cleanOutput } = require(path.join(SRC, 'proc'));

const IS_WIN = process.platform === 'win32';
const USO = 'Uso: node sdd-eval.js <tareas.json> [--confirmar] [--validar] [--repeticiones=N] [--linea-base] [--max-tareas=N] [--max-costo-usd=X] [--max-minutos=N]';
const GATE_QUESTION = /¿\s*apruebo la implementaci[oó]n\s*\?/i; // mismo patrón que harness/src/gate.js
const MODOS = { 'sin-gate': 'GATE apagado en la copia', flujo: 'GATE activo; el evaluador responde «sí» una vez a su pregunta' };
const MODELO = /^[\w.:[\]-]+$/;
const ACEPTACION_MIN = 30;
const MAX_SALIDA = 32 * 1024 * 1024;
const NO_EXISTE = /no se reconoce como un comando|is not recognized as an internal or external command|command not found|: not found/i;
const SIN_DATO = { valor: null, fuente: 'no_disponible' };

const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const texto = v => typeof v === 'string' && v.trim() !== '';
const tipo = v => (Array.isArray(v) ? 'arreglo' : v === null ? 'null' : typeof v);
const medido = v => (typeof v === 'number' && Number.isFinite(v) ? { valor: v, fuente: 'medido' } : SIN_DATO);
const n = x => (x == null ? '—' : Math.round(x).toLocaleString('es-CL'));
const usd = x => (x == null ? '—' : `US$ ${x.toFixed(3)}`);
/** Evidencia para diagnosticar: últimas ~40 líneas (≤ 2000 caracteres), sin colores ni secretos. */
const cola = (s, lineas = 40, max = 2000) => { const t = redact(cleanOutput(String(s || ''))).trim().split('\n').slice(-lineas).join('\n'); return t.length > max ? t.slice(-max) : t; };
const junta = (...xs) => xs.map(x => String(x || '').trim()).filter(Boolean).join('\n');
const sinApiKey = env => { const e = { ...env }; for (const k of Object.keys(e)) if (/^anthropic_api_key$/i.test(k)) delete e[k]; return e; };
const entornoComandos = () => ({ ...sinApiKey(process.env), CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' });
const winArg = s => (/^[\w\-.:\\/=@]+$/.test(s) ? s : `"${s}"`);

// Procesos y copias en curso: se detienen y borran también si el usuario interrumpe (Ctrl+C).
const VIVOS = new Set();
const TEMPORALES = new Set();
function borrar(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch (e) { console.warn(`Aviso: no se pudo borrar la copia temporal ${dir} (${e.code || e.message}).`); }
  TEMPORALES.delete(dir);
}
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    for (const pid of VIVOS) killTree(pid);
    for (const d of [...TEMPORALES]) borrar(d);
    console.error('\nEvaluación interrumpida: se detuvieron los procesos en curso y se borró la copia temporal (no se guardó el historial).');
    process.exit(130);
  });
}

/** Ejecuta un proceso con stdin, salidas separadas y tiempo límite (al excederlo mata el árbol de procesos). */
function exec(cmd, args, { cwd, env, input = '', timeoutMs, shell = false }) {
  return new Promise(resolve => {
    const out = [], err = [];
    let size = 0, timedOut = false, done = false, timer = null, child;
    const started = Date.now();
    const finish = r => {
      if (done) return;
      done = true; clearTimeout(timer);
      if (child && child.pid) VIVOS.delete(child.pid);
      resolve({ code: null, signal: null, error: null, ...r, stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8'), timedOut, ms: Date.now() - started });
    };
    try { child = spawn(cmd, args, { cwd, env, shell, windowsHide: true, detached: !IS_WIN, stdio: ['pipe', 'pipe', 'pipe'] }); } catch (e) { finish({ error: e }); return; }
    if (child.pid) VIVOS.add(child.pid);
    const take = a => d => { if (size < MAX_SALIDA) { a.push(d); size += d.length; } };
    child.stdout.on('data', take(out));
    child.stderr.on('data', take(err));
    child.stdin.on('error', () => { /* el proceso no leyó la entrada */ });
    child.stdin.end(input);
    timer = setTimeout(() => {
      timedOut = true; killTree(child.pid);
      // Si algún nieto sigue reteniendo las salidas, no se espera más.
      setTimeout(() => { child.stdout.destroy(); child.stderr.destroy(); child.unref(); finish({}); }, 10000).unref();
    }, timeoutMs);
    child.on('error', e => finish({ error: e }));
    child.on('close', (code, signal) => finish({ code, signal }));
  });
}

/** Lanza el cliente: en Windows con el shell (claude es un .cmd), en macOS/Linux directo. */
function lanzar(bin, args, opts) {
  if (/[\\/]/.test(bin) && !fs.existsSync(bin)) return Promise.resolve({ error: Object.assign(new Error(`no existe ${bin}`), { code: 'ENOENT' }), code: null, signal: null, stdout: '', stderr: '', timedOut: false, ms: 0 });
  return IS_WIN ? exec([bin, ...args].map(winArg).join(' '), [], { ...opts, shell: true }) : exec(bin, args, opts);
}

// Clientes de IA. Para agregar otro: { bin(), args(spec, tarea, {resume}), parse(stdout), version() }.
const CLIENTES = {
  claude: {
    bin: () => process.env.SDD_EVAL_CLAUDE_BIN || 'claude',
    args: (spec, t, { resume } = {}) => ['-p', ...(resume ? ['--resume', resume] : []), '--output-format', 'json', '--permission-mode', 'acceptEdits', '--max-turns', String(t.maxTurnos || 40), ...(spec.modelo ? ['--model', spec.modelo] : [])],
    parse(stdout) {
      let j = null;
      try { j = JSON.parse(String(stdout).trim()); } catch { /* salida no JSON */ }
      if (!isObj(j)) return { json: null, texto: '' };
      const u = isObj(j.usage) ? j.usage : null;
      return {
        json: j,
        texto: typeof j.result === 'string' ? j.result : '',
        error: j.is_error === true || /^error/i.test(String(j.subtype || '')) ? String(j.subtype || 'is_error') : null,
        sesion: typeof j.session_id === 'string' && /^[\w-]{1,128}$/.test(j.session_id) ? j.session_id : null,
        turnos: Number.isFinite(j.num_turns) ? j.num_turns : null,
        tokens: u ? ['input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens'].reduce((a, k) => a + (Number(u[k]) || 0), 0) : null,
        costoUsd: Number.isFinite(j.total_cost_usd) ? j.total_cost_usd : null,
      };
    },
    async version() {
      const r = await lanzar(this.bin(), ['--version'], { cwd: os.tmpdir(), env: process.env, timeoutMs: 30000 });
      return !r.error && !r.timedOut && r.code === 0 ? r.stdout.trim().split(/\r?\n/)[0] || null : null;
    },
  },
};

function parseArgs(argv) {
  const o = { repeticiones: 1, errores: [] };
  const BOOL = { '--confirmar': 'confirmar', '--validar': 'validar', '--linea-base': 'lineaBase' };
  const NUM = { '--repeticiones': ['repeticiones', true], '--max-tareas': ['maxTareas', true], '--max-costo-usd': ['maxCostoUsd', false], '--max-minutos': ['maxMinutos', false] };
  for (const a of argv.filter(x => x.startsWith('--'))) {
    const i = a.indexOf('=');
    const k = i < 0 ? a : a.slice(0, i), v = i < 0 ? null : a.slice(i + 1);
    if (BOOL[k] && v === null) o[BOOL[k]] = true;
    else if (NUM[k] && v !== null) {
      const [key, entero] = NUM[k], x = Number(v);
      if (!v.trim() || !Number.isFinite(x) || x <= 0 || (entero && !Number.isInteger(x))) o.errores.push(`${k} debe ser ${entero ? 'un entero' : 'un número'} mayor que 0 (recibido: ${v})`);
      else o[key] = x;
    } else o.errores.push(`opción desconocida o mal escrita: ${a}`);
  }
  const archivos = argv.filter(x => !x.startsWith('--'));
  if (archivos.length !== 1) o.errores.push(archivos.length ? `se esperaba un solo archivo de tareas (recibidos: ${archivos.join(', ')})` : 'falta el archivo de tareas');
  o.file = archivos[0];
  return o;
}

/** Valida el archivo de tareas sin ejecutar nada. Devuelve la spec normalizada, errores y avisos legibles. */
function validar(file) {
  const errores = [], avisos = [];
  let raw, spec;
  try { raw = fs.readFileSync(file); } catch (e) { return { errores: [`no se pudo leer ${file} (${e.code || e.message})`], avisos }; }
  try { spec = JSON.parse(raw.toString('utf8').replace(/^\uFEFF/, '')); } catch (e) { return { errores: [`no es JSON válido: ${e.message}`], avisos }; }
  if (!isObj(spec)) return { errores: [`debe ser un objeto JSON { "proyecto", "tareas" } (recibido: ${tipo(spec)})`], avisos };
  if (!texto(spec.proyecto)) errores.push('«proyecto» debe ser la ruta del repositorio a evaluar (texto)');
  const project = texto(spec.proyecto) ? path.resolve(path.dirname(file), spec.proyecto) : null;
  if (spec.version !== undefined && !texto(spec.version)) errores.push('«version» del dataset debe ser texto');
  const cliente = spec.cliente === undefined ? 'claude' : spec.cliente;
  if (!(typeof cliente === 'string' && Object.prototype.hasOwnProperty.call(CLIENTES, cliente))) errores.push(`cliente no soportado: ${typeof cliente === 'string' ? cliente : JSON.stringify(cliente)} (pendiente; solo claude está implementado)`);
  const modo = spec.modo === undefined ? 'sin-gate' : spec.modo;
  if (!Object.prototype.hasOwnProperty.call(MODOS, modo)) errores.push(`«modo» debe ser ${Object.keys(MODOS).join(' o ')} (recibido: ${JSON.stringify(spec.modo)})`);
  if (spec.modelo !== undefined && !(typeof spec.modelo === 'string' && MODELO.test(spec.modelo))) errores.push('«modelo» debe ser un nombre de modelo (letras, números y . : - [ ])');
  if (spec.preparar !== undefined && !texto(spec.preparar)) errores.push('«preparar» debe ser un comando (texto)');
  if (spec.usarApiKey !== undefined && typeof spec.usarApiKey !== 'boolean') errores.push('«usarApiKey» debe ser true o false');
  if (spec.umbrales !== undefined && !(isObj(spec.umbrales) && (spec.umbrales.maxRegresiones === undefined || (Number.isInteger(spec.umbrales.maxRegresiones) && spec.umbrales.maxRegresiones >= 0)))) errores.push('«umbrales» debe ser { "maxRegresiones": entero ≥ 0 }');
  const tareas = [];
  if (!Array.isArray(spec.tareas)) errores.push(`«tareas» debe ser un arreglo de tareas (recibido: ${tipo(spec.tareas)})`);
  else if (!spec.tareas.length) errores.push('«tareas» está vacío: define al menos una tarea');
  else {
    const vistos = new Set();
    spec.tareas.forEach((t, i) => {
      const id = `tarea ${i + 1}${isObj(t) && texto(t.nombre) ? ` («${t.nombre}»)` : ''}`;
      if (!isObj(t)) { errores.push(`${id}: debe ser un objeto (recibido: ${tipo(t)})`); return; }
      if (!texto(t.nombre)) errores.push(`${id}: falta «nombre»`);
      else if (vistos.has(t.nombre)) errores.push(`${id}: «nombre» repetido`);
      else vistos.add(t.nombre);
      if (!texto(t.pedido)) errores.push(`${id}: falta «pedido» (texto)`);
      if (t.timeoutMin !== undefined && !(typeof t.timeoutMin === 'number' && Number.isFinite(t.timeoutMin) && t.timeoutMin > 0)) errores.push(`${id}: «timeoutMin» debe ser un número positivo`);
      if (t.maxTurnos !== undefined && !(Number.isInteger(t.maxTurnos) && t.maxTurnos > 0)) errores.push(`${id}: «maxTurnos» debe ser un entero positivo`);
      let a = t.aceptacion;
      if (t.verificar !== undefined && a !== undefined) errores.push(`${id}: usa solo «aceptacion» («verificar» es el formato viejo)`);
      else if (t.verificar !== undefined) {
        if (!texto(t.verificar)) errores.push(`${id}: «verificar» debe ser un comando (texto)`);
        else avisos.push(`${id}: «verificar» está obsoleto; usa "aceptacion": { "comando": … }`);
        a = { comando: t.verificar };
      } else if (a === undefined) errores.push(`${id}: falta el criterio de aceptación «aceptacion»: { "comando": "…" }`);
      else if (!isObj(a)) errores.push(`${id}: «aceptacion» debe ser un objeto { "comando", "archivos"?, "dir"? }`);
      else {
        if (!texto(a.comando)) errores.push(`${id}: «aceptacion.comando» es obligatorio (texto)`);
        if (a.archivos !== undefined && !(Array.isArray(a.archivos) && a.archivos.every(f => texto(f) && !path.isAbsolute(f) && !/^[a-z]:/i.test(f) && !f.split(/[\\/]/).includes('..')))) errores.push(`${id}: «aceptacion.archivos» debe ser una lista de rutas relativas al proyecto (sin «..»)`);
        if (a.dir !== undefined) {
          const abs = texto(a.dir) ? path.resolve(path.dirname(file), a.dir) : null;
          const rel = abs && project ? path.relative(project, abs) : '..';
          if (!abs) errores.push(`${id}: «aceptacion.dir» debe ser una ruta (texto)`);
          else if (!fs.statSync(abs, { throwIfNoEntry: false })?.isDirectory()) errores.push(`${id}: «aceptacion.dir» no existe o no es carpeta: ${a.dir}`);
          else if (!rel || (!rel.startsWith('..') && !path.isAbsolute(rel))) errores.push(`${id}: «aceptacion.dir» debe estar fuera del proyecto (dentro, el agente la vería)`);
        }
      }
      tareas.push({ ...t, aceptacion: a });
    });
  }
  return { errores, avisos, raw, spec: { ...spec, cliente, modo, tareas } };
}

const git = (args, cwd, enc = 'utf8') => spawnSync('git', args, { cwd, encoding: enc, windowsHide: true, timeout: 60000, maxBuffer: 16 * 1024 * 1024 });
function gitInfo(project) {
  const head = git(['rev-parse', 'HEAD'], project), st = git(['status', '--porcelain'], project);
  return { commit: head.status === 0 ? head.stdout.trim() : null, arbolLimpio: st.status === 0 ? !st.stdout.trim() : null, nota: 'se evalúa lo commiteado' };
}
/** Configuración del harness que se evalúa: la commiteada (es la que llega a la copia). */
function hashConfig(project) { const r = git(['show', 'HEAD:.sdd/harness.json'], project, 'buffer'); return r.status === 0 && r.stdout && r.stdout.length ? sha256(r.stdout) : null; }
function versionHarness() { try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version || null; } catch { return null; } }

/** Copia el contenido de una carpeta sobre otra (reemplaza lo que el agente haya dejado con el mismo nombre). */
function copiar(src, dst) {
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const a = path.join(src, e.name), b = path.join(dst, e.name);
    const actual = fs.lstatSync(b, { throwIfNoEntry: false });
    if (e.isDirectory()) {
      if (actual && !actual.isDirectory()) fs.rmSync(b, { recursive: true, force: true });
      fs.mkdirSync(b, { recursive: true });
      copiar(a, b);
    } else if (e.isFile()) {
      if (actual) fs.rmSync(b, { recursive: true, force: true });
      fs.copyFileSync(a, b);
    }
  }
}

/** Un turno del cliente: ejecuta, interpreta la salida y explica por qué falló (o null si terminó bien). */
async function turno(cli, spec, t, dir, env, input, resume) {
  const min = t.timeoutMin || 30;
  const r = await lanzar(cli.bin(), cli.args(spec, t, { resume }), { cwd: dir, env, input, timeoutMs: min * 60000 });
  const p = cli.parse(r.stdout);
  let motivo = null;
  if (r.error) motivo = `no arrancó (${r.error.code === 'ENOENT' ? `no se encontró ${cli.bin()}` : r.error.message})`;
  else if (r.timedOut) motivo = `excedió el tiempo límite (${min} min)`;
  else if (!p.json && (r.code === 127 || r.code === 9009 || NO_EXISTE.test(r.stderr))) motivo = 'no arrancó (el ejecutable no existe o no está en el PATH)';
  else if (p.json && p.error) motivo = `el cliente informó un error (${p.error})`;
  else if (r.code !== 0) motivo = r.signal ? `terminó por la señal ${r.signal}` : `salió con código ${r.code}${p.json ? '' : ' y su salida no es JSON'}`;
  else if (!p.json) motivo = 'su salida no es JSON válido';
  return { r, p, motivo, evidencia: { codigo: r.code, timeout: r.timedOut, jsonValido: !!p.json, salida: cola(junta(r.stderr, p.json ? p.texto : r.stdout)) } };
}

/** El agente completo: uno o dos turnos (en modo flujo responde «sí» a la pregunta del GATE una vez). */
async function agente(cli, spec, t, dir, env) {
  const turnos = [await turno(cli, spec, t, dir, env, t.pedido, null)];
  const [primero] = turnos;
  let intervencion = 0;
  if (!primero.motivo && spec.modo === 'flujo' && GATE_QUESTION.test(primero.p.texto)) {
    intervencion = 1;
    if (!primero.p.sesion) primero.motivo = 'dejó la pregunta del GATE pero no informó session_id para continuar';
    else turnos.push(await turno(cli, spec, t, dir, env, 'sí', primero.p.sesion));
  }
  const suma = k => (turnos.every(x => x.p.json && x.p[k] != null) ? turnos.reduce((s, x) => s + x.p[k], 0) : null);
  const motivos = turnos.map((x, i) => x.motivo && (turnos.length > 1 ? `turno ${i + 1}: ${x.motivo}` : x.motivo)).filter(Boolean);
  return { motivo: motivos[0] || null, intervencion, ms: turnos.reduce((s, x) => s + x.r.ms, 0), turnos: suma('turnos'), tokens: medido(suma('tokens')), costoUsd: medido(suma('costoUsd')), evidencia: turnos.map(x => x.evidencia) };
}

/** Ejecuta una tarea en una copia temporal (siempre se borra) y la clasifica según el contrato de resultados. */
async function ejecutar(t, repeticion, { spec, project, cli, file }) {
  const res = { nombre: t.nombre, repeticion, estado: 'fallido', causa: 'infraestructura', motivo: '', segundos: 0, turnos: null, tokens: SIN_DATO, costoUsd: SIN_DATO, reintentos: 0, intervencion: 0, aceptacionModificada: false, evidencia: {} };
  const fin = (estado, causa, motivo) => Object.assign(res, { estado, causa, motivo });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-eval-'));
  TEMPORALES.add(dir);
  try {
    const clone = spawnSync('git', ['clone', '--quiet', '--local', '--no-hardlinks', '--', project, dir], { encoding: 'utf8', windowsHide: true, timeout: 10 * 60000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
    if (clone.status !== 0) {
      res.evidencia.infraestructura = cola(clone.stderr || (clone.error && clone.error.message));
      return fin('fallido', 'infraestructura', `no se pudo clonar el proyecto${res.evidencia.infraestructura ? `: ${res.evidencia.infraestructura.split('\n')[0]}` : ''}`);
    }
    // Aceptación independiente: los archivos protegidos se guardan tal como están en lo commiteado, antes del agente.
    const protegidos = [];
    for (const rel of t.aceptacion.archivos || []) {
      const p = path.join(dir, rel);
      let buf;
      try { buf = fs.readFileSync(p); } catch { return fin('fallido', 'infraestructura', `el archivo de aceptación ${rel} no existe en lo commiteado del proyecto`); }
      protegidos.push({ rel, p, buf, hash: sha256(buf) });
    }
    if (spec.modo === 'sin-gate') { // sin usuario que apruebe: GATE apagado (solo en la copia)
      const cfgFile = path.join(dir, '.sdd', 'harness.json');
      let cfg = {};
      try { cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8')); } catch { /* sin config */ }
      fs.mkdirSync(path.dirname(cfgFile), { recursive: true });
      fs.writeFileSync(cfgFile, JSON.stringify({ ...(isObj(cfg) ? cfg : {}), gate: 'nunca' }, null, 2));
    }
    if (spec.preparar) {
      const p = await exec(spec.preparar, [], { cwd: dir, env: entornoComandos(), timeoutMs: 30 * 60000, shell: true });
      if (p.error || p.timedOut || p.code !== 0) {
        res.evidencia.infraestructura = cola(junta(p.stdout, p.stderr, p.error && p.error.message));
        return fin('fallido', 'infraestructura', `falló «preparar» (${p.timedOut ? 'excedió 30 min' : `código ${p.code}`})`);
      }
    }
    const ag = await agente(cli, spec, t, dir, spec.usarApiKey ? { ...process.env } : sinApiKey(process.env));
    Object.assign(res, { segundos: Math.round(ag.ms / 1000), turnos: ag.turnos, tokens: ag.tokens, costoUsd: ag.costoUsd, intervencion: ag.intervencion });
    res.evidencia.agente = ag.evidencia;
    if (ag.motivo) return fin('fallido', 'agente', ag.motivo);
    // Lo protegido vuelve a su original (si el agente lo tocó, la tarea falla) y recién ahora llega la aceptación oculta.
    const tocados = [];
    for (const f of protegidos) {
      let ahora = null;
      try { ahora = fs.readFileSync(f.p); } catch { /* borrado o reemplazado */ }
      if (ahora && sha256(ahora) === f.hash) continue;
      tocados.push(f.rel);
      fs.rmSync(f.p, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(f.p), { recursive: true });
      fs.writeFileSync(f.p, f.buf);
    }
    res.aceptacionModificada = tocados.length > 0;
    if (t.aceptacion.dir) copiar(path.resolve(path.dirname(file), t.aceptacion.dir), dir);
    const a = await exec(t.aceptacion.comando, [], { cwd: dir, env: entornoComandos(), timeoutMs: ACEPTACION_MIN * 60000, shell: true });
    res.evidencia.aceptacion = { codigo: a.code, timeout: a.timedOut, salida: cola(junta(a.stdout, a.stderr)) };
    if (tocados.length) return fin('fallido', 'aceptacion', `el agente modificó archivos de aceptación (restaurados antes de verificar): ${tocados.join(', ')}`);
    if (a.error || a.timedOut || a.code === 127 || a.code === 9009 || (a.code !== 0 && NO_EXISTE.test(a.stderr))) return fin('no_verificado', 'aceptacion', a.timedOut ? `el comando de aceptación excedió ${ACEPTACION_MIN} min` : 'no se pudo ejecutar el comando de aceptación (¿herramienta ausente?)');
    if (a.code !== 0) return fin('fallido', 'aceptacion', `el comando de aceptación falló (${a.signal ? `señal ${a.signal}` : `código ${a.code}`})`);
    return fin('aprobado', null, '');
  } catch (e) {
    return fin('fallido', 'infraestructura', `error del evaluador: ${redact(e.message)}`);
  } finally {
    borrar(dir);
  }
}

function resumir(rs) {
  const porEstado = Object.fromEntries(ESTADOS.map(e => [e, 0]));
  const porCausa = {};
  for (const r of rs) { porEstado[r.estado]++; if (r.causa) porCausa[r.causa] = (porCausa[r.causa] || 0) + 1; }
  const prom = f => { const v = rs.map(f).filter(x => typeof x === 'number'); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  return { aprobadas: porEstado.aprobado, total: rs.length, porEstado, porCausa, promedios: { tokens: prom(r => r.tokens.valor), turnos: prom(r => r.turnos), costoUsd: prom(r => r.costoUsd.valor) } };
}

// Solo se comparan corridas con el mismo dataset, cliente, modelo, modo y configuración del harness.
const CLAVES = [['dataset', e => e.dataset && e.dataset.hash], ['cliente', e => e.cliente && e.cliente.nombre], ['modelo', e => e.cliente && e.cliente.modelo], ['modo', e => e.modo], ['config del harness', e => e.harness && e.harness.hashConfig]];
const corto = v => (v == null ? 'ninguno' : /^[0-9a-f]{64}$/.test(v) ? v.slice(0, 12) : v);
const diferencias = (a, b) => CLAVES.filter(([, f]) => (f(a) ?? null) !== (f(b) ?? null)).map(([k, f]) => `${k}: ${corto(f(a))} → ${corto(f(b))}`);
/** Tareas aprobadas en todas sus repeticiones. */
function aprobadasDe(rs) {
  const m = new Map();
  for (const r of rs || []) m.set(r.nombre, (m.get(r.nombre) ?? true) && r.estado === 'aprobado');
  return new Set([...m].filter(([, ok]) => ok).map(([k]) => k));
}

const linea = r => `${SIMBOLO[r.estado]} ${ETIQUETA[r.estado]}${r.causa ? ` [${r.causa}]` : ''}${r.motivo ? `: ${r.motivo}` : ''}`;

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.errores.length) { console.error(USO); for (const e of o.errores) console.error(`  - ${e}`); return 2; }
  const v = validar(o.file);
  for (const a of v.avisos) console.warn(`Aviso: ${a}`);
  if (v.errores.length) { console.error(`Archivo de tareas inválido: ${o.file}`); for (const e of v.errores) console.error(`  - ${e}`); return 2; }
  const { spec } = v;
  const hash = sha256(v.raw);
  const dataset = { version: spec.version || hash.slice(0, 12), hash };
  if (o.validar) { console.log(`Archivo de tareas válido: ${spec.tareas.length} tarea(s) · cliente ${spec.cliente} · modo ${spec.modo} · dataset ${dataset.version}.`); return 0; }

  const project = path.resolve(path.dirname(o.file), spec.proyecto);
  const proyecto = gitInfo(project);
  const limites = { maxTareas: o.maxTareas ?? null, maxCostoUsd: o.maxCostoUsd ?? null, maxMinutos: o.maxMinutos ?? null };
  const lim = [limites.maxTareas && `máx. ${limites.maxTareas} ejecuciones`, limites.maxCostoUsd && `máx. US$ ${limites.maxCostoUsd}`, limites.maxMinutos && `máx. ${limites.maxMinutos} min`].filter(Boolean);
  console.log(`Evaluación: ${o.file}`);
  console.log(`  Proyecto: ${project} — se evalúa lo commiteado (${proyecto.commit ? `HEAD ${proyecto.commit.slice(0, 12)}${proyecto.arbolLimpio === false ? '; hay cambios sin commitear que NO se evalúan' : ''}` : 'no se pudo leer el commit: ¿es un repositorio git?'})`);
  console.log(`  Dataset:  versión ${spec.version || '(sin «version»: se usa el hash)'} · sha256 ${hash.slice(0, 12)}`);
  console.log(`  Cliente:  ${spec.cliente} · modelo ${spec.modelo || 'por defecto del cliente'} · modo ${spec.modo} (${MODOS[spec.modo]})`);
  console.log(`  Tareas:   ${spec.tareas.map(t => t.nombre).join(', ')}${o.repeticiones > 1 ? ` × ${o.repeticiones} repeticiones` : ''} = ${spec.tareas.length * o.repeticiones} ejecución(es)`);
  console.log(`  Límites:  ${lim.length ? lim.join(' · ') : 'sin presupuesto global (cada tarea: maxTurnos y timeoutMin)'}`);
  if (!o.confirmar) {
    console.error('\nNo se ejecutó nada: cada tarea lanza la IA en modo no interactivo y consume tokens de tu plan.');
    console.error('Para correrla, repite el comando agregando --confirmar.');
    return 2;
  }

  const cli = CLIENTES[spec.cliente];
  const run = { v: 2, fecha: new Date().toISOString(), lineaBase: !!o.lineaBase, dataset, proyecto, harness: { version: versionHarness(), hashConfig: hashConfig(project) }, cliente: { nombre: spec.cliente, version: await cli.version(), modelo: spec.modelo || null }, modo: spec.modo, repeticiones: o.repeticiones, limites, resultados: [] };
  console.log(`\nCliente ${run.cliente.nombre} ${run.cliente.version || '(versión desconocida)'}\n`);
  const ctx = { spec, project, cli, file: o.file };
  const t0 = Date.now();
  let costo = 0, ejecutadas = 0, sinCosto = false;
  for (let i = 1; i <= o.repeticiones; i++) {
    for (const t of spec.tareas) {
      const etiqueta = `• ${t.nombre}${o.repeticiones > 1 ? ` (#${i})` : ''}… `;
      const min = (Date.now() - t0) / 60000;
      const tope = limites.maxTareas != null && ejecutadas >= limites.maxTareas ? `se alcanzó --max-tareas=${limites.maxTareas}`
        : limites.maxCostoUsd != null && costo >= limites.maxCostoUsd ? `costo acumulado ${usd(costo)} ≥ --max-costo-usd=${limites.maxCostoUsd}`
          : limites.maxMinutos != null && min >= limites.maxMinutos ? `pasaron ${Math.floor(min)} min ≥ --max-minutos=${limites.maxMinutos}` : null;
      let r;
      if (tope) {
        r = { nombre: t.nombre, repeticion: i, estado: 'bloqueado', causa: 'presupuesto', motivo: `no se ejecutó: ${tope}`, segundos: 0, turnos: null, tokens: SIN_DATO, costoUsd: SIN_DATO, reintentos: 0, intervencion: 0, aceptacionModificada: false, evidencia: {} };
        process.stdout.write(etiqueta);
      } else {
        process.stdout.write(etiqueta);
        ejecutadas++;
        r = await ejecutar(t, i, ctx);
        if (r.costoUsd.fuente === 'medido') costo += r.costoUsd.valor;
        else if (r.evidencia.agente) sinCosto = true;
      }
      run.resultados.push(r);
      console.log(linea(r));
      const ev = r.causa === 'aceptacion' ? r.evidencia.aceptacion && r.evidencia.aceptacion.salida
        : r.causa === 'agente' ? r.evidencia.agente && r.evidencia.agente[r.evidencia.agente.length - 1].salida : r.evidencia.infraestructura;
      if (ev) console.log(ev.split('\n').slice(-5).map(l => `    │ ${l}`).join('\n'));
    }
  }
  if (sinCosto && limites.maxCostoUsd != null) console.warn('Aviso: el cliente no informó el costo de alguna tarea; --max-costo-usd solo sumó el costo informado.');

  const res = run.resumen = resumir(run.resultados);
  const detalle = ESTADOS.filter(e => e !== 'aprobado' && res.porEstado[e]).map(e => {
    const c = {};
    for (const r of run.resultados.filter(x => x.estado === e)) c[r.causa] = (c[r.causa] || 0) + 1;
    return `${ETIQUETA[e]}: ${res.porEstado[e]} (${Object.entries(c).map(([k, x]) => `${k} ${x}`).join(', ')})`;
  });
  console.log(`\nResultado: ${res.aprobadas}/${res.total} aprobadas${detalle.length ? ` · ${detalle.join(' · ')}` : ''}`);
  console.log(`Promedios (solo lo medido): tokens ${n(res.promedios.tokens)} · turnos ${n(res.promedios.turnos)} · costo ${usd(res.promedios.costoUsd)}`);

  const histFile = `${o.file.replace(/\.json$/i, '')}.resultados.json`;
  let hist = [], histOut = histFile;
  if (fs.existsSync(histFile)) {
    try { hist = JSON.parse(fs.readFileSync(histFile, 'utf8')); if (!Array.isArray(hist)) throw new Error('no es un arreglo'); } catch (e) {
      hist = []; histOut = histFile.replace(/\.json$/i, `.${Date.now()}.json`);
      console.warn(`Aviso: el historial ${histFile} no se pudo leer (${e.message}); no se sobrescribe y esta corrida se guarda en ${histOut}.`);
    }
  }
  const v2 = hist.filter(e => isObj(e) && e.v === 2);
  const compatibles = v2.filter(e => !diferencias(e, run).length);
  const prev = compatibles[compatibles.length - 1] || null;
  if (prev) {
    const p = prev.resumen || {}, pp = p.promedios || {};
    console.log(`Comparada con ${prev.fecha}: aprobadas ${p.aprobadas}/${p.total} → ${res.aprobadas}/${res.total} · tokens prom. ${n(pp.tokens)} → ${n(res.promedios.tokens)} · costo prom. ${usd(pp.costoUsd)} → ${usd(res.promedios.costoUsd)}`);
  } else console.log(`Sin corrida comparable: ${!hist.length ? 'es la primera corrida de este archivo' : !v2.length ? 'el historial solo tiene corridas del formato anterior' : diferencias(v2[v2.length - 1], run).join('; ')}`);
  const base = [...compatibles].reverse().find(e => e.lineaBase === true) || null;
  const ahora = aprobadasDe(run.resultados);
  const regresiones = base ? [...aprobadasDe(base.resultados)].filter(x => !ahora.has(x)) : [];
  const maxRegresiones = (spec.umbrales && spec.umbrales.maxRegresiones) ?? 0;
  if (base) console.log(regresiones.length ? `Regresiones contra la línea base del ${base.fecha} (${regresiones.length}; tolerancia ${maxRegresiones}): ${regresiones.join(', ')}` : `Sin regresiones contra la línea base del ${base.fecha}.`);
  else console.log(`Sin línea base compatible${o.lineaBase ? '' : ': marca una corrida con --linea-base para detectar regresiones'}.`);
  if (o.lineaBase) console.log('Esta corrida queda como línea base.');
  Object.assign(run, { comparadaCon: prev ? prev.fecha : null, lineaBaseUsada: base ? base.fecha : null, regresiones });
  fs.writeFileSync(histOut, JSON.stringify([...hist, run], null, 2));
  console.log(`Historial: ${histOut}`);

  if (run.resultados.some(r => r.causa === 'infraestructura')) return 3;
  if (run.resultados.some(r => r.estado !== 'aprobado') || regresiones.length > maxRegresiones) return 1;
  return 0;
}

main().then(code => { process.exitCode = code; }, e => { console.error(`Error inesperado del evaluador: ${redact(e && e.message)}`); process.exitCode = 3; });
