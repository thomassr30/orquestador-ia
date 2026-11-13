#!/usr/bin/env node
// Diagnóstico del harness SDD (solo lectura, salvo que "sensores" ejecuta los chequeos del proyecto).
// Uso:
//   node sdd-harness.js estado   [ruta] [--json]   GATE, archivos modificados y últimos sensores de este proyecto
//                                          con --json: contrato público del estado (lo consume la extensión de VS Code)
//   node sdd-harness.js doctor   [ruta] [--json]   evidencia por cliente (configuración, hook, prueba sintética, eventos reales),
//                                          capacidades y límites, estado del harness y sensores detectados
//   node sdd-harness.js sensores [ruta]   ejecuta ahora los sensores sobre lo modificado (git status)
//   node sdd-harness.js registro [n]      últimas decisiones del harness en este proyecto
//   node sdd-harness.js trabajo preguntas  dudas abiertas, listas para que TÚ las publiques (el harness no escribe en el gestor)
//   node sdd-harness.js worktree listar | nuevo <rama> [--desde develop] [--ruta …] | sincronizar [--confirmar] | cerrar <rama|ruta> [--confirmar]
//                                          una carpeta por tarea, cada una con su rama: varias ventanas sin pisarse
//   node sdd-harness.js aprobar  [ruta]   (tú, desde tu terminal) aprueba el plan pendiente de la última sesión
//   node sdd-harness.js consumo  [ruta]   en qué se fueron los tokens de la última sesión (Claude Code)
//   node sdd-harness.js reglas   [ruta]   revisa TODO el proyecto contra las reglas propias (harness.json → reglas)
//   node sdd-harness.js workspace [ruta] [--aplicar]   proyectos del espacio de trabajo; con --aplicar da acceso a las carpetas extra (Claude Code, Codex)
//   node sdd-harness.js puntos            puntos de restauración del proyecto actual (uno antes de cada turno que modificó archivos)
//   node sdd-harness.js deshacer [n|id] [--confirmar]   muestra qué volvería atrás; con --confirmar deja los archivos como en ese punto
//   node sdd-harness.js excepcion [control…] --motivo "por qué"   (tú, desde tu terminal) acepta controles fallidos o sin verificar
//                                                                  de la última verificación; vale solo para ese contenido
//   node sdd-harness.js linea-base [ruta]  toma la línea base de errores sobre el último commit (sin cambios de código)
//   node sdd-harness.js perfil [listar] | perfil aplicar <nombre> [--ruta …] [--confirmar] [--forzar]
//                                          configuración de IA de un repo concreto (perfiles/<nombre>): vista previa y, con --confirmar, la aplica
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SRC = path.join(__dirname, '..', 'harness', 'src');
const { findProjectRoot, relPosix } = require(path.join(SRC, 'util'));
const { loadConfig } = require(path.join(SRC, 'config'));
const S = require(path.join(SRC, 'state'));
const { plan, runSensors, summarize, takeBaseline, validBaseline, CODE_EXT } = require(path.join(SRC, 'sensors'));
const V = require(path.join(SRC, 'verificacion'));
const { ETIQUETA, SIMBOLO, idControl } = require(path.join(SRC, 'resultado'));
const { HOME, SDD_HOME, fwd } = require(path.join(SRC, 'paths'));

const argv = process.argv.slice(2);
// Opciones con valor: --motivo "x", --json '{…}', --archivo ruta, --responsable nombre (también --opcion=valor)
// --json lleva valor solo en «trabajo plan --json '{…}'»; en doctor es una bandera (salida para máquinas)
const VALUED = ['--motivo', '--archivo', '--responsable', '--explicar', '--sesion', '--para', '--donde', '--tarea', '--respuesta', '--desde', '--ruta', ...(argv[0] === 'trabajo' ? ['--json'] : [])];
const opt = name => { const i = argv.indexOf(name); if (i >= 0) return argv[i + 1]; const eq = argv.find(a => a.startsWith(`${name}=`)); return eq ? eq.slice(name.length + 1) : undefined; };
const motivo = opt('--motivo') || '';
const positional = argv.filter((a, i) => !a.startsWith('--') && !VALUED.includes(argv[i - 1]));
const flags = new Set(argv.filter(a => a.startsWith('--')));
const [cmd = 'estado', arg] = positional;
const root = findProjectRoot(cmd === 'perfil' ? (opt('--ruta') || process.cwd()) : ['registro', 'eventos', 'puntos', 'deshacer', 'excepcion', 'excepción', 'trabajo'].includes(cmd) ? process.cwd() : (arg || process.cwd()));
const spaceLine = () => {
  try {
    const W = require(path.join(SRC, 'workspace'));
    const ws = W.load(root);
    return W.isMulti(ws) ? `Espacio de trabajo: ${ws.proyectos.length} proyecto(s) — ${ws.proyectos.slice(0, 8).map(p => p.nombre).join(', ')}${ws.proyectos.length > 8 ? '…' : ''}${ws.carpetas.length > 1 ? ` · ${ws.carpetas.length} carpetas` : ''} (detalle: sdd-harness.js workspace)` : '';
  } catch { return ''; }
};
const GATE = { inicial: 'sin cambio en curso', requerido: 'pedido de cambio: plan sin presentar (ediciones bloqueadas)', pendiente: 'plan presentado: esperando tu aprobación (ediciones bloqueadas)', aprobado: 'plan aprobado: puede implementar', libre: 'pedido directo (sin plan)' };

function changedFiles() {
  const r = spawnSync('git', ['-C', root, 'status', '--porcelain', '--untracked-files=all'], { encoding: 'utf8' });
  if (r.status === 0) return r.stdout.split('\n').filter(Boolean).map(l => l.slice(3).replace(/^.* -> /, '').replace(/^"|"$/g, '')).filter(f => !f.startsWith('.sdd/'));
  const last = S.listSessions(root)[0];
  return last ? last.cambios.filter(f => !f.startsWith('.sdd/')) : [];
}

/**
 * Estado de la sesión en JSON: contrato público y estable para integraciones (la extensión de VS Code y
 * cualquier panel propio), para que nadie tenga que leer los archivos internos del estado. No expone prompts
 * ni contenido de archivos: el mensaje del usuario y el objetivo vienen ya recortados y redactados por el
 * estado. «v» sube solo si la forma cambia de manera incompatible.
 */
function estadoJson() {
  const G = require(path.join(SRC, 'gate'));
  const sessions = S.listSessions(root);
  const cfg = loadConfig(root);
  const s = sessions.find(x => !x.danado) || sessions[0] || null;
  const version = f => { try { return require(f).version || null; } catch { return null; } };
  const instalado = () => { try { return JSON.parse(fs.readFileSync(path.join(SDD_HOME, 'manifest.json'), 'utf8')).version || null; } catch { return null; } };
  let espacio = null;
  try {
    const W = require(path.join(SRC, 'workspace'));
    const ws = W.load(root);
    if (W.isMulti(ws)) espacio = { raiz: fwd(ws.raiz), proyectos: ws.proyectos.map(x => ({ nombre: x.nombre, ruta: fwd(x.ruta) })) };
  } catch { espacio = null; }
  let trabajo = null;
  try {
    const T = require(path.join(SRC, 'trabajo'));
    const st = T.status(root);
    if (st && st.problema) trabajo = { problema: st.problema };
    else if (st) trabajo = {
      estado: st.estado,
      tecnico: st.tecnico,
      objetivo: st.trabajo.objetivo || '',
      congelado: st.trabajo.congelado ? st.trabajo.congelado.en : null,
      tareas: st.tareas.map(x => ({ id: x.id, titulo: x.titulo, estado: x.estado, motivo: x.motivo || '' })),
      preguntas: (st.preguntas || []).map(q => ({ id: q.id, texto: q.texto, para: q.para || '', donde: q.donde || '', estado: q.estado })),
      faltan: st.faltan,
    };
  } catch { trabajo = null; }
  const lb = validBaseline(root);
  const sens = s && !s.danado ? s.sensores : null;
  const apr = s && !s.danado && s.aprobaciones ? s.aprobaciones : { pendientes: [], aprobadas: [] };
  const etiqueta = x => ({ id: x.id, tipo: x.tipo || null, etiqueta: x.etiqueta || x.clave || '', vence: x.vence || null });
  return {
    v: 1,
    generado: new Date().toISOString(),
    proyecto: { ruta: fwd(root), nombre: path.basename(root) },
    espacio,
    harness: { repo: version(path.join(__dirname, '..', 'package.json')), instalado: instalado(), sddHome: fwd(SDD_HOME), estadoDir: fwd(S.projectDir(root)) },
    config: { gate: cfg.gate, modo: cfg.modo, presupuesto: cfg.presupuesto, problemas: cfg.problemas || [] },
    sesiones: sessions.length,
    sesion: s ? { id: s.sesion, herramienta: s.herramienta || null, actualizado: s.actualizado || null, turno: s.turno || 0, danado: !!s.danado, compactado: !!s.compactado, recuperacion: s.recuperacion || null } : null,
    gate: s && !s.danado ? {
      estado: s.gate.estado,
      desde: s.gate.desde || null,
      via: s.gate.via || null,
      sdd: s.sdd === 'off' ? 'off' : 'on',
      bloqueaEdiciones: !!G.editBlockReason(s, cfg),
      mensajeUsuario: s.mensajeUsuario || '',
      objetivo: s.objetivo || '',
    } : null,
    cambios: s && !s.danado ? s.cambios.filter(f => !f.startsWith('.sdd/')) : [],
    sucio: !!(s && !s.danado && s.sucio),
    punto: s && !s.danado && s.punto ? { id: s.punto.id || null, en: s.punto.en || null, error: !!s.punto.error } : null,
    sensores: sens ? {
      estado: sens.estado || null,
      ok: !!sens.ok,
      motivo: sens.motivo || '',
      en: sens.en || null,
      pausado: !!sens.pausado,
      huella: sens.huella || null,
      controles: (sens.resumen || []).map(r => ({ control: idControl(r), nombre: r.nombre, modulo: r.modulo || '.', estado: r.estado, obligatorio: !!r.obligatorio, motivo: r.motivo || '', ms: r.ms || 0 })),
    } : null,
    excepciones: s && !s.danado && s.excepciones ? s.excepciones.map(e => ({ control: e.control, en: e.en, motivo: e.motivo || '' })) : [],
    lineaBase: lb.lb ? { commit: lb.lb.commit, en: lb.lb.en, motivo: null } : { commit: null, en: null, motivo: lb.motivo },
    subagentes: s && !s.danado && s.subagentes ? { lanzados: s.subagentes.lanzados || 0, libre: !!s.subagentes.libre } : null,
    aprobaciones: { pendientes: (apr.pendientes || []).map(etiqueta), vigentes: (apr.aprobadas || []).map(etiqueta) },
    consumo: s && !s.danado && s.consumo ? s.consumo : null,
    trabajo,
  };
}

