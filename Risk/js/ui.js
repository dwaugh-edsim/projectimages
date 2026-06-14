// ui.js — UI controller: modals, side panel, event wiring.
window.RISK_UI = (function () {
  const C = window.RISK_CONFIG;
  const R = window.RISK_RULES;
  const S = window.RISK_STATE;
  const M = window.RISK_MAP;
  const A = window.RISK_ACCOUNT;
  const G = window.RISK_GAS;
  const DICE = window.RISK_DICE;
  const U = window.RISK_UTILS;

  // Public event hooks for the game loop to set
  const hooks = {
    onStartGame: null,
    onEndReinforce: null,
    onEndAttack: null,
    onEndFortify: null,
    onEndTurn: null,
    onTradeCards: null,
    onAttack: null,        // (fromId, toId, dice) — loop returns true to continue
    onPlaceInitial: null,
    onClaim: null,
    onFortify: null,        // (fromId, toId, count)
    onLoadGame: null,
    onSaveQuit: null,
    onNewGame: null,
    onMainMenu: null,
  };
  function setHook(name, fn) { hooks[name] = fn; }

  // ===== Toasts =====
  function toast(msg, kind = '') {
    const region = document.getElementById('toast-region');
    const t = document.createElement('div');
    t.className = 'toast ' + kind;
    t.textContent = msg;
    region.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }
  function showError(msg) { toast(msg, 'error'); }
  function showSuccess(msg) { toast(msg, 'success'); }

  // ===== Modal helpers =====
  function showModal(id) { document.getElementById(id).style.display = 'flex'; }
  function hideModal(id) { document.getElementById(id).style.display = 'none'; }

  // ===== Welcome / Login =====
  function showWelcome() {
    // Pre-fill backend URL
    const url = G.getUrl();
    document.getElementById('backend-url').value = url;
    showModal('welcome-modal');
    wireWelcome();
  }

  function wireWelcome() {
    document.querySelectorAll('#welcome-modal .tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('#welcome-modal .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const which = tab.dataset.tab;
        document.getElementById('tab-login').style.display = which === 'login' ? 'flex' : 'none';
        document.getElementById('tab-signup').style.display = which === 'signup' ? 'flex' : 'none';
        document.getElementById('tab-guest').style.display = which === 'guest' ? 'flex' : 'none';
      };
    });
    document.getElementById('btn-login').onclick = async () => {
      clearErr('welcome-error');
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      saveBackendUrlFromInput();
      try {
        await A.login({ username, password });
        hideModal('welcome-modal');
        showSetup();
        showSuccess(`Welcome, ${username}!`);
      } catch (e) { setErr('welcome-error', e.message); }
    };
    document.getElementById('btn-signup').onclick = async () => {
      clearErr('welcome-error');
      const username = document.getElementById('signup-username').value.trim();
      const password = document.getElementById('signup-password').value;
      const displayName = username;
      saveBackendUrlFromInput();
      try {
        await A.signup({ username, password, displayName });
        hideModal('welcome-modal');
        showSetup();
        showSuccess('Account created!');
      } catch (e) { setErr('welcome-error', e.message); }
    };
    document.getElementById('btn-guest').onclick = async () => {
      clearErr('welcome-error');
      const name = document.getElementById('guest-name').value.trim() || 'Guest';
      saveBackendUrlFromInput();
      try {
        await A.guest(name);
        hideModal('welcome-modal');
        showSetup();
        showSuccess(`Playing as guest: ${name}`);
      } catch (e) { setErr('welcome-error', e.message); }
    };
  }

  function saveBackendUrlFromInput() {
    G.setUrl(document.getElementById('backend-url').value.trim());
  }

  function setErr(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.style.display = 'block';
  }
  function clearErr(id) {
    const el = document.getElementById(id);
    el.textContent = '';
    el.style.display = 'none';
  }

  // ===== New Game Setup =====
  function showSetup() {
    // Populate color select
    const colorSel = document.getElementById('setup-player-color');
    colorSel.innerHTML = '';
    C.PLAYER_COLORS.forEach((c, i) => {
      const o = document.createElement('option');
      o.value = i; o.textContent = c.name;
      colorSel.appendChild(o);
    });
    // Populate model select
    const modelSel = document.getElementById('setup-model');
    modelSel.innerHTML = '';
    C.MODEL_OPTIONS.forEach((m, i) => {
      const o = document.createElement('option');
      o.value = m.id; o.textContent = m.label;
      if (i === 0) o.selected = true;
      modelSel.appendChild(o);
    });
    showModal('setup-modal');
    document.getElementById('btn-start-game').onclick = () => {
      const opts = {
        playerName: document.getElementById('setup-player-name').value.trim() || 'Commander',
        playerColor: parseInt(document.getElementById('setup-player-color').value, 10),
        opponents: Math.max(2, Math.min(5, parseInt(document.getElementById('setup-opponents').value, 10))),
        model: document.getElementById('setup-model').value,
        personalities: Array.from(document.querySelectorAll('.personality-mix input:checked')).map(i => i.value),
      };
      if (opts.personalities.length === 0) {
        setErr('setup-error', 'Pick at least one AI personality.');
        return;
      }
      hideModal('setup-modal');
      if (hooks.onStartGame) hooks.onStartGame(opts);
    };
    document.getElementById('btn-load-games').onclick = async () => {
      hideModal('setup-modal');
      await showLoadGames();
    };
  }

  // ===== Load Game =====
  async function showLoadGames() {
    showModal('load-modal');
    const list = document.getElementById('saved-games-list');
    list.innerHTML = '<p class="muted">Loading…</p>';
    document.getElementById('btn-load-cancel').onclick = () => {
      hideModal('load-modal');
      showSetup();
    };
    try {
      const games = await G.listGames();
      if (!games.length) {
        list.innerHTML = '<p class="muted">No saved games found.</p>';
        return;
      }
      list.innerHTML = '';
      for (const g of games) {
        const row = document.createElement('div');
        row.className = 'saved-game';
        const dt = new Date(g.lastSavedAt || g.createdAt).toLocaleString();
        const players = g.players.filter(p => !p.eliminated).map(p => p.name).join(', ') || '—';
        row.innerHTML = `
          <div class="sg-info">
            <div class="sg-title">Turn ${g.turnNumber} · ${g.status}</div>
            <div class="sg-meta">${players}</div>
            <div class="sg-meta">Saved ${dt}</div>
          </div>
        `;
        const del = document.createElement('button');
        del.className = 'sg-delete';
        del.textContent = 'Delete';
        del.onclick = async (e) => {
          e.stopPropagation();
          if (confirm('Delete this saved game?')) {
            await G.deleteGame(g.gameId);
            row.remove();
          }
        };
        row.appendChild(del);
        row.onclick = async () => {
          try {
            const snap = await G.loadGame(g.gameId);
            hideModal('load-modal');
            if (hooks.onLoadGame) hooks.onLoadGame(snap);
          } catch (e) { showError('Load failed: ' + e.message); }
        };
        list.appendChild(row);
      }
    } catch (e) {
      list.innerHTML = '<p class="error-msg">Failed to load: ' + e.message + '</p>';
    }
  }

  // ===== Side panel rendering =====
  function renderScoreboard() {
    const state = S.get();
    if (!state) return;
    const board = document.getElementById('scoreboard');
    board.innerHTML = '';
    for (const p of state.players) {
      const row = document.createElement('div');
      row.className = 'scoreboard-row';
      if (p.id === state.currentPlayer) row.classList.add('active');
      if (p.eliminated) row.classList.add('eliminated');
      const terrCount = R.countTerritories(p.id, state.territories);
      const armyCount = R.countArmies(p.id, state.territories);
      row.innerHTML = `
        <div class="swatch" style="background:${p.colorHex}"></div>
        <div class="pname">${escapeHtml(p.name)}${p.isHuman ? ' (you)' : ''}</div>
        <div class="terr-count" title="Territories">🗺 ${terrCount}</div>
        <div class="army-count" title="Armies">⚔ ${armyCount}</div>
        <div class="card-count" title="Cards">🃏 ${p.cards.length}</div>
      `;
      board.appendChild(row);
    }
  }

  function renderCards() {
    const state = S.get();
    if (!state) return;
    const p = state.players[state.currentPlayer];
    const hand = document.getElementById('card-hand');
    hand.innerHTML = '';
    for (const card of p.cards) {
      const el = document.createElement('div');
      el.className = 'card-mini';
      el.dataset.type = card.type;
      el.dataset.cardId = card.id;
      const sym = card.type === 'infantry' ? '⚔️' : card.type === 'cavalry' ? '🐴' : card.type === 'artillery' ? '💣' : '★';
      const name = card.territoryId ? C.TERRITORIES[card.territoryId].name : 'Wild';
      el.innerHTML = `<div class="symbol">${sym}</div><div class="terrname">${escapeHtml(name)}</div>`;
      el.onclick = () => el.classList.toggle('selected');
      hand.appendChild(el);
    }
    document.getElementById('card-count').textContent = p.cards.length + ' cards';
    updateTradeButton();
  }

  function updateTradeButton() {
    const state = S.get();
    const p = state.players[state.currentPlayer];
    const sel = Array.from(document.querySelectorAll('.card-mini.selected')).map(e => e.dataset.cardId);
    const btn = document.getElementById('btn-trade-cards');
    const inReinforce = state.phase === C.PHASES.REINFORCE;
    const valid = sel.length === 3 && isValidSet(sel, p.cards);
    btn.disabled = !(inReinforce && valid);
  }

  function isValidSet(cardIds, hand) {
    const cards = cardIds.map(id => hand.find(c => c.id === id)).filter(Boolean);
    if (cards.length !== 3) return false;
    const types = cards.map(c => c.type);
    const wilds = types.filter(t => t === 'wild').length;
    const distinct = new Set(types.filter(t => t !== 'wild'));
    if (distinct.size === 1) return true;          // 3-of-a-kind (or 3 wilds)
    if (distinct.size === 3 && wilds === 0) return true; // 1 of each
    if (distinct.size === 2 && wilds === 1) return true; // pair + wild
    return false;
  }

  function renderLog() {
    const state = S.get();
    if (!state) return;
    const log = document.getElementById('game-log');
    log.innerHTML = '';
    for (const entry of state.log.slice(-200)) {
      const row = document.createElement('div');
      row.className = 'log-entry kind-' + (entry.kind || 'info');
      row.textContent = entry.msg;
      log.appendChild(row);
    }
    log.scrollTop = log.scrollHeight;
  }

  function renderTopBar() {
    const state = S.get();
    if (!state) return;
    const p = state.players[state.currentPlayer];
    document.getElementById('turn-number').textContent = state.turnNumber;
    document.getElementById('current-player-name').textContent = p ? p.name : '—';
    document.querySelectorAll('.phase-dots .dot').forEach(d => {
      d.classList.remove('active', 'done');
      if (d.dataset.phase === state.phase) d.classList.add('active');
    });
  }

  function renderActionButtons() {
    const state = S.get();
    if (!state) return;
    const p = state.players[state.currentPlayer];
    const isHumanTurn = p && p.isHuman;
    const phase = state.phase;
    document.getElementById('btn-end-reinforce').style.display = (isHumanTurn && phase === C.PHASES.REINFORCE) ? '' : 'none';
    document.getElementById('btn-end-attack').style.display = (isHumanTurn && phase === C.PHASES.ATTACK) ? '' : 'none';
    document.getElementById('btn-end-fortify').style.display = (isHumanTurn && phase === C.PHASES.FORTIFY) ? '' : 'none';
    document.getElementById('btn-end-turn').style.display = (isHumanTurn && phase === C.PHASES.FORTIFY) ? '' : 'none';
    document.getElementById('btn-skip-claim').style.display = (isHumanTurn && phase === C.PHASES.CLAIM) ? '' : 'none';
    // action hint
    let hint = '';
    if (phase === C.PHASES.CLAIM) hint = isHumanTurn ? 'Claim an unclaimed territory.' : `${p.name} is claiming…`;
    else if (phase === C.PHASES.PLACE_INITIAL) hint = isHumanTurn ? `Place 1 army on your territory (${state.placeInitialRemaining?.[p.id] ?? 0} left).` : `${p.name} is placing armies…`;
    else if (phase === C.PHASES.REINFORCE) hint = isHumanTurn ? `Reinforce: ${p.pendingReinforcements ?? 0} armies to place. Click your territory.` : `${p.name} is reinforcing…`;
    else if (phase === C.PHASES.ATTACK) hint = isHumanTurn ? 'Attack: click your territory (≥2 armies) then an adjacent enemy.' : `${p.name} is attacking…`;
    else if (phase === C.PHASES.FORTIFY) hint = isHumanTurn ? 'Fortify (optional): move armies between connected territories.' : `${p.name} is fortifying…`;
    else if (phase === C.PHASES.GAME_OVER) hint = `${p.name} WINS!`;
    document.getElementById('action-hint').textContent = hint;
  }

  function renderAll() {
    renderTopBar();
    renderScoreboard();
    renderCards();
    renderLog();
    renderActionButtons();
    M.render();
  }

  // ===== Map click → phase handler =====
  function onMapClick(territoryId) {
    const state = S.get();
    if (!state) return;
    const p = state.players[state.currentPlayer];
    if (!p || !p.isHuman) return;
    const phase = state.phase;
    try {
      if (phase === C.PHASES.CLAIM) {
        S.claimTerritory(territoryId);
      } else if (phase === C.PHASES.PLACE_INITIAL) {
        S.placeArmy(territoryId);
      } else if (phase === C.PHASES.REINFORCE) {
        S.placeArmy(territoryId);
      } else if (phase === C.PHASES.ATTACK) {
        // Two-click: source then target
        handleAttackClick(territoryId);
      } else if (phase === C.PHASES.FORTIFY) {
        handleFortifyClick(territoryId);
      }
    } catch (e) { showError(e.message); }
  }

  let attackSource = null;
  function handleAttackClick(territoryId) {
    const state = S.get();
    const t = state.territories[territoryId];
    if (attackSource == null) {
      if (t.owner !== state.currentPlayer) {
        showError('Pick your own territory to attack from.');
        return;
      }
      if (t.armies < 2) {
        showError('Need at least 2 armies to attack.');
        return;
      }
      attackSource = territoryId;
      // Highlight valid targets
      const targets = R.getAttackableTargets(territoryId, state.territories);
      M.setHighlights([territoryId], 'source');
      // Manually add target class
      targets.forEach(tid => {
        const el = document.querySelector(`[data-territory="${tid}"]`);
        if (el) el.classList.add('hl-target');
      });
    } else {
      if (territoryId === attackSource) {
        // cancel
        attackSource = null;
        M.clearHighlights();
        return;
      }
      const source = state.territories[attackSource];
      if (source.owner !== state.currentPlayer) {
        showError('Source no longer yours.');
        attackSource = null;
        M.clearHighlights();
        return;
      }
      if (t.owner === state.currentPlayer) {
        // change source
        attackSource = territoryId;
        M.clearHighlights();
        const targets = R.getAttackableTargets(territoryId, state.territories);
        targets.forEach(tid => {
          const el = document.querySelector(`[data-territory="${tid}"]`);
          if (el) el.classList.add('hl-target');
        });
        return;
      }
      // Open dice modal
      const fromId = attackSource;
      attackSource = null;
      M.clearHighlights();
      openDiceModal(fromId, territoryId);
    }
  }

  let fortifySource = null;
  function handleFortifyClick(territoryId) {
    const state = S.get();
    const t = state.territories[territoryId];
    if (fortifySource == null) {
      if (t.owner !== state.currentPlayer || t.armies < 2) {
        showError('Pick your own territory with ≥2 armies to fortify from.');
        return;
      }
      fortifySource = territoryId;
      const connected = R.getConnectedFriendly(territoryId, state.currentPlayer, state.territories);
      M.clearHighlights();
      connected.forEach(tid => {
        const el = document.querySelector(`[data-territory="${tid}"]`);
        if (el) el.classList.add('hl-connected');
      });
    } else {
      if (territoryId === fortifySource) {
        fortifySource = null;
        M.clearHighlights();
        return;
      }
      const fromT = state.territories[fortifySource];
      const connected = R.getConnectedFriendly(fortifySource, state.currentPlayer, state.territories);
      if (!connected.has(territoryId)) {
        showError('Target not connected to source.');
        return;
      }
      const fromId = fortifySource;
      fortifySource = null;
      M.clearHighlights();
      openFortifyModal(fromId, territoryId);
    }
  }

  // ===== Dice modal =====
  let diceContext = null;
  function openDiceModal(fromId, toId) {
    diceContext = { fromId, toId };
    const state = S.get();
    const from = state.territories[fromId];
    const to = state.territories[toId];
    document.getElementById('dice-title').textContent = `${C.TERRITORIES[fromId].name} → ${C.TERRITORIES[toId].name}`;
    document.getElementById('attacker-dice').innerHTML = '';
    document.getElementById('defender-dice').innerHTML = '';
    document.getElementById('dice-result').textContent = `Attacker: ${from.armies} armies · Defender: ${to.armies} armies`;
    document.getElementById('btn-dice-roll').style.display = '';
    document.getElementById('btn-dice-retreat').style.display = '';
    document.getElementById('btn-dice-continue').style.display = 'none';
    showModal('dice-modal');
  }
  function wireDiceModal() {
    document.getElementById('btn-dice-roll').onclick = async () => {
      if (!diceContext) return;
      const { fromId, toId } = diceContext;
      const state = S.get();
      const from = state.territories[fromId];
      const to = state.territories[toId];
      const { attackerDice, defenderDice } = R.pickDiceCounts(from.armies, to.armies);
      const attColor = state.players[state.currentPlayer].colorHex;
      const defColor = '#9ca3af';
      await DICE.animateRoll(document.getElementById('attacker-dice'), R.rollDice(attackerDice), { color: attColor });
      await DICE.animateRoll(document.getElementById('defender-dice'), R.rollDice(defenderDice), { color: defColor });
      // Resolve
      if (hooks.onAttack) {
        await hooks.onAttack(fromId, toId, attackerDice);
      }
      // After attack, check if either side can attack again
      const newState = S.get();
      const newFrom = newState.territories[fromId];
      const newTo = newState.territories[toId];
      const conquered = newTo.owner === newState.currentPlayer;
      const canContinue = !conquered && newFrom.armies >= 2 && newTo.armies >= 1;
      document.getElementById('btn-dice-roll').style.display = canContinue ? '' : 'none';
      document.getElementById('btn-dice-retreat').style.display = canContinue ? '' : 'none';
      document.getElementById('btn-dice-continue').style.display = 'none';
      document.getElementById('dice-result').textContent = `Attacker: ${newFrom.armies} armies · Defender: ${newTo.armies} armies${conquered ? ' (conquered!)' : ''}`;
    };
    document.getElementById('btn-dice-retreat').onclick = () => {
      diceContext = null;
      hideModal('dice-modal');
    };
  }

  // ===== Army slider (post-conquest + fortify) =====
  let armyContext = null;
  function openArmyModal({ title, desc, max, onConfirm }) {
    document.getElementById('army-modal-title').textContent = title;
    document.getElementById('army-modal-desc').textContent = desc;
    const slider = document.getElementById('army-slider');
    slider.min = 1;
    slider.max = max;
    slider.value = Math.max(1, Math.floor(max / 2));
    document.getElementById('army-count-label').textContent = slider.value;
    slider.oninput = () => { document.getElementById('army-count-label').textContent = slider.value; };
    armyContext = { onConfirm };
    showModal('army-modal');
  }
  function wireArmyModal() {
    document.getElementById('btn-army-confirm').onclick = () => {
      const slider = document.getElementById('army-slider');
      const count = parseInt(slider.value, 10);
      hideModal('army-modal');
      if (armyContext && armyContext.onConfirm) armyContext.onConfirm(count);
      armyContext = null;
    };
    document.getElementById('btn-army-cancel').onclick = () => {
      hideModal('army-modal');
      armyContext = null;
    };
  }

  // ===== Fortify modal =====
  function openFortifyModal(fromId, toId) {
    const state = S.get();
    const from = state.territories[fromId];
    openArmyModal({
      title: 'Fortify',
      desc: `Move armies from ${C.TERRITORIES[fromId].name} to ${C.TERRITORIES[toId].name}. Max: ${from.armies - 1}.`,
      max: from.armies - 1,
      onConfirm: (count) => {
        try {
          S.fortify(fromId, toId, count);
        } catch (e) { showError(e.message); }
      },
    });
  }

  // ===== Victory =====
  function showVictory(winnerId) {
    const state = S.get();
    const winner = state.players[winnerId];
    document.getElementById('victory-title').textContent = winner.isHuman ? 'Victory!' : 'Defeat';
    document.getElementById('victory-message').textContent = `${winner.name} has conquered the world in ${state.turnNumber} turns!`;
    const stats = document.getElementById('victory-stats');
    stats.innerHTML = state.players.map(p => {
      const tc = R.countTerritories(p.id, state.territories);
      return `<div>${escapeHtml(p.name)}: ${tc} territories${p.eliminated ? ' (eliminated)' : ''}</div>`;
    }).join('');
    document.getElementById('btn-victory-new').onclick = () => {
      hideModal('victory-modal');
      if (hooks.onNewGame) hooks.onNewGame();
    };
    document.getElementById('btn-victory-menu').onclick = () => {
      hideModal('victory-modal');
      if (hooks.onMainMenu) hooks.onMainMenu();
    };
    showModal('victory-modal');
  }

  // ===== Map highlights per phase =====
  function applyPhaseHighlights() {
    const state = S.get();
    if (!state) return;
    const p = state.players[state.currentPlayer];
    if (!p || !p.isHuman) { M.clearHighlights(); return; }
    const phase = state.phase;
    if (phase === C.PHASES.CLAIM) {
      // highlight all unclaimed
      const ids = Object.values(state.territories).filter(t => t.owner === -1).map(t => Object.keys(state.territories).find(k => state.territories[k] === t));
      M.setHighlights(ids, 'valid');
    } else if (phase === C.PHASES.PLACE_INITIAL || phase === C.PHASES.REINFORCE) {
      const ids = Object.entries(state.territories).filter(([id, t]) => t.owner === state.currentPlayer).map(([id]) => id);
      M.setHighlights(ids, 'valid');
    } else {
      M.clearHighlights();
    }
  }

  // ===== Save status indicator =====
  let saveStatusTimer = null;
  function setSaveStatus(text, kind = '') {
    const el = document.getElementById('save-status');
    el.textContent = text;
    el.style.color = kind === 'error' ? '#fca5a5' : kind === 'saving' ? 'var(--text-2)' : 'var(--accent-gold)';
  }

  // ===== Escape HTML =====
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // ===== Public init =====
  function init() {
    // Map click → ui handler
    M.setClickHandler(onMapClick);
    // Top bar buttons
    document.getElementById('btn-save').onclick = () => {
      if (hooks.onEndTurn) hooks.onEndTurn();
    };
    document.getElementById('btn-quit').onclick = () => {
      if (hooks.onSaveQuit) hooks.onSaveQuit();
    };
    // Action bar buttons
    document.getElementById('btn-end-reinforce').onclick = () => {
      if (hooks.onEndReinforce) hooks.onEndReinforce();
    };
    document.getElementById('btn-end-attack').onclick = () => {
      if (hooks.onEndAttack) hooks.onEndAttack();
    };
    document.getElementById('btn-end-fortify').onclick = () => {
      if (hooks.onEndFortify) hooks.onEndFortify();
    };
    document.getElementById('btn-end-turn').onclick = () => {
      if (hooks.onEndTurn) hooks.onEndTurn();
    };
    document.getElementById('btn-skip-claim').onclick = () => {
      // debug skip
      const state = S.get();
      const unowned = Object.values(state.territories).find(t => t.owner === -1);
      if (unowned) S.claimTerritory(unowned.id);
    };
    // Cards
    document.getElementById('btn-trade-cards').onclick = () => {
      const sel = Array.from(document.querySelectorAll('.card-mini.selected')).map(e => e.dataset.cardId);
      if (sel.length !== 3) return;
      if (hooks.onTradeCards) hooks.onTradeCards(sel);
    };
    wireDiceModal();
    wireArmyModal();

    // State subscriptions
    S.on('init', () => { renderAll(); applyPhaseHighlights(); });
    S.on('player', () => { renderTopBar(); renderScoreboard(); renderCards(); renderActionButtons(); applyPhaseHighlights(); });
    S.on('phase', () => { renderTopBar(); renderActionButtons(); applyPhaseHighlights(); renderCards(); });
    S.on('territory', () => { renderScoreboard(); applyPhaseHighlights(); });
    S.on('log', () => renderLog());
    S.on('cards', () => { renderScoreboard(); renderCards(); });
    S.on('reinforcements', () => renderActionButtons());
    S.on('victory', (winnerId) => showVictory(winnerId));
  }

  return {
    init, setHook, showWelcome, showSetup, showVictory, toast, showError, showSuccess,
    renderAll, applyPhaseHighlights, setSaveStatus,
  };
})();
