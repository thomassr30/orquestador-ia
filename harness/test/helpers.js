'use strict';
// Utilidades de prueba: directorios temporales y proyectos falsos.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const tmp = (prefix = 'sdd-') => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));

function project(files = {}, { git = true } = {}) {
  const dir = tmp('sdd-proj-');
  if (git) spawnSync('git', ['init', '-q'], { cwd: dir });
  for (const [f, content] of Object.entries(files)) {
    const p = path.join(dir, f);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return dir;
}

const REPO = path.resolve(__dirname, '..', '..');
module.exports = { tmp, project, REPO };
