'use strict';
// Banco de frases del GATE (evals/gate/frases.json): mide si el harness exige plan cuando corresponde.
// Sin modelos y sin procesos: son funciones puras de gate.js, así que corre en milisegundos.
//
// Línea base medida el 2026-11-06, antes de invertir la condición: 80% de falsos negativos en «cambio»
// (32 de 40 pedidos con redacción natural no abrían el GATE) y 0% de falsos positivos en «consulta».
// Esa asimetría es la razón del cambio: reconocer la consulta es acotado, reconocer el pedido no lo es.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { REPO } = require('./helpers');
const G = require('../src/gate');

const banco = require(path.join(REPO, 'evals', 'gate', 'frases.json'));
const U = banco.umbrales;
const pide = t => (G.requiresPlan ? G.requiresPlan(t) : G.isChangeRequest(t));
const pct = (n, total) => (total ? n / total : 0);

/** Informe legible: cuántas fallaron y las primeras que hay que mirar. */
function informe(etiqueta, fallas, total, limite) {
  const p = pct(fallas.length, total);
  const detalle = fallas.slice(0, 12).map(f => `    · ${f}`).join('\n');
  return `${etiqueta}: ${fallas.length}/${total} (${(p * 100).toFixed(1)}%, límite ${(limite * 100).toFixed(1)}%)\n${detalle}${fallas.length > 12 ? `\n    … y ${fallas.length - 12} más` : ''}`;
}

test('banco: un pedido de cambio exige plan aprobado', () => {
  const fallas = banco.cambio.filter(t => !pide(t));
  const max = 1 - U.recallCambio;
  assert.ok(pct(fallas.length, banco.cambio.length) <= max, informe('no abren el GATE', fallas, banco.cambio.length, max));
});

test('banco: una consulta o un saludo no exige plan', () => {
  const fallas = banco.consulta.filter(t => pide(t));
  const max = U.maxFalsosPositivosConsulta;
  assert.ok(pct(fallas.length, banco.consulta.length) <= max, informe('abren el GATE sin ser pedido', fallas, banco.consulta.length, max));
});

test('banco: se reconoce la aprobación del usuario en su propio lenguaje', () => {
  const fallas = banco.aprobacion.filter(t => !G.isApproval(t));
  const max = 1 - U.recallAprobacion;
  assert.ok(pct(fallas.length, banco.aprobacion.length) <= max, informe('no se leen como aprobación', fallas, banco.aprobacion.length, max));
});

test('banco: negar, esperar o preguntar nunca cuenta como aprobación', () => {
  const fallas = banco.noAprobacion.filter(t => G.isApproval(t));
  assert.ok(pct(fallas.length, banco.noAprobacion.length) <= U.maxFalsasAprobaciones, informe('se leyeron como aprobación', fallas, banco.noAprobacion.length, U.maxFalsasAprobaciones));
});

test('banco: una aprobación no se confunde con un pedido nuevo (respaldo desde la conversación)', () => {
  for (const t of banco.aprobacion) assert.ok(G.isPureApproval(t) || t.length > 80, `«${t}» debería valer como aprobación pura`);
  for (const t of banco.noAprobacion) assert.ok(!G.isPureApproval(t), `«${t}» no es una aprobación pura`);
});
