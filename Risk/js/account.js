// account.js — Client-side auth: PBKDF2 hashing, signup/login/guest flows.
window.RISK_ACCOUNT = (function () {
  const U = window.RISK_UTILS;
  const G = window.RISK_GAS;

  async function hashPassword(password, salt) {
    return U.pbkdf2Hex(password, salt, 200000);
  }

  function newSalt() {
    return U.randomHex(16);
  }

  function validateUsername(u) {
    if (!u) return 'Username required';
    if (u.length < 3 || u.length > 24) return 'Username must be 3–24 characters';
    if (!/^[a-zA-Z0-9_-]+$/.test(u)) return 'Username may only contain letters, numbers, _ and -';
    return null;
  }
  function validatePassword(p) {
    if (!p) return 'Password required';
    if (p.length < 8) return 'Password must be at least 8 characters';
    return null;
  }

  async function signup({ username, password, displayName }) {
    const err = validateUsername(username) || validatePassword(password);
    if (err) throw new Error(err);
    const salt = newSalt();
    const passwordHash = await hashPassword(password, salt);
    const data = await G.signup({ username, passwordHash, salt, displayName: displayName || username });
    G.setSession({ token: data.sessionToken, userId: data.userId, username: data.username });
    return data;
  }

  async function login({ username, password }) {
    // We need the salt to re-hash, so we fetch user-salt first via a "preflight" call.
    // We'll embed this in the login action: backend returns salt, then we re-call with hash.
    // To keep it 1 round-trip, we ask backend for the salt first:
    const pre = await G.call('getSalt', { username });
    const passwordHash = await hashPassword(password, pre.salt);
    const data = await G.login({ username, passwordHash });
    G.setSession({ token: data.sessionToken, userId: data.userId, username: data.username });
    return data;
  }

  async function guest(displayName) {
    const username = 'guest_' + U.randomHex(6);
    const password = U.randomHex(24);
    return signup({ username, password, displayName });
  }

  function logout() {
    G.setSession(null);
  }

  function isSignedIn() {
    return !!G.getSession();
  }

  return { signup, login, guest, logout, isSignedIn, validateUsername, validatePassword };
})();
