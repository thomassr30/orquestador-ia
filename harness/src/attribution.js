'use strict';
// Líneas de atribución que las IA agregan a los mensajes de commit y PR ("Co-Authored-By: Claude…",
// "🤖 Generated with Claude Code", "Made-with: Cursor"…). El usuario no las quiere en sus commits.
const AI = '(?:claude|anthropic|codex|openai|chatgpt|copilot|cursor|gemini|google|opencode|windsurf|codeium|devin|aider|amp)';
const PATTERNS = [
  new RegExp(`^[\\s>*\`-]*co-authored-by:\\s*[^\\n]*${AI}`, 'im'),
  new RegExp(`^[\\s>*\`-]*(?:🤖\\s*)?generated (?:with|by)\\s*\\[?\\s*${AI}`, 'im'),
  /^[\s>*`-]*claude-session:/im,
  new RegExp(`^[\\s>*\`-]*made-with:\\s*${AI}`, 'im'),
  /^[\s>*`-]*co-authored-by:[^\n]*noreply@anthropic\.com/im,
];

/** Primera línea de atribución encontrada en el texto, o null. */
function findAttribution(text) {
  const t = String(text || '');
  for (const re of PATTERNS) { const m = re.exec(t); if (m) return m[0].trim().replace(/^[>*`-]+\s*/, '').slice(0, 80); }
  return null;
}

module.exports = { findAttribution };
