'use strict';
// Credenciales de servidores MCP que se autentican con un token (Azure DevOps con PAT, y lo que venga después).
//
// Por qué existe este módulo, y no una variable de entorno:
//  - Pedirle al usuario que mantenga PERSONAL_ACCESS_TOKEN en su entorno deja la autenticación FUERA del harness:
//    la tiene que recrear en cada máquina y en cada sesión de terminal, y nada avisa cuando falta.
//  - Poner el token en la configuración del servidor MCP lo copia a CADA herramienta donde se registra
//    (~/.claude.json, .mcp.json, Codex, Gemini, Cursor, Copilot): seis copias en texto plano de un secreto que
//    da acceso de lectura a todo el Azure DevOps de la organización.
// Acá queda una sola copia, en el home del harness, solo legible por el usuario (0600), y el lanzador
// (bin/sdd-mcp.js) la entrega al servidor por el entorno del proceso hijo, sin pasar por ninguna configuración.
//
// Lo que esto NO es: cifrado. Un archivo 0600 protege de otros usuarios de la máquina, no de algo que corra como
// tú. La ganancia es sacar el token de seis archivos de configuración y del entorno, no volverlo indescifrable.

const fs = require('fs');
const os = require('os');
const path = require('path');

const SDD_HOME = path.join(os.homedir(), '.sdd-orquestador');
const DIR = () => path.join(process.env.SDD_HOME || SDD_HOME, 'credenciales');
const VERSION = 1;

// Tipos conocidos: cómo se arma el valor y en qué variable lo espera el servidor.
const TIPOS = {
  'azure-pat': {
    variable: 'PERSONAL_ACCESS_TOKEN',
    // @azure-devops/mcp espera el base64 de «correo:token», no el token pelado.
    valor: ({ usuario, token }) => Buffer.from(`${usuario}:${token}`, 'utf8').toString('base64'),
    pide: ['usuario', 'token'],
  },
};

const ALIAS_OK = /^[a-z0-9][a-z0-9-]{0,48}$/;
const fileOf = alias => path.join(DIR(), `${alias}.json`);

/** Alias válido para un nombre de archivo: sin rutas, sin sorpresas. */
function checkAlias(alias) {
  const a = String(alias || '').trim();
  if (!ALIAS_OK.test(a)) throw new Error(`alias inválido: «${alias}». Usa minúsculas, números y guiones (ej. azure-sag).`);
  return a;
}

/** Guarda la credencial. Devuelve {alias, tipo, archivo}. El valor derivado no se registra en ningún log. */
function save(alias, tipo, datos) {
  const a = checkAlias(alias);
  const t = TIPOS[tipo];
  if (!t) throw new Error(`tipo de credencial desconocido: «${tipo}» (conocidos: ${Object.keys(TIPOS).join(', ')})`);
  for (const campo of t.pide) if (!String((datos || {})[campo] || '').trim()) throw new Error(`falta «${campo}»`);
  const valor = t.valor(datos);
  const dir = DIR();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(dir, 0o700); } catch { /* en Windows no aplica */ }
  const cuerpo = { v: VERSION, tipo, variable: t.variable, usuario: String(datos.usuario || ''), valor, creado: new Date().toISOString() };
  const tmp = `${fileOf(a)}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cuerpo, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, fileOf(a));
  try { fs.chmodSync(fileOf(a), 0o600); } catch { /* en Windows no aplica */ }
  return { alias: a, tipo, archivo: fileOf(a) };
}

/** Lee la credencial. Devuelve {variable, valor, …} o null si no existe. Lanza si está rota. */
function read(alias) {
  const a = checkAlias(alias);
  let raw;
  try { raw = fs.readFileSync(fileOf(a), 'utf8'); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  let c;
  try { c = JSON.parse(raw); } catch (e) { throw new Error(`la credencial «${a}» no se puede leer (${e.message}). Vuelve a registrarla.`); }
  if (!c || !c.valor || !c.variable) throw new Error(`la credencial «${a}» está incompleta. Vuelve a registrarla.`);
  return c;
}

/** Credenciales registradas, sin su valor: alias, tipo, usuario y fecha. */
function list() {
  let files;
  try { files = fs.readdirSync(DIR()); } catch { return []; }
  return files.filter(f => f.endsWith('.json')).map(f => {
    const alias = f.slice(0, -5);
    try {
      const c = JSON.parse(fs.readFileSync(path.join(DIR(), f), 'utf8'));
      let modo = null;
      try { modo = (fs.statSync(path.join(DIR(), f)).mode & 0o777).toString(8).padStart(3, '0'); } catch { /* ignorar */ }
      return { alias, tipo: c.tipo || '?', usuario: c.usuario || '', creado: c.creado || '', modo, ok: !!c.valor };
    } catch { return { alias, tipo: '?', usuario: '', creado: '', modo: null, ok: false }; }
  }).sort((a, b) => a.alias.localeCompare(b.alias));
}

/** Borra la credencial. Devuelve true si existía. */
function remove(alias) {
  const a = checkAlias(alias);
  try { fs.unlinkSync(fileOf(a)); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; }
}

module.exports = { save, read, list, remove, checkAlias, TIPOS, DIR, fileOf };
