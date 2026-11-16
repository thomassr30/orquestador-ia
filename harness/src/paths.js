'use strict';
// Rutas del harness. Funciona igual desde el repositorio y desde la copia instalada en
// ~/.sdd-orquestador (bin/ y harness/ conservan la misma estructura relativa).
const os = require('os');
const path = require('path');

const HOME = os.homedir();
const SDD_HOME = process.env.SDD_HOME || path.join(HOME, '.sdd-orquestador');
const fwd = p => String(p).replace(/\\/g, '/');

module.exports = {
  HOME,
  SDD_HOME,
  GLOBAL_CONFIG: path.join(SDD_HOME, 'harness.json'),
  STATE_DIR: path.join(SDD_HOME, 'estado'),
  fwd,
  /**
   * Comando del CLI del harness tal como lo debe escribir el agente: ruta real y con barras normales, igual que la
   * regla de permiso que escribe el instalador (con $HOME el texto no coincide y el asistente pregunta cada vez).
   */
  harnessCmd: (sub = '') => `node "${fwd(SDD_HOME)}/bin/sdd-harness.js"${sub ? ` ${sub}` : ''}`,
};
