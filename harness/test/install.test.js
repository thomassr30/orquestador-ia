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
  assert.ok(claude.permissions.ask.includes('Bash(git commit:*)'), 'commit con confirmación');
  assert.ok(claude.permissions.ask.includes('Bash(npm version:*)'), 'herramientas que crean commits con confirmación');
  assert.ok(!claude.permissions.deny.some(r => /commit|npm version/.test(r)), 'commit ya no está en deny');
  assert.ok(claude.permissions.deny.includes('Bash(gh pr create:*)'), 'la escritura en la forja sigue bloqueada');
  assert.ok(claude.permissions.ask.includes('Bash(git push:*)'), 'push con confirmación');
  assert.deepStrictEqual(claude.attribution, { commit: '', pr: '' }, 'sin líneas de atribución en commits y PR');
  assert.ok(claude.permissions.ask.includes('Bash(psql:*)'));
  const codex = read('.codex/hooks.json');
  assert.strictEqual(ours(codex.hooks.Stop), 1);
  assert.match(fs.readFileSync(path.join(HOME, '.codex/rules/sdd-orquestador.rules'), 'utf8'), /prefix_rule\(pattern = \["git","commit"\], decision = "prompt"/, 'commit: Codex pide la aprobación');
  assert.match(fs.readFileSync(path.join(HOME, '.codex/rules/sdd-orquestador.rules'), 'utf8'), /prefix_rule\(pattern = \["npm","version"\], decision = "prompt"/);
  assert.doesNotMatch(fs.readFileSync(path.join(HOME, '.codex/rules/sdd-orquestador.rules'), 'utf8'), /\["git","commit"\], decision = "forbidden"|commit nunca/);
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

test('scripts del orquestador: ruta real en las reglas y permiso nativo en cada cliente', () => {
  const CLI = `node "${path.join(HOME, '.sdd-orquestador').replace(/\\/g, '/')}/bin/sdd-harness.js"`;
  for (const f of ['.claude/CLAUDE.md', '.codex/AGENTS.md', '.gemini/GEMINI.md', '.config/opencode/AGENTS.md', '.sdd-orquestador/reglas-globales.md']) {
    const t = fs.readFileSync(path.join(HOME, f), 'utf8');
    assert.ok(t.includes(`${CLI} trabajo plan`), `${f}: comando con la ruta real`);
    assert.doesNotMatch(t, /\$HOME\/\.sdd-orquestador|\{\{SDD_HOME\}\}/, f);
  }
  const claude = read('.claude/settings.json').permissions;
  assert.ok(claude.allow.includes(`Bash(${CLI}:*)`));
  assert.ok(claude.ask.includes(`Bash(${CLI} aprobar:*)`) && claude.ask.includes(`Bash(${CLI} trabajo aceptar:*)`));
  const codex = fs.readFileSync(path.join(HOME, '.codex/rules/sdd-orquestador.rules'), 'utf8');
  assert.ok(codex.split('\n').some(l => l.includes('decision = "allow"') && l.includes(JSON.stringify(CLI.slice(6, -1)))), 'Codex: allow con la ruta real');
  assert.ok(codex.split('\n').some(l => l.includes('decision = "prompt"') && l.includes('"aprobar"')), 'Codex: aprobar con la aprobación del usuario');
  assert.ok(read('.gemini/settings.json').tools.allowed.includes(`run_shell_command(${CLI})`));
  const bash = read('.config/opencode/opencode.json').permission.bash;
  assert.strictEqual(bash[`${CLI}*`], 'allow');
  assert.strictEqual(bash[`${CLI} aprobar*`], 'ask');
  const keys = Object.keys(bash);
  assert.ok(keys.indexOf(`${CLI} aprobar*`) > keys.indexOf(`${CLI}*`), 'OpenCode: la excepción va después (gana la última)');
});

test('reinstalar no duplica los permisos nativos de Gemini', () => {
  const r = install('--targets=all', '--no-deps', '--no-mcp');
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  const allowed = read('.gemini/settings.json').tools.allowed;
  assert.strictEqual(allowed.length, new Set(allowed).size);
});

test('el hook instalado funciona desde ~/.sdd-orquestador (sin el repositorio)', () => {
  const dir = project({ 'a.js': '' });
  // Payload simulado: SDD_DOCTOR=1 para que no cuente como evento real del cliente
  const r = spawnSync(process.execPath, [path.join(HOME, '.sdd-orquestador/bin/sdd-hook.js'), 'claude', 'PreToolUse'],
    { input: JSON.stringify({ session_id: 'i', cwd: dir, tool_name: 'Bash', tool_input: { command: 'gh pr create --title x' } }), encoding: 'utf8', env: { ...env, SDD_DOCTOR: '1' } });
  assert.strictEqual(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, 'deny');
});

test('doctor: prueba sintética en los 6 clientes, sin llamarla integración confirmada', () => {
  const r = spawnSync(process.execPath, [path.join(HOME, '.sdd-orquestador/bin/sdd-harness.js'), 'doctor', project({ 'a.js': '' })], { env, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.strictEqual((r.stdout.match(/\(c\) ✓ prueba sintética aprobada/g) || []).length, 6, r.stdout);
  assert.strictEqual((r.stdout.match(/sin eventos reales todavía/g) || []).length, 6, r.stdout);
  assert.doesNotMatch(r.stdout, /integración confirmada en el cliente real/);
  assert.match(r.stdout, /los hooks no son un sandbox/);
  assert.ok(!fs.existsSync(path.join(HOME, '.sdd-orquestador/observado.json')), 'las pruebas de doctor no registran eventos reales');
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
  assert.ok(!read('.gemini/settings.json').tools, 'se quitan los permisos de Gemini que agregó el instalador');
  assert.ok(!JSON.stringify(read('.config/opencode/opencode.json')).includes('sdd-harness.js'), 'y los de OpenCode');
  assert.ok(!fs.existsSync(path.join(HOME, '.copilot/hooks/sdd-orquestador.json')));
  assert.ok(!fs.existsSync(path.join(HOME, '.config/opencode/plugins/sdd-harness.js')));
  assert.ok(!fs.existsSync(path.join(HOME, '.codex/rules/sdd-orquestador.rules')));
  assert.strictEqual(fs.readFileSync(path.join(HOME, '.sdd-orquestador/harness.json'), 'utf8'), '{"gate":"siempre"}');
});

test('skills: se instalan solo las que se usan, y el flujo nunca se excluye', () => {
  const H2 = tmp('sdd-skills-');
  const env2 = { ...env, HOME: H2, USERPROFILE: H2, APPDATA: path.join(H2, 'AppData', 'Roaming') };
  const run = (...args) => spawnSync(process.execPath, [path.join(REPO, 'install.js'), '--targets=claude', '--no-mcp', '--no-deps', ...args], { env: env2, encoding: 'utf8' });
  const puestas = () => fs.readdirSync(path.join(H2, '.claude', 'skills')).filter(n => fs.existsSync(path.join(H2, '.claude', 'skills', n, 'SKILL.md')));

  assert.strictEqual(run().status, 0);
  const todas = puestas();
  assert.ok(todas.length > 90, `se instalaron ${todas.length}`);

  // Excluir por nombre y por patrón, y la reinstalación limpia las que ya no van
  assert.strictEqual(run('--sin-skills=tracker-jira,deploy-*').status, 0);
  const menos = puestas();
  assert.ok(!menos.includes('tracker-jira'));
  assert.ok(!menos.some(n => n.startsWith('deploy-')), menos.filter(n => n.startsWith('deploy-')).join(','));
  assert.ok(menos.length < todas.length);
  assert.ok(menos.includes('stack-angular'), 'lo no excluido sigue');

  // El flujo del orquestador no se puede dejar fuera ni pidiéndolo
  assert.strictEqual(run('--skills=stack-angular', '--sin-skills=sdd-*,tracker-common').status, 0);
  const solo = puestas();
  assert.ok(solo.includes('sdd-apply') && solo.includes('tracker-common'), 'sdd-* y tracker-common son fijas');
  assert.ok(solo.includes('stack-angular'));
  assert.ok(!solo.includes('stack-go'), '--skills instala solo lo pedido (más las fijas)');

  // Un nombre inexistente avisa y no rompe la instalación
  const r = run('--sin-skills=no-existe-esta-skill');
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /skills que no existen: no-existe-esta-skill/);

  // Y el instalador informa el costo fijo que tienen las descripciones en cada sesión
  assert.match(run().stdout, /Skills \(\d+ de \d+, ~\d+ tokens de descripciones en cada sesión\)/);
});
