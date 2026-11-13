'use strict';
// Prueba de punta a punta del punto de entrada de los hooks (como lo ejecuta cada herramienta).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { project, tmp, REPO } = require('./helpers');

const SDD_HOME = tmp('sdd-home-');
const HOOK = path.join(REPO, 'bin', 'sdd-hook.js');
function hook(host, ev, input, env = {}) {
  const r = spawnSync(process.execPath, [HOOK, host, ev], { input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, SDD_HOME, ...env } });
  return { code: r.status, json: r.stdout.trim() ? JSON.parse(r.stdout) : null, stderr: r.stderr };
}

test('Claude Code: GATE, permisos, sensores al terminar y checkpoint de sesión', () => {
  const dir = project({
    'package.json': '{"name":"p"}', 'src/a.js': 'let x = 1\n',
    '.sdd/harness.json': JSON.stringify({ sensores: { alTerminar: ['lint'], comandos: { lint: 'node -e "console.error(\'src/a.js:1:5 error no-unused-vars\'); process.exit(1)"' } } }),
  });
  const base = { session_id: 'e2e', cwd: dir };
  const edit = { ...base, tool_name: 'Edit', tool_input: { file_path: path.join(dir, 'src/a.js'), old_string: 'x', new_string: 'y' } };

  assert.match(hook('claude', 'UserPromptSubmit', { ...base, prompt: 'agrega un contador de visitas' }).json.hookSpecificOutput.additionalContext, /Pedido de cambio/);
  assert.strictEqual(hook('claude', 'PreToolUse', edit).json.hookSpecificOutput.permissionDecision, 'deny', 'sin plan aprobado no se edita');
  // HOME y política de la organización temporales: sin reglas de Claude del equipo (como en CI), el harness no opina
  const home = tmp('sdd-home-claude-');
  const claudeEnv = { HOME: home, USERPROFILE: home, SDD_CLAUDE_MANAGED_DIR: tmp('sdd-managed-') };
  assert.strictEqual(hook('claude', 'PreToolUse', { ...base, tool_name: 'Bash', tool_input: { command: 'npm test' } }, claudeEnv).json, null, 'los tests sí se pueden correr con el plan pendiente');
  assert.strictEqual(hook('claude', 'PreToolUse', { ...base, tool_name: 'Bash', tool_input: { command: `node "${require('os').homedir().replace(/\\/g, '/')}/.sdd-orquestador/bin/sdd-harness.js" estado` } }).json, null, '/sdd-status funciona con el plan pendiente');
  assert.strictEqual(hook('claude', 'PreToolUse', { ...base, tool_name: 'Bash', tool_input: { command: 'gh pr create --title x' } }).json.hookSpecificOutput.permissionDecision, 'deny');
  assert.strictEqual(hook('claude', 'PreToolUse', { ...base, tool_name: 'Bash', tool_input: { command: 'kubectl apply -f k8s/' } }).json.hookSpecificOutput.permissionDecision, 'ask');
  assert.strictEqual(hook('claude', 'PreToolUse', { ...base, tool_name: 'Read', tool_input: { file_path: path.join(dir, '.env') } }).json.hookSpecificOutput.permissionDecision, 'deny');

  hook('claude', 'Stop', { ...base, last_assistant_message: 'Plan:\n1. …\n¿Apruebo la implementación? (sí / no / ajustes)' });
  assert.match(hook('claude', 'UserPromptSubmit', { ...base, prompt: 'sí, dale' }).json.hookSpecificOutput.additionalContext, /Plan aprobado/);
  assert.strictEqual(hook('claude', 'PreToolUse', edit).json, null, 'con el plan aprobado se puede editar');

  fs.writeFileSync(path.join(dir, 'src/conf.json'), '{"a": 1,}');
  const fb = hook('claude', 'PostToolUse', { ...base, tool_name: 'Write', tool_input: { file_path: path.join(dir, 'src/conf.json') } }).json;
  assert.strictEqual(fb.decision, 'block');
  assert.match(fb.reason, /JSON inválido/);

  const s1 = hook('claude', 'Stop', { ...base, last_assistant_message: 'Listo.' }).json;
  assert.strictEqual(s1.decision, 'block', 'con sensores en rojo no puede terminar');
  assert.match(s1.reason, /no-unused-vars/);
  // Sin cambiar el contenido no se vuelve a correr (daría lo mismo y una suite lenta retendría el turno minutos):
  // avisa una vez y deja terminar, con los cambios todavía sin verificar
  const s2 = hook('claude', 'Stop', { ...base, last_assistant_message: 'Ese error ya existía.', stop_hook_active: true }).json;
  assert.ok(s2.systemMessage && !s2.decision, 'mismo contenido: avisa y deja terminar');
  assert.match(s2.systemMessage, /Sin cambios desde la última verificación/);

  const ses = fs.readFileSync(path.join(dir, '.sdd/memoria/sesion.md'), 'utf8');
  assert.match(ses, /^Proyecto: /);
  assert.match(ses, /harness:inicio/);
  assert.match(ses, /src\/conf\.json/);
  assert.match(hook('claude', 'SessionStart', { ...base, source: 'compact' }).json.hookSpecificOutput.additionalContext, /se acaba de compactar/);
});

