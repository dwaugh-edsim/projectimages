// gasApi.js — Thin client for the Google Apps Script Web App backend.
// All endpoints go through doPost(e) and are JSON in/out.
window.RISK_GAS = (function () {
  const U = window.RISK_UTILS;

  const STORAGE_KEY = 'risk_backend_url';
  const SESSION_KEY = 'risk_session';
  // Backend URL is NOT hard-coded here. Each deploy must supply its own Google Apps
  // Script Web App URL via the Welcome screen's "Backend URL" field (stored locally).
  // Never commit a live /exec URL — it invites abuse of the OpenRouter quota.
  const DEFAULT_BACKEND_URL = '';

  function getUrl() {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_BACKEND_URL;
  }
  function setUrl(url) {
    if (url) localStorage.setItem(STORAGE_KEY, url);
    else localStorage.removeItem(STORAGE_KEY);
  }
  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch { return null; }
  }
  function setSession(s) {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  }

  async function call(action, payload = {}, opts = {}) {
    const url = getUrl();
    if (!url) throw new Error('No backend URL configured');
    const body = {
      action,
      payload,
      sessionToken: (opts.sessionToken !== undefined ? opts.sessionToken : (getSession()?.token || null)),
    };
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        // GAS Web Apps require text/plain or no Content-Type for CORS.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
        redirect: 'follow',
      });
    } catch (e) {
      throw new Error('Network error: ' + e.message);
    }
    let json;
    try { json = await res.json(); }
    catch { throw new Error('Invalid response from backend'); }
    if (!json.ok) throw new Error(json.error || 'Backend error');
    return json.data;
  }

  // Action wrappers
  async function signup({ username, passwordHash, salt, displayName }) {
    return call('signup', { username, passwordHash, salt, displayName });
  }
  async function login({ username, passwordHash }) {
    return call('login', { username, passwordHash });
  }
  async function whoami() {
    return call('whoami', {});
  }
  async function saveGame(snapshot) {
    return call('saveGame', snapshot);
  }
  async function listGames() {
    return call('listGames', {});
  }
  async function loadGame(gameId) {
    return call('loadGame', { gameId });
  }
  async function deleteGame(gameId) {
    return call('deleteGame', { gameId });
  }
  async function llmChat({ model, system, user, maxTokens = 600, temperature = 0.4 }) {
    return call('llmChat', { model, system, user, maxTokens, temperature });
  }

  return {
    getUrl, setUrl,
    getSession, setSession,
    call, signup, login, whoami, saveGame, listGames, loadGame, deleteGame, llmChat,
  };
})();
