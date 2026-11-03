'use strict';
// Modelo de trabajo verificable por proyecto (en el estado del harness, fuera del repo, donde el agente no escribe):
// objetivo y alcance, requisitos con criterios de aceptación, tareas con dependencias y responsables, intentos,
// evidencias, decisiones y excepciones. La memoria narrativa ayuda al agente; ESTE estado decide qué está hecho:
//  - el agente registra el plan antes del GATE; el «sí» del usuario lo congela (los criterios ya no se pueden rebajar:
//    un plan nuevo queda como propuesta hasta la siguiente aprobación);
//  - una tarea pasa a «verificada» solo con evidencia producida por el harness (sensores o comandos de aceptación)
//    sobre el contenido actual de sus archivos; si el contenido cambia, la evidencia vence y la tarea se reverifica;
//  - el objetivo queda «técnicamente completo» cuando todo lo automático tiene evidencia vigente; «aceptado» (la
//    aceptación funcional) lo marca solo el usuario;
//  - N intentos seguidos con el mismo error dejan la tarea bloqueada «sin progreso» (criterio explícito).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const S = require('./state');
const { canonical } = require('./aprobaciones');
const { fingerprint } = require('./verificacion');
const { runSensors, CODE_EXT } = require('./sensors');
const { runShell } = require('./proc');
const { combinar, verificado, ETIQUETA } = require('./resultado');
const { shortHash, truncateMiddle } = require('./util');
const { redact } = require('./secrets');

const VERSION = 1;
const file = root => path.join(S.projectDir(root), 'trabajo.json');
const now = () => new Date().toISOString();
const newId = () => crypto.randomBytes(4).toString('hex');

/** Trabajo del proyecto: {trabajo, problema}. Un archivo dañado nunca se interpreta como trabajo completo. */
function load(root) {
  let raw;
  try { raw = fs.readFileSync(file(root), 'utf8'); } catch (e) { return { trabajo: null, problema: e.code === 'ENOENT' ? null : `no se pudo leer (${e.code})` }; }
  try {
    const t = JSON.parse(raw);
    if ((t.v || 1) > VERSION) return { trabajo: null, problema: `versión más nueva del harness (v${t.v})` };
    return { trabajo: t, problema: null };
  } catch (e) { return { trabajo: null, problema: `archivo dañado (${e.message.slice(0, 60)})` }; }
}

/** Modifica el trabajo bajo candado (escritura atómica). fn devuelve el resultado de la operación. */
function update(root, fn) {
  const f = file(root);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  return S.withLock(f, () => {
    const { trabajo, problema } = load(root);
    if (problema) throw new Error(`el trabajo guardado no se puede usar: ${problema}. Revísalo con «sdd-harness trabajo» (el usuario puede descartarlo).`);
    const out = fn(trabajo);
    const t = out && out.trabajo !== undefined ? out.trabajo : trabajo;
    if (t) { t.v = VERSION; t.actualizado = now(); S.writeAtomic(f, JSON.stringify(t, null, 1)); }
    return out;
  });
}

// ---------- Plan ----------

