'use strict';
const test = require('node:test');
const assert = require('node:assert');
const gate = require('../src/gate');
const { emptyState } = require('../src/state');

const cfg = { gate: 'auto' };
const st = () => emptyState('/tmp/p', 's');

test('reconoce aprobaciones (con tildes) y descarta el "si" condicional', () => {
  for (const t of ['sí', 'Sí, dale', '¡Sí!', 'ok', 'dale', 'apruebo', 'Perfecto, adelante', 'listo']) assert.ok(gate.isApproval(t), t);
  for (const t of ['si puedes agrega un botón', 'no, mejor usa X', 'sigue con lo que falta', 'simple: cambia el color', 'claro que no']) assert.ok(!gate.isApproval(t), t);
  for (const t of ['okey', 'claro, adelante', 'me parece bien', 'está bien así', 'de una']) assert.ok(gate.isApproval(t), t);
});

test('detecta pedidos de cambio y de corrección', () => {
  for (const t of ['agrega un botón', 'el login no funciona', 'se rompió el build', 'añadí un campo y falla', 'crea un componente', 'migración de datos', 'fix the parser']) assert.ok(gate.isChangeRequest(t), t);
  for (const t of ['trabaja el ticket LAB-123', 'resuelve PROJ-42']) assert.ok(gate.isChangeRequest(t), t);
  for (const t of ['¿qué hace este módulo?', 'explica la arquitectura', 'creo que está bien', 'continúa', 'crea un prototipo de la pantalla de pagos', 'el archivo está en utf-8']) assert.ok(!gate.isChangeRequest(t), t);
});

test('ciclo completo: requerido → pendiente → aprobado', () => {
  const s = st();
  gate.onPrompt(s, 'agrega exportación a CSV', cfg);
  assert.strictEqual(s.gate.estado, 'requerido');
  assert.ok(gate.editBlockReason(s, cfg));
  gate.onStop(s, 'Plan…\n¿Apruebo la implementación? (sí / no / ajustes)');
  assert.strictEqual(s.gate.estado, 'pendiente');
  gate.onPrompt(s, 'no, primero cambia el nombre del archivo', cfg);
  assert.ok(gate.editBlockReason(s, cfg), 'un "no" con ajustes mantiene el bloqueo');
  gate.onPrompt(s, 'sí', cfg);
  assert.strictEqual(s.gate.estado, 'aprobado');
  assert.strictEqual(gate.editBlockReason(s, cfg), null);
  gate.onPrompt(s, 'sí, y agrega también el filtro por fecha', cfg);
  assert.strictEqual(s.gate.estado, 'aprobado', 'aprobar con un agregado no reabre el GATE');
  gate.onPrompt(s, 'ahora corrige el bug del login', cfg);
  assert.strictEqual(s.gate.estado, 'requerido', 'un pedido nuevo vuelve a pedir plan');
});

test('"directo" libera; gate "nunca" y "siempre"', () => {
  const s = st();
  gate.onPrompt(s, 'cambia el título a Hola, directo', cfg);
  assert.strictEqual(s.gate.estado, 'libre');
  assert.strictEqual(gate.editBlockReason(s, cfg), null);
  const n = st();
  gate.onPrompt(n, 'agrega un botón', { gate: 'nunca' });
  assert.strictEqual(gate.editBlockReason(n, { gate: 'nunca' }), null);
  assert.ok(gate.editBlockReason(st(), { gate: 'siempre' }));
});

test('un "sí" a un comando crítico no aprueba el plan si no se mostró la pregunta del GATE', () => {
  const s = st();
  gate.onPrompt(s, 'agrega exportación a PDF', cfg);
  s.aprobaciones.pendientes.push({ clave: 'npm install pdfkit', en: new Date().toISOString() });
  gate.onStop(s, '¿Apruebas instalar pdfkit?');
  gate.onPrompt(s, 'sí', cfg);
  assert.strictEqual(s.aprobaciones.aprobadas.length, 1);
  assert.ok(gate.editBlockReason(s, cfg), 'el plan sigue sin aprobar');
  gate.onStop(s, 'Plan…\n¿Apruebo la implementación? (sí / no / ajustes)');
  gate.onPrompt(s, 'sí', cfg);
  assert.strictEqual(gate.editBlockReason(s, cfg), null);
});

test('las aprobaciones de comandos críticos son de un solo uso y caducan', () => {
  const s = st();
  s.aprobaciones.pendientes.push({ clave: 'rm -rf build', en: new Date().toISOString() });
  const notes = gate.onPrompt(s, 'sí', cfg);
  assert.ok(notes.some(n => n.includes('rm -rf build')));
  assert.strictEqual(s.aprobaciones.aprobadas.length, 1);
  const v = st();
  v.aprobaciones.pendientes.push({ clave: 'kubectl delete pod x', en: new Date(Date.now() - 3600000).toISOString() });
  gate.onPrompt(v, 'sí', cfg);
  assert.strictEqual(v.aprobaciones.aprobadas.length, 0, 'una confirmación de hace una hora no vale');
  const w = st();
  w.aprobaciones.pendientes.push({ clave: 'rm x', en: new Date().toISOString() });
  gate.onPrompt(w, 'mejor no', cfg);
  assert.strictEqual(w.aprobaciones.pendientes.length, 0);
});

test('si la herramienta entrega el último mensaje, un "sí" sin pregunta previa no aprueba el plan', () => {
  const s = st();
  s.conMensajes = true;
  gate.onPrompt(s, 'agrega un filtro por fecha', cfg);
  gate.onPrompt(s, 'sí', cfg);
  assert.ok(gate.editBlockReason(s, cfg), 'el agente aún no mostró el plan');
  gate.onStop(s, 'Plan…\n¿Apruebo la implementación? (sí / no / ajustes)');
  gate.onPrompt(s, 'sí', cfg);
  assert.strictEqual(gate.editBlockReason(s, cfg), null);
});
