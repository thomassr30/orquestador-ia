'use strict';
// Un adaptador por herramienta: traduce la entrada de su hook al evento común y la decisión común a su formato.
module.exports = {
  claude: require('./claude'),
  codex: require('./codex'),
  gemini: require('./gemini'),
  cursor: require('./cursor'),
  copilot: require('./copilot'),
};
