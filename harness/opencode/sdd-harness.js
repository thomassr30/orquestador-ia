// Orquestador SDD — harness para OpenCode (plugin local: sin dependencias, sin red, sin claves).
// Lo instala install.js en ~/.config/opencode/plugins/. Usa el mismo núcleo que los hooks del resto
// de herramientas (~/.sdd-orquestador/harness). Ante un error interno no bloquea nada.
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const SDD_HOME = '{{SDD_HOME}}';

let core = null; let common = null; let util = null; let memory = null;
try {
  core = require(`${SDD_HOME}/harness/src/core.js`);
  common = require(`${SDD_HOME}/harness/src/adapters/common.js`);
  util = require(`${SDD_HOME}/harness/src/util.js`);
  memory = require(`${SDD_HOME}/harness/src/memory.js`);
} catch (e) {
  console.error(`[sdd-harness] no se pudo cargar el núcleo en ${SDD_HOME}: ${e.message}`);
}

export const SddHarness = async ({ client, directory, worktree }) => {
  if (!core) return {};
  const root = util.findProjectRoot(worktree || directory || process.cwd());
  const ev = (event, extra) => ({ host: 'opencode', event, nativeAsk: false, nativeGitAsk: true, canRewrite: true, root, ...extra });
  const argsByCall = new Map();
  const textOf = parts => (parts || []).filter(p => p && p.type === 'text' && !p.synthetic).map(p => p.text || '').join('\n');

  async function lastAssistant(id) {
    try {
      const r = await client.session.messages({ path: { id } });
      const list = (r && (r.data || r)) || [];
      for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (((m.info && m.info.role) || m.role) === 'assistant') return textOf(m.parts);
      }
    } catch { /* SDK distinto: sin último mensaje */ }
    return '';
  }

  async function followUp(id, text) {
    const parts = [{ type: 'text', text }];
    try { await client.session.prompt({ path: { id }, body: { parts } }); } catch {
      try { await client.session.prompt({ sessionID: id, parts }); } catch (e) { console.error(`[sdd-harness] no se pudo continuar la sesión: ${e.message}`); }
    }
  }

  return {
    'tool.execute.before': async (input, output) => {
      const args = (output && output.args) || {};
      argsByCall.set(input.callID, { tool: input.tool, args });
      if (argsByCall.size > 200) argsByCall.delete(argsByCall.keys().next().value);
      const r = await core.handle(ev('pre', { sessionId: input.sessionID, tool: common.normalizeTool(input.tool, args, { opencode: true }) }));
      if (r && r.decision) throw new Error(r.reason);
      if (r && r.rewrite && output && output.args) output.args.command = r.rewrite;
    },

    'tool.execute.after': async (input, output) => {
      const saved = argsByCall.get(input.callID);
      argsByCall.delete(input.callID);
      if (!saved) return;
      const r = await core.handle(ev('post', { sessionId: input.sessionID, tool: common.normalizeTool(saved.tool, saved.args, { opencode: true }) }));
      if (r && r.feedback && output && typeof output.output === 'string') output.output += `\n\n${r.feedback}`;
    },

    'chat.message': async (input, output) => {
      const text = textOf(output && output.parts);
      if (text) await core.handle(ev('prompt', { sessionId: input.sessionID, prompt: text }));
    },

    'experimental.chat.system.transform': async (_input, output) => {
      const ctx = memory.contextBlock(root, {});
      if (ctx && output && Array.isArray(output.system)) output.system.push(ctx);
    },

    'experimental.session.compacting': async (input, output) => {
      const r = await core.handle(ev('compact', { sessionId: input.sessionID, wantsContext: true }));
      if (r && r.context && output && Array.isArray(output.context)) output.context.push(r.context);
    },

    event: async ({ event }) => {
      if (!event || event.type !== 'session.idle') return;
      const id = event.properties && event.properties.sessionID;
      if (!id) return;
      const r = await core.handle(ev('stop', { sessionId: id, lastMessage: await lastAssistant(id) }));
      if (r && r.block) followUp(id, r.block);
    },
  };
};
