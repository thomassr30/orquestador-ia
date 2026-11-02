'use strict';
// Instala en un HOME simulado con todas las herramientas, reinstala (idempotente) y desinstala.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { tmp, project, REPO } = require('./helpers');

const HOME = tmp('sdd-fakehome-');
const env = { ...process.env, HOME, USERPROFILE: HOME, APPDATA: path.join(HOME, 'AppData', 'Roaming') };
delete env.CODEX_HOME; delete env.COPILOT_HOME; delete env.SDD_HOME; delete env.CLAUDE_PROJECT_DIR;
const install = (...args) => spawnSync(process.execPath, [path.join(REPO, 'install.js'), ...args], { env, encoding: 'utf8' });
const read = f => JSON.parse(fs.readFileSync(path.join(HOME, f), 'utf8'));
const ours = groups => (groups || []).filter(g => JSON.stringify(g).includes('sdd-hook.js')).length;

for (const d of ['.claude', '.codex', '.gemini', '.cursor', '.copilot', '.config/opencode']) fs.mkdirSync(path.join(HOME, d), { recursive: true });
fs.writeFileSync(path.join(HOME, '.claude/settings.json'), JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo hook-del-usuario' }] }] } }));
fs.writeFileSync(path.join(HOME, '.gemini/settings.json'), JSON.stringify({ theme: 'GitHub' }));

test('instala el harness en las 6 herramientas', () => {
  const r = install('--targets=all', '--no-deps', '--no-mcp');
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  const claude = read('.claude/settings.json');
  assert.strictEqual(ours(claude.hooks.PreToolUse), 1);
  assert.ok(claude.hooks.PreToolUse.some(g => JSON.stringify(g).includes('hook-del-usuario')), 'respeta los hooks del usuario');
  for (const ev of ['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'Stop', 'PreCompact']) assert.strictEqual(ours(claude.hooks[ev]), 1, ev);
  assert.ok(claude.permissions.deny.includes('Bash(git commit:*)'));
  assert.ok(claude.permissions.ask.includes('Bash(git push:*)'), 'push con confirmación');
  assert.deepStrictEqual(claude.attribution, { commit: '', pr: '' }, 'sin líneas de atribución en commits y PR');
  assert.ok(claude.permissions.ask.includes('Bash(psql:*)'));
  const codex = read('.codex/hooks.json');
  assert.strictEqual(ours(codex.hooks.Stop), 1);
  assert.match(fs.readFileSync(path.join(HOME, '.codex/rules/sdd-orquestador.rules'), 'utf8'), /prefix_rule\(pattern = \["git","commit"\], decision = "forbidden"/);
  assert.match(fs.readFileSync(path.join(HOME, '.codex/rules/sdd-orquestador.rules'), 'utf8'), /prefix_rule\(pattern = \["git","push"\], decision = "prompt"/, 'push: Codex pide la aprobación');
  const gem = read('.gemini/settings.json');
  assert.strictEqual(gem.theme, 'GitHub');
  assert.strictEqual(ours(gem.hooks.AfterAgent), 1);
  const cur = read('.cursor/hooks.json');
  assert.strictEqual(cur.version, 1);
  assert.strictEqual(ours(cur.hooks.stop), 1);
  assert.strictEqual(ours(read('.copilot/hooks/sdd-orquestador.json').hooks.agentStop), 1);
  const plugin = fs.readFileSync(path.join(HOME, '.config/opencode/plugins/sdd-harness.js'), 'utf8');
  assert.ok(!plugin.includes('{{SDD_HOME}}') && plugin.includes('.sdd-orquestador'));
  assert.ok(fs.existsSync(path.join(HOME, '.sdd-orquestador/harness/src/core.js')));
  assert.ok(fs.existsSync(path.join(HOME, '.sdd-orquestador/harness.json')));
});

test('el hook instalado funciona desde ~/.sdd-orquestador (sin el repositorio)', () => {
  const dir = project({ 'a.js': '' });
  const r = spawnSync(process.execPath, [path.join(HOME, '.sdd-orquestador/bin/sdd-hook.js'), 'claude', 'PreToolUse'],
    { input: JSON.stringify({ session_id: 'i', cwd: dir, tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }), encoding: 'utf8', env });
  assert.strictEqual(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, 'deny');
});

test('doctor ejecuta los hooks registrados y confirma que bloquean', () => {
  const r = spawnSync(process.execPath, [path.join(HOME, '.sdd-orquestador/bin/sdd-harness.js'), 'doctor', project({ 'a.js': '' })], { env, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.strictEqual((r.stdout.match(/prueba en vivo OK/g) || []).length, 5, r.stdout);
});

test('reinstalar no duplica hooks', () => {
  const r = install('--no-deps', '--no-mcp');
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(ours(read('.claude/settings.json').hooks.PreToolUse), 1);
  assert.strictEqual(ours(read('.codex/hooks.json').hooks.PreToolUse), 1);
  assert.strictEqual(ours(read('.gemini/settings.json').hooks.BeforeTool), 1);
  assert.strictEqual(ours(read('.cursor/hooks.json').hooks.preToolUse), 1);
});

test('desinstalar quita solo lo del orquestador y conserva la configuración del usuario', () => {
  fs.writeFileSync(path.join(HOME, '.sdd-orquestador/harness.json'), '{"gate":"siempre"}');
  const r = install('--uninstall');
  assert.strictEqual(r.status, 0, r.stderr);
  const claude = read('.claude/settings.json');
  assert.strictEqual(ours(claude.hooks.PreToolUse), 0);
  assert.ok(JSON.stringify(claude).includes('hook-del-usuario'));
  assert.strictEqual(claude.attribution, undefined, 'se quita la configuración de atribución que puso el instalador');
  assert.ok(!(claude.permissions && (claude.permissions.deny || []).includes('Bash(git commit:*)')));
  assert.ok(!read('.gemini/settings.json').hooks);
  assert.ok(!fs.existsSync(path.join(HOME, '.copilot/hooks/sdd-orquestador.json')));
  assert.ok(!fs.existsSync(path.join(HOME, '.config/opencode/plugins/sdd-harness.js')));
  assert.ok(!fs.existsSync(path.join(HOME, '.codex/rules/sdd-orquestador.rules')));
  assert.strictEqual(fs.readFileSync(path.join(HOME, '.sdd-orquestador/harness.json'), 'utf8'), '{"gate":"siempre"}');
});
