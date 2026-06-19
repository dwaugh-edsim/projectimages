// engine.js — Reuses the browser game modules (config/utils/rules/cards/gameState/ai)
// inside Node by evaluating them in an isolated vm context with a fake `window`.
// Each call to createEngine() yields a fresh, independent game state singleton,
// so multiple concurrent games never share state.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CLIENT_JS_DIR = path.join(__dirname, '..', 'js');
const MODULE_FILES = ['config.js', 'utils.js', 'rules.js', 'cards.js', 'gameState.js', 'ai.js'];

function createEngine() {
  const sandbox = {
    window: {},
    console,
    Math, Date, JSON, Object, Array, Set, Map, Symbol,
    parseInt, parseFloat, isNaN,
    setTimeout, clearTimeout, setInterval, clearInterval,
    TextEncoder, TextDecoder,
    crypto: globalThis.crypto,
  };
  vm.createContext(sandbox);
  for (const f of MODULE_FILES) {
    const code = fs.readFileSync(path.join(CLIENT_JS_DIR, f), 'utf8');
    vm.runInContext(code, sandbox, { filename: f });
  }
  return sandbox.window;
}

module.exports = { createEngine, MODULE_FILES, CLIENT_JS_DIR };