const pad = (p, n) => `${p}-${String(n).padStart(2, '0')}`;
/** Valida y normaliza un plan. Devuelve {plan, errores}. */
function normalizePlan(p) {
  const errores = [];
  if (!p || typeof p !== 'object') return { plan: null, errores: ['el plan debe ser un objeto JSON'] };
  if (!String(p.objetivo || '').trim()) errores.push('falta «objetivo»');
  const reqs = Array.isArray(p.requisitos) ? p.requisitos : [];
  const tasks = Array.isArray(p.tareas) ? p.tareas : [];
  if (!reqs.length) errores.push('falta al menos un requisito en «requisitos»');
  if (!tasks.length) errores.push('falta al menos una tarea en «tareas»');
  let nc = 0;
  const requisitos = reqs.map((r, i) => {
    const id = String(r.id || pad('REQ', i + 1));
    const crits = Array.isArray(r.criterios) ? r.criterios : [];
    if (!String(r.texto || '').trim()) errores.push(`${id}: falta «texto»`);
    if (!crits.length) errores.push(`${id}: necesita al menos un criterio de aceptación`);
    return {
      id, texto: redact(String(r.texto || '')).slice(0, 400),
      criterios: crits.map(c => {
        const cid = String(c.id || pad('CA', ++nc));
        const kinds = ['control', 'comando', 'manual'].filter(k => c[k]);
        if (kinds.length !== 1) errores.push(`${cid}: indica exactamente uno de «control» (lint/tipos/tests…), «comando» (comando de aceptación) o «manual»: true`);
        return { id: cid, texto: redact(String(c.texto || '')).slice(0, 400), ...(c.control ? { control: String(c.control) } : {}), ...(c.comando ? { comando: String(c.comando) } : {}), ...(c.manual ? { manual: true } : {}) };
      }),
    };
  });
  const reqIds = new Set(requisitos.map(r => r.id));
  const tareas = tasks.map((x, i) => {
    const id = String(x.id || pad('T', i + 1));
    const rs = (Array.isArray(x.requisitos) ? x.requisitos : []).map(String);
    if (!String(x.titulo || '').trim()) errores.push(`${id}: falta «titulo»`);
    if (!rs.length) errores.push(`${id}: indica qué requisitos cubre («requisitos»)`);
    for (const r of rs) if (!reqIds.has(r)) errores.push(`${id}: el requisito ${r} no existe`);
    return { id, titulo: redact(String(x.titulo || '')).slice(0, 200), requisitos: rs, depende: (Array.isArray(x.depende) ? x.depende : []).map(String), archivos: (Array.isArray(x.archivos) ? x.archivos : []).map(f => String(f).replace(/\\/g, '/')), responsable: x.responsable ? String(x.responsable) : null };
  });
  const taskIds = new Set(tareas.map(t => t.id));
  for (const t of tareas) for (const d of t.depende) if (!taskIds.has(d)) errores.push(`${t.id}: depende de ${d}, que no existe`);
  for (const r of requisitos) if (!tareas.some(t => t.requisitos.includes(r.id))) errores.push(`${r.id}: ninguna tarea lo cubre`);
  // Dependencias sin ciclos
  const seen = new Map();
  const visit = (id, stack) => {
    if (seen.get(id) === 'listo') return;
    if (stack.includes(id)) { errores.push(`dependencias en ciclo: ${[...stack, id].join(' → ')}`); return; }
    const t = tareas.find(x => x.id === id);
    for (const d of (t ? t.depende : [])) visit(d, [...stack, id]);
    seen.set(id, 'listo');
  };
  for (const t of tareas) visit(t.id, []);
  const dup = list => list.find((x, i) => list.indexOf(x) !== i);
  if (dup(requisitos.map(r => r.id))) errores.push(`id de requisito repetido: ${dup(requisitos.map(r => r.id))}`);
  if (dup(tareas.map(t => t.id))) errores.push(`id de tarea repetido: ${dup(tareas.map(t => t.id))}`);
  return { plan: { objetivo: redact(String(p.objetivo || '')).slice(0, 400), alcance: redact(String(p.alcance || '')).slice(0, 600), requisitos, tareas }, errores };
}

/** Huella de lo que el usuario aprueba: requisitos, criterios y tareas (no los estados). */
const planHash = t => shortHash(canonical({ o: t.objetivo, a: t.alcance, r: t.requisitos, t: t.tareas.map(x => ({ id: x.id, r: x.requisitos, d: x.depende, f: x.archivos })) }));

/**
 * Registra el plan. Antes de la aprobación lo reemplaza; ya aprobado, queda como PROPUESTA hasta que el usuario
 * vuelva a aprobar (así el agente no puede cambiar ni rebajar los criterios aprobados por su cuenta).
 */
function setPlan(root, raw, { sesion } = {}) {
  const { plan, errores } = normalizePlan(raw);
  if (errores.length) return { ok: false, errores };
  return update(root, t => {
    if (t && t.congelado && t.estado !== 'cerrado') {
      t.propuesta = { ...plan, en: now(), sesion };
      t.historial = [...(t.historial || []), { en: now(), evento: 'propuesta', detalle: 'plan nuevo pendiente de aprobación' }].slice(-100);
      return { trabajo: t, ok: true, propuesta: true };
    }
    const fresh = { v: VERSION, id: newId(), creado: now(), estado: 'borrador', congelado: null, ...plan,
      tareas: plan.tareas.map(x => ({ ...x, estado: 'pendiente', motivo: '', intentos: [], evidencias: [] })),
      evidencias: [], decisiones: (t && t.estado !== 'cerrado' && t.decisiones) || [], excepciones: [], historial: [{ en: now(), evento: 'plan', detalle: `registrado (${sesion || 'sin sesión'})` }] };
    return { trabajo: fresh, ok: true, propuesta: false };
  });
}

