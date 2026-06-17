// Code.gs — Self-contained Google Apps Script entry point.
// All auth/save/llm logic is inlined here to avoid multi-file scoping issues.
// Deploy this as a single Web App file.

const AUTH_SESSION_DAYS = 30;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function _props() { return PropertiesService.getScriptProperties(); }
function _now() { return Date.now(); }
function _token() { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); }

// Simple per-key rate limit using CacheService.
// bucket: namespace, key: identifier (username / session / ip), limit: max calls,
// windowMs: rolling window. Returns true if allowed (and increments), false if exceeded.
function _rateAllow(bucket, key, limit, windowMs) {
  if (!key) key = 'anon';
  const cache = CacheService.getScriptCache();
  const ck = 'rl:' + bucket + ':' + key;
  let entry;
  try { entry = JSON.parse(cache.get(ck) || 'null'); } catch (e) { entry = null; }
  const now = _now();
  if (!entry) entry = { count: 0, reset: now + windowMs };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs; }
  entry.count++;
  // Cache TTL slightly longer than the window so the entry survives until reset.
  cache.put(ck, JSON.stringify(entry), Math.ceil(windowMs / 1000) + 5);
  return entry.count <= limit;
}

// GAS Web Apps do not expose the client IP in doPost(e). Return a constant so
// IP-bucketed limits act as a coarse global throttle; per-username / per-session
// buckets are the primary abuse protection.
function _clientIp() { return 'gas'; }


