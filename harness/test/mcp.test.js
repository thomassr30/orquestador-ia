'use strict';
// Herramientas MCP: qué se bloquea, qué se confirma y qué pasa libre. Funciones puras, sin procesos.
// Los nombres de Azure DevOps son los del MCP oficial (@azure-devops/mcp), que agrupa por herramienta con un
// parámetro «action»: wit_work_item (get/my/get_batch/list_for_iteration), wit_query (WIQL), wit_backlog,
// core_list_projects para lectura; wit_work_item_write y wit_work_item_link_write para escritura.
const test = require('node:test');
const assert = require('node:assert');
const { classifyMcp, parseMcpName } = require('../src/mcp');

const d = (server, tool, permisos) => classifyMcp({ server, tool }, permisos);

test('Azure Boards: leer pasa libre, también con el nombre WIQL («query» no es escritura)', () => {
  for (const [srv, tool] of [['azure-devops', 'core_list_projects'], ['ado', 'core_list_projects'],
    ['azure-devops', 'wit_work_item'], ['ado', 'wit_work_item'], ['azure-devops', 'wit_backlog'],
    ['azure-devops', 'wit_query'], ['ado', 'wit_query']]) {
    assert.strictEqual(d(srv, tool).decision, 'allow', `${srv} → ${tool}`);
  }
});

test('Azure Boards: escribir un work item se confirma, no se bloquea (tracker-common: «siempre con confirmación»)', () => {
  for (const [srv, tool] of [['azure-devops', 'wit_work_item_write'], ['ado', 'wit_work_item_write'],
    ['azure-devops', 'wit_work_item_link_write'], ['azdo', 'wit_work_item_link_write'], ['vsts', 'work_item_update']]) {
    const r = d(srv, tool);
    assert.strictEqual(r.decision, 'ask', `${srv} → ${tool}`);
    assert.ok(r.critical, `${srv} → ${tool}: decisión del usuario`);
    assert.match(r.reason, /gestor de tickets/);
  }
});

test('la decisión no depende del nombre que se le dé al servidor', () => {
  for (const tool of ['wit_work_item_write', 'repo_create_pull_request', 'wit_query']) {
    assert.strictEqual(d('azure-devops', tool).decision, d('ado', tool).decision, tool);
  }
});

test('escribir en el repositorio de una forja sigue bloqueado, también en Azure Repos', () => {
  for (const [srv, tool] of [['azure-devops', 'repo_create_pull_request'], ['ado', 'repo_create_pull_request'],
    ['azure-devops', 'repo_update_pull_request'], ['github', 'create_pull_request'], ['gitlab', 'merge_merge_request'],
    ['github', 'create_issue'], ['github', 'add_issue_comment']]) {
    assert.strictEqual(d(srv, tool).decision, 'deny', `${srv} → ${tool}`);
  }
  assert.strictEqual(d('github', 'get_issue').decision, 'allow', 'leer una forja pasa libre');
});

test('otros servidores: escribir o ejecutar se confirma; leer pasa libre', () => {
  assert.strictEqual(d('notion', 'notion-update-page').decision, 'ask');
  assert.strictEqual(d('jira', 'get_issue').decision, 'allow');
  assert.strictEqual(d('postgres', 'query').decision, 'allow', 'una consulta es lectura');
  for (const tool of ['execute_query', 'run_sql', 'sql_exec']) assert.strictEqual(d('postgres', tool).decision, 'ask', tool);
});

test('la configuración manda sobre todo lo anterior', () => {
  assert.strictEqual(d('azure-devops', 'wit_work_item_write', { mcpBloquear: ['azure-devops__wit_work_item_write'] }).decision, 'deny');
  assert.strictEqual(d('azure-devops', 'wit_work_item_write', { mcpLibres: ['azure-devops'] }).decision, 'allow');
  assert.strictEqual(d('playwright', 'browser_click').decision, 'allow', 'servidores del orquestador');
});

test('wiki, planes de prueba y pipelines de una forja: confirmación, no bloqueo', () => {
  for (const [tool, args] of [['wiki', { action: 'upsert_page' }], ['wiki_upsert_page', {}],
    ['testplan_test_case_write', { action: 'create' }], ['pipelines_write', { action: 'run_pipeline' }]]) {
    const r = classifyMcp({ server: 'azure-devops', tool, args });
    assert.strictEqual(r.decision, 'ask', tool);
    assert.ok(r.critical, `${tool}: decisión del usuario`);
    assert.match(r.reason, /no es el código del repositorio/);
  }
  // Leerlos sigue pasando libre
  for (const [tool, args] of [['wiki', { action: 'get_page_content' }], ['pipelines_build', { action: 'list' }],
    ['testplan', { action: 'list_plans' }]]) {
    assert.strictEqual(classifyMcp({ server: 'azure-devops', tool, args }).decision, 'allow', tool);
  }
});

test('las herramientas agrupadas no esconden la escritura en el argumento «action»', () => {
  const t = tool => ({ server: 'azure-devops', tool });
  // wit_backlog es lectura en «list» y escritura en «reorder»: el nombre no alcanza para distinguirlas
  assert.strictEqual(classifyMcp({ ...t('wit_backlog'), args: { action: 'list' } }).decision, 'allow');
  assert.strictEqual(classifyMcp({ ...t('wit_backlog'), args: { action: 'reorder' } }).decision, 'ask');
  assert.strictEqual(classifyMcp({ ...t('wit_work_item'), args: { action: 'get' } }).decision, 'allow');
  assert.strictEqual(classifyMcp({ ...t('wit_work_item'), args: { action: 'update' } }).decision, 'ask');
  // Sin args no se rompe, y «operation» se mira igual
  assert.strictEqual(classifyMcp(t('wit_backlog')).decision, 'allow');
  assert.strictEqual(classifyMcp({ ...t('wit_backlog'), args: { operation: 'reorder' } }).decision, 'ask');
});

test('nombres MCP de cada herramienta', () => {
  assert.deepStrictEqual(parseMcpName('mcp__azure-devops__wit_work_item_write'), { server: 'azure-devops', tool: 'wit_work_item_write' });
  assert.deepStrictEqual(parseMcpName('mcp_ado_wit_query'), { server: 'ado', tool: 'wit_query' });
  assert.deepStrictEqual(parseMcpName('ado_wit_query', { opencode: true }), { server: 'ado', tool: 'wit_query' });
  assert.strictEqual(parseMcpName('Bash'), null);
});
