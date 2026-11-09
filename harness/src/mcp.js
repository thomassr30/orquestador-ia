'use strict';
// Herramientas MCP: el harness también decide sobre ellas (antes solo veía comandos, ediciones y lecturas).
//  - GitHub/GitLab/Azure Repos: escribir en el código y su maquinaria (crear PR, merge, push, comentar, issues,
//    releases) se bloquea, igual que git.
//  - Gestor de tickets de una forja (work items de Azure Boards): NO es escribir en el código, así que pide
//    confirmación en vez de bloquearse, como dicen las skills tracker-common y tracker-azure-boards.
//  - Cualquier otro servidor: acciones que escriben o ejecutan piden confirmación (decisión crítica).
//  - Servidores del propio orquestador (navegador y documentación) quedan libres: el flujo browser los usa sin parar.

const FREE_SERVERS = ['playwright', 'chrome-devtools', 'chrome_devtools', 'context7'];
// Alias habituales incluidos a propósito: la decisión no debe depender del nombre que cada quien le ponga al
// servidor en su configuración («azure-devops» y «ado» son el mismo MCP oficial de Azure DevOps).
const FORGE_SERVER = /(github|gitlab|bitbucket|gitea|azure[-_]?(devops|repos|boards)|\bado\b|azdo|vsts|tfs)/i;
// Herramientas de Boards del MCP oficial de Azure DevOps (@azure-devops/mcp): wit_work_item, wit_work_item_write,
// wit_work_item_link_write, wit_backlog, wit_query. Escribir acá es comentar, mover un estado o vincular: enviar
// datos a un servicio externo, no publicar código. GitHub y GitLab no usan estos nombres, así que sus issues
// siguen bloqueados (ver SECURITY.md).
const TRACKER_TOOL = /(^|[_\-.])(wit|work[_\-]?items?|backlogs?|wiql|boards?|iterations?|area[_\-]?paths?)([_\-.]|$)/i;
const WRITE_VERB = /(^|[_\-.])(create|update|delete|remove|merge|push|write|edit|patch|put|post|insert|drop|truncate|alter|execute|exec|run|send|comment|close|reopen|approve|assign|move|rename|upload|commit|fork|archive|transition|set|add|cancel|rerun|dispatch|apply|deploy|publish|sql|mutate|modify|replace)([_\-.]|$)/i;

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
  const forge = FORGE_SERVER.test(server) || FORGE_SERVER.test(tool);
  if (forge && TRACKER_TOOL.test(tool)) {
    return { decision: 'ask', critical: true, reason: `la herramienta MCP ${server} → ${tool} escribe en el gestor de tickets: comentar, cambiar de estado o vincular es enviar datos a un servicio externo (decisión crítica). Muéstrale al usuario el work item y el cambio exacto antes de confirmar` };
  }
  if (forge) return { decision: 'deny', reason: `escritura en el repositorio de GitHub/GitLab/Azure Repos vía MCP bloqueada (${server} → ${tool}). Sugiérelo al usuario como texto.` };
  return { decision: 'ask', critical: true, reason: `la herramienta MCP ${server ? `${server} → ` : ''}${tool} modifica o ejecuta algo fuera del proyecto (decisión crítica)` };
}

module.exports = { parseMcpName, classifyMcp };
