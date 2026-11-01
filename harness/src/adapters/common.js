'use strict';
// Utilidades compartidas por los adaptadores de cada herramienta.
const fs = require('fs');
const { findProjectRoot } = require('../util');
const { GATE_QUESTION } = require('../gate');
const { parseMcpName } = require('../mcp');
const { isAgentTool } = require('../budget');

const first = (...vals) => vals.find(v => v !== undefined && v !== null && v !== '');

/** Raíz del proyecto a partir de los candidatos que entrega cada herramienta. */
function resolveRoot(...candidates) {
  const dir = first(...candidates.flat());
  return findProjectRoot(dir || process.cwd());
}

/** Texto plano de un mensaje (string, {text}, {content:[{type:'text',text}]}). */
function toText(m) {
  if (!m) return '';
  if (typeof m === 'string') return m;
  if (typeof m.text === 'string') return m.text;
  const c = m.content || (m.message && m.message.content);
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map(p => (typeof p === 'string' ? p : p && p.text) || '').join('\n');
  return '';
}

/** Si no hay último mensaje, busca la pregunta del GATE al final del transcript. */
function lastFromTranscript(file) {
  if (!file) return '';
  try {
    const fd = fs.openSync(file, 'r');
    const size = fs.fstatSync(fd).size;
    const len = Math.min(size, 32 * 1024);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    fs.closeSync(fd);
    return GATE_QUESTION.test(buf.toString('utf8')) ? '¿Apruebo la implementación? (sí / no / ajustes)' : '';
  } catch { return ''; }
}

/** Rutas y contenido agregado de un parche (formato apply_patch de Codex / OpenCode / Copilot). */
function parsePatch(text) {
  const paths = []; const contents = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const m = /^\*\*\* (?:Add|Update|Delete) File:\s*(.+?)\s*$/.exec(line) || /^\*\*\* Move to:\s*(.+?)\s*$/.exec(line);
    if (m) paths.push(m[1]);
    else if (line.startsWith('+') && !line.startsWith('+++')) contents.push(line.slice(1));
  }
  return { paths, contents: contents.length ? [contents.join('\n')] : [] };
}

const parseArgs = a => { if (typeof a !== 'string') return a || {}; try { return JSON.parse(a); } catch { return { command: a }; } };
const pathOf = i => first(i.file_path, i.filePath, i.path, i.target_file, i.absolute_path, i.notebook_path, i.filename);

/**
 * Herramienta normalizada desde nombres al estilo Claude Code / Codex / Copilot / Gemini.
 * @returns {{kind:'shell'|'edit'|'read'|'other', name:string, command?:string, paths:string[], contents:string[]}}
 */
function normalizeTool(name, rawInput, opts = {}) {
  const n = String(name || '');
  const i = parseArgs(rawInput);
  const lower = n.toLowerCase();
  if (isAgentTool(n)) return { kind: 'agent', name: n, agente: String(first(i.subagent_type, i.agent, i.agent_type, i.name, '')), descripcion: String(first(i.description, i.title, '')).slice(0, 80), paths: [], contents: [] };
  if (['bash', 'shell', 'powershell', 'run_shell_command', 'exec_command', 'local_shell', 'run_in_terminal', 'runinterminal'].includes(lower)) {
    const cmd = Array.isArray(i.command) ? i.command.join(' ') : first(i.command, i.cmd, i.script);
    return { kind: 'shell', name: n, command: cmd ? String(cmd) : '', background: !!(i.run_in_background || i.is_background || i.background), paths: [], contents: [] };
  }
  if (lower === 'apply_patch' || lower === 'patch') {
    const p = parsePatch(first(i.command, i.patch, i.patchText, i.input, typeof rawInput === 'string' ? rawInput : ''));
    return { kind: 'edit', name: n, paths: p.paths, contents: p.contents };
  }
  if (lower === 'multiedit') return { kind: 'edit', name: n, paths: [pathOf(i)].filter(Boolean), contents: (i.edits || []).map(e => e.new_string || '') };
  if (['edit', 'write', 'notebookedit', 'write_file', 'replace', 'smart_edit', 'create', 'create_file', 'str_replace_editor', 'str_replace', 'insert', 'edit_file', 'editfiles', 'replace_string_in_file', 'delete', 'delete_file'].includes(lower)) {
    if (lower === 'str_replace_editor' && i.command === 'view') return { kind: 'read', name: n, paths: [pathOf(i)].filter(Boolean), contents: [] };
    const content = first(i.content, i.new_string, i.newString, i.file_text, i.new_str, i.new_source, i.code, '');
    return { kind: 'edit', name: n, paths: [pathOf(i)].filter(Boolean), contents: [String(content)] };
  }
  if (['read', 'read_file', 'view', 'read_many_files', 'grep', 'search_file_content'].includes(lower)) {
    const ps = Array.isArray(i.paths) ? i.paths : [pathOf(i)];
    return { kind: 'read', name: n, paths: ps.filter(p => p && !/[*?]/.test(p)), contents: [] };
  }
  const mcp = parseMcpName(n, opts);
  if (mcp) return { kind: 'mcp', name: n, server: mcp.server, tool: mcp.tool, paths: [], contents: [] };
  return { kind: 'other', name: n, paths: [], contents: [] };
}

const json = obj => `${JSON.stringify(obj)}\n`;

module.exports = { first, resolveRoot, toText, lastFromTranscript, parsePatch, normalizeTool, json };
