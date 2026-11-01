'use strict';
const test = require('node:test');
const assert = require('node:assert');
const A = require('../src/adapters');
const { normalizeTool, parsePatch } = require('../src/adapters/common');

const out = r => (r.stdout ? JSON.parse(r.stdout) : null);
const DENY = { decision: 'deny', reason: '[harness] no' };

test('normaliza herramientas de todas las IAs', () => {
  assert.deepStrictEqual(normalizeTool('Bash', { command: 'npm test' }).command, 'npm test');
  assert.strictEqual(normalizeTool('run_shell_command', { command: 'ls' }).kind, 'shell');
  assert.deepStrictEqual(normalizeTool('Edit', { file_path: 'a.ts', old_string: 'x', new_string: 'y' }).paths, ['a.ts']);
  assert.deepStrictEqual(normalizeTool('MultiEdit', { file_path: 'a.ts', edits: [{ new_string: 'z' }] }).contents, ['z']);
  assert.deepStrictEqual(normalizeTool('replace', { file_path: 'b.go' }).paths, ['b.go']);
  assert.deepStrictEqual(normalizeTool('edit', '{"path":"c.js","new_str":"q"}').paths, ['c.js']);
  assert.deepStrictEqual(normalizeTool('write', { filePath: 'd.ts', content: 'w' }).paths, ['d.ts']);
  assert.strictEqual(normalizeTool('read_file', { absolute_path: '/x/.env' }).kind, 'read');
  assert.strictEqual(normalizeTool('str_replace_editor', { command: 'view', path: 'e' }).kind, 'read');
  assert.strictEqual(normalizeTool('mcp__playwright__navigate', {}).kind, 'other');
});

test('parches apply_patch: rutas y contenido agregado', () => {
  const p = parsePatch('*** Begin Patch\n*** Update File: src/a.js\n@@\n-x\n+y\n*** Add File: src/b.js\n+nuevo\n*** End Patch');
  assert.deepStrictEqual(p.paths, ['src/a.js', 'src/b.js']);
  assert.match(p.contents[0], /nuevo/);
  assert.deepStrictEqual(normalizeTool('apply_patch', { command: '*** Begin Patch\n*** Delete File: old.txt\n*** End Patch' }).paths, ['old.txt']);
});

test('Claude Code: deny/ask, feedback, bloqueo al terminar y contexto', () => {
  assert.deepStrictEqual(out(A.claude.format('PreToolUse', DENY)), { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: '[harness] no' } });
  assert.strictEqual(out(A.claude.format('PreToolUse', { decision: 'ask', reason: 'r' })).hookSpecificOutput.permissionDecision, 'ask');
  assert.deepStrictEqual(out(A.claude.format('PostToolUse', { feedback: 'f' })), { decision: 'block', reason: 'f' });
  assert.deepStrictEqual(out(A.claude.format('Stop', { block: 'b' })), { decision: 'block', reason: 'b' });
  assert.strictEqual(out(A.claude.format('SessionStart', { context: 'c' })).hookSpecificOutput.additionalContext, 'c');
  assert.deepStrictEqual(A.claude.format('PreToolUse', {}), {});
  const ev = A.claude.parse('PreToolUse', { session_id: 's', cwd: '/tmp', tool_name: 'Bash', tool_input: { command: 'ls' } }, {});
  assert.strictEqual(ev.nativeAsk, true);
  assert.strictEqual(ev.tool.command, 'ls');
});

test('Codex: sin "ask" nativo; contexto en PostToolUse; Stop continúa con decision block', () => {
  const ev = A.codex.parse('PreToolUse', { session_id: 's', cwd: '/tmp', tool_name: 'apply_patch', tool_input: { command: '*** Begin Patch\n*** Update File: a.js\n*** End Patch' } }, {});
  assert.strictEqual(ev.nativeAsk, false);
  assert.deepStrictEqual(ev.tool.paths, ['a.js']);
  assert.strictEqual(out(A.codex.format('PreToolUse', DENY)).hookSpecificOutput.permissionDecision, 'deny');
  assert.strictEqual(out(A.codex.format('PostToolUse', { feedback: 'f' })).hookSpecificOutput.additionalContext, 'f');
  assert.deepStrictEqual(out(A.codex.format('Stop', { block: 'b' })), { decision: 'block', reason: 'b' });
});

test('Gemini CLI: decision deny, additionalContext y reintento en AfterAgent', () => {
  const ev = A.gemini.parse('AfterAgent', { session_id: 's', cwd: '/tmp', prompt_response: '¿Apruebo la implementación?' }, {});
  assert.strictEqual(ev.event, 'stop');
  assert.match(ev.lastMessage, /Apruebo/);
  assert.deepStrictEqual(out(A.gemini.format('BeforeTool', DENY)), { decision: 'deny', reason: '[harness] no' });
  assert.deepStrictEqual(out(A.gemini.format('AfterTool', { feedback: 'f' })), { hookSpecificOutput: { additionalContext: 'f' } });
  assert.deepStrictEqual(out(A.gemini.format('AfterAgent', { block: 'b' })), { decision: 'deny', reason: 'b' });
});

test('Cursor: permission deny con exit 2, additional_context y followup_message', () => {
  const r = A.cursor.format('beforeShellExecution', DENY);
  assert.strictEqual(r.code, 2);
  assert.deepStrictEqual(out(r), { permission: 'deny', user_message: '[harness] no', agent_message: '[harness] no' });
  assert.deepStrictEqual(out(A.cursor.format('postToolUse', { feedback: 'f' })), { additional_context: 'f' });
  assert.deepStrictEqual(out(A.cursor.format('stop', { block: 'b' })), { followup_message: 'b' });
  assert.deepStrictEqual(out(A.cursor.format('beforeSubmitPrompt', {})), { continue: true });
  assert.strictEqual(A.cursor.parse('preToolUse', { conversation_id: 'c', workspace_roots: ['/tmp'], tool_name: 'Shell', tool_input: {} }), null, 'Shell va por beforeShellExecution');
  assert.deepStrictEqual(A.cursor.parse('preToolUse', { conversation_id: 'c', workspace_roots: ['/tmp'], tool_name: 'Write', tool_input: { file_path: 'a.ts' } }).tool.paths, ['a.ts']);
});

test('Copilot: camelCase, toolArgs como texto JSON y decisiones de nivel superior', () => {
  const ev = A.copilot.parse('preToolUse', { sessionId: 's', cwd: '/tmp', toolName: 'bash', toolArgs: '{"command":"git push"}' });
  assert.strictEqual(ev.tool.command, 'git push');
  assert.deepStrictEqual(out(A.copilot.format('preToolUse', DENY)), { permissionDecision: 'deny', permissionDecisionReason: '[harness] no' });
  assert.deepStrictEqual(out(A.copilot.format('postToolUse', { feedback: 'f' })), { additionalContext: 'f' });
  assert.deepStrictEqual(out(A.copilot.format('agentStop', { block: 'b' })), { decision: 'block', reason: 'b' });
});
