'use strict';
// GATE por código: en un pedido de cambio, las ediciones quedan bloqueadas hasta que el USUARIO
// aprueba el plan en el chat. El modelo no puede abrirlo: solo cambia con los mensajes del usuario.
//   inicial ──(pedido de cambio)──► requerido ──(el agente pregunta)──► pendiente ──(usuario: "sí")──► aprobado
// Un mensaje abre el GATE salvo que se reconozca como consulta, saludo, aprobación o pedido directo: reconocer la
// consulta tiene formas acotadas y reconocer el pedido de cambio no (medido en evals/gate/frases.json).
//   cualquier estado ──("directo" / "sin plan")──► libre

const A = require('./aprobaciones');
const { redact } = require('./secrets');

// Límites de palabra que entienden tildes y ñ (\b de JavaScript solo considera ASCII).
const W = '[\\p{L}\\p{N}_]';
const words = (list, flags = 'iu') => new RegExp(`(?<!${W})(?:${list})(?!${W})`, flags);

const NEGATED = /^[\s¡!"'«]*[\p{L}]+\s+que\s+no(?![\p{L}])/iu; // "claro que no", "obvio que no"
const CONDITIONAL_SI = /^[\s¡!"'«]*si\s+(?:puedes|pod[eé]s|podr[ií]as|quieres|quer[eé]s|hay|es|est[aá]n?|tienes|ten[eé]s|no|se|me|te|lo|la|los|las|el|ella|ellos|existe|falla|funciona|fuera|fuese|necesitas|ves)(?![\p{L}\p{N}_])/iu;
const ESCAPE = words('directo|directamente|sin plan|sin gate|no (?:necesito|hace falta) (?:el |un )?plan');
// Apagar / volver a encender el orquestador para el resto de la conversación
const SDD_OFF = words('sin sdd|sin (?:el )?orquestador|(?:desactiva|desactivar|apaga|apagar|deshabilita) (?:el )?(?:sdd|orquestador)|no uses (?:el )?(?:sdd|orquestador)');
const SDD_ON = words('con sdd|(?:activa|activar|reactiva|reactivar|enciende|usa|usar|vuelve a usar) (?:el )?(?:sdd|orquestador)');
const CHANGE = words(`agreg${W}*|añad${W}*|anad${W}*|incorpor${W}*|cre(?:a|ar|ame|alo|ala|ate|en|emos)|implement${W}*|desarroll${W}*|constru${W}*|codific${W}*|corrig${W}*|corrij${W}*|arregl${W}*|solucion${W}*|repar${W}*|refactori${W}*|reorganiz${W}*|reestructur${W}*|reescrib${W}*|migr[ae]${W}*|actualiz${W}*|modific${W}*|cambi[ae]${W}*|elimin${W}*|borr[ae]${W}*|quit[ae]${W}*|renombr${W}*|muev[ae]${W}*|integr[ae]${W}*|conect[ae]${W}*|configur[ae]${W}*|optimiz${W}*|ajust[ae]${W}*|add|create|implement${W}*|build|fix${W}*|refactor${W}*|migrate|update|upgrade|change|remove|delete|rename|rewrite|optimi[sz]e`);
const FIX = words("no funciona|no anda|no carga|no compila|no levanta|no guarda|falla|fallan|fallando|error|errores|bug|bugs|se rompe|se cae|roto|rota|rompi[oó]|se ve mal|crash\\w*|excepci[oó]n|exception|stack ?trace|traceback|broken|not working|doesn'?t work");
// Ticket referido por su identificador: Jira (LAB-123), Azure Boards (AB#1234, PBI 4521) o el enlace del work item.
const TICKET = /(?<![A-Za-z0-9_])(?:[A-Z][A-Z0-9]{1,9}-\d+|AB#\d+|PBI[ #-]?\d+)(?![A-Za-z0-9_])|_workitems\/edit\/\d+/;
const WORK = words(`resuelv${W}*|resolv${W}*|trabaj[ae]${W}*`);
const CONTINUE = words('sigue|segu[ií]|contin[uú]a|continuar|contin[uú]e|termina|terminar|falta|faltan|lo que queda|el resto|tambi[eé]n|adem[aá]s|retoma|relanza|reintenta');
const NON_CODE = words('prototipo|prototipos|maqueta|maquetas|mockup|mockups|wireframe|wireframes'); // solo genera el prototipo
const GATE_QUESTION = /¿\s*apruebo la implementaci[oó]n\s*\?/i;

// Contexto que algunas herramientas anteponen al mensaje del usuario (IDE, navegador integrado, archivo abierto…).
// Ej.: Codex en VS Code/app → "# Context from my IDE setup: … ## My request for Codex:\nsí";
// Claude Code en VS Code → "<ide_opened_file>…</ide_opened_file>sí".
const REQUEST_MARK = /^[ \t]*#{1,6}[ \t]*(?:my (?:request|message|prompt)|user (?:request|message|prompt)|mi (?:pedido|solicitud|mensaje)|(?:pedido|solicitud|mensaje) del usuario)(?![\p{L}])[^\n]*$/gimu;
const TAG_BLOCK = /<([a-z][\w.:-]*)(?:\s[^>]*)?>[\s\S]*?<\/\1\s*>/giu;
const SELF_TAG = /<[a-z][\w.:-]*(?:\s[^>]*)?\/>/giu;
const CONTEXT_WORDS = 'context|contexto|browser|navegador|ide|editor|page|p[aá]gina|tab|tabs|pesta[ñn]as?|selection|selecci[oó]n|selected|seleccionado|file|files|archivo|archivos|environment|entorno|url|screenshot|captura';
const CONTEXT_START = new RegExp(`^\\s*(?:<|[#\\[][^\\n]*?(?<!${W})(?:${CONTEXT_WORDS})(?!${W}))`, 'iu');
const CONTEXT_LINE = /^\s*(?:[#<>\[`|]|---|[-*•]\s|https?:\/\/|[\p{L}][\p{L}\p{N} _./-]{0,40}:\s*\S)/u;

/** Texto escrito por el usuario, sin el contexto que la herramienta le antepone. */
function userText(prompt) {
  let t = String(prompt || '').replace(/\r\n?/g, '\n');
  let m, end = -1;
  REQUEST_MARK.lastIndex = 0;
  while ((m = REQUEST_MARK.exec(t))) end = m.index + m[0].length;
  if (end >= 0) t = t.slice(end);
  for (let i = 0; i < 5; i++) {
    const n = t.replace(TAG_BLOCK, '\n').replace(SELF_TAG, '');
    if (n === t) break;
    t = n;
  }
  t = t.trim();
  if (!CONTEXT_START.test(t)) return t;
  // Bloque de contexto desconocido al inicio: el mensaje del usuario es el último párrafo
  // (o la última línea si no hay línea en blanco que los separe).
  const paras = t.split(/\n[ \t]*\n/).map(p => p.trim()).filter(Boolean);
  const lastPara = paras.length > 1 ? paras[paras.length - 1] : '';
  if (lastPara && !CONTEXT_LINE.test(lastPara)) return lastPara;
  return t.split('\n').map(l => l.trim()).filter(Boolean).pop() || t;
}

// ---------- Aprobación en lenguaje natural ----------
// Se compara sin tildes ni mayúsculas. Aprobar es: afirmar ("sí", "dale", "ya po", "ok") o pedir que avance
// ("desarrolla", "implementalo", "procede", "hazlo", "manos a la obra"), solo o referido al plan
// ("desarrolla lo propuesto", "implementa todo tal cual"). No es aprobar: negar, pedir esperar, preguntar,
// o pedir algo nuevo ("desarrolla el módulo de pagos" es un pedido, no un "sí").
const fold = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
// Afirmaciones fuertes: aprueban al inicio del mensaje ("sí, pero usa azul"). Débiles: solo si van solas o junto a otra.
const STRONG = 'si+|sip|ok(?:ay|ey|i|a)?|oki|okis|dale|dele|apruebo|apruebalo|aprobad[oa]|autoriz(?:o|ado|ada)|confirm(?:o|ado|ada)|adelante|de acuerdo|deacuerdo|perfecto|listo|lista|vamos|correcto|conforme|claro|genial|excelente|me parece bien|esta bien|metele|mandale|de una|yes|yep|go ahead|go|lgtm|approved|ship it';
const WEAK = 'ya(?: po)?|ya pues|bien|buena|va|sale|vale|hecho|obvio|por supuesto|bacan|filete|joya|buenisimo|vamo|ta bien|me parece|sure|yeah|perfect';
const AFFIRM = `${STRONG}|${WEAK}`;
const PROCEED = [
  'desarroll(?:a|ar|ad|en|e|emos|alo|ala|alos|alas|amelo|enlo|elo)',
  'implement(?:a|ar|ad|en|e|emos|alo|ala|alos|alas|amelo|enlo|elo)',
  'ejecut(?:a|ar|ad|en|e|alo|ala|elo|enlo)', 'aplic(?:a|ar|ad|alo|ala|alos|alas|alo)', 'proced(?:e|er|an|amos|ed)', 'prosig(?:ue|a)|proseguir',
  'avanz(?:a|ar|en|amos|ad)', 'continu(?:a|ar|en|emos|ad)', 'sig(?:ue|an|amos)|segui|seguir', 'arranc(?:a|ar|en|amos)',
  'comienz(?:a|en)|comenzar|comencemos|empiez(?:a|en)|empezar|empecemos', 'inici(?:a|ar|en|emos)',
  'hazlo|haz|hacelo|hacedlo|haganlo|hagale|hagamoslo|hagamos|hacerlo|hagalo', 'programa(?:lo)?|codifica(?:lo)?|construye(?:lo)?|construir',
  'manos a la obra|a darle|dale nomas|anda nomas|hazle', 'do it|proceed|implement(?: it)?|build it|go for it|let.?s go',
].join('|');
// Lo que puede seguir al verbo sin convertirlo en un pedido nuevo (se refiere al plan presentado)
const PLAN_REF = '(?:(?:con |segun |como |tal |lo |la |el |los |las |todo |toda |todos |eso |esto |ahora |ya |nomas |no mas |entonces |porfa |por favor |pls |please |al tiro |altiro |ya mismo )*(?:el plan|la propuesta|lo propuesto|lo planteado|lo acordado|lo conversado|lo que (?:propusiste|planteaste|dijiste|acordamos)|todo|toda|eso|esto|tal cual|asi|como (?:esta|dijiste|lo propusiste)|los cambios|la solucion|la implementacion|ahora|nomas|no mas|ya|entonces|porfa|por favor|pls|please|al tiro|altiro|ya mismo|completo|entero|de una)?)?';
const LEAD = `(?:(?:${AFFIRM}|bueno|entonces|ahora|porfa|por favor|pls|please|y)[\\s,.!;:]+)*`;
const STRONG_RE = new RegExp(`^[\\s¡!"'«(]*(?:${STRONG})(?![\\p{L}\\p{N}])`, 'u');
const WEAK_RE = new RegExp(`^[\\s¡!"'«(]*(?:${WEAK})(?:[\\s,.!;:]+(?:${AFFIRM}))*[\\s,.!;:)»"']*$`, 'u');
const APPROVE_RE = new RegExp(`^[\\s¡!"'«(]*${LEAD}(?:si (?:puedes|quieres|podes|queres|te parece)[\\s,]+)?(?:${PROCEED})(?![\\p{L}\\p{N}])[\\s,.!;:]*${PLAN_REF}[\\s,.!;:)»"']*$`, 'u');
const HOLD = /(?<![\p{L}])(?:no (?:desarroll|implement|ejecut|apliqu|avanc|sig|continu|empiec|comienc|arranqu|lo hag|hag|toques|edites|cambies|todavia|aun|aún|ahora|por ahora)|todavia no|aun no|mejor no|espera|esperate|aguanta|alto|detente|para(?: ahi)?$|stop|cancel|pero antes|antes de (?:implementar|desarrollar|seguir|continuar|avanzar|empezar)|primero (?:explica|dime|aclara|revisa|muestra|responde))/u;

// ---------- Apagar o encender el orquestador: solo como instrucción, no dentro de contenido pegado ----------
// Un log con la frase apagó el orquestador: la instrucción tiene que ser el mensaje, no aparecer en lo pegado.
const SWITCH_MAX = 160;
const LOOKS_PASTED = /```|^\s*(?:at |Error\b|error:|Exception|Traceback|FAIL\b|PASS\b|not ok \d|ok \d|#\s|[✓✗×√]|\d+\)|[[{<]|(?:test|it|describe|assert)\s*\()/m;
/** Parte del mensaje donde «sin sdd»/«con sdd» cuentan: mensajes cortos que no parecen pegados. */
const switchScope = text => {
  const t = String(text || '').trim();
  if (!t || t.length > SWITCH_MAX || LOOKS_PASTED.test(t)) return '';
  return t.split('\n')[0].slice(0, 120);
};

const isApproval = text => {
  const t = fold(text).trim();
  if (!t || HOLD.test(t) || NEGATED.test(t)) return false;
  if (/^[¿?]/.test(t) || (/\?\s*$/.test(t) && !/^[\s¡!"'«]*(?:si|ok|dale)(?![\p{L}])/u.test(t))) return false; // preguntas
  if (STRONG_RE.test(t) && !CONDITIONAL_SI.test(t)) return true;
  return WEAK_RE.test(t) || APPROVE_RE.test(t);
};
const isChangeRequest = text => !NON_CODE.test(text) && (CHANGE.test(text) || FIX.test(text) || TICKET.test(text) || WORK.test(text));

// Aprobación «limpia»: el mensaje es solo el sí, con o sin referencia al plan. «dale soporte a paginación»
// empieza con una afirmación pero trae un pedido nuevo, así que no exime de presentar plan.
const ONLY_APPROVAL_RE = new RegExp(`^[\\s¡!"'«(]*${LEAD}(?:${AFFIRM}|${PROCEED})(?![\\p{L}\\p{N}])[\\s,.!;:]*${PLAN_REF}[\\s,.!;:)»"']*$`, 'u');
const isOnlyApproval = text => {
  const t = fold(text).trim();
  return !!t && !HOLD.test(t) && !NEGATED.test(t) && ONLY_APPROVAL_RE.test(t);
};

// ---------- Consulta: lo único que NO abre el GATE (además de aprobar, «directo» y saludar) ----------
// Pide información. No incluye los modales de pedido cortés («¿puedes…?», «¿podrías…?», «¿me haces…?»),
// que son pedidos de cambio con forma de pregunta.
const CONSULT_WORD = 'qu[eé]|cu[aá]l(?:es)?|c[oó]mo|d[oó]nde|cu[aá]ndo|cu[aá]nt[oa]s?|qui[eé]n(?:es)?|por qu[eé]|para qu[eé]|hay|existen?|est[aá]n?|es|son|tienen?|sabes|sab[eé]s|conoces|se puede|se usa|se hace|what|which|how|where|when|why|who|whose|is|are|was|were|does|do|did|has|have';
const CONSULT_VERB = `explic${W}*|descri[bv]${W}*|resum${W}*|list[ae]${W}*|enumera|muestr${W}*|mu[eé]stram${W}*|ens[eé][nñ]am${W}*|dime|cu[eé]ntame|indica|aclara|compar[ae]${W}*|analiz${W}*|revis${W}*|audit${W}*|inspeccion${W}*|busc${W}*|encuentr${W}*|ubic${W}*|identific${W}*|verific${W}*|investig${W}*|averigu${W}*|diagnostic${W}*|lee|leer|explain|describe|summari[sz]e|list|show|tell|compare|analy[sz]e|review|audit|find|search|locate|identify|check|inspect|read`;
const CONSULTA_RE = new RegExp(`^[\\s¡¿"'«(]*(?:${CONSULT_WORD}|${CONSULT_VERB})(?!${W})`, 'iu');
// Señal de cambio lo bastante fuerte para vetar una frase con forma de consulta: «revisa por qué falla» pide
// arreglar, «resume los cambios» no. Son formas verbales completas, así que sustantivos que CHANGE y FIX
// reconocen por prefijo («cambios», «errores», «configuración») no convierten una consulta en pedido.
const CHANGE_VERB = words(`agrega|agregar|agr[eé]ga${W}*|a[nñ]ade|a[nñ]adir|crea|crear|implementa|implementar|desarrolla|desarrollar|corrige|corregir|arregla|arreglar|soluciona|solucionar|repara|reparar|refactoriza|refactorizar|reescribe|reescribir|migra|migrar|actualiza|actualizar|modifica|modificar|cambia|cambiar|c[aá]mbia${W}*|elimina|eliminar|borra|borrar|quita|quitar|renombra|renombrar|mueve|mover|integra|integrar|conecta|conectar|configura|configurar|optimiza|optimizar|ajusta|ajustar|add|create|implement|fix|refactor|migrate|update|change|remove|delete|rename|rewrite`);
const BROKEN = words("no funciona|no anda|no carga|no compila|no levanta|no guarda|falla|fallan|fallando|se rompe|se cae|roto|rota|rompi[oó]|se ve mal|crash\\w*|excepci[oó]n|exception|stack ?trace|traceback|bug|bugs|broken|not working|doesn'?t work");

// «qué» y «hay» son ambiguos: «qué hace este archivo» pregunta, pero «que el formulario valide el RUT» y
// «hay que validar el RUT» piden un cambio. Solo cuentan como consulta con marca de pregunta o con tilde.
const AMBIGUO_RE = new RegExp(`^[\\s¡¿"'«(]*(?:que|hay)(?!${W})`, 'iu');
const PREGUNTA_RE = new RegExp(`^[\\s¡!"'«(]*¿|\\?\\s*$|^[\\s¡¿"'«(]*qu[éá]`, 'iu');

/** Mensaje que pide información o revisar sin modificar. */
const isConsulta = text => {
  const t = String(text || '').trim();
  // La marca de consulta se compara sin tildes («explícame» entra por «explic»); el veto, sobre el texto real.
  const f = fold(t);
  if (!CONSULTA_RE.test(f)) return false;
  if (AMBIGUO_RE.test(f) && !PREGUNTA_RE.test(t)) return false;
  return !CHANGE_VERB.test(t) && !BROKEN.test(t) && !TICKET.test(t);
};

// Saludos y cortesías: no son pedidos ni consultas, y no deben abrir el GATE.
const SMALL_TALK = /^[\s¡!¿?"'«(]*(?:hola|holi|buenas|buen[oa]s (?:d[ií]as|tardes|noches)|hey|hi|hello|qu[eé] tal|c[oó]mo (?:est[aá]s|vas)|(?:muchas |mil )?gracias|ok(?:ey)? gracias|dale gracias|chao|chau|adi[oó]s|nos vemos|hasta luego|bienvenid[oa])[\s.,!?]*(?:[\s¡!¿?"'«(]*(?:hola|buenas|gracias|ok(?:ey)?|bien|todo bien|y t[uú]|c[oó]mo (?:est[aá]s|vas))[\s.,!?]*)*$/iu;

/**
 * ¿Este mensaje exige plan aprobado antes de editar? Por defecto SÍ. La excepción es lo que se reconoce con
 * precisión: consulta, saludo, aprobación o pedido directo. Antes la pregunta era la inversa («¿parece un
 * pedido de cambio?») y dejaba pasar sin plan la mayoría de las redacciones naturales (banco: 59,5%).
 */
const requiresPlan = text => {
  const t = String(text || '').trim();
  if (!t) return false;
  if (isConsulta(t)) return false;          // consulta reconocida (su veto cubre el pedido con forma de pregunta)
  if (isChangeRequest(t)) return true;      // señal explícita de cambio
  if (NON_CODE.test(t)) return false;       // prototipo o maqueta: no toca el código del proyecto
  if (SMALL_TALK.test(t) || isOnlyApproval(t)) return false;
  return true;                              // no se reconoció: se exige plan (ver encabezado)
};

/** ¿El último mensaje del agente termina pidiendo algo al usuario? */
function asksUser(lastMessage) {
  const t = String(lastMessage || '').trim();
  if (!t) return false;
  return GATE_QUESTION.test(t) || t.slice(-400).includes('?');
}

/**
 * Actualiza el estado con el mensaje del usuario. Devuelve avisos para el agente.
 * @param {object} state estado de la sesión (se modifica)
 * @param {string} prompt
 * @param {{gate: string}} cfg
 */
function onPrompt(state, prompt, cfg) {
  const text = userText(prompt);
  state.mensajeUsuario = redact(text.replace(/\s+/g, ' ')).slice(0, 60);
  const notes = [];
  const g = state.gate;
  const approval = isApproval(text);
  const now = new Date().toISOString();

  // Acciones críticas que esperaban confirmación en el chat (ligadas a la acción exacta; ver aprobaciones.js)
  const reply = A.onUserReply(state, text, approval, { vigenciaMin: Number((cfg.aprobaciones || {}).vigenciaMin) || 30 });
  const commandsPending = reply.habia;
  notes.push(...reply.notas);

  // Orquestador apagado por el usuario para esta conversación: sin GATE ni flujos hasta que diga «con sdd».
  const wasOff = state.sdd === 'off';
  const sw = switchScope(text);
  if (wasOff && SDD_ON.test(sw)) {
    state.sdd = 'on';
    state.gate = { estado: 'inicial', desde: now };
    notes.push('El usuario reactivó el orquestador SDD: vuelve a usar los flujos, y en pedidos de cambio presenta el plan y espera su aprobación.');
    return notes;
  }
  if (wasOff || SDD_OFF.test(sw)) {
    state.sdd = 'off';
    state.gate = { estado: 'libre', desde: now };
    notes.push(wasOff
      ? 'Orquestador SDD desactivado por el usuario: responde y edita directo, sin flujos [SDD], sub-agentes ni plan.'
      : 'El usuario DESACTIVÓ el orquestador SDD para esta conversación: responde y edita directo, como un asistente normal. No anuncies flujos [SDD], no lances sub-agentes, no presentes plan ni preguntes «¿Apruebo la implementación?». Se reactiva si escribe «con sdd». Siguen vigentes: commit y resto de git con confirmación y secretos protegidos.');
    return notes;
  }

  if (cfg.gate === 'nunca') return notes;
  // Un "sí" a un comando no aprueba el plan, salvo que el agente haya mostrado la pregunta del GATE.
  const approvesPlan = approval && ((g.estado === 'pendiente' && (g.conPlan || !commandsPending)) || (g.estado === 'requerido' && !commandsPending && !state.conMensajes));
  // gate 'pedido' conserva el criterio anterior: solo abre el GATE un pedido reconocido por su texto.
  const pide = cfg.gate === 'pedido' ? isChangeRequest(text) : requiresPlan(text);
  if (ESCAPE.test(text)) {
    state.gate = { estado: 'libre', desde: now };
    state.objetivo = redact(text.replace(/\s+/g, ' ').trim()).slice(0, 300);
    notes.push('Pedido marcado como directo: puedes editar sin presentar plan (igual valida con tests/lint).');
  } else if (approvesPlan) {
    state.gate = { estado: 'aprobado', desde: now };
    notes.push('Plan aprobado por el usuario: puedes implementar. Los sensores revisarán el código al terminar.');
  } else if (pide && !(approval && (g.estado === 'aprobado' || commandsPending)) && !(g.estado === 'aprobado' && CONTINUE.test(text))) {
    state.gate = { estado: 'requerido', desde: now };
    state.objetivo = redact(text.replace(/\s+/g, ' ').trim()).slice(0, 300);
    notes.push(isChangeRequest(text)
      ? 'Pedido de cambio: las ediciones de código quedan bloqueadas hasta que presentes el plan y el usuario lo apruebe («¿Apruebo la implementación? (sí / no / ajustes)»); explorar, leer y correr tests sí puedes. Si es trivial, pregunta si lo aplicas directo.'
      : 'Este mensaje no es una consulta ni un saludo: si implica modificar código, presenta el plan y espera la aprobación del usuario («¿Apruebo la implementación? (sí / no / ajustes)»). Si solo hay que responder o explorar, hazlo: leer, buscar e inspeccionar está permitido; editar, no. Si es trivial, pregunta si lo aplicas directo.');
  }
  return notes;
}

/** Al terminar el turno: si el agente quedó preguntando, el GATE pasa a "pendiente" (conPlan: mostró la pregunta del GATE). */
function onStop(state, lastMessage) {
  if (state.sdd === 'off') return;
  const e = state.gate.estado;
  const withPlan = GATE_QUESTION.test(String(lastMessage || ''));
  // Si el agente terminó su turno con las ediciones bloqueadas, está esperando al usuario (aunque no lo haya
  // formulado como pregunta): el siguiente "sí" cuenta como aprobación.
  // Si muestra la pregunta del GATE, queda esperando aprobación aunque el harness no haya detectado el pedido
  // (gate "siempre", pedido redactado de otra forma, sesión retomada): así el "sí" siguiente siempre cuenta.
  if (e === 'requerido' || (withPlan && e !== 'pendiente' && e !== 'libre')) state.gate = { estado: 'pendiente', desde: new Date().toISOString(), conPlan: withPlan };
  else if (e === 'pendiente' && withPlan) state.gate.conPlan = true;
}

/** Tipo de mensaje, para el registro (sin guardar el texto). */
const classify = text => SDD_OFF.test(switchScope(text)) ? 'sin sdd' : SDD_ON.test(switchScope(text)) ? 'con sdd' : ESCAPE.test(text) ? 'directo'
  : isApproval(text) ? 'aprobación' : isChangeRequest(text) ? 'pedido de cambio' : SMALL_TALK.test(text) ? 'saludo'
  : isConsulta(text) ? 'consulta' : 'pedido sin verbo reconocido';

/** Aprobación pura: "sí", "dale", "desarrolla", "ok, implementa todo"… sin pedidos nuevos (respaldo desde la conversación). */
const isPureApproval = text => {
  const t = String(text || '').trim();
  return t.length <= 80 && isApproval(t) && (APPROVE_RE.test(fold(t)) || !isChangeRequest(t));
};

/** Aprueba el plan bloqueado cuando la aprobación se leyó de la conversación guardada por la herramienta. */
function approveFromTranscript(state, cfg) {
  if (!editBlockReason(state, cfg)) return false;
  state.gate = { estado: 'aprobado', desde: new Date().toISOString(), via: 'conversación' };
  return true;
}

/** Motivo de bloqueo para editar, o null si se puede. */
function editBlockReason(state, cfg) {
  if (cfg.gate === 'nunca' || state.sdd === 'off') return null;
  const e = state.gate.estado;
  if (e === 'requerido' || e === 'pendiente' || (cfg.gate === 'siempre' && e === 'inicial')) {
    return 'GATE del harness: el plan de este cambio aún no está aprobado por el usuario. Presenta el plan (qué y por qué, archivos por capa, tests previstos, riesgos) y termina con «¿Apruebo la implementación? (sí / no / ajustes)». Si el cambio es trivial, pregunta si lo aplicas directo. Termina tu turno ahí. El usuario aprueba con su propio lenguaje ("sí", "dale", "ok", "ya", "desarrolla", "implementa", "procede", "hazlo", "directo"…): no le exijas una palabra exacta. Mientras tanto puedes explorar (leer, buscar, correr tests); no intentes editar por otra vía.'
      + (state.mensajeUsuario ? ` (Último mensaje del usuario según el harness: «${state.mensajeUsuario}»; si no coincide con lo que escribió, pídele que apruebe desde su terminal con: node "$HOME/.sdd-orquestador/bin/sdd-harness.js" aprobar)` : '');
  }
  return null;
}

module.exports = { onPrompt, onStop, editBlockReason, approveFromTranscript, classify, isApproval, isPureApproval, isOnlyApproval, isChangeRequest, isConsulta, requiresPlan, switchScope, asksUser, userText, GATE_QUESTION };
