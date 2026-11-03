'use strict';
// Reglas de permiso de Claude Code para Bash, para que el compactador de salidas no conceda nada que el usuario no haya
// concedido. Claude Code evalúa sus reglas «ask» y «deny» contra el comando que devuelve el hook (el envuelto), no contra
// el original: por eso solo se compacta un comando que las reglas del usuario YA permiten y que ninguna regla de
// preguntar o denegar toca. Ante cualquier duda (archivo ilegible, regla que podría aplicar) no se compacta.
// Sintaxis (code.claude.com/docs/en/permissions): «Bash» = todo · «*» en cualquier parte · un «*» final precedido de
// espacio (o «:*») también cubre el comando solo · se evalúa deny, luego ask, luego allow · en un comando compuesto
// cada parte debe estar permitida y basta una parte para que apliquen deny o ask.
// Archivos (code.claude.com/docs/en/settings y /managed-settings): ~/.claude/settings.json, <proyecto>/.claude/
// settings.json y settings.local.json, y la política en archivo (managed-settings.json y managed-settings.d/*.json).
// Desde un hook NO se pueden ver: políticas por registro de Windows, perfil de macOS o servidor, ni --allowedTools /
// --disallowedTools. Si la organización deniega comandos de test por esas vías, conviene salida.compactar: false.
const fs = require('fs');
const path = require('path');
const { HOME } = require('../paths');
const { splitSegments } = require('../policy');

const MANAGED_DIR = {
  win32: path.join(process.env.ProgramFiles || 'C:\\Program Files', 'ClaudeCode'),
  darwin: '/Library/Application Support/ClaudeCode',
  linux: '/etc/claude-code',
}[process.platform] || '/etc/claude-code';

/** Archivos de configuración de Claude Code que aplican a este proyecto (existan o no). */
function settingsFiles(root, { home = HOME, managedDir = process.env.SDD_CLAUDE_MANAGED_DIR || MANAGED_DIR } = {}) {
  const files = [path.join(home, '.claude', 'settings.json')];
  if (root) files.push(path.join(root, '.claude', 'settings.json'), path.join(root, '.claude', 'settings.local.json'));
  files.push(path.join(managedDir, 'managed-settings.json'));
  try { files.push(...fs.readdirSync(path.join(managedDir, 'managed-settings.d')).filter(f => f.endsWith('.json')).sort().map(f => path.join(managedDir, 'managed-settings.d', f))); } catch { /* sin carpeta */ }
  return files;
}

/** Reglas de un archivo: {allow, ask, deny} o {problema} si existe pero no se puede leer (no se toma como permiso). */
function readRules(file) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch (e) { return e.code === 'ENOENT' || e.code === 'ENOTDIR' ? { allow: [], ask: [], deny: [] } : { problema: `${file} (${e.code})` }; }
  let data;
  try { data = JSON.parse(raw.replace(/^\uFEFF/, '')); } catch { return { problema: `${file} (JSON inválido)` }; }
  const p = (data && data.permissions) || {};
  const list = k => (Array.isArray(p[k]) ? p[k].filter(x => typeof x === 'string') : []);
  return { allow: list('allow'), ask: list('ask'), deny: list('deny') };
}

const esc = s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
/** Especificador de una regla Bash: null si no es de Bash, '' si es «Bash» a secas (todo). */
const bashSpec = rule => { const m = /^\s*Bash\s*(?:\(([\s\S]*)\))?\s*$/.exec(String(rule)); return m ? (m[1] === undefined ? '' : m[1]) : null; };

/** ¿El comando coincide con el especificador, según la sintaxis documentada de Claude Code? */
function coincide(spec, command) {
  let s = String(spec);
  if (s.endsWith(':*')) s = `${s.slice(0, -2)} *`;
  const stars = (s.match(/\*/g) || []).length;
  // Un «*» final con espacio delante, si es el único comodín, también cubre el comando solo («ls *» ↔ «ls»)
  const re = stars === 1 && s.endsWith(' *') ? new RegExp(`^${esc(s.slice(0, -2))}(?: [\\s\\S]*)?$`) : new RegExp(`^${s.split('*').map(esc).join('[\\s\\S]*')}$`);
  return re.test(String(command).trim());
}

/**
 * ¿Las reglas aplican a esta parte del comando? Para permitir se exige coincidencia exacta con la sintaxis; para
 * preguntar o denegar basta con que alguna variante razonable coincida (sin variables iniciales, espacios normalizados).
 */
function applies(rules, seg, { strict }) {
  const variants = strict ? [seg] : [seg, seg.replace(/\s+/g, ' '), seg.replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+/, '')];
  return rules.some(rule => {
    const spec = bashSpec(rule);
    if (spec === null) return false;
    if (spec.trim() === '') return true; // «Bash» o «Bash()»: todos los comandos
    return variants.some(v => coincide(spec, v));
  });
}

/**
 * ¿Compactar este comando concede algo que el usuario no concedió? Devuelve {ok:true} solo si TODAS sus partes están
 * permitidas por las reglas del usuario y ninguna regla de preguntar o denegar toca alguna parte.
 * @returns {{ok:boolean, motivo?:string}}
 */
function permite(root, command, opts = {}) {
  const segs = splitSegments(String(command || ''));
  if (!segs.length) return { ok: false, motivo: 'comando vacío' };
  const all = { allow: [], ask: [], deny: [] };
  for (const f of settingsFiles(root, opts)) {
    const r = readRules(f);
    if (r.problema) return { ok: false, motivo: `no se pudo leer ${r.problema}` };
    for (const k of Object.keys(all)) all[k].push(...r[k]);
  }
  for (const seg of segs) {
    if (applies(all.deny, seg, { strict: false })) return { ok: false, motivo: 'una regla de denegar lo toca' };
    if (applies(all.ask, seg, { strict: false })) return { ok: false, motivo: 'una regla de preguntar lo toca' };
  }
  const missing = segs.find(seg => !applies(all.allow, seg, { strict: true }));
  return missing ? { ok: false, motivo: `«${missing}» no está permitido en tus reglas de Claude Code` } : { ok: true };
}

module.exports = { permite, coincide, settingsFiles, readRules };
