// utils.js — Small helpers used across the game.
window.RISK_UTILS = (function () {
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Breadth-first search over an adjacency map.
  // graph: { nodeId: [neighborId, ...] }
  // start: starting node
  // returns: array of all reachable node ids (including start)
  function bfs(graph, start) {
    const visited = new Set([start]);
    const queue = [start];
    const out = [start];
    while (queue.length) {
      const node = queue.shift();
      for (const nb of (graph[node] || [])) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
          out.push(nb);
        }
      }
    }
    return out;
  }

  function debounce(fn, wait) {
    let t = null;
    return function (...args) {
      if (t) clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function groupBy(arr, keyFn) {
    const out = {};
    for (const item of arr) {
      const k = keyFn(item);
      (out[k] = out[k] || []).push(item);
    }
    return out;
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Hex color utilities
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  }
  function rgbToHex(r, g, b) {
    const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  }
  // Mix two hex colors. t=0 → c1, t=1 → c2.
  function mix(c1, c2, t) {
    const a = hexToRgb(c1), b = hexToRgb(c2);
    return rgbToHex(
      a.r * (1 - t) + b.r * t,
      a.g * (1 - t) + b.g * t,
      a.b * (1 - t) + b.b * t,
    );
  }

  // SHA-256 hex digest
  async function sha256Hex(str) {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // PBKDF2-SHA256 → hex. iterations >= 200000 recommended.
  async function pbkdf2Hex(password, saltHex, iterations = 200000) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(password),
      { name: 'PBKDF2' }, false, ['deriveBits'],
    );
    const salt = hexToBytes(saltHex);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      key, 256,
    );
    return bytesToHex(new Uint8Array(bits));
  }

  function hexToBytes(hex) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return out;
  }

  function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function randomHex(byteLen) {
    const bytes = new Uint8Array(byteLen);
    crypto.getRandomValues(bytes);
    return bytesToHex(bytes);
  }

  return {
    shuffle, randomInt, delay, deepClone, bfs, debounce, groupBy, pickRandom,
    mix, hexToRgb, rgbToHex,
    sha256Hex, pbkdf2Hex, randomHex,
  };
})();
