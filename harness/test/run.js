#!/usr/bin/env node
// Ejecuta todas las pruebas del harness (compatible con Node 18+, sin depender de globs del shell).
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort().map(f => path.join(__dirname, f));
// Sin las variables del host: si las pruebas corren dentro de un hook (sensor), los hooks de prueba
// tomarían el proyecto real en vez del proyecto temporal de cada test.
const env = { ...process.env };
for (const k of ['CLAUDE_PROJECT_DIR', 'GEMINI_PROJECT_DIR', 'GEMINI_SESSION_ID']) delete env[k];
const r = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit', env });
process.exit(r.status === null ? 1 : r.status);
