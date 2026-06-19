// index.js — Risk multiplayer server entry point.
// Serves the static client (the Risk/ web app) over HTTP and runs a WebSocket
// server on the same port for real-time multiplayer. Designed for Render.com.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { GameSession } = require('./game');

const ROOT = path.join(__dirname, '..');        // the Risk/ project root (client)
const PORT = process.env.PORT || 8080;

// ---------- Game registry ----------
const games = new Map();        // code -> GameSession
const socketGame = new Map();   // ws -> GameSession

function makeCode() {
  // 4-char human-friendly room code (no ambiguous chars).
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (games.has(code));
  return code;
}

// ---------- HTTP static server ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

  // Block traversal outside the client root.
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(serveStatic);

// ---------- WebSocket server ----------
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  ws.__pid = Math.random().toString(36).slice(2);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    try {
      handle(ws, msg);
    } catch (e) {
      send(ws, { t: 'error', message: e.message });
    }
  });

  ws.on('close', () => {
    const game = socketGame.get(ws);
    if (game) {
      game.removePlayer(ws);
      if (!game.started) game.broadcast({ t: 'lobby', code: game.code, roster: game.humanRoster(), humans: game.humans, ai: game.ai });
      socketGame.delete(ws);

      // Memory cleanup:
      if (game.isEmpty()) {
        if (!game.started) {
          games.delete(game.code);
          console.log(`[${game.code}] Empty lobby cleaned up.`);
        } else {
          if (!game.cleanupTimer) {
            console.log(`[${game.code}] All humans disconnected. Starting 60s cleanup timer.`);
            game.cleanupTimer = setTimeout(() => {
              games.delete(game.code);
              console.log(`[${game.code}] Game destroyed due to inactivity.`);
            }, 60000);
          }
        }
      }
    }
  });
});

function send(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function handle(ws, msg) {
  switch (msg.t) {
    case 'reconnect': {
      const code = (msg.code || '').toUpperCase();
      const game = games.get(code);
      if (!game) throw new Error('Game session not found');
      if (!game.started) throw new Error('Game not started yet');
      const playerId = parseInt(msg.playerId, 10);
      const expectedToken = game.reconnectTokens[playerId];
      if (!expectedToken || expectedToken !== msg.token) {
        throw new Error('Invalid reconnection token');
      }

      // Cancel any pending cleanup timer
      if (game.cleanupTimer) {
        clearTimeout(game.cleanupTimer);
        game.cleanupTimer = null;
        console.log(`[${code}] Reconnect detected. Cleanup timer cancelled.`);
      }

      // Associate socket
      game.playerSocket[playerId] = ws;
      game.socketPlayer[ws.__pid || (ws.__pid = Math.random().toString(36).slice(2))] = playerId;
      socketGame.set(ws, game);

      // Confirm reconnection and send state
      send(ws, { t: 'joined', code, playerId });
      game.broadcastState();
      game.tick();
      break;
    }
    case 'create': {
      const humans = clamp(msg.humans || 3, 2, 6);
      const total = clamp(humans + (msg.ai || 0), 2, 6);
      const ai = total - humans;
      const code = makeCode();
      const game = new GameSession({ code, humans, ai, personalities: msg.personalities });
      const { slot, token } = game.addPlayer(msg.name || 'Host', ws);
      games.set(code, game);
      socketGame.set(ws, game);
      send(ws, { t: 'joined', code, playerId: slot, reconnectToken: token });
      send(ws, { t: 'lobby', code, roster: game.humanRoster(), humans: game.humans, ai: game.ai });
      break;
    }
    case 'join': {
      const game = games.get((msg.code || '').toUpperCase());
      if (!game) throw new Error('Game not found');
      const { slot, token } = game.addPlayer(msg.name || 'Player', ws);
      socketGame.set(ws, game);
      send(ws, { t: 'joined', code: game.code, playerId: slot, reconnectToken: token });
      game.broadcast({ t: 'lobby', code: game.code, roster: game.humanRoster(), humans: game.humans, ai: game.ai });
      break;
    }
    case 'ready': {
      const game = socketGame.get(ws);
      if (!game) throw new Error('Not in a game');
      game.setReady(ws, msg.ready !== false);
      game.broadcast({ t: 'lobby', code: game.code, roster: game.humanRoster(), humans: game.humans, ai: game.ai, canStart: game.canStart() });
      break;
    }
    case 'start': {
      const game = socketGame.get(ws);
      if (!game) throw new Error('Not in a game');
      game.start();   // validates canStart(); broadcasts 'started' + state
      break;
    }
    case 'lobbyState': {
      const game = socketGame.get(ws);
      if (game && !game.started) {
        send(ws, { t: 'lobby', code: game.code, roster: game.humanRoster(), humans: game.humans, ai: game.ai, canStart: game.canStart() });
      }
      break;
    }
    // In-game actions are routed to the session for validation.
    case 'claim':
    case 'place':
    case 'endReinforce':
    case 'tradeCards':
    case 'attack':
    case 'endAttack':
    case 'fortify':
    case 'endFortify':
    case 'endTurn': {
      const game = socketGame.get(ws);
      if (!game) throw new Error('Not in a game');
      game.applyAction(ws, msg);
      break;
    }
    default:
      throw new Error('Unknown message type: ' + msg.t);
  }
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

server.listen(PORT, () => {
  console.log(`Risk multiplayer server listening on :${PORT}`);
  console.log(`Client served from ${ROOT}`);
});