function estado() {
  if (flags.has('--json')) { console.log(JSON.stringify(estadoJson(), null, 2)); return; }
  const sessions = S.listSessions(root);
  console.log(`Proyecto: ${fwd(root)}`);
  const sl = spaceLine(); if (sl) console.log(sl);
  if (!sessions.length) { console.log('Sin actividad registrada del harness en este proyecto.'); return; }
  const s = sessions[0];
  if (s.danado) { console.log(`Última sesión: ${s.sesion} — estado DAÑADO (ilegible). El próximo evento lo recupera en modo restrictivo (plan por aprobar, sin confirmaciones vigentes).`); return; }
  console.log(`Última sesión: ${s.sesion} (${s.herramienta || '—'}) · actualizada ${String(s.actualizado || '').replace('T', ' ').slice(0, 16)}`);
  if (s.recuperacion) console.log(`Estado recuperado el ${String(s.recuperacion.en).slice(0, 16).replace('T', ' ')}: ${s.recuperacion.motivo} (modo restrictivo)`);
  const problemas = loadConfig(root).problemas || [];
  for (const p of problemas) console.log(`Configuración con problemas: ${p}`);
  console.log(`GATE: ${GATE[s.gate.estado] || s.gate.estado}${s.sdd === 'off' ? ' · orquestador DESACTIVADO en esta conversación ("con sdd" lo reactiva)' : ''}`);
  if (s.mensajeUsuario) console.log(`Tu último mensaje, según el harness: «${s.mensajeUsuario}»${s.gate.via ? ` · aprobado desde ${s.gate.via}` : ''}`);
  const files = s.cambios.filter(f => !f.startsWith('.sdd/'));
  console.log(`Archivos modificados: ${files.length ? files.join(', ') : '—'}`);
  if (s.punto) console.log(`Último punto de restauración: ${s.punto.error ? 'no se pudo guardar (ver doctor)' : `${s.punto.id} · deshacer con: sdd-harness.js deshacer`}`);
  const sens = s.sensores;
  const verdict = !sens ? 'sin ejecutar' : sens.estado
    ? `${ETIQUETA[sens.estado]}${sens.motivo ? ` (${sens.motivo})` : ''}${sens.resumen && sens.resumen.length ? ` — ${sens.resumen.map(r => `${SIMBOLO[r.estado] || '•'} ${idControl(r)}`).join(' · ')}` : ''}`
    : `${sens.ok ? 'en verde' : 'con errores'} (formato anterior)`;
  console.log(`Verificación: ${verdict}${s.sucio ? ' · hay cambios sin verificar' : ''}${sens && sens.pausado ? ' · el harness dejó de insistir: sigue pendiente hasta que cambien los archivos o autorices una excepción (sdd-harness.js excepcion)' : ''}`);
  if ((s.excepciones || []).length) console.log(`Excepciones autorizadas: ${s.excepciones.map(e => `${e.control} (${String(e.en).slice(0, 10)})`).join(' · ')}`);
  const lb = validBaseline(root);
  console.log(`Línea base de errores: ${lb.lb ? `commit ${lb.lb.commit.slice(0, 8)} (${String(lb.lb.en).slice(0, 10)})` : lb.motivo}`);
  if (s.subagentes) console.log(`Sub-agentes en el último pedido: ${s.subagentes.lanzados}${s.subagentes.libre ? ' (sin tope: aprobaste más)' : ''}`);
  if (s.aprobaciones.pendientes.length) console.log(`Esperando confirmación en el chat: ${s.aprobaciones.pendientes.map((p, i) => `${i + 1}) ${p.etiqueta || p.clave}`).join(' · ')}`);
  if (s.aprobaciones.aprobadas.length) console.log(`Confirmaciones vigentes (un uso): ${s.aprobaciones.aprobadas.map(p => `${p.etiqueta || p.clave}${p.vence ? ` hasta ${p.vence.slice(11, 16)}` : ''}`).join(' · ')}`);
  if (sessions.length > 1) console.log(`Otras sesiones recientes: ${sessions.slice(1, 4).map(x => `${x.sesion} (${x.danado ? 'estado dañado' : `${x.herramienta || '—'}, GATE ${x.gate.estado}`})`).join(', ')}`);
}

// ---------- doctor: evidencia por cliente ----------
// Niveles: (a) configuración encontrada · (b) hook ejecutable · (c) prueba sintética aprobada · (d) eventos reales del cliente.
// La prueba sintética ejecuta el comando EXACTO registrado en cada cliente con payloads simulados (SDD_DOCTOR=1 y estado
// temporal: no cuenta como evento real). Valida Node en el PATH, las comillas de la ruta, el adaptador y el núcleo;
// NO que el cliente real respete la respuesta. Solo (d) dice que el cliente real invoca los hooks (observado.json).
const ATRIBUCION = 'Listo.\n\nCo-Authored-By: Claude <noreply@anthropic.com>';
const HSO = o => [(o.hookSpecificOutput || {}).permissionDecision, (o.hookSpecificOutput || {}).permissionDecisionReason];
const claudeLike = { pre: 'PreToolUse', entrada: (d, c) => ({ session_id: 'doctor', cwd: d, tool_name: 'Bash', tool_input: { command: c } }), decision: HSO, fin: [['Stop', d => ({ session_id: 'doctor', cwd: d, last_assistant_message: ATRIBUCION })]], termina: o => o.decision === 'block' };
const PRUEBAS = {
  claude: claudeLike,
  codex: claudeLike,
  gemini: { pre: 'BeforeTool', entrada: (d, c) => ({ session_id: 'doctor', cwd: d, tool_name: 'run_shell_command', tool_input: { command: c } }), decision: o => [o.decision, o.reason], fin: [['AfterAgent', d => ({ session_id: 'doctor', cwd: d, prompt_response: ATRIBUCION })]], termina: o => o.decision === 'deny' },
  cursor: { pre: 'beforeShellExecution', entrada: (d, c) => ({ conversation_id: 'doctor', workspace_roots: [d], cwd: d, command: c }), decision: o => [o.permission, o.agent_message],
    fin: [['afterAgentResponse', d => ({ conversation_id: 'doctor', workspace_roots: [d], text: ATRIBUCION })], ['stop', d => ({ conversation_id: 'doctor', workspace_roots: [d], status: 'completed' })]], termina: o => !!o.followup_message },
  copilot: { pre: 'preToolUse', entrada: (d, c) => ({ sessionId: 'doctor', cwd: d, toolName: 'bash', toolArgs: { command: c } }), decision: o => [o.permissionDecision, o.permissionDecisionReason], fin: [['agentStop', d => ({ sessionId: 'doctor', cwd: d, lastAssistantMessage: ATRIBUCION })]], termina: o => o.decision === 'block' },
};
const FIN = { bloquea: 'bloquea al terminar', reintenta: 'pide reintentar al terminar', aviso: 'avisa al terminar' };
const ARCHIVOS = () => [
  ['claude', path.join(HOME, '.claude', 'settings.json')],
  ['codex', path.join(process.env.CODEX_HOME || path.join(HOME, '.codex'), 'hooks.json')],
  ['gemini', path.join(HOME, '.gemini', 'settings.json')],
  ['cursor', path.join(HOME, '.cursor', 'hooks.json')],
  ['copilot', path.join(process.env.COPILOT_HOME || path.join(HOME, '.copilot'), 'hooks', 'sdd-orquestador.json')],
  ['opencode', path.join(HOME, '.config', 'opencode', 'plugins', 'sdd-harness.js')],
];

function findCommand(text, ev) {
  const re = /"command"\s*:\s*"((?:[^"\\]|\\.)*sdd-hook\.js(?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(text))) { const c = JSON.parse(`"${m[1]}"`); if (c.trim().endsWith(` ${ev}`)) return c; }
  return null;
}

/** Proyecto y estado temporales para las pruebas sintéticas (sin puntos de restauración ni variables del host). */
function sandboxDoctor() {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'sdd-doctor-'));
  const proj = path.join(dir, 'proyecto');
  fs.mkdirSync(path.join(proj, '.sdd'), { recursive: true });
  fs.writeFileSync(path.join(proj, '.sdd', 'harness.json'), JSON.stringify({ deshacer: { activo: false } }));
  const env = { ...process.env, SDD_HOME: path.join(dir, '.estado'), SDD_DOCTOR: '1' };
  for (const k of ['CLAUDE_PROJECT_DIR', 'GEMINI_PROJECT_DIR', 'GEMINI_SESSION_ID']) delete env[k];
  return { dir, proj, env, fin: () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* temporal */ } } };
}

