'use strict';
// Ejecución de comandos para los sensores: con tiempo límite, sin colores, matando el árbol de
// procesos si se excede, y con la salida limpia (sin ANSI ni barras de progreso) para ahorrar tokens.
const { spawn, spawnSync } = require('child_process');
const { IS_WIN } = require('./util');

const LIVE = new Set();

function killTree(pid) {
  if (!pid) return;
  if (IS_WIN) {
    try { spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); } catch { /* ya terminó */ }
    return;
  }
  try { process.kill(-pid, 'SIGTERM'); } catch { try { process.kill(pid, 'SIGTERM'); } catch { /* ya terminó */ } }
  const t = setTimeout(() => { try { process.kill(-pid, 'SIGKILL'); } catch { /* ya terminó */ } }, 1500);
  t.unref();
}
process.on('exit', () => {
  for (const pid of LIVE) {
    try { if (IS_WIN) spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); else process.kill(-pid, 'SIGKILL'); } catch { /* ya terminó */ }
  }
});

/** Acumula salida conservando el inicio y el final si es muy larga. */
class OutputBuffer {
  constructor(max = 512 * 1024, headMax = 16 * 1024) {
    this.max = max; this.headMax = headMax; this.head = []; this.headLen = 0; this.tail = []; this.tailLen = 0; this.dropped = 0;
  }
  push(chunk) {
    if (this.headLen < this.headMax) {
      const take = chunk.subarray(0, this.headMax - this.headLen);
      this.head.push(take); this.headLen += take.length;
      chunk = chunk.subarray(take.length);
      if (!chunk.length) return;
    }
    this.tail.push(chunk); this.tailLen += chunk.length;
    while (this.tailLen > this.max && this.tail.length > 1) { const x = this.tail.shift(); this.tailLen -= x.length; this.dropped += x.length; }
  }
  text() {
    const head = Buffer.concat(this.head).toString('utf8');
    const tail = Buffer.concat(this.tail).toString('utf8');
    return this.dropped ? `${head}\n[… ${this.dropped} bytes omitidos …]\n${tail}` : head + tail;
  }
}

/** Quita códigos ANSI y barras de progreso con \r. */
function cleanOutput(s) {
  return String(s)
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/\x1b[()][A-Z0-9]/g, '')
    .split('\n').map(l => (l.includes('\r') ? l.split('\r').filter(Boolean).pop() || '' : l)).join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * Ejecuta un comando en el shell del sistema (cmd en Windows, sh en macOS/Linux).
 * @returns {Promise<{code:number, output:string, ms:number, timedOut:boolean}>}
 */
function runShell(command, { cwd, timeoutMs = 120000, env = {} } = {}) {
  return new Promise(resolve => {
    const started = Date.now();
    let done = false;
    const finish = r => { if (!done) { done = true; resolve({ ...r, ms: Date.now() - started }); } };
    let child;
    try {
      child = spawn(command, {
        cwd, shell: true, windowsHide: true, detached: !IS_WIN, stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1', npm_config_color: 'false', GIT_PAGER: 'cat', PAGER: 'cat', GIT_TERMINAL_PROMPT: '0', ...env },
      });
    } catch (e) { finish({ code: -1, output: e.message, timedOut: false }); return; }
    if (child.pid) LIVE.add(child.pid);
    const buf = new OutputBuffer();
    child.stdout.on('data', d => buf.push(d));
    child.stderr.on('data', d => buf.push(d));
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; killTree(child.pid); }, timeoutMs);
    child.on('error', e => { clearTimeout(timer); LIVE.delete(child.pid); finish({ code: -1, output: `${buf.text()}\n${e.message}`, timedOut }); });
    child.on('close', code => { clearTimeout(timer); LIVE.delete(child.pid); finish({ code: code ?? -1, output: cleanOutput(buf.text()), timedOut }); });
  });
}

/** ¿Existe un ejecutable en el PATH? (resultado en caché) */
const whichCache = new Map();
function hasCommand(cmd) {
  if (whichCache.has(cmd)) return whichCache.get(cmd);
  const r = spawnSync(IS_WIN ? 'where' : 'which', [cmd], { stdio: 'ignore', windowsHide: true });
  const ok = r.status === 0;
  whichCache.set(cmd, ok);
  return ok;
}

module.exports = { runShell, killTree, cleanOutput, OutputBuffer, hasCommand };
