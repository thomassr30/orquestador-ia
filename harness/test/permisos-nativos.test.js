'use strict';
// El comando que el harness le indica al agente (`node "<SDD_HOME>/bin/sdd-harness.js" …`) debe coincidir con el
// permiso nativo que el instalador escribe en cada cliente; si no, el asistente le pregunta al usuario cada vez.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { REPO } = require('./helpers');
const R = require('../src/rules');
const HC = require('../src/hooks-config');
const { SDD_HOME, fwd, harnessCmd } = require('../src/paths');

const HOME_FWD = fwd(SDD_HOME);
const P = HC.ownScriptPerms(HOME_FWD);
const CLI = harnessCmd();

test('harnessCmd usa la ruta real con barras normales, sin $HOME ni barras invertidas', () => {
  assert.strictEqual(harnessCmd('trabajo'), `node "${HOME_FWD}/bin/sdd-harness.js" trabajo`);
  assert.doesNotMatch(CLI, /\$HOME|~|\\/);
});

test('Claude: el comando sugerido coincide con la regla allow, y lo del usuario queda en ask', () => {
  assert.ok(P.claude.allow.includes(`Bash(${CLI}:*)`));
  for (const s of ['aprobar', 'excepcion', 'trabajo aceptar', 'trabajo descartar']) assert.ok(P.claude.ask.includes(`Bash(${CLI} ${s}:*)`), s);
});

test('Codex: allow para los scripts propios (ruta con / y con \\) y prompt para lo que decide el usuario', () => {
  const [allow] = P.codex.allow;
  assert.strictEqual(allow[0], 'node');
  assert.ok(allow[1].includes(`${HOME_FWD}/bin/sdd-harness.js`));
  assert.ok(allow[1].some(t => t.endsWith('\\bin\\sdd-harness.js')));
  const rules = HC.codexRules(HOME_FWD);
  assert.match(rules, /decision = "allow"/);
  for (const s of R.HARNESS_USER_ONLY) {
    const words = s.split(' ');
    assert.ok(P.codex.prompt.some(p => JSON.stringify(p.slice(2)) === JSON.stringify(words)), s);
  }
  assert.doesNotMatch(HC.codexRules(), /decision = "allow"/, 'sin ruta no se preaprueba nada');
});

test('OpenCode: la última regla que coincide gana → lo del usuario queda en ask', () => {
  const lastMatch = cmd => {
    let out = null;
    for (const [pat, v] of P.opencode) {
      const re = new RegExp(`^${pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
      if (re.test(cmd)) out = v;
    }
    return out;
  };
  assert.strictEqual(lastMatch(harnessCmd('trabajo verificar T-01')), 'allow');
  assert.strictEqual(lastMatch(harnessCmd('doctor')), 'allow');
  assert.strictEqual(lastMatch(harnessCmd('aprobar')), 'ask');
  assert.strictEqual(lastMatch(harnessCmd('trabajo aceptar')), 'ask');
});

test('Gemini, Cursor y Copilot: prefijo exacto del comando sugerido', () => {
  assert.ok(P.gemini.includes(`run_shell_command(${CLI})`));
  assert.ok(P.prefijos.includes(CLI));
});

test('ningún mensaje ni regla del orquestador le indica al agente usar $HOME para sus scripts', () => {
  const files = [path.join(REPO, 'core', 'rules', 'global.md'), ...fs.readdirSync(path.join(REPO, 'harness', 'src')).filter(f => f.endsWith('.js')).map(f => path.join(REPO, 'harness', 'src', f))];
  for (const f of files) assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /(\$HOME|~)\/\.sdd-orquestador\/bin\//, path.relative(REPO, f));
});