function ejecutar(cmd, entrada, env) {
  const t0 = Date.now();
  const r = spawnSync(cmd, { shell: true, input: JSON.stringify(entrada), encoding: 'utf8', timeout: 20000, windowsHide: true, env });
  const out = String(r.stdout || '').trim();
  let json = null; try { json = out ? JSON.parse(out) : {}; } catch { json = null; }
  const err = r.error ? r.error.message : r.status === null ? 'sin respuesta (tiempo agotado)' : json === null ? 'la salida no es JSON' : r.status !== 0 && !out ? `terminó con código ${r.status}` : '';
  const why = err && r.stderr ? `: ${String(r.stderr).trim().split('\n')[0]}` : '';
  return { ok: !err, json: json || {}, ms: Date.now() - t0, error: err ? `${err}${why}` : '' };
}

/** (b) y (c) para los clientes con hooks de comando. */
function pruebaComando(id, text, CAP) {
  const p = PRUEBAS[id];
  const mod = CAP.CLIENTES[id].mod;
  if (!findCommand(text, p.pre)) return { ejecutable: false, motivo: `${p.pre} no está registrado` };
  const sb = sandboxDoctor();
  try {
    const run = (ev, entrada) => { const c = findCommand(text, ev); return c ? ejecutar(c, entrada, sb.env) : { ok: false, json: {}, error: `${ev} no está registrado` }; };
    const r1 = run(p.pre, p.entrada(sb.proj, 'gh pr create --title prueba'));
    if (!r1.ok) return { ejecutable: false, motivo: r1.error };
    const deny = p.decision(r1.json)[0] === 'deny';
    // Git de escritura con aprobación nativa del cliente (Codex): el hook no decide; se prueba con otro comando crítico
    const critico = (mod.parse(p.pre, p.entrada(sb.proj, 'x'), {}) || {}).nativeGitAsk ? 'kubectl apply -f k8s/' : 'git push origin main';
    const r2 = run(p.pre, p.entrada(sb.proj, critico));
    const [d2, why2] = p.decision(r2.json);
    const nativa = mod.capacidades.aprobacion === 'nativa';
    const critica = r2.ok && (nativa ? d2 === 'ask' : d2 === 'deny' && /Requiere confirmación/.test(String(why2 || '')));
    let fin = true;
    if (mod.capacidades.finDeTurno !== 'no') {
      let r3 = null;
      for (const [ev, f] of p.fin) { r3 = run(ev, f(sb.proj)); if (!r3.ok) break; }
      fin = !!(r3 && r3.ok && p.termina(r3.json));
    }
    return { ejecutable: true, ms: r1.ms, sintetica: { ok: deny && critica && fin, deny, critica, fin, critico, aprobacion: mod.capacidades.aprobacion, finDeTurno: mod.capacidades.finDeTurno } };
  } finally { sb.fin(); }
}

// OpenCode: el plugin se carga con Node y un cliente falso (como opencode.test.js), en un proceso aparte.
const OC_PRUEBA = `
const out = { carga: false };
const prompts = [];
const client = { session: { messages: async () => ({ data: [{ info: { role: 'assistant' }, parts: [{ type: 'text', text: ${JSON.stringify(ATRIBUCION)} }] }] }), prompt: async x => { prompts.push(x); } } };
try {
  const { pathToFileURL } = await import('node:url');
  const { SddHarness } = await import(pathToFileURL(process.env.SDD_DOCTOR_PLUGIN).href);
  const d = process.env.SDD_DOCTOR_DIR;
  const h = await SddHarness({ client, directory: d, worktree: d });
  out.carga = !!h && typeof h['tool.execute.before'] === 'function';
  if (out.carga) {
    const rej = async (c, id) => { try { await h['tool.execute.before']({ tool: 'bash', sessionID: 'doctor', callID: id }, { args: { command: c } }); return ''; } catch (e) { return String((e && e.message) || e); } };
    out.deny = await rej('gh pr create --title prueba', '1');
    out.critica = await rej('kubectl apply -f k8s/', '2');
    await h.event({ event: { type: 'session.idle', properties: { sessionID: 'doctor' } } });
    await new Promise(r => setTimeout(r, 100));
    out.fin = prompts.length > 0;
  }
} catch (e) { out.error = String((e && e.message) || e); }
console.log(JSON.stringify(out));`;

function pruebaOpenCode(text) {
  const sb = sandboxDoctor();
  try {
    const file = path.join(sb.dir, 'sdd-harness.mjs');
    fs.writeFileSync(file, text);
    const t0 = Date.now();
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', OC_PRUEBA], { encoding: 'utf8', timeout: 20000, windowsHide: true, env: { ...sb.env, SDD_DOCTOR_PLUGIN: file, SDD_DOCTOR_DIR: sb.proj } });
    let o = null; try { o = JSON.parse(String(r.stdout || '').trim().split('\n').pop()); } catch { o = null; }
    if (!o || !o.carga) return { ejecutable: false, motivo: (o && o.error) || (r.error && r.error.message) || String(r.stderr || '').trim().split('\n')[0] || 'el plugin no cargó' };
    const deny = /\[harness\]/.test(o.deny || ''); const critica = /Requiere confirmación/.test(o.critica || ''); const fin = !!o.fin;
    return { ejecutable: true, ms: Date.now() - t0, sintetica: { ok: deny && critica && fin, deny, critica, fin, critico: 'kubectl apply -f k8s/', aprobacion: 'chat', finDeTurno: 'reintenta' } };
  } finally { sb.fin(); }
}

/** (a) Configuración del cliente: hooks del harness registrados según el contrato del adaptador. */
function configuracion(id, text, CAP) {
  const hooks = CAP.CLIENTES[id].mod.capacidades.hooks;
  if (id === 'opencode') {
    if (!text.includes('SddHarness')) return { nuestro: false, ok: false, registrados: [], faltan: hooks, motivo: 'sin el plugin del harness' };
    const m = /const SDD_HOME = '([^']+)'/.exec(text);
    if (m && !fs.existsSync(path.join(m[1], 'harness', 'src', 'core.js'))) return { nuestro: true, ok: false, registrados: [], faltan: [], motivo: `el plugin apunta a ${m[1]}, donde no está el harness` };
    return { nuestro: true, ok: true, registrados: hooks, faltan: [], motivo: '' };
  }
  if (!text.includes('sdd-hook.js')) return { nuestro: false, ok: false, registrados: [], faltan: hooks, motivo: 'sin hooks del harness' };
  const faltan = hooks.filter(ev => !findCommand(text, ev));
  return { nuestro: true, ok: !faltan.length, registrados: hooks.filter(ev => !faltan.includes(ev)), faltan, motivo: faltan.length ? `faltan ${faltan.join(', ')}` : '' };
}

/** Evidencia por cliente, combinada con las capacidades declaradas (capacidades.js). */
function clientes() {
  const CAP = require(path.join(SRC, 'capacidades'));
  const obs = require(path.join(SRC, 'observado')).read();
  const read = file => { try { return fs.readFileSync(file, 'utf8'); } catch { return null; } };
  return ARCHIVOS().map(([id, file]) => {
    const text = read(file);
    const base = { id, nombre: CAP.CLIENTES[id].nombre, archivo: fwd(file), instalado: text !== null };
    if (text === null) return { ...base, falla: false, evaluacion: CAP.evaluar(id, {}, { observado: obs }) };
    const conf = configuracion(id, text, CAP);
    const prueba = conf.nuestro && !(id === 'opencode' && !conf.ok) ? (id === 'opencode' ? pruebaOpenCode(text) : pruebaComando(id, text, CAP)) : null;
    const evaluacion = CAP.evaluar(id, { configuracion: conf.ok, ejecutable: !!(prueba && prueba.ejecutable), sintetica: prueba && prueba.sintetica }, { observado: obs });
    return { ...base, configuracion: conf, prueba, evaluacion, falla: !conf.ok || !prueba || !prueba.ejecutable || !prueba.sintetica.ok };
  });
}

