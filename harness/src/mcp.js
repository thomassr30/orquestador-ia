'use strict';
// Herramientas MCP: el harness también decide sobre ellas (antes solo veía comandos, ediciones y lecturas).
//  - GitHub/GitLab/Azure Repos: escribir en el código y su maquinaria (crear PR, merge, push, comentar, issues,
//    releases) se bloquea, igual que git.
//  - Lo que en una forja NO es el código (work items de Azure Boards, wiki, planes de prueba, pipelines): pide
//    confirmación en vez de bloquearse, como dicen las skills tracker-common y tracker-azure-boards.
//  - Cualquier otro servidor: acciones que escriben o ejecutan piden confirmación (decisión crítica).
//  - Servidores del propio orquestador (navegador y documentación) quedan libres: el flujo browser los usa sin parar.

const FREE_SERVERS = ['playwright', 'chrome-devtools', 'chrome_devtools', 'context7'];
// Alias habituales incluidos a propósito: la decisión no debe depender del nombre que cada quien le ponga al
// servidor en su configuración («azure-devops» y «ado» son el mismo MCP oficial de Azure DevOps).
const FORGE_SERVER = /(github|gitlab|bitbucket|gitea|azure[-_]?(devops|repos|boards)|\bado\b|azdo|vsts|tfs)/i;
// Lo que en una forja no es su código, con los nombres del MCP oficial de Azure DevOps (@azure-devops/mcp):
// Boards (wit_*, wit_backlog, wit_query), wiki (wiki_upsert_page), planes de prueba (testplan_*) y pipelines.
// Escribir acá es comentar, mover un estado, editar documentación o lanzar un pipeline: enviar datos a un
// servicio externo o mover infraestructura, no publicar código. GitHub y GitLab no usan estos nombres, así que
// sus issues siguen bloqueados (ver SECURITY.md).
const NO_CODIGO_TOOL = /(^|[_\-.])(wit|work[_\-]?items?|backlogs?|wiql|boards?|iterations?|area[_\-]?paths?|wikis?|testplans?|test[_\-]?(?:cases?|suites?|plans?)|pipelines?)([_\-.]|$)/i;
const WRITE_VERB = /(^|[_\-.])(create|update|upsert|delete|remove|merge|push|write|edit|patch|put|post|insert|drop|truncate|alter|execute|exec|run|send|comment|close|reopen|approve|assign|move|rename|reorder|vote|upload|commit|fork|archive|transition|set|add|cancel|rerun|dispatch|apply|deploy|publish|sql|mutate|modify|replace)([_\-.]|$)/i;

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
  // Las herramientas agrupadas esconden la escritura en el argumento «action» y no en el nombre
  // (wit_backlog con reorder, wiki con upsert_page): se mira también ahí, o pasarían como lectura.
  const action = String((t.args || {}).action || (t.args || {}).operation || '');
  const writes = WRITE_VERB.test(tool) || (!!action && WRITE_VERB.test(action));
  if (!writes) return { decision: 'allow' };
  const forge = FORGE_SERVER.test(server) || FORGE_SERVER.test(tool);
  if (forge && NO_CODIGO_TOOL.test(tool)) {
    return { decision: 'ask', critical: true, reason: `la herramienta MCP ${server} → ${tool}${action ? ` (${action})` : ''} escribe en algo que no es el código del repositorio (gestor de tickets, wiki, planes de prueba o pipelines): es enviar datos a un servicio externo o mover infraestructura (decisión crítica). Muéstrale al usuario exactamente qué va a cambiar antes de confirmar` };
  }
  if (forge) return { decision: 'deny', reason: `escritura en el repositorio de GitHub/GitLab/Azure Repos vía MCP bloqueada (${server} → ${tool}). Sugiérelo al usuario como texto.` };
  return { decision: 'ask', critical: true, reason: `la herramienta MCP ${server ? `${server} → ` : ''}${tool} modifica o ejecuta algo fuera del proyecto (decisión crítica)` };
}

module.exports = { parseMcpName, classifyMcp };
