'use strict';
// Consumo de tokens de una sesión leyendo el transcript que guarda la herramienta (Claude Code: JSONL con
// "usage" por mensaje). Sirve para ver EN QUÉ se van los tokens: historial, caché, sub-agentes y las salidas
// de herramientas más pesadas. Solo lectura; no guarda contenido, solo números y nombres de herramienta.
const fs = require('fs');
const path = require('path');

const MAX_BYTES = 64 * 1024 * 1024;

function parseTranscript(file) {
  const r = { entrada: 0, cacheEscritura: 0, cacheLectura: 0, salida: 0, mensajes: 0, herramientas: [] };
  let text;
  try {
    if (fs.statSync(file).size > MAX_BYTES) return null;
    text = fs.readFileSync(file, 'utf8');
  } catch { return null; }
  const seen = new Set();
  const tools = new Map(); // id → {nombre, detalle}
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    const m = o.message || {};
    const content = Array.isArray(m.content) ? m.content : [];
    if (m.role === 'assistant' || o.type === 'assistant') {
      const id = m.id || o.uuid;
      if (m.usage && !seen.has(id)) {
        seen.add(id);
        r.entrada += m.usage.input_tokens || 0;
        r.cacheEscritura += m.usage.cache_creation_input_tokens || 0;
        r.cacheLectura += m.usage.cache_read_input_tokens || 0;
        r.salida += m.usage.output_tokens || 0;
        r.mensajes++;
      }
      for (const b of content) {
        if (b && b.type === 'tool_use') {
          const inp = b.input || {};
          const det = inp.command || inp.file_path || inp.pattern || inp.description || inp.subagent_type || '';
          tools.set(b.id, { nombre: b.name, detalle: String(det).replace(/\s+/g, ' ').slice(0, 80) });
        }
      }
    }
    for (const b of content) {
      if (b && b.type === 'tool_result') {
        const c = b.content;
        const size = typeof c === 'string' ? c.length : Array.isArray(c) ? c.reduce((n, x) => n + ((x && x.text) || '').length, 0) : 0;
        const t = tools.get(b.tool_use_id) || { nombre: '?', detalle: '' };
        r.herramientas.push({ ...t, tokens: Math.round(size / 4) });
      }
    }
  }
  return r;
}

/** Sub-agentes de la sesión (Claude Code los guarda junto al transcript principal). */
function subagentFiles(transcript) {
  const dir = path.dirname(transcript);
  const id = path.basename(transcript, '.jsonl');
  const out = [];
  for (const d of [path.join(dir, id, 'subagents'), path.join(dir, id)]) {
    try { for (const f of fs.readdirSync(d)) if (f.endsWith('.jsonl')) out.push(path.join(d, f)); } catch { /* no existe */ }
  }
  return [...new Set(out)];
}

/** Resumen de consumo: principal + sub-agentes + salidas de herramientas más pesadas. */
function sessionUsage(transcript) {
  if (!transcript) return null;
  const main = parseTranscript(transcript);
  if (!main) return null;
  const subs = subagentFiles(transcript).map(parseTranscript).filter(Boolean);
  const sum = (a, k) => a.reduce((n, x) => n + x[k], 0);
  const sub = { agentes: subs.length, entrada: sum(subs, 'entrada'), cacheEscritura: sum(subs, 'cacheEscritura'), cacheLectura: sum(subs, 'cacheLectura'), salida: sum(subs, 'salida') };
  const all = [main, ...subs].flatMap(x => x.herramientas);
  const mayores = all.sort((a, b) => b.tokens - a.tokens).slice(0, 6);
  const porHerramienta = {};
  for (const t of all) porHerramienta[t.nombre] = (porHerramienta[t.nombre] || 0) + t.tokens;
  return {
    principal: { entrada: main.entrada, cacheEscritura: main.cacheEscritura, cacheLectura: main.cacheLectura, salida: main.salida, mensajes: main.mensajes },
    subagentes: sub, mayores, porHerramienta,
  };
}

module.exports = { sessionUsage, parseTranscript };
