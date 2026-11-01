'use strict';
// Rutas del harness. Funciona igual desde el repositorio y desde la copia instalada en
// ~/.sdd-orquestador (bin/ y harness/ conservan la misma estructura relativa).
const os = require('os');
const path = require('path');

const HOME = os.homedir();
const SDD_HOME = process.env.SDD_HOME || path.join(HOME, '.sdd-orquestador');

module.exports = {
  HOME,
  SDD_HOME,
  GLOBAL_CONFIG: path.join(SDD_HOME, 'harness.json'),
  STATE_DIR: path.join(SDD_HOME, 'estado'),
  fwd: p => String(p).replace(/\\/g, '/'),
};