function imprimirClientes(rows) {
  const ok = b => (b ? '✓' : '✗');
  console.log('Clientes — evidencia: (a) configuración · (b) hook ejecutable · (c) prueba sintética · (d) eventos reales del cliente · (e) limitaciones');
  for (const r of rows) {
    const e = r.evaluacion;
    if (!r.instalado) { console.log(`  · ${r.nombre.padEnd(12)} no instalado`); continue; }
    console.log(`  ${r.falla ? '✗' : '✓'} ${r.nombre.padEnd(12)} ${e.nivelTexto} — ${r.archivo}`);
    const c = r.configuracion;
    console.log(`      (a) ${c.nuestro && c.registrados.length ? `${ok(c.ok)} ${c.registrados.length}/${e.hooks.length} hooks registrados${c.faltan.length ? ` (faltan: ${c.faltan.join(', ')})` : ''}` : `✗ ${c.motivo}`}`);
    const p = r.prueba;
    if (p) console.log(`      (b) ${p.ejecutable ? `✓ ${r.id === 'opencode' ? 'el plugin carga (con Node y un cliente simulado) y' : 'el hook'} responde (${p.ms} ms)` : `✗ ${p.motivo}`}`);
    if (p && p.ejecutable) {
      const s = p.sintetica;
      const partes = [`${ok(s.deny)} bloquea «gh pr create»`, `${ok(s.critica)} ${s.aprobacion === 'nativa' ? 'pide confirmación nativa' : 'pide confirmación en el chat'} para «${s.critico}»`];
      if (FIN[s.finDeTurno]) partes.push(`${ok(s.fin)} ${FIN[s.finDeTurno]}`);
      console.log(`      (c) ${ok(s.ok)} prueba sintética ${s.ok ? 'aprobada' : 'fallida'}: ${partes.join(' · ')}`);
    }
    const vistos = e.observado ? Object.keys(e.observado.eventos) : [];
    console.log(`      (d) ${e.confirmacion ? `✓ ${e.confirmacion} (${vistos.slice(0, 6).join(', ')}${vistos.length > 6 ? '…' : ''})` : `— sin eventos reales todavía: ${p && p.ejecutable ? 'lo anterior es una prueba sintética, no una integración confirmada' : 'integración sin confirmar'}${r.id === 'codex' ? ' (Codex no ejecuta hooks nuevos hasta aprobarlos con /hooks)' : ''}`}`);
    if (e.limitaciones.length) console.log(`      (e) ${e.limitaciones.map(l => `${l.dimension}: ${l.valor}`).join(' · ')}`);
  }
  if (rows.some(r => r.falla)) console.log('  → Hay clientes con hooks que no responden o no pasan la prueba. Ejecuta: node install.js (y revisa que "node" funcione en una terminal nueva).');
  console.log('  Prueba sintética = el comando registrado responde bien a payloads simulados. Solo (d) confirma que el cliente real invoca los hooks; que respete cada respuesta no se comprueba desde el hook. Detalle y respaldo archivo:línea: doctor --json');
}

function doctor() {
  const CAP = require(path.join(SRC, 'capacidades'));
  const O = require(path.join(SRC, 'observado'));
  const rows = clientes();
  const cfg = loadConfig(root);
  const sesiones = S.listSessions(root);
  const danadas = sesiones.filter(s => s.danado).map(s => s.sesion);
  const recuperadas = sesiones.filter(s => s.recuperacion).map(s => ({ sesion: s.sesion, en: s.recuperacion.en, motivo: s.recuperacion.motivo }));
  const ultimoError = O.readError();
  const clave = fs.existsSync(path.join(SDD_HOME, 'clave-aprobaciones'));
  const lb = validBaseline(root);
  const files = changedFiles();
  const steps = plan(root, files.length ? files : guessSample(), cfg);
  const SPR = require(path.join(SRC, 'skills-proyecto'));
  const sp = SPR.descubrir(root, { home: HOME });
  const spChoques = sp.skills.filter(s => s.colision).map(s => s.nombre);
  if (rows.some(r => r.falla)) process.exitCode = 1;
  if (flags.has('--json')) {
    const cliente = r => ({ nombre: r.nombre, archivo: r.archivo, instalado: r.instalado, nivel: r.evaluacion.nivel, nivelTexto: r.evaluacion.nivelTexto, niveles: r.evaluacion.niveles, confirmacion: r.evaluacion.confirmacion, configuracion: r.configuracion || null, prueba: r.prueba || null, observado: r.evaluacion.observado, capacidades: r.evaluacion.capacidades, limitaciones: r.evaluacion.limitaciones, falla: r.falla });
    console.log(JSON.stringify({
      node: process.version, sddHome: fwd(SDD_HOME), aviso: CAP.AVISO,
      clientes: Object.fromEntries(rows.map(r => [r.id, cliente(r)])),
      harness: { claveAprobaciones: clave, ultimoError },
      proyecto: { ruta: fwd(root), modo: cfg.modo || 'normal', problemas: cfg.problemas || [], sesiones: { total: sesiones.length, danadas, recuperadas }, lineaBase: lb.lb ? { commit: lb.lb.commit, en: lb.lb.en } : { motivo: lb.motivo }, skills: { total: sp.total, nombres: sp.skills.map(s => s.nombre), colisiones: spChoques, descTokens: sp.descTokens }, sensores: steps.map(s => ({ nombre: s.nombre, modulo: s.modulo, cmd: s.cmd })) },
    }, null, 2));
    return;
  }
  console.log(`Harness SDD · Node ${process.version} · ${fwd(SDD_HOME)}`);
  console.log(`Aviso: ${CAP.AVISO}.\n`);
  imprimirClientes(rows);
  console.log(`\nClave de aprobaciones por chat: ${clave ? 'presente' : 'todavía no creada (se crea con la primera confirmación en el chat)'}`);
  console.log(`Último error interno del hook: ${ultimoError ? `${CAP.fecha(ultimoError.en)} · ${ultimoError.cliente} ${ultimoError.evento} · ${ultimoError.mensaje}` : 'ninguno registrado'}`);
  console.log(`\nProyecto: ${fwd(root)}`);
  const sl = spaceLine(); if (sl) console.log(sl);
  console.log(`Modo: ${cfg.modo === 'estricto' ? 'estricto (falla cerrada salvo lecturas; lo no reconocido como seguro pide aprobación)' : 'normal'}`);
  for (const p of cfg.problemas || []) console.log(`✗ Configuración con problemas: ${p}`);
  console.log(`Configuración: GATE ${cfg.gate} · sensores al editar ${cfg.sensores.alEditar ? 'sí' : 'no'} · al terminar: ${cfg.sensores.alTerminar.join(', ') || 'ninguno'} · máx. ${cfg.sensores.maxBloqueos} bloqueos`);
  const { limitFor } = require(path.join(SRC, 'budget'));
  const C = require(path.join(SRC, 'checkpoints'));
  console.log(`Deshacer: ${(cfg.deshacer || {}).activo === false ? 'desactivado' : !C.hasGit() ? '✗ necesita git instalado' : C.isSlow(root) ? '⚠ proyecto grande: ejecuta sdd-harness.js puntos --iniciar' : `punto de restauración antes de cada turno que modifica archivos (máx. ${(cfg.deshacer || {}).maxPuntos || 30}, ${C.list(root).length} guardados)`}`);
  console.log(`Presupuesto: modo ${(cfg.presupuesto || {}).modo || 'normal'} · ${limitFor(cfg) ? `máx. ${limitFor(cfg)} sub-agentes por mensaje` : 'sin tope de sub-agentes'} · salidas largas ${cfg.salida && cfg.salida.compactar ? 'compactadas' : 'completas'}`);
  const projCfg = path.join(root, '.sdd', 'harness.json');
  console.log(`Config. del proyecto: ${fs.existsSync(projCfg) ? fwd(projCfg) : 'no hay (.sdd/harness.json)'}`);
  // Nombre y descripción de cada skill instalada entran en el contexto de todas las sesiones
  const skillsDir = path.join(HOME, '.claude', 'skills');
  try {
    const ns = fs.readdirSync(skillsDir).filter(n => fs.existsSync(path.join(skillsDir, n, 'SKILL.md')));
    let chars = 0;
    for (const n of ns) { const t = fs.readFileSync(path.join(skillsDir, n, 'SKILL.md'), 'utf8'); const m = /^description:\s*(.*)$/m.exec(t); chars += n.length + ((m && m[1]) || '').length + 2; }
    console.log(`Skills instaladas: ${ns.length} · ~${Math.round(chars / 4)} tokens de descripciones en cada sesión (el contenido solo se lee al usarlas). Para no instalar las que no usas: config/skills.json → excluir`);
  } catch { /* sin skills instaladas acá */ }
  // Las que trae el propio proyecto: el agente recibe sus nombres y rutas al iniciar (sin su contenido)
  if (!sp.skills.length) console.log(`Skills del proyecto: ninguna (${SPR.DIRS.join(', ')})`);
  else {
    console.log(`Skills del proyecto: ${sp.total} (${SPR.DIRS.map(d => `${d}: ${sp.skills.filter(s => s.origen === d).length}`).join(', ')}) · ~${sp.descTokens} tokens de descripciones en cada sesión · ${sp.skills.map(s => s.nombre).join(', ')}${sp.omitidas ? ` y ${sp.omitidas} más` : ''}`);
    if (spChoques.length) console.log(`  ⚠ chocan con una skill global (en Claude Code prevalece la global; el harness le indica al agente leer la del proyecto): ${spChoques.join(', ')}. Renombrar la del proyecto evita el choque.`);
  }
  const pf = require(path.join(SRC, 'perfiles')).estado(root);
  if (pf) console.log(`Perfil: ${pf.nombre} ${pf.aplicada}${pf.error ? ` · ✗ ${pf.error}` : pf.pendientes ? ` · ⚠ ${pf.pendientes} cambio(s) respecto del perfil ${pf.disponible}: sdd-harness.js perfil aplicar ${pf.nombre}` : ' · al día'}`);
  console.log(`Sesiones del harness: ${sesiones.length}${danadas.length ? ` · ✗ con estado dañado: ${danadas.join(', ')}` : ''}${recuperadas.length ? ` · recuperadas en modo restrictivo: ${recuperadas.map(x => `${x.sesion} (${CAP.fecha(x.en)}: ${x.motivo})`).join(', ')}` : ''}`);
  console.log(`Línea base de errores: ${lb.lb ? `commit ${lb.lb.commit.slice(0, 8)} (${String(lb.lb.en).slice(0, 10)})` : lb.motivo}`);
  const ctx = require(path.join(SRC, 'memory')).contextStats(root);
  const largos = (ctx.archivos || []).filter(x => x.recortado);
  console.log(`Contexto que se reinyecta: ${ctx.error ? `✗ no se puede leer (${ctx.error})` : `${ctx.chars} de ${ctx.max} caracteres${ctx.recortado ? ' · ⚠ RECORTADO: el agente no recibe todo' : ''}`}${largos.length ? ` · ⚠ ${largos.map(x => `${x.nombre} tiene ${x.lineas} líneas y solo se leen ${x.max}`).join('; ')} (mueve lo terminado a historial.md)` : ''}`);
  console.log(`\nSensores ${files.length ? `para los ${files.length} archivo(s) modificados` : '(ejemplo con un archivo del proyecto)'}:`);
  if (!steps.length) console.log('  ninguno detectado: configura sensores.comandos en .sdd/harness.json');
  for (const s of steps) console.log(`  • ${s.nombre}${s.modulo !== '.' ? ` [${s.modulo}]` : ''}${s.runner ? ` (${s.runner})` : ''}: ${s.cmd}`);
}