test('Codex: confirmación crítica en el chat (sin "ask" nativo), de un solo uso', () => {
  const dir = project({ 'src/a.js': '' });
  const base = { session_id: 'cx', cwd: dir };
  const rm = { ...base, tool_name: 'Bash', tool_input: { command: 'rm -rf dist' } };
  assert.match(hook('codex', 'PreToolUse', rm).json.hookSpecificOutput.permissionDecisionReason, /Requiere confirmación/);
  assert.match(hook('codex', 'UserPromptSubmit', { ...base, prompt: 'sí' }).json.hookSpecificOutput.additionalContext, /aprobó \(una vez, vence en 30 min\): comando rm/);
  assert.strictEqual(hook('codex', 'PreToolUse', rm).json, null);
  assert.strictEqual(hook('codex', 'PreToolUse', rm).json.hookSpecificOutput.permissionDecision, 'deny', 'la confirmación vale una sola vez');
});

test('los mensajes generados por el harness no se toman como pedidos del usuario', () => {
  const dir = project({ 'src/a.js': '' });
  const base = { session_id: 'hx', cwd: dir };
  hook('gemini', 'BeforeAgent', { ...base, prompt: 'agrega X' });
  hook('gemini', 'AfterAgent', { ...base, prompt_response: '¿Apruebo la implementación? (sí / no / ajustes)' });
  hook('gemini', 'BeforeAgent', { ...base, prompt: 'sí' });
  assert.strictEqual(hook('gemini', 'BeforeAgent', { ...base, prompt: '[harness] Sensores…\n✗ lint errores' }).json, null);
  assert.strictEqual(hook('gemini', 'BeforeTool', { ...base, tool_name: 'write_file', tool_input: { file_path: 'src/a.js', content: 'y' } }).json, null, 'el GATE sigue aprobado');
});

test('MCP: escribir en GitHub se bloquea y una base de datos pide confirmación', () => {
  const dir = project({ 'a.js': '' });
  const base = { session_id: 'mcp', cwd: dir };
  assert.strictEqual(hook('claude', 'PreToolUse', { ...base, tool_name: 'mcp__github__merge_pull_request', tool_input: { pull_number: 3 } }).json.hookSpecificOutput.permissionDecision, 'deny');
  assert.strictEqual(hook('claude', 'PreToolUse', { ...base, tool_name: 'mcp__postgres__execute_query', tool_input: {} }).json.hookSpecificOutput.permissionDecision, 'ask');
  assert.strictEqual(hook('claude', 'PreToolUse', { ...base, tool_name: 'mcp__playwright__browser_navigate', tool_input: {} }).json, null);
  assert.match(hook('codex', 'PreToolUse', { ...base, tool_name: 'mcp__postgres__execute_query', tool_input: {} }).json.hookSpecificOutput.permissionDecisionReason, /Requiere confirmación/);
});

