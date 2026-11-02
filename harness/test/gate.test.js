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

test('caso real: el agente termina pidiendo «responda sí» sin signo de pregunta y el usuario escribe "si"', () => {
  const s = st();
  s.conMensajes = true;
  gate.onPrompt(s, 'agrega la base de íconos y tooltips', cfg);
  gate.onStop(s, 'Qué necesito de usted\nResponda «sí» otra vez, con tilde, o «directo», para que el harness lo registre.');
  gate.onPrompt(s, 'si', cfg);
  assert.strictEqual(gate.editBlockReason(s, cfg), null);
});

test('con el plan aprobado, "continúa con los tooltips" no vuelve a bloquear', () => {
  const s = st();
  s.gate = { estado: 'aprobado' };
  gate.onPrompt(s, 'continúa y agrega los tooltips que faltan', cfg);
  assert.strictEqual(s.gate.estado, 'aprobado');
  gate.onPrompt(s, 'ahora crea el módulo de reportes', cfg);
  assert.strictEqual(s.gate.estado, 'requerido', 'un pedido nuevo sí pide plan');
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

test('extrae el mensaje del usuario del contexto que antepone la herramienta', () => {
  const codex = '# Context from my IDE setup:\n\n## Active file: src/app/fix-login.ts\n\n## Open tabs:\n- error.service.ts\n\n## My request for Codex:\nsi\n';
  assert.strictEqual(gate.userText(codex), 'si');
  assert.strictEqual(gate.userText('<ide_opened_file>The user opened src/a.ts</ide_opened_file>\nsí'), 'sí');
  assert.strictEqual(gate.userText('<environment_context>\n  <cwd>C:\\dev\\x</cwd>\n</environment_context>\r\n\r\nsí, dale'), 'sí, dale');
  assert.strictEqual(gate.userText('# Browser context\nURL: http://localhost:4200/panel\nTitle: Panel\n\nsi'), 'si');
  assert.strictEqual(gate.userText('# Contexto del navegador\nURL: http://localhost:4200\nsi'), 'si');
  assert.strictEqual(gate.userText('[Selección en la página]\nBotón Guardar\n\nsí\npero usa azul'), 'sí\npero usa azul');
  // Sin contexto reconocible no se recorta nada
  assert.strictEqual(gate.userText('# Tarea\nAgrega export CSV\n\nGracias'), '# Tarea\nAgrega export CSV\n\nGracias');
  assert.strictEqual(gate.userText('sí'), 'sí');
});

test('caso real (Codex con navegador integrado): un "si" con contexto antepuesto aprueba el plan', () => {
  for (const reply of [
    '# Context from my IDE setup:\n\n## Open tabs:\n- panel.component.ts\n\n## My request for Codex:\nsi',
    '# Browser context\nURL: http://localhost:4200/panel\nTitle: Panel de control\n\nsi',
    '<browser_context url="http://localhost:4200">Panel de control · Error al cargar</browser_context>\nsi',
  ]) {
    const s = st();
    s.conMensajes = true;
    gate.onPrompt(s, 'corrige el error de Trusted Types en el panel', cfg);
    gate.onStop(s, 'Plan…\n¿Apruebo la implementación? (sí / no / ajustes)');
    gate.onPrompt(s, reply, cfg);
    assert.strictEqual(gate.editBlockReason(s, cfg), null, reply);
  }
});

test('el contexto antepuesto no dispara "directo" ni pedidos de cambio, ni entra al objetivo', () => {
  const s = st();
  gate.onPrompt(s, '# Browser context\nTitle: Acceso directo · Error 500\nURL: http://localhost/x\n\n¿qué hace este módulo?', cfg);
  assert.strictEqual(s.gate.estado, 'inicial', 'el texto de la página no es del usuario');
  const c = st();
  gate.onPrompt(c, '# Context from my IDE setup:\n\n## Active file: a.ts\n\n## My request for Codex:\nagrega un filtro por fecha', cfg);
  assert.strictEqual(c.gate.estado, 'requerido');
  assert.strictEqual(c.objetivo, 'agrega un filtro por fecha');
  assert.ok(gate.editBlockReason(c, cfg).includes('«agrega un filtro por fecha»'), 'el bloqueo muestra qué leyó el harness');
});