/** El usuario aprobó el plan (GATE): se congela; si había una propuesta, la reemplaza conservando lo ya hecho. */
function freeze(root, { sesion, via = 'chat' } = {}) {
  const { trabajo } = load(root);
  if (!trabajo || trabajo.estado === 'cerrado' || (trabajo.congelado && !trabajo.propuesta)) return null;
  return update(root, t => {
    if (t.propuesta) {
      const prev = new Map(t.tareas.map(x => [x.id, x]));
      const p = t.propuesta;
      Object.assign(t, { objetivo: p.objetivo, alcance: p.alcance, requisitos: p.requisitos,
        tareas: p.tareas.map(x => { const o = prev.get(x.id); return { ...x, estado: o ? o.estado : 'pendiente', motivo: o ? o.motivo : '', intentos: o ? o.intentos : [], evidencias: o ? o.evidencias : [] }; }) });
      delete t.propuesta;
    }
    t.congelado = { huella: planHash(t), en: now(), sesion, via };
    if (t.estado === 'borrador') t.estado = 'en_curso';
    t.historial = [...(t.historial || []), { en: now(), evento: 'aprobado', detalle: `plan congelado (${via})` }].slice(-100);
    return { trabajo: t, congelado: t.congelado };
  });
}

// ---------- Evidencias y estado calculado ----------

/** ¿La evidencia sigue valiendo para el contenido actual de sus archivos? */
const vigente = (root, ev) => !!ev && fingerprint(root, ev.archivos || []) === ev.huella;

/** Estado de un criterio: {ok, motivo, evidencia?}. */
function criterion(root, t, req, c) {
  if (c.manual) return { ok: !!t.aceptado, manual: true, motivo: t.aceptado ? 'aceptado por el usuario' : 'requiere la aceptación del usuario' };
  const tasks = t.tareas.filter(x => x.requisitos.includes(req.id));
  const evs = t.evidencias.filter(e => tasks.some(x => (x.evidencias || []).includes(e.id)) || e.origen === 'fin de turno').reverse();
  const match = c.control
    ? evs.find(e => e.tipo === 'sensores' && (e.resumen || []).some(r => r.nombre === c.control && verificado(r.estado)))
    : evs.find(e => e.tipo === 'comando' && e.criterio === c.id && verificado(e.estado));
  if (!match) return { ok: false, motivo: c.control ? `sin evidencia del control «${c.control}»` : 'sin evidencia del comando de aceptación' };
  if (!vigente(root, match)) return { ok: false, motivo: `la evidencia ${match.id} venció: los archivos cambiaron (reverificar)` };
  return { ok: true, evidencia: match.id, motivo: `evidencia ${match.id}` };
}

/** Vista calculada: qué falta y por qué. */
function status(root) {
  const { trabajo: t, problema } = load(root);
  if (problema) return { problema };
  if (!t) return null;
  const tareas = t.tareas.map(x => {
    const evs = (x.evidencias || []).map(id => t.evidencias.find(e => e.id === id)).filter(Boolean);
    const reverify = x.estado === 'verificada' && evs.some(e => !vigente(root, e));
    return { ...x, estado: reverify ? 'por_reverificar' : x.estado, motivo: reverify ? 'sus archivos cambiaron después de verificarla' : x.motivo };
  });
  const requisitos = t.requisitos.map(r => {
    const crits = r.criterios.map(c => ({ ...c, ...criterion(root, t, r, c) }));
    return { ...r, criterios: crits, tecnico: crits.filter(c => !c.manual).every(c => c.ok), completo: crits.every(c => c.ok) };
  });
  const tecnico = !!t.congelado && requisitos.every(r => r.tecnico) && tareas.every(x => x.estado === 'verificada');
  const estado = t.estado === 'cerrado' || t.estado === 'aceptado' ? t.estado : !t.congelado ? 'borrador' : tareas.some(x => x.estado === 'bloqueada') ? 'bloqueado' : tecnico ? 'tecnicamente_completo' : 'en_curso';
  const faltan = [];
  if (!t.congelado) faltan.push('el plan no está aprobado por el usuario');
  if (t.propuesta) faltan.push('hay un plan nuevo propuesto: necesita la aprobación del usuario');
  for (const r of requisitos) for (const c of r.criterios) if (!c.ok) faltan.push(`${r.id}/${c.id}: ${c.motivo}`);
  for (const x of tareas) if (x.estado !== 'verificada') faltan.push(`${x.id} ${ETAREA[x.estado] || x.estado}${x.motivo ? `: ${x.motivo}` : ''}`);
  return { trabajo: t, estado, tecnico, requisitos, tareas, faltan };
}

