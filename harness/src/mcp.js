'use strict';
// Herramientas MCP: el harness también decide sobre ellas (antes solo veía comandos, ediciones y lecturas).
//  - GitHub/GitLab: escribir (crear PR, merge, push, comentar, issues…) se bloquea, igual que git.
//  - Cualquier otro servidor: acciones que escriben o ejecutan piden confirmación (decisión crítica).
//  - Servidores del propio orquestador (navegador y documentación) quedan libres: el flujo browser los usa sin parar.

const FREE_SERVERS = ['playwright', 'chrome-devtools', 'chrome_devtools', 'context7'];
const FORGE_SERVER = /(github|gitlab|bitbucket|azure[-_]?devops|gitea)/i;
const WRITE_VERB = /(^|[_\-.])(create|update|delete|remove|merge|push|write|edit|patch|put|post|insert|drop|truncate|alter|execute|exec|run|send|comment|close|reopen|approve|assign|move|rename|upload|commit|fork|archive|transition|set|add|cancel|rerun|dispatch|apply|deploy|publish|query|sql|mutate|modify|replace)([_\-.]|$)/i;

/** Nombre normalizado {server, tool} o null si no es MCP. Formatos: mcp__srv__tool, mcp_srv_tool, "MCP: tool", srv_tool (OpenCode). */
function parseMcpName(name, { opencode = false } = {}) {
  const n = String(name || '');
  let m = /^mcp__(.+?)__(.+)$/i.exec(n);
  if (m) return { server: m[1], tool: m[2] };
  m = /^mcp_([^_]+(?:[-][^_]+)*)_(.+)$/i.exec(n);
  if (m) return { server: m[1], tool: m[2] };
  m = /^mcp:\s*(?:(.+?)[:/])?\s*(.+)$/i.exec(n);
  if (m) return { server: m[1] || '', tool: m[2] };
  if (opencode) { m = /^([a-z0-9-]+)_(.+)$/i.exec(n); if (m) return { server: m[1], tool: m[2] }; }
  return null;
}

/**
 * Decisión para una herramienta MCP.
 * @param {{server:string, tool:string}} t
 * @param {{mcpLibres?: string[], mcpBloquear?: string[]}} permisos
 */
function classifyMcp(t, permisos = {}) {
  const server = String(t.server || '').toLowerCase();
  const tool = String(t.tool || '');
  const full = `${server}__${tool}`.toLowerCase();
  const list = v => (v || []).map(x => String(x).toLowerCase());
  if (list(permisos.mcpBloquear).some(p => full.startsWith(p.replace(/\*$/, '')))) return { decision: 'deny', reason: `herramienta MCP bloqueada por configuración (${server} → ${tool})` };
  if ([...FREE_SERVERS, ...list(permisos.mcpLibres)].some(s => server === s || full.startsWith(s.replace(/\*$/, '')))) return { decision: 'allow' };
  const writes = WRITE_VERB.test(tool);
  if (!writes) return { decision: 'allow' };
  if (FORGE_SERVER.test(server) || FORGE_SERVER.test(tool)) return { decision: 'deny', reason: `escritura en GitHub/GitLab vía MCP bloqueada (${server} → ${tool}). Sugiérelo al usuario como texto.` };
  return { decision: 'ask', critical: true, reason: `la herramienta MCP ${server ? `${server} → ` : ''}${tool} modifica o ejecuta algo fuera del proyecto (decisión crítica)` };
}

module.exports = { parseMcpName, classifyMcp };