function guessSample() {
  for (const d of ['src', 'app', 'lib', 'cmd', 'internal', 'pkg', '.']) {
    try {
      const f = fs.readdirSync(path.join(root, d)).find(x => /\.(m?[jt]sx?|go|vue)$/.test(x));
      if (f) return [relPosix(root, path.join(root, d, f))];
    } catch { /* no existe */ }
  }
  return [];
}

async function sensores() {
  const files = changedFiles();
  if (!files.length) { console.log('No hay archivos modificados (git status) para verificar.'); return; }
  const cfg = loadConfig(root);
  const pasos = plan(root, files, cfg);
  if (pasos.length) console.log(`Controles detectados: ${pasos.map(p => `${p.nombre}${p.modulo && p.modulo !== '.' ? ` [${p.modulo}]` : ''}${p.runner ? ` (${p.runner})` : ''}`).join(' · ')}`);
  const run = await runSensors(root, files, cfg);
  if (!run.ran) { console.log('No hay sensores aplicables a los archivos modificados: quedan sin verificar. Revisa qué detecta el harness con «sdd-harness.js doctor» o fija el comando en .sdd/harness.json → sensores.comandos.'); process.exitCode = 1; return; }
  console.log(summarize(run, files.length));
  process.exitCode = run.ok ? 0 : 1;
}

