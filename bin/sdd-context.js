#!/usr/bin/env node
// Imprime la memoria SDD del PROYECTO ACTUAL (la misma que el harness inyecta al iniciar o tras compactar).
// Aislada por proyecto. Si no hay memoria, no imprime nada.
// Uso manual: node sdd-context.js [ruta-del-proyecto]
'use strict';
const fs = require('fs');
const path = require('path');
const { contextBlock } = require(path.join(__dirname, '..', 'harness', 'src', 'memory'));
const { findProjectRoot } = require(path.join(__dirname, '..', 'harness', 'src', 'util'));

let source = '';
try { if (!process.stdin.isTTY) { const input = fs.readFileSync(0, 'utf8'); if (input.trim()) source = JSON.parse(input).source || ''; } } catch { /* sin stdin */ }
const root = findProjectRoot(process.argv[2] || process.env.CLAUDE_PROJECT_DIR || process.cwd());
const out = contextBlock(root, { source });
if (out) process.stdout.write(`${out}\n`);
