'use strict';
// Detección de contenido con aspecto de secreto (claves, tokens, contraseñas, URLs con credenciales).
// Se usa para que nada de esto llegue a la memoria del proyecto.

const SECRET_CONTENT = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,                                   // AWS
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,                         // GitHub
  /\bglpat-[A-Za-z0-9_-]{20,}\b/,                           // GitLab
  /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}\b/,               // Anthropic / OpenAI
  /\bAIza[0-9A-Za-z_-]{30,}\b/,                             // Google
  /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/,                       // Slack
  /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, // JWT
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@]+:[^\s@/]+@/i,           // usuario:clave@host
  /\b(?:password|passwd|pwd|contraseña|secret|token|api[_-]?key|client[_-]?secret)\s*[:=]\s*["']?[^\s"'<>{}$]{6,}/i,
];

// Secretos de alta confianza para el código (sin el patrón genérico "password=", que en código y tests da falsos positivos).
const CODE_SECRETS = [
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
  /\bglpat-[A-Za-z0-9_-]{20,}\b/,
  /\bsk-(?:ant-|proj-)[A-Za-z0-9_-]{30,}\b/,
  /\bsk-[A-Za-z0-9]{40,}\b/,
  /\bAIza[0-9A-Za-z_-]{35}\b/,
  /\bxox[abprs]-[0-9]{6,}-[A-Za-z0-9-]{10,}\b/,
  /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/,
  /\bSG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/,
];
const PLACEHOLDER = /example|ejemplo|dummy|fake|placeholder|changeme|your[_-]?|tu[_-]|x{6,}|\*{4,}|<[^>]*>|\$\{/i;
// usuario:clave@host con clave real y host que no es local
const URL_CREDS = /\b[a-z][a-z0-9+.-]*:\/\/([^\s:/@'"]+):([^\s@/'"]+)@([^\s/:'"?#]+)/gi;
const LOCAL_HOST = /^(?:localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[?::1\]?|host\.docker\.internal|db|postgres|mysql|redis|mongo|.*\.local)$/i;

/** Secreto real escrito en código (fragmento corto) o null. */
function findCodeSecret(text) {
  const s = String(text || '');
  for (const re of CODE_SECRETS) {
    const m = re.exec(s);
    if (m && !PLACEHOLDER.test(m[0])) return `${m[0].slice(0, 10)}…`;
  }
  URL_CREDS.lastIndex = 0;
  let m;
  while ((m = URL_CREDS.exec(s))) {
    const [, , pass, host] = m;
    if (pass.length >= 6 && !PLACEHOLDER.test(pass) && !/^(?:pass(?:word)?|secret|clave|contrase[ñn]a|admin|root|postgres|test|user)$/i.test(pass) && !LOCAL_HOST.test(host)) return `${m[0].slice(0, 14)}…`;
  }
  return null;
}

/** Devuelve un fragmento corto del primer secreto encontrado, o null. */
function findSecret(text) {
  const s = String(text || '');
  for (const re of SECRET_CONTENT) {
    const m = re.exec(s);
    if (m) return `${m[0].slice(0, 10)}…`;
  }
  return null;
}

module.exports = { findSecret, findCodeSecret, SECRET_CONTENT };