test('comandos de verificación ruidosos se envuelven para compactar su salida', () => {
  const dir = project({ 'a.js': '' });
  const base = { session_id: 'out', cwd: dir };
  // Claude: HOME y política de la organización temporales (no depender de la configuración real del equipo)
  const home = tmp('sdd-home-claude-');
  const claudeEnv = { HOME: home, USERPROFILE: home, SDD_CLAUDE_MANAGED_DIR: tmp('sdd-managed-') };
  const npmTest = { ...base, tool_name: 'Bash', tool_input: { command: 'npm test', description: 'tests' } };
  assert.strictEqual(hook('claude', 'PreToolUse', npmTest, claudeEnv).json, null, 'sin una regla tuya que lo permita, no se compacta (el harness no concede el permiso)');
  fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.claude', 'settings.json'), JSON.stringify({ permissions: { allow: ['Bash(npm test:*)'] } }));
  const c = hook('claude', 'PreToolUse', npmTest, claudeEnv).json.hookSpecificOutput;
  assert.strictEqual(c.permissionDecision, 'allow');
  assert.match(c.updatedInput.command, /sdd-salida\.js" bnBtIHRlc3Q= \d+$/);
  assert.strictEqual(c.updatedInput.description, 'tests', 'conserva los demás campos');
  assert.strictEqual(hook('claude', 'PreToolUse', { ...base, tool_name: 'Bash', tool_input: { command: 'npm test', run_in_background: true } }, claudeEnv).json, null, 'en segundo plano no se envuelve');
  fs.writeFileSync(path.join(dir, '.claude', 'settings.local.json'), JSON.stringify({ permissions: { ask: ['Bash(npm test *)'] } }));
  assert.strictEqual(hook('claude', 'PreToolUse', npmTest, claudeEnv).json, null, 'una regla tuya de preguntar sigue aplicando: no se compacta');
  assert.match(hook('gemini', 'BeforeTool', { ...base, tool_name: 'run_shell_command', tool_input: { command: 'go test ./...' } }).json.hookSpecificOutput.tool_input.command, /sdd-salida/);
  assert.strictEqual(hook('copilot', 'preToolUse', { sessionId: 'o', cwd: dir, toolName: 'bash', toolArgs: { command: 'npm test' } }).json, null, 'Copilot: sin reescritura');
});

test('un error interno nunca bloquea (falla abierta) y la salida es solo JSON', () => {
  const r = spawnSync(process.execPath, [HOOK, 'claude', 'PreToolUse'], { input: '{no es json', encoding: 'utf8', env: { ...process.env, SDD_HOME } });
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, '');
  const u = spawnSync(process.execPath, [HOOK, 'desconocida', 'X'], { input: '{}', encoding: 'utf8', env: { ...process.env, SDD_HOME } });
  assert.strictEqual(u.status, 0);
});

test('la entrada que llega tarde por stdin se espera (antes, en Linux/macOS se leía vacía y la acción pasaba sin control)', async () => {
  const dir = project({ 'a.js': '' });
  const input = { session_id: 'tarde', cwd: dir, tool_name: 'Bash', tool_input: { command: 'gh pr create --title x' } };
  const out = await new Promise((resolve, reject) => {
    const k = spawn(process.execPath, [HOOK, 'claude', 'PreToolUse'], { env: { ...process.env, SDD_HOME } });
    let s = '';
    k.stdout.on('data', x => { s += x; });
    k.on('error', reject);
    k.on('close', () => resolve(s.trim()));
    setTimeout(() => k.stdin.end(JSON.stringify(input)), 500);
  });
  assert.ok(out, 'el hook respondió vacío: leyó stdin antes de que llegara la entrada');
  assert.strictEqual(JSON.parse(out).hookSpecificOutput.permissionDecision, 'deny');
});

test('con el plan pendiente, la IA puede explorar con cualquier comando de lectura (Codex)', () => {
  const dir = project({ 'a.ts': '' });
  const base = { session_id: 'expl', cwd: dir };
  hook('codex', 'UserPromptSubmit', { ...base, prompt: 'agrega un filtro por fecha' });
  const bash = command => hook('codex', 'PreToolUse', { ...base, tool_name: 'Bash', tool_input: { command } }).json;
  assert.strictEqual(bash('jq .name package.json'), null);
  assert.strictEqual(bash('Get-ChildItem -Recurse src | Select-String "fecha"'), null);
  assert.strictEqual(bash("sed -i 's/a/b/' a.ts").hookSpecificOutput.permissionDecision, 'deny');
});
