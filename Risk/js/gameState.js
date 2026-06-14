// gameState.js — Central reactive game state.
// Owns all mutations; emits events for the UI to subscribe to.
window.RISK_STATE = (function () {
  const C = window.RISK_CONFIG;
  const R = window.RISK_RULES;
  const CardLib = window.RISK_CARDS;
  const U = window.RISK_UTILS;

  // ---- Event emitter ----
  const listeners = {};
  function on(event, fn) {
    (listeners[event] = listeners[event] || []).push(fn);
  }
  function emit(event, data) {
    (listeners[event] || []).forEach(fn => {
      try { fn(data); } catch (e) { console.error('listener err', event, e); }
    });
  }

  // ---- State ----
  let state = null;

  function init(opts) {
    // opts: { players:[{name,color,isHuman,personality,userId?}], gameId, ownerUserId }
    const players = opts.players.map((p, i) => ({
      id: i,
      name: p.name,
      color: p.color,
      colorHex: C.PLAYER_COLORS[p.color].hex,
      isHuman: !!p.isHuman,
      personality: p.personality || null,
      userId: p.userId || null,
      cards: [],
      eliminated: false,
    }));

    // Initialize all territories to neutral
    const territories = {};
    for (const t of C.territoryList()) {
      territories[t.id] = {
        id: t.id,
        owner: -1,
        armies: 0,
        adjacency: [...t.adjacency],
        continent: t.continent,
        name: t.name
      };
    }

    state = {
      gameId: opts.gameId || ('local_' + Date.now()),
      ownerUserId: opts.ownerUserId || null,
      phase: C.PHASES.CLAIM,
      turnNumber: 0,
      currentPlayer: 0,
      currentPlayerInTurnPhase: 0, // for initial placement turn order
      claimIndex: 0, // for CLAIM phase
      placeInitialIndex: 0,
      placeInitialRemaining: {}, // playerId → armies left to place
      players,
      territories,
      cardDeck: CardLib.createDeck(),
      discardPile: [],
      setsTraded: 0,
      turnConquered: false,
      reinforcementsThisTurn: 0,
      log: [],
      meta: { createdAt: Date.now(), lastSavedAt: null },
    };

    // Order players randomly for turn order
    state.turnOrder = U.shuffle(players.map(p => p.id));
    log('Game created. Turn order: ' + state.turnOrder.map(id => players[id].name).join(' → '));
    emit('init', state);
    emit('phase', state.phase);
    emit('player', state.currentPlayer);
    return state;
  }

  function get() { return state; }
  function snapshot() { return U.deepClone(state); }
  function hydrate(s) {
    state = s;
    emit('init', state);
    emit('phase', state.phase);
    emit('player', state.currentPlayer);
  }

  // ---- Logging ----
  function log(msg, kind = 'info') {
    const entry = { ts: Date.now(), msg, kind };
    state.log.push(entry);
    if (state.log.length > 500) state.log.shift();
    emit('log', entry);
  }

  // ---- Turn order helpers ----
  function activePlayerOrder() {
    // Filter to non-eliminated players, preserving turn order
    return state.turnOrder.filter(id => !state.players[id].eliminated);
  }
  function nextPlayerId() {
    const order = activePlayerOrder();
    const idx = order.indexOf(state.currentPlayer);
    return order[(idx + 1) % order.length];
  }

  // ============================================================
  // Phase: CLAIM
  // Each player (in turn order) claims one unowned territory.
  // ============================================================
  function claimTerritory(territoryId) {
    if (state.phase !== C.PHASES.CLAIM) throw new Error('Not in claim phase');
    const t = state.territories[territoryId];
    if (!t) throw new Error('No such territory');
    if (t.owner !== -1) throw new Error('Territory already owned');
    const player = state.players[state.currentPlayer];
    t.owner = player.id;
    t.armies = 1;
    log(`${player.name} claims ${C.TERRITORIES[territoryId].name}.`, 'claim');
    emit('territory', territoryId);
    advanceClaim();
  }

  function advanceClaim() {
    const unowned = Object.values(state.territories).filter(t => t.owner === -1);
    if (unowned.length === 0) {
      enterPlaceInitial();
      return;
    }
    state.currentPlayer = nextPlayerId();
    state.claimIndex++;
    emit('player', state.currentPlayer);
  }

  // Auto-pick for AI: pick the first unowned territory.
  function autoClaimForCurrentAI() {
    const unowned = Object.values(state.territories).find(t => t.owner === -1);
    if (unowned) claimTerritory(unowned.id);
  }

  // ============================================================
  // Phase: PLACE_INITIAL
  // Each player places 1 army per turn on an owned territory until
  // they've placed STARTING_ARMIES armies.
  // ============================================================
  function enterPlaceInitial() {
    state.phase = C.PHASES.PLACE_INITIAL;
    const baseArmies = C.STARTING_ARMIES[state.players.length];
    for (const p of state.players) {
      state.placeInitialRemaining[p.id] = baseArmies - 1; // they already placed 1 during claim
    }
    state.currentPlayer = state.turnOrder[0];
    log('Initial placement phase begins.', 'phase');
    emit('phase', state.phase);
    emit('player', state.currentPlayer);
  }

  function placeInitialArmy(territoryId) {
    if (state.phase !== C.PHASES.PLACE_INITIAL) throw new Error('Not in placeInitial phase');
    const t = state.territories[territoryId];
    if (!t) throw new Error('No such territory');
    if (t.owner !== state.currentPlayer) throw new Error('Not your territory');
    const player = state.players[state.currentPlayer];
    t.armies++;
    state.placeInitialRemaining[player.id]--;
    log(`${player.name} places 1 army in ${C.TERRITORIES[territoryId].name} (${state.placeInitialRemaining[player.id]} left).`, 'place');
    emit('territory', territoryId);
    if (Object.values(state.placeInitialRemaining).every(v => v === 0)) {
      state.turnNumber = 1;
      state.currentPlayer = state.turnOrder[0];
      log('--- Turn 1 ---', 'turn');
      enterReinforce();
      return;
    }
    // next player
    state.currentPlayer = nextPlayerId();
    emit('player', state.currentPlayer);
  }

  function autoPlaceInitialForCurrentAI() {
    const player = state.players[state.currentPlayer];
    // Place on a random owned territory
    const owned = Object.values(state.territories).filter(t => t.owner === player.id);
    if (owned.length) {
      const t = U.pickRandom(owned);
      placeInitialArmy(t.id);
    }
  }

  // ============================================================
  // Phase: REINFORCE
  // Player gets reinforcements based on territory/3 + continent bonuses + card set.
  // Player places 1 at a time on own territories.
  // ============================================================
  function enterReinforce() {
    state.phase = C.PHASES.REINFORCE;
    state.turnConquered = false;
    state.reinforcementsThisTurn = 0;
    // Compute and store each player's current reinforcement
    for (const p of state.players) {
      if (p.eliminated) continue;
      const r = R.calculateReinforcements(p, state.territories);
      p.pendingReinforcements = r.territoryBonus + r.continentBonus;
    }
    // Recompute for current player
    computeAndSetCurrentReinforcements();
    log(`Reinforcements for ${state.players[state.currentPlayer].name}: ${state.players[state.currentPlayer].pendingReinforcements}`, 'phase');
    emit('phase', state.phase);
    emit('player', state.currentPlayer);
  }

  function computeAndSetCurrentReinforcements() {
    const p = state.players[state.currentPlayer];
    if (p.eliminated) return;
    const r = R.calculateReinforcements(p, state.territories);
    p.pendingReinforcements = r.territoryBonus + r.continentBonus;
    state.reinforcementsThisTurn = p.pendingReinforcements;
  }

  function placeArmy(territoryId) {
    const p = state.players[state.currentPlayer];
    if (state.phase === C.PHASES.REINFORCE) {
      if ((p.pendingReinforcements || 0) <= 0) throw new Error('No reinforcements left');
      const t = state.territories[territoryId];
      if (!t || t.owner !== p.id) throw new Error('Not your territory');
      t.armies++;
      p.pendingReinforcements--;
      state.reinforcementsThisTurn = p.pendingReinforcements;
      log(`${p.name} reinforces ${C.TERRITORIES[territoryId].name} (${t.armies} armies, ${p.pendingReinforcements} left).`, 'reinforce');
      emit('territory', territoryId);
      emit('reinforcements', p.pendingReinforcements);
    } else if (state.phase === C.PHASES.PLACE_INITIAL) {
      placeInitialArmy(territoryId);
    } else {
      throw new Error('Cannot place army in this phase');
    }
  }

  function endReinforce() {
    if (state.phase !== C.PHASES.REINFORCE) return;
    enterAttack();
  }

  // ============================================================
  // Phase: ATTACK
  // Player picks source territory (>=2 armies) + target (adjacent enemy).
  // Roll dice, resolve, repeat until player stops.
  // ============================================================
  function enterAttack() {
    state.phase = C.PHASES.ATTACK;
    state.turnConquered = false;
    log(`${state.players[state.currentPlayer].name} is attacking.`, 'phase');
    emit('phase', state.phase);
  }

  function attack(fromId, toId, requestedDice) {
    if (state.phase !== C.PHASES.ATTACK) throw new Error('Not in attack phase');
    const from = state.territories[fromId];
    const to = state.territories[toId];
    if (!from || !to) throw new Error('Bad territory');
    if (from.owner !== state.currentPlayer) throw new Error('Not your source');
    if (to.owner === from.owner) throw new Error('Cannot attack own territory');
    if (!from.adjacency.includes(toId)) throw new Error('Not adjacent');
    if (from.armies < 2) throw new Error('Need >=2 armies to attack');
    const p = state.players[state.currentPlayer];

    const attackerDice = requestedDice || Math.min(3, from.armies - 1);
    const defDiceAvail = Math.min(2, to.armies);
    const { attackerDice: aD, defenderDice: dD } = R.pickDiceCounts(from.armies, to.armies);
    const useAttDice = Math.min(attackerDice, aD);

    const aRolls = R.rollDice(useAttDice);
    const dRolls = R.rollDice(dDiceAvail);
    const result = R.resolveCombat(aRolls, dRolls);
    from.armies -= result.attackerLosses;
    to.armies -= result.defenderLosses;
    log(`${p.name} attacks ${C.TERRITORIES[toId].name} from ${C.TERRITORIES[fromId].name}: A[${aRolls.join(',')}] vs D[${dRolls.join(',')}] → A-${result.attackerLosses} D-${result.defenderLosses}`, 'combat');
    emit('combat', { fromId, toId, aRolls, dRolls, ...result });
    emit('territory', fromId);
    emit('territory', toId);

    if (to.armies <= 0) {
      // Conquered
      const conqueredOwner = to.owner;
      const minMove = Math.max(1, useAttDice); // must move at least as many as dice rolled
      const maxMove = from.armies - 1;
      if (maxMove < minMove) {
        // Edge case: not enough armies to occupy after losses.
        // In Risk, the territory is captured with whatever is left.
      }
      const move = Math.max(minMove, Math.min(maxMove, from.armies - 1));
      const movedArmies = Math.max(1, Math.min(move, from.armies - 1));
      to.owner = from.owner;
      to.armies = movedArmies;
      from.armies -= movedArmies;
      state.turnConquered = true;
      log(`${p.name} conquers ${C.TERRITORIES[toId].name}!`, 'conquest');
      emit('conquest', { fromId, toId, movedArmies });
      emit('territory', toId);
      emit('territory', fromId);
      // Award a card
      awardCardTo(p);
      // Check elimination
      const conqueredPlayer = state.players[conqueredOwner];
      const stillHas = Object.values(state.territories).some(t => t.owner === conqueredOwner);
      if (!stillHas && !conqueredPlayer.eliminated) {
        conqueredPlayer.eliminated = true;
        // Transfer cards
        const transferred = conqueredPlayer.cards.splice(0);
        p.cards.push(...transferred);
        log(`${conqueredPlayer.name} is eliminated. ${transferred.length} cards transferred to ${p.name}.`, 'elim');
        emit('elimination', { playerId: conqueredOwner });
      }
      // Check victory
      if (R.countTerritories(p.id, state.territories) === C.territoryCount()) {
        enterGameOver(p);
      }
    }
    return { aRolls, dRolls, result, conquered: to.armies <= 0 };
  }

  function awardCardTo(player) {
    if (state.cardDeck.length === 0) {
      CardLib.reshuffleDiscardInto(state.cardDeck, state.discardPile);
    }
    const card = state.cardDeck.shift();
    if (card) {
      player.cards.push(card);
      emit('cards', player.id);
    }
  }

  function endAttack() {
    if (state.phase !== C.PHASES.ATTACK) return;
    enterFortify();
  }

  // ============================================================
  // Phase: FORTIFY
  // Move armies from one owned territory to another connected owned territory.
  // ============================================================
  function enterFortify() {
    state.phase = C.PHASES.FORTIFY;
    log(`${state.players[state.currentPlayer].name} may fortify.`, 'phase');
    emit('phase', state.phase);
  }

  function fortify(fromId, toId, count) {
    if (state.phase !== C.PHASES.FORTIFY) throw new Error('Not in fortify phase');
    const from = state.territories[fromId];
    const to = state.territories[toId];
    if (!from || !to) throw new Error('Bad territory');
    if (from.owner !== state.currentPlayer || to.owner !== state.currentPlayer) throw new Error('Not your territory');
    const connected = R.getConnectedFriendly(fromId, state.currentPlayer, state.territories);
    if (!connected.has(toId)) throw new Error('Not connected');
    if (from.armies <= count) throw new Error('Must leave at least 1 army');
    if (count < 1) throw new Error('Must move at least 1');
    from.armies -= count;
    to.armies += count;
    log(`${state.players[state.currentPlayer].name} fortifies ${C.TERRITORIES[fromId].name} → ${C.TERRITORIES[toId].name} (${count} armies).`, 'fortify');
    emit('territory', fromId);
    emit('territory', toId);
  }

  function endFortify() {
    if (state.phase !== C.PHASES.FORTIFY) return;
    endTurn();
  }

  // ============================================================
  // Turn cycling
  // ============================================================
  function endTurn() {
    const order = activePlayerOrder();
    if (order.length === 0) return;
    const idx = order.indexOf(state.currentPlayer);
    const nextPlayer = order[(idx + 1) % order.length];
    if (nextPlayer === state.turnOrder[0]) {
      state.turnNumber++;
      log('--- Turn ' + state.turnNumber + ' ---', 'turn');
    }
    state.currentPlayer = nextPlayer;
    enterReinforce();
  }

  function enterGameOver(winner) {
    state.phase = C.PHASES.GAME_OVER;
    state.winner = winner.id;
    log(`${winner.name} WINS THE GAME!`, 'victory');
    emit('phase', state.phase);
    emit('victory', winner.id);
  }

  // ============================================================
  // Card trading
  // ============================================================
  function tradeCards(cardIds) {
    const p = state.players[state.currentPlayer];
    if (state.phase !== C.PHASES.REINFORCE) throw new Error('Can only trade during reinforce');
    const hand = p.cards;
    // Verify cards are in hand
    for (const id of cardIds) {
      if (!hand.find(c => c.id === id)) throw new Error('Card not in hand');
    }
    // Compute value
    const base = R.tradeSetValue(state.setsTraded);
    const territoryBonus = R.getCardTerritoryBonus(cardIds, hand, state.territories, p.id);
    const total = base + territoryBonus;
    // Remove cards from hand and add to discard
    const set = hand.filter(c => cardIds.includes(c.id));
    for (const c of set) {
      const i = p.cards.indexOf(c);
      p.cards.splice(i, 1);
      state.discardPile.push(c);
    }
    state.setsTraded++;
    p.pendingReinforcements += total;
    state.reinforcementsThisTurn = p.pendingReinforcements;
    log(`${p.name} trades ${cardIds.length} cards for +${total} armies (${base}+${territoryBonus} territory).`, 'trade');
    emit('cards', p.id);
    emit('reinforcements', p.pendingReinforcements);
    return total;
  }

  return {
    on, emit,
    get, snapshot, hydrate, init,
    log,
    claimTerritory, autoClaimForCurrentAI,
    placeArmy, endReinforce, autoPlaceInitialForCurrentAI,
    attack, endAttack,
    fortify, endFortify,
    endTurn,
    tradeCards,
    activePlayerOrder, nextPlayerId,
  };
})();
