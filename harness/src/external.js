'use strict';
// Defensa contra instrucciones inyectadas ("lethal trifecta": datos privados + contenido no confiable + un canal
// para enviar datos afuera). Cuando la sesión ya leyó contenido externo (una web, un MCP, una descarga), los comandos
// que pueden enviar datos a un servidor externo piden confirmación del usuario: si una página o un ticket traía
// instrucciones escondidas, no pueden sacar código ni secretos sin que el usuario lo vea.

const WEB_TOOLS = /^(?:webfetch|web_fetch|fetch|fetch_url|read_url|browse|websearch|web_search|google_web_search|search_web)$/i;
const NAVIGATE = /navigate|goto|open|new_page|new_tab|visit/i;
const LOCAL = /^(?:localhost|127(?:\.\d+){3}|0\.0\.0\.0|\[?::1\]?|host\.docker\.internal|[^.]+\.local|[^.]+\.localhost)$/i;

const hostOf = url => { try { return new URL(url).hostname.replace(/^\[|\]$/g, ''); } catch { return null; } };
const isLocal = host => !host || LOCAL.test(host) || /^::1$/.test(host);
const urlsIn = text => (String(text || '').match(/\bhttps?:\/\/[^\s"'`<>)]+/gi) || []);

/**
 * ¿Esta herramienta trae contenido externo a la conversación? Devuelve una descripción corta de la fuente, o null.
 * @param {{kind:string, name:string, server?:string, tool?:string, args?:object, command?:string}} t
 */
function externalSource(t) {
  if (!t) return null;
  if (t.kind === 'other' && WEB_TOOLS.test(t.name || '')) {
    const host = hostOf((t.args && (t.args.url || t.args.uri)) || '');
    return host && isLocal(host) ? null : `web${host ? ` (${host})` : ''}`;
  }
  if (t.kind === 'mcp') {
    const server = String(t.server || '').toLowerCase();
    if (/playwright|chrome[-_]?devtools|puppeteer|browser/.test(server)) {
      if (!NAVIGATE.test(t.tool || '')) return null;
      const host = hostOf(String((t.args && (t.args.url || t.args.uri)) || ''));
      return host && !isLocal(host) ? `navegador (${host})` : null;
    }
    return `MCP ${server || t.tool}`;
  }
  if (t.kind === 'shell' && /^\s*(?:curl|wget|iwr|irm|invoke-webrequest|invoke-restmethod|http|xh)\b/i.test(t.command || '')) {
    const ext = urlsIn(t.command).map(hostOf).filter(h => h && !isLocal(h));
    return ext.length ? `descarga (${ext[0]})` : null;
  }
  return null;
}

const NET_TOOLS = /(?:^|[\s;&|(])(?:curl|wget|iwr|irm|invoke-webrequest|invoke-restmethod|http|xh|nc|ncat|netcat|socat|telnet|ssh|scp|sftp|ftp|rsync|rclone|aws\s+s3|gsutil|azcopy)(?=\s|$)/i;
const REMOTE_PATH = /\b[\w.-]+@[\w.-]+:|\b[\w-]+(?:\.[\w-]+)+:[/~]/; // user@host: o host.dominio:/ruta (scp, rsync, ssh)

/**
 * ¿El comando puede enviar datos a un servidor externo? Devuelve el destino o null.
 * Destinos locales (localhost, 127.0.0.1, *.local, host.docker.internal) no cuentan.
 */
function exfilTarget(command) {
  const c = String(command || '');
  const ext = urlsIn(c).map(hostOf).filter(h => h && !isLocal(h));
  if (ext.length) return ext[0];
  if (NET_TOOLS.test(c)) {
    const m = REMOTE_PATH.exec(c);
    if (m) return m[0].replace(/:.*$/, '').replace(/^.*@/, '');
    if (/(?:^|\s)(?:nc|ncat|netcat|socat|telnet|ssh|sftp|ftp)\s+(?!-)/i.test(c)) {
      const host = (c.match(/(?:nc|ncat|netcat|socat|telnet|ssh|sftp|ftp)\s+(?:-\S+\s+)*(?:[\w.-]+@)?([\w.-]+)/i) || [])[1];
      return host && !isLocal(host) ? host : null;
    }
  }
  return null;
}

/** Navegación o lectura web que podría llevar datos en la URL (parámetros largos o tokens). Devuelve el host o null. */
function urlLeak(t) {
  const url = String((t && t.args && (t.args.url || t.args.uri)) || '');
  const host = hostOf(url);
  if (!host || isLocal(host)) return null;
  let u; try { u = new URL(url); } catch { return null; }
  return u.search.length > 60 || /[A-Za-z0-9+/=_-]{40,}/.test(u.pathname + u.search) ? host : null;
}

module.exports = { externalSource, exfilTarget, urlLeak, isLocal };
