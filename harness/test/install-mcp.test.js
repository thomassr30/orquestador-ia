'use strict';
// Registro de servidores MCP en un HOME simulado: locales y remotos (Figma), apagados por defecto y --mcp=<nombre>.
// Sin Claude Code: registrar ahí usa la CLI real y tocaría la configuración del equipo.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { tmp, REPO } = require('./helpers');

const TARGETS = '--targets=codex,gemini,cursor,copilot,opencode';
const FIGMA = 'https://mcp.figma.com/mcp';

function fakeHome() {
  const HOME = tmp('sdd-fakehome-mcp-');
  const env = { ...process.env, HOME, USERPROFILE: HOME, APPDATA: path.join(HOME, 'AppData', 'Roaming') };
  delete env.CODEX_HOME; delete env.COPILOT_HOME; delete env.SDD_HOME; delete env.CLAUDE_PROJECT_DIR;
  for (const d of ['.codex', '.gemini', '.cursor', '.copilot', '.config/opencode', 'AppData/Roaming/Code/User', '.config/Code/User', 'Library/Application Support/Code/User']) fs.mkdirSync(path.join(HOME, d), { recursive: true });
  const install = (...args) => spawnSync(process.execPath, [path.join(REPO, 'install.js'), TARGETS, '--no-deps', '--no-hooks', ...args], { env, encoding: 'utf8' });
  const text = f => fs.readFileSync(path.join(HOME, f), 'utf8');
  const json = f => JSON.parse(text(f));
  const vscode = () => json(process.platform === 'win32' ? 'AppData/Roaming/Code/User/mcp.json' : process.platform === 'darwin' ? 'Library/Application Support/Code/User/mcp.json' : '.config/Code/User/mcp.json');
  return { install, text, json, vscode };
}

test('Figma viene apagado: sin --mcp no se registra', () => {
  const h = fakeHome();
  const r = h.install();
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  assert.ok(h.json('.gemini/settings.json').mcpServers.playwright, 'los locales se registran');
  assert.ok(!h.json('.gemini/settings.json').mcpServers.figma);
  assert.doesNotMatch(h.text('.codex/config.toml'), /mcp_servers\.figma/);
  assert.doesNotMatch(r.stdout, /iniciar sesión|inicies sesión/);
});

test('--mcp=figma registra el servidor remoto con el formato de cada herramienta', () => {
  const h = fakeHome();
  const r = h.install('--mcp=figma');
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  assert.match(h.text('.codex/config.toml'), /\[mcp_servers\.figma\]\nurl = "https:\/\/mcp\.figma\.com\/mcp"\n/);
  assert.deepStrictEqual(h.json('.gemini/settings.json').mcpServers.figma, { httpUrl: FIGMA });
  assert.deepStrictEqual(h.json('.cursor/mcp.json').mcpServers.figma, { url: FIGMA });
  assert.deepStrictEqual(h.vscode().servers.figma, { type: 'http', url: FIGMA });
  assert.deepStrictEqual(h.json('.config/opencode/opencode.json').mcp.figma, { type: 'remote', url: FIGMA, enabled: true });
  assert.deepStrictEqual(h.json('.cursor/mcp.json').mcpServers.playwright.type, 'stdio', 'los locales no cambian');
  assert.strictEqual(h.json('.config/opencode/opencode.json').mcp.playwright.type, 'local');
  for (const s of ['codex mcp login figma', '/mcp auth figma', 'opencode mcp auth figma']) assert.ok(r.stdout.includes(s), `indica cómo iniciar sesión: ${s}`);

  const again = h.install('--mcp=figma');
  assert.strictEqual(again.status, 0, again.stderr + again.stdout);
  assert.strictEqual(h.text('.codex/config.toml').split('[mcp_servers.figma]').length, 2, 'no se duplica al reinstalar');
  assert.match(again.stdout, /MCP figma ya existe/);
  assert.doesNotMatch(again.stdout, /inicies sesión/, 'sin aviso de inicio de sesión si no se registró nada nuevo');
});

test('--mcp con un nombre desconocido avisa y sigue', () => {
  const h = fakeHome();
  const r = h.install('--mcp=noexiste');
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /servidores desconocidos en config\/mcp\.json: noexiste/);
});

test('MCP por proyecto: dos repos con dos organizaciones no se pisan', () => {
  const run = (cwd, ...args) => spawnSync(process.execPath, [path.join(REPO, 'install.js'), ...args], { cwd, encoding: 'utf8', env: { ...process.env, HOME: tmp('home-'), USERPROFILE: tmp('home-') } });
  const repo = () => tmp('repo-'); // sin .git: repoRoot cae al directorio actual, que es lo que se quiere acá
  const leer = d => JSON.parse(fs.readFileSync(path.join(d, '.mcp.json'), 'utf8')).mcpServers;

  const junji = repo(); const sag = repo();
  assert.strictEqual(run(junji, '--mcp=azure-devops', '--org=siigsa', '--proyecto').status, 0);
  assert.strictEqual(run(sag, '--mcp=azure-devops', '--org=SAG', '--proyecto').status, 0);

  // El nombre lleva la organización: con el mismo nombre, el inicio de sesión de una pisaría el de la otra
  assert.deepStrictEqual(Object.keys(leer(junji)), ['azure-devops-siigsa']);
  assert.deepStrictEqual(Object.keys(leer(sag)), ['azure-devops-sag'], 'la organización se normaliza a minúsculas');
  assert.strictEqual(leer(junji)['azure-devops-siigsa'].url, 'https://mcp.dev.azure.com/siigsa');
  assert.strictEqual(leer(sag)['azure-devops-sag'].url, 'https://mcp.dev.azure.com/SAG');

  // Solo se registra lo pedido: los servidores de siempre quedan a nivel de usuario, no duplicados en el repo
  assert.ok(!Object.keys(leer(junji)).includes('playwright'));

  // Sin organización no se registra nada, y lo dice
  const sinOrg = repo();
  const r = run(sinOrg, '--mcp=azure-devops', '--proyecto');
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /necesita tu organización|No quedó ningún servidor/);
  assert.strictEqual(fs.existsSync(path.join(sinOrg, '.mcp.json')), false);

  // Sin --mcp tampoco: pedirlo explícito evita duplicar los globales por descuido
  assert.match(run(repo(), '--proyecto').stdout + run(repo(), '--proyecto').stderr, /Indica qué servidor registrar/);
});
