#!/usr/bin/env node
'use strict';
// Lanzador de servidores MCP que necesitan un token: lee la credencial del harness, la pone en el entorno del
// proceso hijo y arranca el servidor de verdad.
//
//   node sdd-mcp.js <alias> -- <comando> [argumentos...]
//   node sdd-mcp.js azure-sag -- cmd /c npx -y @azure-devops/mcp MiOrg -d core work -a pat
//
// Así el token no entra en la configuración de ninguna herramienta: lo que queda registrado en ~/.claude.json,
// .mcp.json, Codex, Gemini, Cursor y Copilot es esta línea, sin secreto adentro.
//
// REGLA DE ORO: stdout es el canal del protocolo MCP y se hereda tal cual. Todo lo que diga este lanzador va por
// stderr. Un solo carácter impreso en stdout rompe la sesión del servidor con un error de parseo que después no
// hay cómo diagnosticar.

const path = require('path');
const { spawn } = require('child_process');

const argv = process.argv.slice(2);
const die = (msg, code = 2) => { process.stderr.write(`[sdd-mcp] ${msg}\n`); process.exit(code); };

const corte = argv.indexOf('--');
const alias = argv[0];
if (!alias || alias === '--' || corte < 1) {
  die('uso: sdd-mcp.js <alias> -- <comando> [argumentos...]\n' +
      '  El alias es el de la credencial: «sdd-harness credencial listar» los muestra.');
}
const cmd = argv[corte + 1];
const args = argv.slice(corte + 2);
if (!cmd) die('falta el comando del servidor después de «--».');

const C = require(path.join(__dirname, '..', 'harness', 'src', 'credenciales'));

let cred;
try { cred = C.read(alias); } catch (e) { die(e.message); }
if (!cred) {
  die(`no hay credencial «${alias}». Regístrala con:\n` +
      `  node "${path.join(__dirname, 'sdd-harness.js')}" credencial azure ${alias} --usuario <tu-correo>\n` +
      '  Después reinicia la sesión de tu herramienta: los servidores MCP se cargan al iniciarla.');
}

// El entorno del hijo lleva la credencial; el del harness no se toca.
const env = { ...process.env, [cred.variable]: cred.valor };

const hijo = spawn(cmd, args, { stdio: 'inherit', env, shell: false, windowsHide: true });
hijo.on('error', e => die(`no se pudo arrancar «${cmd}»: ${e.message}`, 127));
hijo.on('exit', (code, signal) => {
  if (signal) { process.kill(process.pid, signal); return; }
  process.exit(code === null ? 1 : code);
});
// Las señales se le pasan al servidor para que cierre como corresponde.
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { try { hijo.kill(s); } catch { /* ya murió */ } });
