'use strict';
// Coherencia entre la configuración que usa el código (DEFAULTS) y la documentada en config/harness.json:
// toda clave que el código entiende está documentada con su valor por defecto, y no se documentan claves que no existen.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { REPO } = require('./helpers');
const { DEFAULTS } = require('../src/config');

const doc = JSON.parse(fs.readFileSync(path.join(REPO, 'config', 'harness.json'), 'utf8'));
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

/** Rutas «a.b.c» de las claves con valor (sin las de documentación «_…» ni el interior de listas). */
function leaves(o, prefix = '') {
  return Object.entries(o).filter(([k]) => !k.startsWith('_')).flatMap(([k, v]) => (isObj(v) && Object.keys(v).length ? leaves(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
}
const get = (o, p) => p.split('.').reduce((x, k) => (x == null ? x : x[k]), o);

test('cada clave de configuración que usa el código está documentada con su valor por defecto', () => {
  for (const key of leaves(DEFAULTS).filter(k => k !== 'reglas' && !k.startsWith('sensores.comandos'))) {
    assert.ok(get(doc, key) !== undefined, `config/harness.json no documenta «${key}»`);
    assert.deepStrictEqual(get(doc, key), get(DEFAULTS, key), `«${key}»: el valor documentado no es el por defecto`);
  }
});

test('config/harness.json no documenta claves que el código no entiende', () => {
  for (const key of leaves(doc).filter(k => !k.startsWith('sensores.comandos'))) {
    assert.ok(get(DEFAULTS, key) !== undefined, `config/harness.json documenta «${key}», que el código no usa`);
  }
});