function _getUser(username) {
  const raw = _props().getProperty('user:' + username);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function _putUser(username, data) {
  _props().setProperty('user:' + username, JSON.stringify(data));
}
function _userIndex() {
  const raw = _props().getProperty('users:index') || '[]';
  try { return JSON.parse(raw); } catch { return []; }
}
function _setUserIndex(arr) {
  _props().setProperty('users:index', JSON.stringify(arr));
}

function _issueSession(userId, username) {
  const token = _token();
  const expiresAt = _now() + AUTH_SESSION_DAYS * 24 * 60 * 60 * 1000;
  _props().setProperty('session:' + token, JSON.stringify({
    userId, username, issuedAt: _now(), expiresAt,
  }));
  return { sessionToken: token, userId, username, expiresAt };
}

function verifySession(token) {
  if (!token) return null;
  const raw = _props().getProperty('session:' + token);
  if (!raw) return null;
  let s;
  try { s = JSON.parse(raw); } catch { return null; }
  if (!s.expiresAt || s.expiresAt < _now()) {
    _props().deleteProperty('session:' + token);
    return null;
  }
  return { userId: s.userId, username: s.username, expiresAt: s.expiresAt };
}

function getSalt(payload) {
  const username = ((payload && payload.username) || '').toLowerCase();
  const u = _getUser(username);
  if (!u) throw new Error('User not found');
  return { salt: u.salt };
}

function signup(payload) {
  const username = ((payload && payload.username) || '').toLowerCase();
  if (!_rateAllow('signup', username, 5, 60 * 60 * 1000)) {
    throw new Error('Too many signup attempts. Try again later.');
  }
  if (!_rateAllow('signupIp', _clientIp(), 10, 60 * 60 * 1000)) {
    throw new Error('Too many signups from this address. Try again later.');
  }
  const passwordHash = payload && payload.passwordHash;
  const salt = payload && payload.salt;
  const displayName = (payload && payload.displayName) || username;
  if (!username || !passwordHash || !salt) throw new Error('Missing signup fields');
  if (username.length < 3 || username.length > 24) throw new Error('Invalid username');
  if (_getUser(username)) throw new Error('Username already taken');
  const userId = Utilities.getUuid();
  _putUser(username, { userId, username, salt, passwordHash, displayName, createdAt: _now() });
  const idx = _userIndex();
  idx.push(username);
  _setUserIndex(idx);
  return _issueSession(userId, username);
}

function login(payload) {
  const username = ((payload && payload.username) || '').toLowerCase();
  if (!_rateAllow('login', username, 15, 15 * 60 * 1000)) {
    throw new Error('Too many login attempts. Try again later.');
  }
  if (!_rateAllow('loginIp', _clientIp(), 30, 15 * 60 * 1000)) {
    throw new Error('Too many login attempts from this address. Try again later.');
  }
  const passwordHash = payload && payload.passwordHash;
  const u = _getUser(username);
  if (!u) throw new Error('Invalid credentials');
  if (u.passwordHash !== passwordHash) throw new Error('Invalid credentials');
  return _issueSession(u.userId, username);
}

function _saves_load(userId) {
  const raw = _props().getProperty('games:' + userId);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}
function _saves_persist(userId, games) {
  _props().setProperty('games:' + userId, JSON.stringify(games));
}
function _saves_summarize(snapshot) {
  const players = (snapshot.players || []).map(p => ({
    id: p.id, name: p.name, color: p.color, eliminated: !!p.eliminated,
  }));
  return {
    gameId: snapshot.gameId,
    createdAt: (snapshot.meta && snapshot.meta.createdAt) || null,
    lastSavedAt: (snapshot.meta && snapshot.meta.lastSavedAt) || null,
    status: snapshot.phase === 'gameOver' ? 'finished' : 'active',
    turnNumber: snapshot.turnNumber || 0,
    currentPlayer: snapshot.currentPlayer,
    currentPlayerName: (snapshot.players && snapshot.players[snapshot.currentPlayer])
      ? snapshot.players[snapshot.currentPlayer].name : '?',
    players,
  };
}

function saveGame(session, payload) {
  if (!session) throw new Error('Not signed in');
  const games = _saves_load(session.userId);
  const idx = games.findIndex(g => g.gameId === payload.gameId);
  const summary = _saves_summarize(payload);
  const record = Object.assign({}, summary, { snapshot: payload });
  if (idx >= 0) games[idx] = record; else games.push(record);
  _saves_persist(session.userId, games);
  return { ok: true, gameId: payload.gameId, lastSavedAt: record.lastSavedAt };
}

function listGames(session) {
  if (!session) throw new Error('Not signed in');
  return _saves_load(session.userId).map(g => ({
    gameId: g.gameId,
    createdAt: g.createdAt, lastSavedAt: g.lastSavedAt,
    status: g.status, turnNumber: g.turnNumber,
    currentPlayer: g.currentPlayer, currentPlayerName: g.currentPlayerName,
    players: g.players,
  }));
}

function loadGame(session, payload) {
  if (!session) throw new Error('Not signed in');
  const g = _saves_load(session.userId).find(g => g.gameId === payload.gameId);
  if (!g) throw new Error('Game not found');
  return g.snapshot;
}

function deleteGame(session, payload) {
  if (!session) throw new Error('Not signed in');
  const next = _saves_load(session.userId).filter(g => g.gameId !== payload.gameId);
  _saves_persist(session.userId, next);
  return { ok: true };
}

function openRouterChat(session, payload) {
  // Per-session LLM call limit (protects the OpenRouter quota from abuse).
  if (!_rateAllow('llm', session ? session.userId : _clientIp(), 120, 60 * 60 * 1000)) {
    throw new Error('LLM call limit reached for this session. Try again later.');
  }
  const key = _props().getProperty('OPENROUTER_KEY');
  if (!key) throw new Error('OPENROUTER_KEY not configured on the server');
  const model = (payload && payload.model) || 'openrouter/free';
  const messages = [];
  if (payload && payload.system) messages.push({ role: 'system', content: payload.system });
  if (payload && payload.user)   messages.push({ role: 'user',   content: payload.user });
  const body = {
    model: model,
    messages: messages,
    max_tokens: (payload && payload.maxTokens) || 600,
    temperature: (payload && payload.temperature != null) ? payload.temperature : 0.4,
  };
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(body),
    headers: { 'Authorization': 'Bearer ' + key },
    muteHttpExceptions: true,
  };
  let res;
  try { res = UrlFetchApp.fetch(OPENROUTER_URL, options); }
  catch (err) { Utilities.sleep(500); res = UrlFetchApp.fetch(OPENROUTER_URL, options); }
  const code = res.getResponseCode();
  const text = res.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('OpenRouter HTTP ' + code + ': ' + text.substring(0, 300));
  }
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (e) { throw new Error('Invalid OpenRouter response: ' + text.substring(0, 300)); }
  const choice = (parsed.choices || [])[0];
  const content = (choice && choice.message && choice.message.content) || '';
  return { text: content, model: parsed.model || model, usage: parsed.usage || null };
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return _jsonOut({ ok: false, error: 'Invalid JSON' }); }

  const action = body.action;
  const payload = body.payload || {};
  const sessionToken = body.sessionToken || null;
  const PUBLIC = ['signup', 'login', 'getSalt'];

  let session = null;
  if (sessionToken && PUBLIC.indexOf(action) === -1) {
    session = verifySession(sessionToken);
    if (!session) return _jsonOut({ ok: false, error: 'Invalid or expired session' });
  }

  try {
    let data;
    switch (action) {
      case 'getSalt':    data = getSalt(payload); break;
      case 'signup':     data = signup(payload); break;
      case 'login':      data = login(payload); break;
      case 'whoami':     data = session; break;
      case 'saveGame':   data = saveGame(session, payload); break;
      case 'listGames':  data = listGames(session); break;
      case 'loadGame':   data = loadGame(session, payload); break;
      case 'deleteGame': data = deleteGame(session, payload); break;
      case 'llmChat':    data = openRouterChat(session, payload); break;
      default: return _jsonOut({ ok: false, error: 'Unknown action: ' + action });
    }
    return _jsonOut({ ok: true, data: data });
  } catch (err) {
    return _jsonOut({ ok: false, error: String(err.message || err) });
  }
}

function _jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
