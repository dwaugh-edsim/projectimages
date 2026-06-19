// multiplayer.js — Client-side multiplayer controller.
// Connects to the WebSocket server, runs the lobby, and rewires the existing
// UI so that human actions are sent to the server (authoritative) instead of
// mutating local state. The local RISK_STATE becomes a read-only mirror that is
// re-hydrated from server snapshots. AI opponents and rules all run on the server.
//
// Smack-talk / banter is intentionally NOT loaded in multiplayer.

window.RISK_MULTIPLAYER = (function () {
  const UI = window.RISK_UI;
  const S = window.RISK_STATE;
  const C = window.RISK_CONFIG;
  const M = window.RISK_MAP;

  let ws = null;
  let serverUrl = '';
  let myName = '';
  let myPlayerId = null;
  let gameCode = null;
  let isHost = false;
  let attackResolver = null;     // resolves when an 'attackResult' ack arrives
  let lobbyEls = null;           // cached lobby DOM nodes

  // Active flag — read by main.js to disable the local AI loop and banter.
  window.RISK_MULTIPLAYER_ACTIVE = false;
  // Which player the local client controls (for scoreboard "(you)" label).
  window.RISK_YOU = null;

  // ============================================================
  // Lobby UI (built dynamically to keep index.html changes minimal)
  // ============================================================
  function defaultWsUrl() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${location.host}/ws`;
  }

  function openLobby() {
    if (!lobbyEls) lobbyEls = buildLobbyDom();
    lobbyEls.url.value = defaultWsUrl();
    lobbyEls.name.value = localStorage.getItem('risk_mp_name') || '';
    lobbyEls.codeRow.style.display = 'none';
    lobbyEls.createRow.style.display = '';
    showLobby();
    setLobbyStatus('');
  }

  function buildLobbyDom() {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'mp-lobby-modal';
    backdrop.style.display = 'none';

    const personalities = C.PERSONALITIES.map(p =>
      `<label class="mp-check"><input type="checkbox" value="${p}" checked> ${p[0].toUpperCase() + p.slice(1)}</label>`
    ).join('');

    backdrop.innerHTML = `
      <div class="modal" style="max-width:460px">
        <h2 class="modal-title">Multiplayer</h2>
        <div class="modal-body">
          <div class="mp-tabs">
            <button class="mp-tab active" data-mode="create">Create Game</button>
            <button class="mp-tab" data-mode="join">Join Game</button>
          </div>
          <label class="mp-label">Your name
            <input id="mp-name" class="mp-input" type="text" maxlength="20" placeholder="Commander">
          </label>
          <label class="mp-label">Server URL
            <input id="mp-url" class="mp-input" type="text">
          </label>
          <div id="mp-create-row">
            <div class="mp-row">
              <label class="mp-label">Humans
                <select id="mp-humans" class="mp-input">
                  <option value="2">2</option><option value="3" selected>3</option>
                  <option value="4">4</option><option value="5">5</option><option value="6">6</option>
                </select>
              </label>
              <label class="mp-label">AI opponents
                <select id="mp-ai" class="mp-input">
                  <option value="0">0</option><option value="1">1</option>
                  <option value="2" selected>2</option><option value="3">3</option><option value="4">4</option>
                </select>
              </label>
            </div>
            <div class="mp-label">AI personalities
              <div class="mp-personalities">${personalities}</div>
            </div>
          </div>
          <div id="mp-join-row" style="display:none">
            <label class="mp-label">Game code
              <input id="mp-code" class="mp-input" type="text" maxlength="4" placeholder="ABCD" style="text-transform:uppercase">
            </label>
          </div>
          <div id="mp-lobby-list" style="display:none">
            <div class="mp-label">Lobby — code: <span id="mp-show-code"></span></div>
            <div id="mp-roster"></div>
            <div class="mp-row">
              <button id="mp-ready" class="btn">Ready</button>
              <button id="mp-start" class="btn btn-primary">Start</button>
            </div>
          </div>
          <div id="mp-status" class="mp-status"></div>
          <div class="modal-actions">
            <button id="mp-go" class="btn btn-primary">Create</button>
            <button id="mp-cancel" class="btn">Cancel</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(backdrop);

    const els = {
      backdrop,
      url: backdrop.querySelector('#mp-url'),
      name: backdrop.querySelector('#mp-name'),
      createRow: backdrop.querySelector('#mp-create-row'),
      joinRow: backdrop.querySelector('#mp-join-row'),
      codeRow: backdrop.querySelector('#mp-code'),
      humans: backdrop.querySelector('#mp-humans'),
      ai: backdrop.querySelector('#mp-ai'),
      codeInput: backdrop.querySelector('#mp-code'),
      go: backdrop.querySelector('#mp-go'),
      cancel: backdrop.querySelector('#mp-cancel'),
      status: backdrop.querySelector('#mp-status'),
      lobbyList: backdrop.querySelector('#mp-lobby-list'),
      showCode: backdrop.querySelector('#mp-show-code'),
      roster: backdrop.querySelector('#mp-roster'),
      ready: backdrop.querySelector('#mp-ready'),
      start: backdrop.querySelector('#mp-start'),
    };

    // Tab switching (create/join)
    let mode = 'create';
    backdrop.querySelectorAll('.mp-tab').forEach(tab => {
      tab.onclick = () => {
        mode = tab.dataset.mode;
        backdrop.querySelectorAll('.mp-tab').forEach(t => t.classList.toggle('active', t === tab));
        els.createRow.style.display = mode === 'create' ? '' : 'none';
        els.joinRow.style.display = mode === 'join' ? '' : 'none';
        els.go.textContent = mode === 'create' ? 'Create' : 'Join';
        // Hide lobby list until connected
        if (mode === 'join') els.lobbyList.style.display = 'none';
      };
    });

    els.cancel.onclick = () => { hideLobby(); if (ws) { try { ws.close(); } catch {} ws = null; } };
    els.go.onclick = () => onGo(mode, els);
    els.ready.onclick = () => { send({ t: 'ready', ready: true }); };
    els.start.onclick = () => { send({ t: 'start' }); };
    els.codeInput.oninput = (e) => { e.target.value = e.target.value.toUpperCase(); };

    return els;
  }

  function showLobby() { lobbyEls.backdrop.style.display = 'flex'; }
  function hideLobby() { if (lobbyEls) lobbyEls.backdrop.style.display = 'none'; }
  function setLobbyStatus(msg, isError) {
    if (!lobbyEls) return;
    lobbyEls.status.textContent = msg || '';
    lobbyEls.status.style.color = isError ? '#fca5a5' : 'var(--text-2)';
  }

  function onGo(mode, els) {
    myName = (els.name.value.trim() || 'Player').slice(0, 20);
    localStorage.setItem('risk_mp_name', myName);
    serverUrl = els.url.value.trim() || defaultWsUrl();
    setLobbyStatus('Connecting…');
    connect(serverUrl, () => {
      if (mode === 'create') {
        const humans = parseInt(els.humans.value, 10);
        const ai = parseInt(els.ai.value, 10);
        const personalities = Array.from(lobbyEls.backdrop.querySelectorAll('.mp-personalities input:checked')).map(i => i.value);
        isHost = true;
        send({ t: 'create', name: myName, humans, ai, personalities });
      } else {
        const code = els.codeInput.value.trim().toUpperCase();
        if (!code) { setLobbyStatus('Enter a game code.', true); return; }
        send({ t: 'join', code, name: myName });
      }
    });
  }

  function connect(url, onOpen) {
    try {
      ws = new WebSocket(url);
    } catch (e) {
      setLobbyStatus('Bad server URL: ' + e.message, true);
      return;
    }
    ws.onopen = () => { if (onOpen) onOpen(); };
    ws.onerror = () => { setLobbyStatus('Could not reach server.', true); };
    ws.onclose = () => {
      if (!window.RISK_MULTIPLAYER_ACTIVE) return; // ignore pre-game disconnects handled elsewhere
      UI.toast('Disconnected from server.', 'error');
    };
    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      onMessage(msg);
    };
  }

  function send(obj) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
  }

  // ============================================================
  // Server message handling
  // ============================================================
  function onMessage(msg) {
    switch (msg.t) {
      case 'joined':
        myPlayerId = msg.playerId;
        gameCode = msg.code;
        window.RISK_YOU = myPlayerId;
        break;
      case 'lobby':
        renderLobby(msg);
        break;
      case 'started':
        enterGame();
        break;
      case 'state':
        applyState(msg);
        break;
      case 'attackResult':
        if (attackResolver) { const r = attackResolver; attackResolver = null; r(msg); }
        break;
      case 'error':
        UI.showError(msg.message);
        setLobbyStatus(msg.message, true);
        break;
    }
  }

  function renderLobby(msg) {
    lobbyEls.lobbyList.style.display = '';
    lobbyEls.showCode.textContent = msg.code;
    gameCode = msg.code;
    // Build roster rows
    const total = msg.humans;
    let html = '';
    for (const r of msg.roster) {
      const dot = r.name ? '' : ' (open)';
      const ready = r.name ? (r.ready ? ' ✓' : ' …') : '';
      const me = r.slot === myPlayerId ? ' (you)' : '';
      html += `<div class="mp-roster-row"><span class="swatch" style="background:${C.PLAYER_COLORS[r.slot].hex}"></span>${escapeHtml(r.name || 'Open slot')}${dot}${me}${ready}</div>`;
    }
    html += `<div class="mp-roster-row muted">+ ${msg.ai} AI opponent${msg.ai === 1 ? '' : 's'}</div>`;
    lobbyEls.roster.innerHTML = html;

    // Ready button reflects local state
    const me = msg.roster.find(r => r.slot === myPlayerId);
    lobbyEls.ready.textContent = me && me.ready ? 'Ready ✓' : 'Ready';
    lobbyEls.ready.disabled = !!(me && me.ready);

    // Start button only for host, only when canStart
    const showStart = isHost && msg.canStart;
    lobbyEls.start.style.display = showStart ? '' : 'none';
    setLobbyStatus(msg.canStart ? (isHost ? 'All ready — host can start.' : 'Waiting for host to start.') : 'Waiting for players to ready up…');
  }

  // ============================================================
  // Entering the game: rewire UI hooks to the network
  // ============================================================
  function enterGame() {
    window.RISK_MULTIPLAYER_ACTIVE = true;
    hideLobby();
    // Hide the GAS welcome/setup modals if open.
    ['welcome-modal', 'setup-modal'].forEach(id => { const m = document.getElementById(id); if (m) m.style.display = 'none'; });

    // Make the local RISK_STATE a network-driven mirror.
    window.RISK_NET = {
      claim: (tid) => send({ t: 'claim', territoryId: tid }),
      placeArmy: (tid) => send({ t: 'place', territoryId: tid }),
      fortify: (from, to, count) => send({ t: 'fortify', from, to, count }),
    };

    // Rewire action hooks to send to the server instead of mutating locally.
    UI.setHook('onAttack', (fromId, toId, dice) => {
      send({ t: 'attack', from: fromId, to: toId, dice });
      return new Promise(resolve => { attackResolver = resolve; });
    });
    UI.setHook('onConquest', null); // no extra-move slider in MVP; auto-move stands
    UI.setHook('onEndReinforce', () => send({ t: 'endReinforce' }));
    UI.setHook('onEndAttack', () => send({ t: 'endAttack' }));
    UI.setHook('onEndFortify', () => send({ t: 'endFortify' }));
    UI.setHook('onEndTurn', () => send({ t: 'endTurn' }));
    UI.setHook('onTradeCards', (cardIds) => send({ t: 'tradeCards', cardIds }));
    UI.setHook('onNewGame', () => location.reload());
    UI.setHook('onMainMenu', () => location.reload());
    UI.setHook('onSaveQuit', () => { if (confirm('Leave this multiplayer game?')) location.reload(); });

    // Hide GAS/LLM-only controls that don't apply to multiplayer.
    ['btn-save', 'btn-settings'].forEach(id => { const b = document.getElementById(id); if (b) b.style.display = 'none'; });
  }

  function applyState(msg) {
    if (msg.yourPlayerId !== undefined) { myPlayerId = msg.yourPlayerId; window.RISK_YOU = myPlayerId; }
    S.hydrate(msg.state);
    UI.renderAll();
    UI.applyPhaseHighlights();
    const st = S.get();
    if (st && st.phase === C.PHASES.GAME_OVER && st.winner !== undefined) {
      UI.showVictory(st.winner);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  return { openLobby, send };
})();
