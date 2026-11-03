'use strict';
// OpenCode no usa hooks de comando: el harness es un plugin (harness/opencode/sdd-harness.js, instalado en
// ~/.config/opencode/plugins/). Este módulo solo declara sus capacidades; no se registra en adapters/index.js
// porque sdd-hook.js no atiende a OpenCode. (Las referencias son al archivo del plugin.)

// Hook del plugin → evento común del núcleo
const EVENTS = { 'tool.execute.before': 'pre', 'tool.execute.after': 'post', 'chat.message': 'prompt', 'experimental.chat.system.transform': 'session', 'experimental.session.compacting': 'compact', 'session.idle': 'stop' };

// Capacidades que declara el plugin según su código (contrato en capacidades.js). Que OpenCode las respete
// no se comprueba aquí: doctor las cruza con la prueba sintética y con los eventos reales observados.
const capacidades = {
  hooks: Object.keys(EVENTS),
  bloqueoPrevio: 'si', aprobacion: 'chat', finDeTurno: 'reintenta', compactacion: 'reinyecta', resultados: 'todas', sesion: 'si', consumo: 'no_disponible', aislamiento: 'desconocido',
  notas: {
    bloqueoPrevio: 'tool.execute.before lanza un error con el motivo (sdd-harness.js:55) para todas las herramientas',
    aprobacion: 'sin diálogo nativo: error + confirmación en el chat (sdd-harness.js:25 nativeAsk false); git de escritura lo confirma OpenCode con su permiso "ask" (nativeGitAsk, sdd-harness.js:25)',
    finDeTurno: 'session.idle → un mensaje nuevo a la sesión cuando ya terminó: no bloquea (sdd-harness.js:86-92)',
    compactacion: 'experimental.session.compacting agrega el contexto (sdd-harness.js:80-83) y la memoria va en cada system prompt (sdd-harness.js:74-77)',
    resultados: 'tool.execute.after agrega el aviso a la salida de cualquier herramienta (sdd-harness.js:59-65)',
    sesion: 'sessionID de cada hook (sdd-harness.js:54)',
    consumo: 'el plugin no entrega transcript (sdd-harness.js:25)',
    aislamiento: 'los hooks no aíslan; su sandbox no se verificó en documentación',
  },
};

module.exports = { EVENTS, capacidades };