const ETAREA = { pendiente: 'pendiente', en_curso: 'en curso', bloqueada: 'bloqueada', verificada: 'verificada', por_reverificar: 'por reverificar' };
const ETRABAJO = { borrador: 'plan sin aprobar', en_curso: 'en curso', bloqueado: 'bloqueado', tecnicamente_completo: 'técnicamente completo (falta la aceptación del usuario)', aceptado: 'aceptado por el usuario', cerrado: 'cerrado' };

/** Resumen corto para el contexto del agente (al iniciar y tras compactar) y para la terminal. */
function summary(root, { max = 8 } = {}) {
  const s = status(root);
  if (!s) return '';
  if (s.problema) return `Trabajo del proyecto: no se puede leer (${s.problema}); nada se da por completado hasta revisarlo.`;
  if (s.estado === 'cerrado') return '';
  const lines = [`Trabajo en curso: ${s.trabajo.objetivo} — ${ETRABAJO[s.estado]}`];
  lines.push(`Requisitos: ${s.requisitos.filter(r => r.tecnico).length}/${s.requisitos.length} con evidencia vigente · Tareas: ${s.tareas.map(x => `${x.id} ${ETAREA[x.estado]}${x.responsable ? ` (${x.responsable})` : ''}`).join(' · ')}`);
  if (s.faltan.length) lines.push(`Falta: ${s.faltan.slice(0, max).join(' · ')}${s.faltan.length > max ? ` (+${s.faltan.length - max} más)` : ''}`);
  lines.push('Estado verificable: «node "$HOME/.sdd-orquestador/bin/sdd-harness.js" trabajo». Decir «terminé» no completa nada: cada tarea se verifica con «trabajo verificar <tarea>».');
  return lines.join('\n');
}

// ---------- Transiciones de tareas ----------

function taskOf(t, id) {
  const x = t.tareas.find(y => y.id === id);
  if (!x) throw new Error(`no existe la tarea ${id} (tareas: ${t.tareas.map(y => y.id).join(', ')})`);
  return x;
}
const requireFrozen = t => { if (!t) throw new Error('no hay un trabajo registrado («trabajo plan»)'); if (!t.congelado) throw new Error('el plan aún no está aprobado por el usuario: preséntalo y espera su «sí»'); };

/** Empieza una tarea (sus dependencias deben estar verificadas). Un responsable no pisa a otro sin --tomar. */
function startTask(root, id, { responsable = null, tomar = false } = {}) {
  return update(root, t => {
    requireFrozen(t);
    const x = taskOf(t, id);
    const pend = x.depende.filter(d => taskOf(t, d).estado !== 'verificada');
    if (pend.length) throw new Error(`${id} depende de ${pend.join(', ')}, que aún no están verificadas`);
    if (x.estado === 'en_curso' && x.responsable && responsable && x.responsable !== responsable && !tomar) throw new Error(`${id} ya la trabaja «${x.responsable}» (usa --tomar si de verdad corresponde)`);
    x.estado = 'en_curso'; x.motivo = ''; if (responsable) x.responsable = responsable;
    return { trabajo: t, tarea: x };
  });
}

function blockTask(root, id, motivo) {
  if (!String(motivo || '').trim()) throw new Error('indica el motivo del bloqueo (--motivo "…")');
  return update(root, t => { requireFrozen(t); const x = taskOf(t, id); x.estado = 'bloqueada'; x.motivo = redact(String(motivo)).slice(0, 300); return { trabajo: t, tarea: x }; });
}

/** Registra un intento y aplica el criterio de «sin progreso». */
function addAttempt(x, resultado, firma, limit) {
  x.intentos = [...(x.intentos || []), { n: (x.intentos || []).length + 1, en: now(), resultado, firma }].slice(-20);
  const last = x.intentos.slice(-limit);
  if (last.length === limit && last.every(i => !verificado(i.resultado) && i.firma && i.firma === last[0].firma)) {
    x.estado = 'bloqueada';
    x.motivo = `sin progreso: ${limit} intentos seguidos con el mismo resultado (${ETIQUETA[last[0].resultado] || last[0].resultado}). Detente y consulta al usuario`;
    return true;
  }
  return false;
}

