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

/** Devuelve un fragmento corto del primer secreto encontrado, o null. */
function findSecret(text) {
  const s = String(text || '');
  for (const re of SECRET_CONTENT) {
    const m = re.exec(s);
    if (m) return `${m[0].slice(0, 10)}…`;
  }
  return null;
}

module.exports = { findSecret, SECRET_CONTENT };
