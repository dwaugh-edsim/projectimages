// main.js — App bootstrap, game loop orchestration.
(function () {
  const C = window.RISK_CONFIG;
  const R = window.RISK_RULES;
  const S = window.RISK_STATE;
  const M = window.RISK_MAP;
  const A = window.RISK_AI;
  const U = window.RISK_UTILS;
  const G = window.RISK_GAS;
  const UI = window.RISK_UI;

  // Active game settings
  const gameSettings = { model: 'openrouter/free', allowedPersonalities: C.PERSONALITIES.slice(), ginLemon: false };
  let busy = false;
  let lastSaveSnapshot = null;

  // ---- Auto-save (debounced) ----
  const autoSave = U.debounce(async () => {
    if (!G.getUrl() || !G.getSession()) return;
    const snap = S.snapshot();
    if (JSON.stringify(snap) === lastSaveSnapshot) return;
    lastSaveSnapshot = JSON.stringify(snap);
    try {
      UI.setSaveStatus('Saving…', 'saving');
      snap.meta = { ...(snap.meta || {}), lastSavedAt: Date.now() };
      await G.saveGame(snap);
      UI.setSaveStatus('Saved ✓', 'ok');
    } catch (e) {
      UI.setSaveStatus('Save failed', 'error');
    }
  }, 2000);

  // Subscribe to all state-mutating events
  function wireAutoSave() {
    const trigger = () => autoSave();
    S.on('territory', trigger);
    S.on('player', () => {
      trigger();
      runLoop();
    });
    S.on('phase', trigger);
    S.on('cards', trigger);
    S.on('reinforcements', trigger);
    S.on('combat', trigger);
    S.on('conquest', trigger);
    S.on('init', trigger);
  }

  // ---- Game start ----
  const PERSONALITY_NAMES = {
    aggressive: [
      'Savage Sam', 'Ruthless Rex', 'Hank the Hammer', 'Aggro Andy', 'Bloody Bobby',
      'Viktor the Vicious', 'Mad Mike', 'Iron Igor', 'Berserker Bill', 'Killer Kyle', 'Raging Ryan',
      'Savage Sarah', 'Vicious Val', 'Ruthless Roxy', 'Bloody Beatrice'
    ],
    defensive: [
      'Turtle Terry', 'Fortress Frank', 'Ironclad Ian', 'Bunker Ben', 'Warden Wes',
      'Bastion Barry', 'Guarded Greg', 'Safehouse Seth', 'Sentinel Stan', 'Blockade Bob', 'Shielded Sheldon',
      'Fortress Fiona', 'Guarded Gwen', 'Shielded Sharon', 'Defensive Debbie'
    ],
    opportunistic: [
      'Sly Cooper', 'Calculated Carl', 'Scavenger Sam', 'Sneaky Pete', 'Vulture Victor',
      'Scheming Sean', 'Greedy Gary', 'Predator Phil', 'Cunning Chris', 'Tactical Ted', 'Shifty Shane',
      'Vulture Vicky', 'Foxy Fiona', 'Sneaky Sally', 'Tactical Tina'
    ],
    chaotic: [
      'Wild Willy', 'Mad Max', 'Trigger Tom', 'Loco Leo', 'Chaos Clint',
      'Joker Jack', 'Rowdy Ron', 'Anarchy Artie', 'Psycho Paul', 'Gonzo Gabe', 'Unstable Uri', 'Wacky Wally',
      'Psycho Sally', 'Chaotic Chloe', 'Wild Wendy'
    ]
  };

  function startGame(opts) {
    const numAI = opts.opponents;
    const personalities = opts.personalities;
    const players = [
      { name: opts.playerName, color: opts.playerColor, isHuman: true, personality: null, userId: G.getSession()?.userId || null },
    ];
    const usedNames = new Set(players.map(x => x.name));
    for (let i = 0; i < numAI; i++) {
      const p = personalities[i % personalities.length];
      const pool = PERSONALITY_NAMES[p] || ['AI Bot'];
      let pName = pool[i % pool.length];
      let offset = 1;
      while (usedNames.has(pName)) {
        pName = pool[(i + offset) % pool.length];
        offset++;
      }
      usedNames.add(pName);
      const usedColors = new Set(players.map(x => x.color));
      let color = (i + 1) % C.PLAYER_COLORS.length;
      while (usedColors.has(color)) color = (color + 1) % C.PLAYER_COLORS.length;
      players.push({ name: pName, color, isHuman: false, personality: p, userId: null });
    }
    gameSettings.model = opts.model;
    gameSettings.allowedPersonalities = (opts.personalities && opts.personalities.length) ? opts.personalities.slice() : C.PERSONALITIES.slice();
    if (window.RISK_BANTER && !window.RISK_MULTIPLAYER_ACTIVE) window.RISK_BANTER.init();
    S.init({
      players,
      gameId: 'g_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      ownerUserId: G.getSession()?.userId || null,
    });
    autoSave();
    runLoop();
  }

  // ---- Load saved game ----
  function loadGame(snap) {
    S.hydrate(snap);
    UI.renderAll();
    UI.applyPhaseHighlights();
    autoSave();
    runLoop();
  }

  // ---- Save & quit ----
  async function saveAndQuit() {
    if (!G.getUrl() || !G.getSession()) {
      UI.toast('No backend configured — game is local only.', 'error');
      return;
    }
    try {
      const snap = S.snapshot();
      snap.meta = { ...(snap.meta || {}), lastSavedAt: Date.now() };
      await G.saveGame(snap);
      UI.toast('Game saved. Returning to menu…', 'success');
      setTimeout(() => {
        location.reload();
      }, 600);
    } catch (e) {
      UI.showError('Save failed: ' + e.message);
    }
  }

  // ---- Main game loop ----
  async function runLoop() {
    if (window.RISK_MULTIPLAYER_ACTIVE) return; // server drives turns in multiplayer
    if (busy) return;
    busy = true;
    try {
      // Run until phase is GAME_OVER or we exit
      while (true) {
        const state = S.get();
        if (!state) break;
        if (state.phase === C.PHASES.GAME_OVER) break;
        const p = state.players[state.currentPlayer];
        if (!p || p.eliminated) {
          // Shouldn't happen, but skip
          S.endTurn();
          continue;
        }
        if (p.isHuman) break;  // hand off to UI
        await runAITurn(p);
      }
    } finally {
      busy = false;
    }
  }

  async function runAITurn(player) {
    const state = S.get();
    const overlay = document.getElementById('thinking-overlay');
    const text = document.getElementById('thinking-text');
    overlay.style.display = 'flex';

    try {
      if (state.phase === C.PHASES.CLAIM) {
        text.textContent = `${player.name} is claiming…`;
        await U.delay(400);
        A.playClaim(player);
      } else if (state.phase === C.PHASES.PLACE_INITIAL) {
        text.textContent = `${player.name} is placing armies…`;
        await U.delay(250);
        A.playPlaceInitial(player);
      } else {
        text.textContent = `${player.name} is thinking…`;
        await A.playTurn(player, gameSettings.model);
      }
    } catch (e) {
      console.error('AI turn error', e);
    } finally {
      overlay.style.display = 'none';
    }
    // Re-enter loop in case more AI turns remain
    setTimeout(() => runLoop(), 50);
  }

  // ---- UI hook wiring ----
  function wireUIHooks() {
    UI.setHook('onStartGame', startGame);
    UI.setHook('onLoadGame', loadGame);
    UI.setHook('onSaveQuit', saveAndQuit);
    UI.setHook('onNewGame', () => { location.reload(); });
    UI.setHook('onMainMenu', () => { location.reload(); });
    UI.setHook('getCurrentSettings', () => {
      const state = S.get();
      return {
        model: gameSettings.model,
        allowedPersonalities: gameSettings.allowedPersonalities,
        players: state ? state.players : [],
        ginLemon: gameSettings.ginLemon,
      };
    });
    UI.setHook('onSettingsChange', (changes) => {
      if (changes.model) gameSettings.model = changes.model;
      if (changes.allowedPersonalities) gameSettings.allowedPersonalities = changes.allowedPersonalities;
      if (changes.ginLemon !== undefined) gameSettings.ginLemon = changes.ginLemon;
      if (changes.opponentPersonalities && changes.opponentPersonalities.length) {
        const state = S.get();
        if (state) {
          for (const ov of changes.opponentPersonalities) {
            const p = state.players[ov.id];
            if (p && !p.isHuman) p.personality = ov.personality;
          }
        }
      }
    });
    UI.setHook('onEndReinforce', () => { S.endReinforce(); runLoop(); });
    UI.setHook('onEndAttack', () => { S.endAttack(); runLoop(); });
    UI.setHook('onEndFortify', () => { S.endFortify(); runLoop(); });
    UI.setHook('onEndTurn', async () => {
      // Save explicitly
      if (G.getUrl() && G.getSession()) {
        try {
          const snap = S.snapshot();
          snap.meta = { ...(snap.meta || {}), lastSavedAt: Date.now() };
          await G.saveGame(snap);
          UI.setSaveStatus('Saved ✓', 'ok');
        } catch (e) { UI.setSaveStatus('Save failed', 'error'); }
      }
      S.endTurn();
      runLoop();
    });
    UI.setHook('onTradeCards', (cardIds) => {
      try {
        const total = S.tradeCards(cardIds);
        UI.toast(`Traded for +${total} armies`, 'success');
        // Clear selection
        document.querySelectorAll('.card-mini.selected').forEach(e => e.classList.remove('selected'));
        updateTradeButtonSafe();
      } catch (e) { UI.showError(e.message); }
    });
    UI.setHook('onAttack', async (fromId, toId, dice) => {
      try {
        return S.attack(fromId, toId, dice);
      } catch (e) { UI.showError(e.message); return null; }
    });

    UI.setHook('onConquest', async (fromId, toId, dice) => {
      const state = S.get();
      const from = state.territories[fromId];
      const to = state.territories[toId];
      const sliderMax = from.armies + to.armies - 1;
      const sliderMin = Math.max(1, dice);
      
      const moveArmies = await new Promise(resolve => {
        const wrap = document.createElement('div');
        wrap.className = 'modal-backdrop';
        wrap.innerHTML = `<div class="modal"><h2 class="modal-title">Conquered ${C.TERRITORIES[toId].name}!</h2>
          <div class="modal-body">
            <p class="muted">Move at least ${sliderMin} armies (your dice count) into the new territory.</p>
            <label>Armies: <span id="cnt">${sliderMax}</span>
              <input id="sld" type="range" min="${sliderMin}" max="${sliderMax}" value="${sliderMax}">
            </label>
            <div class="modal-actions">
              <button id="cfm" class="btn btn-primary">Confirm</button>
            </div>
          </div></div>`;
        document.body.appendChild(wrap);
        const sld = wrap.querySelector('#sld');
        const cnt = wrap.querySelector('#cnt');
        sld.oninput = () => cnt.textContent = sld.value;
        wrap.querySelector('#cfm').onclick = () => { resolve(parseInt(sld.value, 10)); wrap.remove(); };
      });

      try {
        S.conquestMove(fromId, toId, moveArmies);
      } catch (e) { UI.showError(e.message); }
    });
  }

  function updateTradeButtonSafe() {
    // Reuse UI helper
    if (UI.updateTradeButton) UI.updateTradeButton();
    else {
      // Recreate by re-emitting cards event
      const state = S.get();
      if (state) S.emit('cards', state.currentPlayer);
    }
  }

  // ---- Boot ----
  async function boot() {
    UI.init();
    wireUIHooks();
    wireAutoSave();
    await M.init(document.getElementById('map-container'));

    // Check if we should auto-reconnect
    let reconnecting = false;
    if (window.RISK_MULTIPLAYER && window.RISK_MULTIPLAYER.checkReconnect) {
      reconnecting = window.RISK_MULTIPLAYER.checkReconnect();
    }

    // Multiplayer entry point (bypasses GAS login).
    const mpBtn = document.getElementById('btn-multiplayer');
    if (mpBtn && window.RISK_MULTIPLAYER) {
      mpBtn.onclick = () => { document.getElementById('welcome-modal').style.display = 'none'; window.RISK_MULTIPLAYER.openLobby(); };
    }
    if (!reconnecting) {
      UI.showWelcome();
    }
  }

  function updateTradeButton() {
    const state = S.get();
    const p = state.players[state.currentPlayer];
    const sel = Array.from(document.querySelectorAll('.card-mini.selected')).map(e => e.dataset.cardId);
    const btn = document.getElementById('btn-trade-cards');
    const inReinforce = state.phase === C.PHASES.REINFORCE;
    const valid = sel.length === 3 && UI.isValidSet ? UI.isValidSet(sel, p.cards) : true;
    btn.disabled = !(inReinforce && valid);
  }
  UI.updateTradeButton = updateTradeButton;

  // Re-evaluate trade button on selection change
  document.addEventListener('click', (e) => {
    if (e.target.closest('.card-mini')) {
      setTimeout(updateTradeButton, 0);
    }
  });

  document.addEventListener('DOMContentLoaded', boot);
})();