/**
 * Verifica una tarea: corre los controles de sus criterios (sensores) y sus comandos de aceptación sobre sus archivos
 * y guarda la evidencia. Solo con todo verificado (o con excepción del usuario para esa huella) pasa a «verificada».
 */
async function verifyTask(root, id, { cfg, sesion, excepciones = [], cambios = [] } = {}) {
  const { trabajo: t0, problema } = load(root);
  if (problema) throw new Error(`el trabajo guardado no se puede usar: ${problema}`);
  requireFrozen(t0);
  const x0 = taskOf(t0, id);
  const pend = x0.depende.filter(d => taskOf(t0, d).estado !== 'verificada');
  if (pend.length) throw new Error(`${id} depende de ${pend.join(', ')}, que aún no están verificadas`);
  const archivos = [...new Set((x0.archivos.length ? x0.archivos : cambios).filter(f => !/(^|\/)\.sdd\//.test(f)))];
  const crits = t0.requisitos.filter(r => x0.requisitos.includes(r.id)).flatMap(r => r.criterios);
  const controls = [...new Set(crits.filter(c => c.control).map(c => c.control))];
  const huella = fingerprint(root, archivos);
  const evs = [];
  const controles = [];
  if (!archivos.length) controles.push({ nombre: 'archivos', estado: 'no_verificado', obligatorio: true, motivo: 'la tarea no declara archivos y no hay cambios en la sesión' });
  else {
    const code = archivos.filter(f => CODE_EXT.test(f) && fs.existsSync(path.resolve(root, f)));
    const sc = { ...cfg.sensores, alTerminar: [...new Set([...cfg.sensores.alTerminar, ...controls])], obligatorios: [...new Set([...(cfg.sensores.obligatorios || []), ...controls])] };
    const run = code.length ? await runSensors(root, code, { ...cfg, sensores: sc }) : { ran: false, results: [] };
    const found = new Set(run.results.map(r => r.nombre));
    for (const c of controls) if (!found.has(c)) controles.push({ nombre: c, estado: 'no_verificado', obligatorio: true, motivo: code.length ? `no hay un comando para «${c}» en este proyecto (configura sensores.comandos.${c})` : 'la tarea no tiene archivos de código' });
    controles.push(...run.results.map(r => ({ nombre: r.nombre, modulo: r.modulo, estado: r.estado, obligatorio: r.obligatorio, motivo: r.motivo, firma: r.firma })));
    if (run.results.length) evs.push({ tipo: 'sensores', estado: combinar(run.results, { excepciones, huella }).estado, resumen: run.results.map(r => ({ nombre: r.nombre, modulo: r.modulo, estado: r.estado })) });
    for (const c of crits.filter(k => k.comando)) {
      const r = await runShell(c.comando, { cwd: root, timeoutMs: (cfg.sensores.timeoutSeg || 240) * 1000 });
      const estado = r.timedOut ? 'no_verificado' : r.code === 0 ? 'aprobado' : 'fallido';
      const motivo = r.timedOut ? `excedió ${Math.round(r.ms / 1000)} s` : r.code === 0 ? '' : `código ${r.code}: ${truncateMiddle(redact(r.output.trim().split('\n').slice(-6).join(' | ')), 300)}`;
      controles.push({ nombre: `aceptación ${c.id}`, estado, obligatorio: true, motivo, firma: estado === 'fallido' ? shortHash(r.output.slice(-2000)) : undefined });
      evs.push({ tipo: 'comando', criterio: c.id, estado, motivo });
    }
  }
  const res = combinar(controles, { excepciones, huella });
  const firma = verificado(res.estado) ? null : shortHash(controles.filter(c => !verificado(c.estado)).map(c => `${c.nombre}:${c.estado}:${c.firma || c.motivo}`).sort().join('|'));
  const limit = Number((cfg.trabajo || {}).maxIntentosSinProgreso) || 3;
  return update(root, t => {
    const x = taskOf(t, id);
    const ids = evs.map(e => { const ev = { id: `EV-${newId()}`, ...e, huella, archivos, en: now(), sesion, origen: `trabajo verificar ${id}` }; t.evidencias.push(ev); return ev.id; });
    t.evidencias = t.evidencias.slice(-300);
    x.evidencias = [...(x.evidencias || []), ...ids].slice(-30);
    let sinProgreso = false;
    if (verificado(res.estado)) { x.estado = 'verificada'; x.motivo = res.estado === 'excepcion' ? res.motivo : ''; x.intentos = [...(x.intentos || []), { n: (x.intentos || []).length + 1, en: now(), resultado: res.estado }].slice(-20); } else {
      if (x.estado !== 'bloqueada') x.estado = 'en_curso';
      sinProgreso = addAttempt(x, res.estado, firma, limit);
    }
    return { trabajo: t, tarea: x, resultado: res, controles, evidencias: ids, sinProgreso };
  });
}

/**
 * Fin de turno con un trabajo aprobado: la verificación de los sensores queda como evidencia, cuenta como intento de
 * las tareas en curso (para detectar falta de progreso) y vence las tareas verificadas cuyos archivos cambiaron.
 * @returns {string[]} avisos para el agente
 */
function recordRun(root, { sesion, sensores, archivos, cfg }) {
  const { trabajo } = load(root);
  if (!trabajo || !trabajo.congelado || trabajo.estado === 'cerrado' || !sensores || !sensores.estado) return [];
  const limit = Number(((cfg || {}).trabajo || {}).maxIntentosSinProgreso) || 3;
  const notes = [];
  update(root, t => {
    const ev = { id: `EV-${newId()}`, tipo: 'sensores', estado: sensores.estado, resumen: (sensores.resumen || []).map(r => ({ nombre: r.nombre, modulo: r.modulo, estado: r.estado })), huella: fingerprint(root, archivos), archivos, en: now(), sesion, origen: 'fin de turno' };
    t.evidencias = [...t.evidencias, ev].slice(-300);
    const firma = verificado(sensores.estado) ? null : shortHash((sensores.resumen || []).filter(r => !verificado(r.estado)).map(r => `${r.nombre}:${r.estado}:${r.firma || r.motivo}`).sort().join('|'));
    for (const x of t.tareas) {
      if (x.estado === 'en_curso') {
        x.evidencias = [...(x.evidencias || []), ev.id].slice(-30);
        if (addAttempt(x, sensores.estado, firma, limit)) notes.push(`${x.id} quedó BLOQUEADA: ${x.motivo}.`);
      } else if (x.estado === 'verificada') {
        const evs = (x.evidencias || []).map(id => t.evidencias.find(e => e.id === id)).filter(Boolean);
        if (evs.some(e => !vigente(root, e))) { x.estado = 'por_reverificar'; x.motivo = 'sus archivos cambiaron después de verificarla'; notes.push(`${x.id} vuelve a «por reverificar»: sus archivos cambiaron.`); }
      }
    }
    return { trabajo: t };
  });
  return notes;
}

/** Aceptación funcional (solo el usuario, desde su terminal: el agente no puede ejecutarla). */
function accept(root, { motivo = '' } = {}) {
  return update(root, t => {
    requireFrozen(t);
    t.aceptado = { en: now(), motivo: redact(String(motivo)).slice(0, 300) };
    t.estado = 'aceptado';
    t.historial = [...(t.historial || []), { en: now(), evento: 'aceptado', detalle: 'aceptación funcional del usuario' }].slice(-100);
    return { trabajo: t };
  });
}

/** Cierra (aceptado) o descarta (solo el usuario) el trabajo actual. */
function close(root, { descartar = false } = {}) {
  return update(root, t => {
    if (!t) throw new Error('no hay un trabajo registrado');
    if (!descartar && t.estado !== 'aceptado') throw new Error('solo se cierra un trabajo aceptado por el usuario (o lo descarta el usuario: «trabajo descartar»)');
    t.estado = 'cerrado'; t.cerrado = { en: now(), descartado: descartar };
    return { trabajo: t };
  });
}

function addDecision(root, texto, motivo) {
  if (!String(texto || '').trim() || !String(motivo || '').trim()) throw new Error('indica la decisión y su motivo: trabajo decision "texto" --motivo "por qué"');
  return update(root, t => { if (!t) throw new Error('no hay un trabajo registrado'); t.decisiones = [...(t.decisiones || []), { en: now(), texto: redact(String(texto)).slice(0, 300), motivo: redact(String(motivo)).slice(0, 300) }].slice(-50); return { trabajo: t }; });
}

module.exports = { load, status, summary, normalizePlan, setPlan, freeze, startTask, blockTask, verifyTask, recordRun, accept, close, addDecision, planHash, ETAREA, ETRABAJO };