async function lineaBase() {
  const dirty = changedFiles().filter(f => CODE_EXT.test(f));
  if (dirty.length) {
    console.log(`Hay cambios sin commitear en archivos de código (${dirty.slice(0, 5).join(', ')}${dirty.length > 5 ? '…' : ''}). La línea base se toma sobre el último commit, sin cambios: así no puede incluir errores nuevos.`);
    process.exitCode = 1; return;
  }
  const ls = spawnSync('git', ['-C', root, 'ls-files'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const files = ls.status === 0 ? ls.stdout.split('\n').filter(f => f && CODE_EXT.test(f)) : [];
  const r = await takeBaseline(root, loadConfig(root), files);
  if (!r.ok) { console.log(`No se pudo tomar la línea base: ${r.motivo}`); process.exitCode = 1; return; }
  const entries = Object.entries(r.data.controles);
  console.log(`Línea base del commit ${r.data.commit.slice(0, 8)}: ${entries.length ? entries.map(([k, v]) => `${k} ${v.lineas.length ? `${v.lineas.length} error(es) conocidos` : 'sin errores'}`).join(' · ') : 'no hay chequeos de proyecto completo que registrar'}. Vale mientras no cambie el commit.`);
}

/**
 * Worktrees: una carpeta por tarea, cada una con su rama, compartiendo el historial. «listar» y las vistas previas
 * son de lectura; crear, mezclar y quitar piden confirmación (y la política se la pide al agente).
 */
function worktree() {
  const W = require(path.join(SRC, 'worktree'));
  const sub = positional[1] || 'listar';
  const fw2 = p => String(p).replace(/\\/g, '/');
  try {
    if (sub === 'listar') {
      const ws = W.list(root);
      if (flags.has('--json')) { console.log(JSON.stringify({ v: 1, worktrees: ws.map(w => ({ rama: w.rama, dir: fw2(w.dir), principal: w.principal, existe: w.existe, detached: !!w.detached, sucio: w.sucio.length, sinSubir: w.sinSubir })) }, null, 2)); return; }
      for (const w of ws) {
        const estado = [!w.existe ? 'la carpeta no existe' : null, w.sucio.length ? `${w.sucio.length} sin commitear` : null, w.sinSubir.length ? `${w.sinSubir.length === 1 && w.sinSubir[0].startsWith('(') ? w.sinSubir[0] : `${w.sinSubir.length} commit(s) sin subir`}` : null].filter(Boolean);
        console.log(`${w.principal ? '▸' : '•'} ${w.rama || '(sin rama)'}${w.principal ? ' (principal)' : ''} → ${fw2(w.dir)}${estado.length ? ` · ${estado.join(' · ')}` : ' · limpio'}`);
      }
      if (ws.length === 1) console.log('\nSolo el principal. Crea uno por tarea: sdd-harness.js worktree nuevo <rama>');
      return;
    }
    if (sub === 'nuevo') {
      const r = W.create(root, positional[2], { desde: opt('--desde'), ruta: opt('--ruta') });
      console.log(`Listo: rama «${r.rama}» desde ${r.remoto ? `origin/${r.base}` : r.base} en ${fw2(r.dir)}`);
      if (r.aviso) console.log(`Aviso: ${r.aviso}.`);
      console.log(`Abre tu herramienta de IA en esa carpeta. Lo que tengas en curso acá no se toca, y lo que commitees allá existe al instante para este repositorio.`);
      if (r.memoria) console.log('Ojo: .sdd/memoria/sesion.md está versionado, así que la carpeta nueva nace con la memoria de la rama base y al mezclar puede chocar. Conviene ignorarlo en git (es volátil).');
      return;
    }
    if (sub === 'sincronizar') {
      const r = W.sync(root, { desde: opt('--desde'), confirmar: flags.has('--confirmar') });
      if (r.bloqueado) { console.log(`No se hizo nada: ${r.bloqueado}`); process.exitCode = 1; return; }
      if (r.aviso) console.log(`Aviso: ${r.aviso}.`);
      if (r.nada) { console.log(`«${r.rama}» ya está al día con ${r.ref}.`); return; }
      console.log(`Rama: ${r.rama} · base: ${r.ref}`);
      console.log(`Entran ${r.entran.length} commit(s):\n${r.entran.slice(0, 15).map(c => `  ${c}`).join('\n')}${r.entran.length > 15 ? `\n  … y ${r.entran.length - 15} más` : ''}`);
      if (r.archivos.length) console.log(`Archivos que cambian: ${r.archivos.slice(0, 20).join(', ')}${r.archivos.length > 20 ? ` (+${r.archivos.length - 20})` : ''}`);
      if (r.conflictos === null) console.log('Conflictos: no se pudo prever (tu git no tiene «merge-tree --write-tree»; actualiza a 2.38 o más).');
      else console.log(r.conflictos.length ? `Conflictos previstos en: ${r.conflictos.join(', ')}` : 'Sin conflictos previstos.');
      if (r.mezclado) console.log(`\nMezclado. Tus ${r.tuyos.length} commit(s) siguen arriba; revisa y sube cuando esté listo.`);
      else if (!flags.has('--confirmar')) console.log('\nNada se mezcló todavía. Para hacerlo: worktree sincronizar --confirmar');
      return;
    }
    if (sub === 'cerrar') {
      const r = W.close(root, positional[2], { confirmar: flags.has('--confirmar') });
      if (r.bloqueado) { console.log(`No se quitó: ${r.bloqueado}`); process.exitCode = 1; return; }
      if (r.quitado) { console.log(`Quitado ${fw2(r.worktree.dir)} (la rama «${r.worktree.rama}» sigue existiendo).`); return; }
      console.log(`Se quitaría ${fw2(r.worktree.dir)} (rama «${r.worktree.rama}»).${r.riesgos.length ? ` ⚠ ${r.riesgos.join(' y ')}.` : ''}`);
      console.log(r.riesgos.length ? 'Resuélvelo antes: con cambios sin commitear o sin subir no se quita.' : 'Para quitarlo: worktree cerrar --confirmar');
      return;
    }
    console.log('Uso: worktree listar | nuevo <rama> [--desde <rama base>] [--ruta <carpeta>] | sincronizar [--desde <rama base>] [--confirmar] | cerrar <rama|ruta> [--confirmar]');
    process.exitCode = 2;
  } catch (e) { console.log(`No se pudo: ${e.message}`); process.exitCode = 1; }
}

/** Modelo de trabajo verificable (ver harness/src/trabajo.js). aceptar y descartar los ejecuta solo el usuario. */
async function trabajo() {
  const T = require(path.join(SRC, 'trabajo'));
  const sub = positional[1] || 'estado';
  const id = positional[2];
  const last = S.listSessions(root).find(s => !s.danado) || {};
  const out = r => { if (r && r.tarea) console.log(`${r.tarea.id}: ${T.ETAREA[r.tarea.estado] || r.tarea.estado}${r.tarea.motivo ? ` — ${r.tarea.motivo}` : ''}`); };
  try {
    if (sub === 'estado') {
      const st = T.status(root);
      if (!st) { console.log('No hay un trabajo registrado en este proyecto. El agente lo registra con «trabajo plan» antes de pedir la aprobación.'); return; }
      if (st.problema) { console.log(`El trabajo guardado no se puede usar: ${st.problema}.`); process.exitCode = 1; return; }
      const t = st.trabajo;
      console.log(`Objetivo: ${t.objetivo}\nEstado: ${T.ETRABAJO[st.estado]}${t.congelado ? ` · plan aprobado ${String(t.congelado.en).slice(0, 16).replace('T', ' ')}` : ''}${t.propuesta ? ' · hay un plan nuevo propuesto sin aprobar' : ''}`);
      if (t.alcance) console.log(`Alcance: ${t.alcance}`);
      for (const r of st.requisitos) {
        console.log(`${r.tecnico ? '✓' : '•'} ${r.id} ${r.texto}`);
        for (const c of r.criterios) console.log(`    ${c.ok ? '✓' : c.manual ? '?' : '✗'} ${c.id} ${c.texto || ''} [${c.control ? `control ${c.control}` : c.comando ? 'comando' : 'manual'}] — ${c.motivo}`);
      }
      for (const x of st.tareas) console.log(`${x.estado === 'verificada' ? '✓' : x.estado === 'bloqueada' ? '⏸' : '•'} ${x.id} ${x.titulo} — ${T.ETAREA[x.estado]}${x.responsable ? ` (${x.responsable})` : ''}${x.motivo ? `: ${x.motivo}` : ''}${(x.intentos || []).length ? ` · ${x.intentos.length} intento(s)` : ''}`);
      for (const q of st.abiertas || []) console.log(`? ${q.id} ${q.texto}${q.para ? ` → ${q.para}` : ''}${q.donde ? ` [${q.donde}]` : ''}${q.tarea ? ` · bloquea ${q.tarea}` : ''}`);
      if ((t.decisiones || []).length) console.log(`Decisiones: ${t.decisiones.map(d => `${d.texto} (${d.motivo})`).join(' · ')}`);
      if (st.faltan.length) console.log(`\nFalta:\n${st.faltan.map(f => `  - ${f}`).join('\n')}`);
      process.exitCode = st.tecnico ? 0 : 1;
      return;
    }
    if (sub === 'plan') {
      const src = opt('--json') || (opt('--archivo') ? fs.readFileSync(path.resolve(opt('--archivo')), 'utf8') : (id === '-' ? fs.readFileSync(0, 'utf8') : ''));
      if (!src) { console.log('Uso: trabajo plan --json \'{"objetivo":…,"requisitos":[…],"tareas":[…]}\' | --archivo plan.json | - (stdin)'); process.exitCode = 2; return; }
      let raw; try { raw = JSON.parse(src); } catch (e) { console.log(`El plan no es JSON válido: ${e.message}`); process.exitCode = 2; return; }
      const r = T.setPlan(root, raw, { sesion: last.sesion });
      if (!r.ok) { console.log(`Plan rechazado:\n${r.errores.map(e => `  - ${e}`).join('\n')}`); process.exitCode = 2; return; }
      console.log(r.propuesta ? 'El plan aprobado no se modifica: el nuevo quedó como PROPUESTA y se aplicará cuando el usuario lo apruebe (GATE).' : 'Plan registrado. Preséntalo al usuario: su aprobación lo congela.');
      return;
    }
    if (sub === 'iniciar') { out(T.startTask(root, id, { responsable: opt('--responsable'), tomar: flags.has('--tomar') })); return; }
    if (sub === 'bloquear') { out(T.blockTask(root, id, motivo)); return; }
    if (sub === 'decision' || sub === 'decisión') { T.addDecision(root, positional[2], motivo); console.log('Decisión registrada.'); return; }
    if (sub === 'preguntas') {
      const st = T.status(root);
      if (!st || st.problema) { console.log(st && st.problema ? `El trabajo guardado no se puede usar: ${st.problema}.` : 'No hay un trabajo registrado en este proyecto.'); process.exitCode = 1; return; }
      const abiertas = st.abiertas || [];
      if (!abiertas.length) console.log('No hay preguntas abiertas.');
      // Listas para copiar: el harness no publica nada en el gestor; eso lo hace el usuario
      for (const q of abiertas) {
        console.log(`\n[${q.id}] ${q.donde ? `en ${q.donde}` : 'sin destino indicado'}${q.para ? ` · etiquetar a ${q.para}` : ''}${q.tarea ? ` · bloquea ${q.tarea}` : ''}`);
        console.log(q.texto);
      }
      const cerradas = (st.preguntas || []).filter(q => q.estado !== 'abierta');
      if (cerradas.length) console.log(`\nCerradas: ${cerradas.map(q => `${q.id} ${T.EPREGUNTA[q.estado]}`).join(' · ')}`);
      process.exitCode = abiertas.length ? 1 : 0;
      return;
    }
    if (sub === 'preguntar') {
      const r = T.addQuestion(root, positional[2], { para: opt('--para'), donde: opt('--donde'), tarea: opt('--tarea') });
      console.log(`Pregunta ${r.pregunta.id} registrada${r.tarea ? ` · ${r.tarea.id} queda bloqueada esperando la respuesta` : ''}. Muéstrasela al usuario para que la publique: «trabajo preguntas».`);
      return;
    }
    if (sub === 'responder') {
      if (!id) { console.log('Uso: trabajo responder <id> --respuesta "…"'); process.exitCode = 2; return; }
      const r = T.answerQuestion(root, id, opt('--respuesta'));
      console.log(`Pregunta ${r.pregunta.id} respondida.${r.liberadas.length ? ` Tareas que la esperaban: ${r.liberadas.map(x => x.id).join(', ')} (retomar con «trabajo iniciar <tarea>»).` : ''}`);
      return;
    }
    if (sub === 'descartar-pregunta') {
      if (!id) { console.log('Uso: trabajo descartar-pregunta <id> --motivo "…"'); process.exitCode = 2; return; }
      console.log(`Pregunta ${T.dropQuestion(root, id, motivo).pregunta.id} descartada.`);
      return;
    }
    if (sub === 'verificar') {
      if (!id) { console.log('Uso: trabajo verificar <tarea>'); process.exitCode = 2; return; }
      const r = await T.verifyTask(root, id, { cfg: loadConfig(root), sesion: last.sesion, excepciones: last.excepciones || [], cambios: last.cambios || [] });
      for (const c of r.controles) console.log(`${SIMBOLO[c.estado] || '•'} ${c.nombre}${c.modulo && c.modulo !== '.' ? ` [${c.modulo}]` : ''}: ${ETIQUETA[c.estado]}${c.motivo ? ` (${c.motivo})` : ''}`);
      out(r);
      if (r.sinProgreso) console.log('La tarea quedó bloqueada por falta de progreso: detente y consulta al usuario.');
      process.exitCode = verificadoEstado(r.resultado.estado) ? 0 : 1;
      return;
    }
    if (sub === 'aceptar') { T.accept(root, { motivo }); console.log('Trabajo aceptado por el usuario (aceptación funcional).'); return; }
    if (sub === 'cerrar') { T.close(root); console.log('Trabajo cerrado.'); return; }
    if (sub === 'descartar') { T.close(root, { descartar: true }); console.log('Trabajo descartado.'); return; }
    console.log('Uso: trabajo [estado] | plan --json … | iniciar <tarea> [--responsable x] | bloquear <tarea> --motivo … | verificar <tarea> | decision "texto" --motivo … | preguntas | preguntar "¿…?" --para quién --donde AB#1234 [--tarea T-01] | responder <id> --respuesta … | descartar-pregunta <id> --motivo … | cerrar · (solo el usuario) aceptar [--motivo …] | descartar');
    process.exitCode = 2;
  } catch (e) { console.log(`No se pudo: ${e.message}`); process.exitCode = 1; }
}
const verificadoEstado = e => e === 'aprobado' || e === 'excepcion';

function excepcion() {
  const last = S.listSessions(root).find(s => !s.danado);
  if (!last || !last.sensores || !last.sensores.huella) { console.log('No hay una verificación registrada en este proyecto.'); return; }
  const pend = V.pendingControls(last.sensores);
  if (!pend.length) { console.log('La última verificación no tiene controles pendientes.'); return; }
  const wanted = positional.slice(1).length ? positional.slice(1) : pend;
  const unknown = wanted.filter(c => !pend.includes(c));
  if (unknown.length) { console.log(`No están pendientes: ${unknown.join(', ')}. Pendientes: ${pend.join(', ')}`); process.exitCode = 1; return; }
  if (!motivo) { console.log(`Indica el motivo: sdd-harness.js excepcion ${wanted.join(' ')} --motivo "por qué se acepta"`); process.exitCode = 1; return; }
  let ok = false;
  S.updateState(root, last.sesion, s => { ok = V.addExceptions(s, wanted, s.sensores.huella, `autorizada por el usuario en la terminal: ${motivo}`); });
  S.log(root, { herramienta: 'terminal', evento: 'excepción', decision: 'autorizada', detalle: wanted.join(', ') });
  console.log(`Excepción registrada para ${wanted.join(', ')}: vale solo para el contenido actual (si los archivos cambian, deja de valer).${ok ? ' La verificación queda aprobada con excepción.' : ' Aún quedan controles pendientes.'}`);
}

/** Eventos estructurados: filtrar por sesión, o reconstruir la cadena de decisiones de uno (sin volver a ejecutar nada). */
function eventos() {
  const EV = require(path.join(SRC, 'eventos'));
  const id = opt('--explicar');
  if (id) {
    const r = EV.explain(root, id);
    if (!r) { console.log(`No hay un evento ${id} en este proyecto.`); process.exitCode = 1; return; }
    if (flags.has('--json')) { console.log(JSON.stringify(r, null, 2)); return; }
    console.log(`Cadena de decisiones del evento ${id} (sesión ${r.evento.sesion || '—'}):`);
    for (const e of r.cadena) console.log(`${e.id === id ? '▶' : ' '} ${EV.format(e)}${e.politica ? `\n      política: ${e.politica}` : ''}${e.verificacion ? `\n      verificación: ${e.verificacion.estado}` : ''}${e.terminacion ? `\n      terminación: ${e.terminacion.motivo}` : ''}`);
    return;
  }
  const list = EV.read(root, { sesion: opt('--sesion') || null, limit: Number(positional[1]) || 40 });
  if (flags.has('--json')) { console.log(JSON.stringify(list, null, 2)); return; }
  console.log(list.length ? list.map(EV.format).join('\n') : 'Sin eventos del harness en este proyecto.');
}

function registro() {
  const n = Number(arg) || 40;
  const lines = S.readLog(root, n);
  console.log(lines.length ? lines.join('\n') : 'Sin registro del harness en este proyecto.');
}

function aprobar() {
  const last = S.listSessions(root)[0];
  if (!last) { console.log('No hay sesiones del harness en este proyecto.'); return; }
  S.updateState(root, last.sesion, st => { st.gate = { estado: 'aprobado', desde: new Date().toISOString() }; });
  S.log(root, { herramienta: 'terminal', evento: 'gate', decision: 'aprobado', detalle: 'aprobado manualmente por el usuario' });
  try { if (require(path.join(SRC, 'trabajo')).freeze(root, { sesion: last.sesion, via: 'terminal' })) console.log('El plan registrado del trabajo quedó congelado.'); } catch (e) { console.log(`Aviso: no se pudo congelar el plan del trabajo (${e.message}).`); }
  console.log(`Plan aprobado para la sesión ${last.sesion} (${last.herramienta || '—'}). Pídele al agente que continúe.`);
}

function space() {
  const W = require(path.join(SRC, 'workspace'));
  const C = require(path.join(SRC, 'checkpoints'));
  const ws = W.load(root, { fresh: true });
  return { W, C, ws, us: C.units(ws), name: d => (path.resolve(d) === path.resolve(root) ? path.basename(root) : relPosix(root, d)) };
}

function workspace() {
  const { W, ws } = space();
  const extra = ws.carpetas.slice(1);
  console.log(`Espacio de trabajo: ${fwd(root)}${ws.fuentes.length ? ` (definido en ${ws.fuentes.join(', ')})` : ''}`);
  if (!ws.proyectos.length) console.log('  sin proyectos detectados.');
  for (const p of ws.proyectos) console.log(`  • ${p.nombre.padEnd(22)} ${(p.rel === '.' ? '(raíz)' : p.rel.startsWith('..') ? fwd(p.ruta) : p.rel).padEnd(28)} ${p.stack.join(', ') || '—'}${p.memoria ? ' · memoria' : ''}${p.git ? ' · git' : ''}${p.config ? ' · reglas propias' : ''}`);
  if (ws.espacio) console.log(`Memoria del espacio: ${fwd(path.join(ws.espacio, '.sdd', 'memoria'))}`);
  if (!W.isMulti(ws)) { console.log('\nUn solo proyecto: el harness trabaja como siempre.'); return; }
  if (!extra.length) { console.log('\nTodos los proyectos están dentro de la carpeta abierta: la IA ya puede buscar en todos y no hay nada que configurar.'); return; }
  // Carpetas fuera de la raíz (workspace multi-raíz): la herramienta necesita acceso explícito
  const dirs = extra.map(fwd);
  const claudeFile = path.join(root, '.claude', 'settings.local.json');
  const codexFile = path.join(root, '.codex', 'config.toml');
  const START = '# >>> sdd-orquestador: carpetas del espacio de trabajo'; const END = '# <<< sdd-orquestador';
  const codexBlock = [START, '[sandbox_workspace_write]', `writable_roots = [${dirs.map(d => JSON.stringify(d)).join(', ')}]`, END].join('\n');
  console.log(`\nCarpetas fuera de la raíz (${dirs.length}): ${dirs.join(', ')}`);
  console.log(`  Claude Code → ${fwd(claudeFile)}: permissions.additionalDirectories`);
  console.log(`  Codex       → ${fwd(codexFile)}: [sandbox_workspace_write] writable_roots`);
  console.log('  Copilot y Cursor ya trabajan con todas las carpetas del workspace. Gemini CLI: ábrelo con --include-directories ' + dirs.join(','));
  if (!flags.has('--aplicar')) { console.log(`\nPara aplicarlo: node "${fwd(path.join(SDD_HOME, 'bin', 'sdd-harness.js'))}" workspace --aplicar   (después reinicia la herramienta)`); return; }
  let cj = {};
  try { cj = JSON.parse(fs.readFileSync(claudeFile, 'utf8')); } catch (e) { if (fs.existsSync(claudeFile)) { console.log(`✗ ${fwd(claudeFile)} no es JSON válido; no se modificó.`); cj = null; } }
  if (cj) {
    cj.permissions = cj.permissions || {};
    cj.permissions.additionalDirectories = [...new Set([...(cj.permissions.additionalDirectories || []), ...dirs])];
    fs.mkdirSync(path.dirname(claudeFile), { recursive: true });
    fs.writeFileSync(claudeFile, JSON.stringify(cj, null, 2) + '\n');
    console.log(`✓ Claude Code: ${fwd(claudeFile)}`);
  }
  let toml = ''; try { toml = fs.readFileSync(codexFile, 'utf8'); } catch { /* no existe */ }
  const re = new RegExp(`${START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END}`);
  if (re.test(toml)) toml = toml.replace(re, codexBlock);
  else if (/^\s*\[sandbox_workspace_write\]/m.test(toml)) { console.log(`⚠ Codex: ${fwd(codexFile)} ya tiene [sandbox_workspace_write]; agrega a mano: writable_roots = [${dirs.map(d => JSON.stringify(d)).join(', ')}]`); toml = null; }
  else toml = `${toml}${toml && !toml.endsWith('\n') ? '\n' : ''}${toml ? '\n' : ''}${codexBlock}\n`;
  if (toml !== null) { fs.mkdirSync(path.dirname(codexFile), { recursive: true }); fs.writeFileSync(codexFile, toml); console.log(`✓ Codex: ${fwd(codexFile)}`); }
  console.log('Reinicia la herramienta para que tome las carpetas nuevas. Son rutas de tu equipo: no las subas al repo (agrega .claude/settings.local.json y .codex/config.toml a tu .gitignore si no lo están).');
}

function puntos() {
  const { C, us, name } = space();
  if (!C.hasGit()) { console.log('Los puntos de restauración necesitan git instalado.'); return; }
  if (flags.has('--iniciar')) {
    console.log(`Guardando el primer punto de restauración de ${us.length} repo(s)/carpeta(s) (en proyectos grandes puede tardar un poco)...`);
    const r = C.snapshotUnits(us.map(u => u), 'punto inicial (terminal)', { budgetMs: 600000, max: (loadConfig(root).deshacer || {}).maxPuntos || 30 });
    console.log(r.hechos.length === us.length ? '✓ Listo: desde ahora los puntos de cada turno son rápidos.' : `⚠ Se guardaron ${r.hechos.length} de ${us.length}. ¿git instalado?`);
    return;
  }
  const slow = us.filter(u => C.isSlow(u.dir));
  if (slow.length) console.log(`⚠ ${slow.map(u => name(u.dir)).join(', ')}: muy grande para guardar el primer punto dentro de un hook. Ejecuta: sdd-harness.js puntos --iniciar\n`);
  const all = C.turns(us);
  if (!all.length) { console.log(`Sin puntos de restauración en ${fwd(root)} todavía (se guarda uno antes de cada turno en que la IA modifica archivos).`); return; }
  console.log(`Puntos de restauración de ${fwd(root)} (el 1 es el más reciente):`);
  all.forEach((t, i) => console.log(`  ${String(i + 1).padStart(2)}. ${t.fecha}  ${t.etiqueta}${us.length > 1 ? `  · ${t.repos.map(name).join(', ')}` : ''}   [${t.id}]`));
  console.log('\nVer qué volvería atrás: sdd-harness.js deshacer [número]   ·   aplicarlo: agrega --confirmar');
}

function deshacer() {
  const { C, us, name } = space();
  const ref = arg;
  const multi = us.length > 1;
  const pre = r => (multi ? `${name(r.dir)}/` : '');
  if (!flags.has('--confirmar')) {
    const pv = C.planUnits(us, ref);
    if (pv.error) { console.log(`No hay nada que deshacer: ${pv.error}`); return; }
    console.log(`Volver al punto ${pv.punto.fecha} (${pv.punto.etiqueta}):`);
    const show = pv.repos.flatMap(r => [...r.restaurar.map(x => `  ↺ ${pre(r)}${x.archivo}${x.estado === 'borrado' ? ' (se recupera: fue borrado)' : ''}`), ...r.quitar.map(f => `  ✗ ${pre(r)}${f} (se quita: se creó después)`)]);
    if (!show.length) { console.log('  sin diferencias.'); return; }
    console.log(show.slice(0, 60).join('\n') + (show.length > 60 ? `\n  … y ${show.length - 60} más` : ''));
    console.log(`\nPara aplicarlo: node "${fwd(path.join(SDD_HOME, 'bin', 'sdd-harness.js'))}" deshacer${ref ? ` ${ref}` : ''} --confirmar`);
    console.log('Antes de aplicar se guarda el estado actual, así que también se puede rehacer. Los secretos (.env, claves) y lo ignorado por .gitignore no se tocan.');
    return;
  }
  const r = C.restoreUnits(us, ref);
  if (r.error) { console.log(`No se deshizo nada: ${r.error}`); process.exitCode = 1; return; }
  const nr = r.repos.reduce((n, x) => n + x.restaurar.length, 0); const nq = r.repos.reduce((n, x) => n + (x.quitados || []).length, 0);
  S.log(root, { herramienta: 'terminal', evento: 'deshacer', decision: 'aplicado', detalle: `vuelta a ${r.punto.id} (${nr} restaurados, ${nq} quitados, ${r.repos.length} repo(s))` });
  console.log(`✓ Archivos como en ${r.punto.fecha}: ${nr} restaurado(s), ${nq} quitado(s)${multi ? ` en ${r.repos.map(x => name(x.dir)).join(', ')}` : ''}.`);
  if (r.rehacer) console.log(`Para rehacer: sdd-harness.js deshacer ${r.rehacer} --confirmar`);
}

function perfil() {
  const P = require(path.join(SRC, 'perfiles'));
  const sub = String(arg || 'listar').toLowerCase();
  const nombre = positional[2];
  const bin = `node "${fwd(path.join(SDD_HOME, 'bin', 'sdd-harness.js'))}"`;
  if (sub === 'listar') {
    const ps = P.listar();
    if (!ps.length) { console.log(`No hay perfiles en ${fwd(P.DIR)}.`); return; }
    console.log(`Perfiles (${fwd(P.DIR)}):`);
    for (const p of ps) console.log(`  • ${p.nombre} ${p.version}  ${p.descripcion}`);
    const e = P.estado(root);
    if (e) console.log(`\nEste proyecto tiene aplicado ${e.nombre} ${e.aplicada}${e.error ? ` (✗ ${e.error})` : e.pendientes ? ` · ${e.pendientes} cambio(s) pendientes respecto de la ${e.disponible}` : ' · al día'}.`);
    console.log(`\nVista previa: ${bin} perfil aplicar <nombre>   ·   aplicarlo: agrega --confirmar`);
    return;
  }
  if (sub !== 'aplicar' || !nombre) { console.error('Uso: sdd-harness.js perfil [listar] | perfil aplicar <nombre> [--ruta <proyecto>] [--confirmar] [--forzar]'); process.exitCode = 1; return; }
  const confirma = flags.has('--confirmar');
  let pl;
  try { pl = confirma ? P.aplicar(root, nombre, { forzar: flags.has('--forzar') }) : P.planificar(root, nombre); } catch (e) { console.log(`✗ ${e.message}`); process.exitCode = 1; return; }
  const ICON = { crear: '+', reemplazar: '↻', igual: '=', semilla: '·' };
  console.log(`Perfil ${pl.perfil.nombre} ${pl.perfil.version} → ${fwd(pl.root)}${pl.previo ? ` (aplicado antes: ${pl.previo.version})` : ''}`);
  if (pl.coincide === false) console.log(`⚠ Este proyecto no parece el del perfil: ${pl.perfil.detectar.archivo} no contiene ${pl.perfil.detectar.contiene || 'lo esperado'}.`);
  const vis = pl.archivos.filter(a => a.accion !== 'igual');
  for (const a of vis) console.log(`  ${ICON[a.accion]} ${a.rel}${a.accion === 'crear' ? ' (nuevo)' : a.accion === 'semilla' ? ' (ya existe: es del equipo y no se toca)' : ''}${a.sinCommitear ? '  ⚠ con cambios sin commitear' : ''}`);
  const iguales = pl.archivos.length - vis.length;
  if (iguales) console.log(`  = ${iguales} archivo(s) ya iguales al perfil`);
  const c = pl.config;
  console.log(`  ${c.accion === 'invalida' ? '✗' : c.accion === 'igual' ? '=' : c.accion === 'crear' ? '+' : '↻'} .sdd/harness.json${c.accion === 'invalida' ? ': JSON inválido, no se toca' : c.accion === 'igual' ? ' ya incluye el perfil' : ` (${c.accion === 'crear' ? 'nuevo' : 'se mezcla'}: ${c.claves.filter(k => !k.startsWith('_')).join(', ') || 'marca del perfil'}${c.accion === 'crear' ? '' : '; tus listas, reglas y demás claves se conservan'})`}`);
  if (pl.obsoletos.length) {
    console.log('\nEl perfil deja obsoleto (no se borra: quítalo tú en una PR):');
    for (const o of pl.obsoletos) console.log(`  ✗ ${o.ruta}${o.motivo ? ` — ${o.motivo}` : ''}`);
  }
  if (!confirma) {
    if (!P.pendientes(pl)) { console.log('\nEl proyecto ya está al día con el perfil.'); return; }
    console.log(`\nPara aplicarlo: ${bin} perfil aplicar ${nombre}${opt('--ruta') ? ` --ruta "${fwd(pl.root)}"` : ''} --confirmar`);
    console.log('Los archivos reemplazados quedan en git: revísalos con git diff y commitéalos como cualquier cambio.');
    return;
  }
  if (pl.error) { console.log(`\n✗ No se aplicó nada: ${pl.error}`); process.exitCode = 1; return; }
  S.log(root, { herramienta: 'terminal', evento: 'perfil', decision: 'aplicado', detalle: `${nombre} ${pl.perfil.version}: ${pl.escritos.length} archivo(s)` });
  console.log(pl.escritos.length ? `\n✓ Perfil aplicado: ${pl.escritos.length} archivo(s) escritos. Revisa con git diff, commitea y abre una sesión nueva de tu IA para que tome skills, agentes y CLAUDE.md.` : '\nEl proyecto ya estaba al día con el perfil.');
}

function consumo() {
  const { sessionUsage } = require(path.join(SRC, 'usage'));
  const last = S.listSessions(root).find(x => x.consumo);
  if (!last) { console.log('Sin datos de consumo todavía (se registran al terminar cada turno en Claude Code).'); return; }
  const u = sessionUsage(last.consumo.transcript) || last.consumo;
  const n = x => Math.round(x).toLocaleString('es-CL');
  const tot = p => p.entrada + p.cacheEscritura + p.cacheLectura + p.salida;
  const p = u.principal; const s = u.subagentes;
  console.log(`Sesión ${last.sesion} (${last.herramienta || '—'})`);
  console.log(`\nConversación principal: ${n(tot(p))} tokens en ${p.mensajes} respuestas`);
  console.log(`  · leídos de caché (baratos, ~10% del precio): ${n(p.cacheLectura)} (${tot(p) ? Math.round(100 * p.cacheLectura / tot(p)) : 0}%)`);
  console.log(`  · escritos en caché: ${n(p.cacheEscritura)} · entrada sin caché: ${n(p.entrada)} · salida (lo que escribe la IA): ${n(p.salida)}`);
  if (s.agentes) console.log(`Sub-agentes (${s.agentes}): ${n(tot(s))} tokens (caché ${n(s.cacheLectura)}, salida ${n(s.salida)})`);
  const per = Object.entries(u.porHerramienta || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (per.length) console.log(`\nResultados de herramientas que entraron al contexto (aprox.): ${per.map(([k, v]) => `${k} ${n(v)}`).join(' · ')}`);
  if ((u.mayores || []).length) {
    console.log('Los más pesados:');
    for (const t of u.mayores) console.log(`  ${String(n(t.tokens)).padStart(8)}  ${t.nombre}${t.detalle ? `: ${t.detalle}` : ''}`);
  }
  console.log('\nCada respuesta vuelve a procesar todo el historial: si la mayoría es caché, el costo real es bajo; si crecen "entrada" o los sub-agentes, conviene /clear entre tareas y flujos más livianos.');
}

function reglas() {
  const { compile, scanFile } = require(path.join(SRC, 'project-rules'));
  const raw = loadConfig(root).reglas;
  const rules = compile(raw);
  if (!rules.length) { console.log('No hay reglas propias. Agrégalas en .sdd/harness.json → "reglas" (ver README, sección Configuración).'); return; }
  const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.angular', 'coverage', '.next', 'vendor', 'target', '.sdd']);
  const hits = [];
  const walk = d => {
    let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of es) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(p); continue; }
      const rel = relPosix(root, p);
      const rs = rules.filter(r => r.files.some(re => re.test(rel)) && !r.except.some(re => re.test(rel)));
      if (!rs.length) continue;
      let text; try { if (fs.statSync(p).size > 2e6) continue; text = fs.readFileSync(p, 'utf8'); } catch { continue; }
      for (const h of scanFile(root, rel, text, raw)) hits.push(`${rel}${h.linea ? `:${h.linea}` : ''}  [${h.regla}]  ${h.texto.slice(0, 100)}`);
    }
  };
  walk(root);
  console.log(hits.length ? `${hits.length} coincidencia(s) con las reglas (${rules.map(r => r.nombre).join(', ')}):\n${hits.slice(0, 200).join('\n')}` : `Sin violaciones de ${rules.length} regla(s).`);
  process.exitCode = hits.length ? 1 : 0;
}

const cmds = { estado, doctor, sensores, registro, eventos, aprobar, consumo, reglas, puntos, deshacer, workspace, worktree, perfil, excepcion, 'excepción': excepcion, 'linea-base': lineaBase, trabajo, hooks: () => { const rows = clientes(); imprimirClientes(rows); if (rows.some(r => r.falla)) process.exitCode = 1; } };
if (!cmds[cmd]) { console.error('Comandos: estado | doctor | hooks | sensores | linea-base | trabajo | registro | eventos | consumo | reglas | workspace | perfil | puntos | deshacer | aprobar | excepcion'); process.exit(1); }
Promise.resolve(cmds[cmd]()).catch(e => { console.error(e.message); process.exit(1); });
