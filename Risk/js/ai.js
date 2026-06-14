// ai.js — AI player decision engine. Heuristic + LLM-via-GAS-proxy.
window.RISK_AI = (function () {
  const C = window.RISK_CONFIG;
  const R = window.RISK_RULES;
  const S = window.RISK_STATE;
  const G = window.RISK_GAS;
  const U = window.RISK_UTILS;

  // Compact board state representation for LLM consumption.
  function serializeBoard(player) {
    const state = S.get();
    const myTerritories = Object.entries(state.territories)
      .filter(([id, t]) => t.owner === player.id)
      .map(([id, t]) => ({ id, name: C.TERRITORIES[id].name, continent: C.TERRITORIES[id].continent, armies: t.armies, adj: t.adjacency.map(a => ({ id: a, owner: state.territories[a].owner, ownerName: state.territories[a].owner >= 0 ? state.players[state.territories[a].owner].name : '?', armies: state.territories[a].armies })) }));

    const enemyTerritories = Object.entries(state.territories)
      .filter(([id, t]) => t.owner !== player.id && t.owner !== -1)
      .map(([id, t]) => ({ id, name: C.TERRITORIES[id].name, armies: t.armies, owner: state.players[t.owner].name }));

    const ownedContinents = R.getOwnedContinentBonuses(player.id, state.territories);
    const continentProgress = {};
    for (const contId in C.CONTINENTS) {
      const cont = C.CONTINENTS[contId];
      const own = cont.territoryList.filter(tid => state.territories[tid].owner === player.id).length;
      continentProgress[contId] = { name: cont.name, own, total: cont.territoryList.length, bonus: cont.bonus };
    }
    return {
      you: { id: player.id, name: player.name, cards: player.cards.length, pendingReinforcements: player.pendingReinforcements || 0 },
      territories: myTerritories,
      enemy: enemyTerritories,
      continentProgress,
      ownedContinents: ownedContinents.map(c => c.contId),
      setsTraded: state.setsTraded,
      phase: state.phase,
    };
  }

  function personalityPrompt(p) {
    switch (p) {
      case 'aggressive':   return 'You are AGGRESSIVE. Prioritize attacking weak neighbors, finishing continents, and growing your empire. Take calculated risks.';
      case 'defensive':    return 'You are DEFENSIVE. Fortify borders, avoid risky attacks, and grow slowly. Build up armies before engaging.';
      case 'opportunistic':return 'You are OPPORTUNISTIC. Target the weakest player, exploit gaps, prefer high-probability attacks.';
      case 'chaotic':      return 'You are CHAOTIC. Make bold, surprising moves. Occasionally do unexpected things. Keep the game interesting.';
      default:             return 'You are a balanced Risk player.';
    }
  }

  function systemPrompt(player, model) {
    return `You are playing Risk, a turn-based strategy game. You are player ${player.name} with personality: ${personalityPrompt(player.personality)}.
Respond ONLY with valid JSON (no markdown, no prose). Be concise and decisive.
Valid territory IDs: ${C.territoryList().map(t => t.id).join(', ')}.
${player.isHuman ? '' : 'You are an AI player competing against a human and other AI opponents.'}`;
  }

  // JSON extraction tolerating markdown fences / surrounding prose.
  function extractJSON(text) {
    if (!text) return null;
    // Strip markdown code fences
    let t = text.trim();
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) t = fence[1].trim();
    // Find first { ... last }
    const first = t.indexOf('{');
    const last = t.lastIndexOf('}');
    if (first >= 0 && last > first) t = t.substring(first, last + 1);
    try { return JSON.parse(t); } catch { return null; }
  }

  async function llmCall(model, system, user) {
    const res = await G.llmChat({ model, system, user, maxTokens: 600, temperature: 0.4 });
    return res.text;
  }

  // Public decision API. Returns a decision object or null on error.
  async function decideReinforce(player, model) {
    const state = S.get();
    const board = serializeBoard(player);
    const sys = systemPrompt(player, model);
    const user = `Phase: REINFORCE. You have ${board.you.pendingReinforcements} armies to place.
You have ${board.you.cards} cards in hand. Sets already traded this game: ${board.setsTraded}.
Owned continents (full bonus): ${board.ownedContinents.length ? board.ownedContinents.join(', ') : 'none'}.
Continent progress: ${Object.entries(board.continentProgress).map(([id, p]) => `${p.name}=${p.own}/${p.total}(+${p.bonus} if complete)`).join('; ')}.
Your territories (id, name, armies, enemy neighbor info): ${JSON.stringify(board.territories)}
You MAY trade a card set first (returns armies immediately you can place this turn). Card set must be 3 of a kind or 1-of-each (infantry/cavalry/artillery); wilds substitute.

Return JSON of the form:
{
  "cardTrade": [ "cardId1","cardId2","cardId3" ] | null,
  "placements": { "territoryId": count, ... }
}
- The sum of placements plus the trade-in value must equal your total available (pendingReinforcements + tradeBonus).
- Prioritize border territories and continents close to completion.
- Place armies one integer at a time per territory.`;

    try {
      const text = await llmCall(model, sys, user);
      const obj = extractJSON(text);
      if (!obj) throw new Error('Bad JSON');
      return obj;
    } catch (e) {
      console.warn('LLM reinforce failed, falling back to heuristic:', e.message);
      return heuristicReinforce(player);
    }
  }

  async function decideAttack(player, model) {
    const board = serializeBoard(player);
    const sys = systemPrompt(player, model);
    const user = `Phase: ATTACK. Decide your next battle.
Your territories with >=2 armies and their adjacent enemies:
${JSON.stringify(board.territories.filter(t => t.armies >= 2).map(t => ({
  id: t.id, name: t.name, armies: t.armies,
  enemies: t.adj.filter(a => a.owner !== player.id).map(a => ({ id: a.id, armies: a.armies }))
})))}
Return JSON:
{ "action": "attack" | "stop", "from": "territoryId", "to": "territoryId", "dice": 1|2|3 }
Choose "stop" if no good targets. Otherwise attack if expected value is positive.`;
    try {
      const text = await llmCall(model, sys, user);
      const obj = extractJSON(text);
      if (!obj) throw new Error('Bad JSON');
      return obj;
    } catch (e) {
      return heuristicAttackStep(player);
    }
  }

  async function decideFortify(player, model) {
    const board = serializeBoard(player);
    const sys = systemPrompt(player, model);
    const user = `Phase: FORTIFY (move armies once, or skip). Your territories:
${JSON.stringify(board.territories.map(t => ({ id: t.id, name: t.name, armies: t.armies })))}
Return JSON:
{ "from": "territoryId" | null, "to": "territoryId" | null, "count": N }
Set from/to to null to skip. Otherwise move count armies along a friendly-connected path to a threatened border.`;
    try {
      const text = await llmCall(model, sys, user);
      const obj = extractJSON(text);
      if (!obj) throw new Error('Bad JSON');
      return obj;
    } catch (e) {
      return heuristicFortify(player);
    }
  }

  // =============================================================
  // HEURISTIC FALLBACK AI
  // =============================================================
  function heuristicReinforce(player) {
    const state = S.get();
    const available = player.pendingReinforcements || 0;
    // Auto-trade cards if 5+ and we have a set
    let cardTrade = null;
    if (R.mustTradeCards(player.cards)) {
      const sets = R.findValidCardSets(player.cards);
      if (sets.length) cardTrade = sets[0];
    }
    // Compute placements: prioritize borders and near-complete continents
    const owned = Object.entries(state.territories)
      .filter(([id, t]) => t.owner === player.id)
      .map(([id, t]) => ({ id, ...t, cont: C.TERRITORIES[id].continent }));
    // Score each territory
    const score = {};
    for (const [id, t] of owned) {
      const isBorder = t.adjacency.some(a => state.territories[a].owner !== player.id);
      const enemies = t.adjacency.filter(a => state.territories[a].owner !== player.id).map(a => state.territories[a].armies);
      const maxEnemy = Math.max(0, ...enemies);
      const threat = isBorder ? maxEnemy - t.armies : 0;
      // Continent completion
      const cont = C.CONTINENTS[C.TERRITORIES[id].continent];
      const ownInCont = cont.territoryList.filter(tid => state.territories[tid].owner === player.id).length;
      const contClose = ownInCont / cont.territoryList.length;
      score[id] = (isBorder ? 10 : 0) + threat * 2 + contClose * 5 - t.armies * 0.1;
    }
    const ranked = owned.map(o => o.id).sort((a, b) => score[b] - score[a]);
    const placements = {};
    let remaining = available;
    for (const id of ranked) {
      if (remaining <= 0) break;
      const give = Math.min(remaining, Math.max(1, Math.ceil(remaining / Math.max(1, ranked.length))));
      placements[id] = give;
      remaining -= give;
    }
    return { cardTrade, placements };
  }

  function heuristicAttackStep(player) {
    const state = S.get();
    // Find best (from, to) by expected value
    const candidates = [];
    const owned = Object.entries(state.territories).filter(([id, t]) => t.owner === player.id && t.armies >= 2);
    for (const [fromId, from] of owned) {
      for (const toId of from.adjacency) {
        const to = state.territories[toId];
        if (to.owner === player.id) continue;
        const wp = R.winProbability(from.armies, to.armies);
        if (wp >= 0.55 && from.armies > to.armies + 1) {
          candidates.push({ fromId, toId, wp, attackerDice: Math.min(3, from.armies - 1) });
        }
      }
    }
    if (!candidates.length) return { action: 'stop' };
    candidates.sort((a, b) => b.wp - a.wp);
    const c = candidates[0];
    return { action: 'attack', from: c.fromId, to: c.toId, dice: c.attackerDice };
  }

  function heuristicFortify(player) {
    const state = S.get();
    const owned = Object.entries(state.territories).filter(([id, t]) => t.owner === player.id);
    // Find interior (no enemy neighbors) with >=2 armies, and most-threatened border
    const interior = owned.filter(([id, t]) => t.adjacency.every(a => state.territories[a].owner === player.id) && t.armies >= 2);
    if (!interior.length) return { from: null, to: null, count: 0 };
    let bestBorder = null, bestThreat = -999;
    for (const [id, t] of owned) {
      const isBorder = t.adjacency.some(a => state.territories[a].owner !== player.id);
      if (!isBorder) continue;
      const maxEnemy = Math.max(0, ...t.adjacency.map(a => state.territories[a].armies));
      const threat = maxEnemy - t.armies;
      if (threat > bestThreat) { bestThreat = threat; bestBorder = id; }
    }
    if (!bestBorder || bestThreat <= 0) return { from: null, to: null, count: 0 };
    // Pick interior with the most armies
    interior.sort((a, b) => b[1].armies - a[1].armies);
    const [fromId, fromT] = interior[0];
    // Check connectivity
    const connected = R.getConnectedFriendly(fromId, player.id, state.territories);
    if (!connected.has(bestBorder)) return { from: null, to: null, count: 0 };
    const move = Math.floor(fromT.armies / 2);
    if (move < 1) return { from: null, to: null, count: 0 };
    return { from: fromId, to: bestBorder, count: move };
  }

  // =============================================================
  // Top-level AI turn orchestration
  // =============================================================
  async function playTurn(player, model) {
    const state = S.get();
    // ===== REINFORCE =====
    if (state.phase === C.PHASES.REINFORCE) {
      // If no pending reinforcements, advance
      if ((player.pendingReinforcements || 0) === 0) {
        S.endReinforce();
      } else {
        const decision = await decideReinforce(player, model);
        if (decision.cardTrade && decision.cardTrade.length === 3) {
          try { S.tradeCards(decision.cardTrade); } catch (e) { console.warn(e.message); }
        }
        const placements = decision.placements || {};
        for (const tid in placements) {
          const count = placements[tid];
          for (let i = 0; i < count; i++) {
            try { S.placeArmy(tid); } catch (e) { /* ignore invalid */ }
          }
        }
        // Place any remaining
        let p = S.get().players[player.id];
        while ((p.pendingReinforcements || 0) > 0) {
          // find any owned
          const owned = Object.values(S.get().territories).filter(t => t.owner === player.id);
          if (!owned.length) break;
          try { S.placeArmy(owned[0].id); } catch { break; }
          p = S.get().players[player.id];
        }
        S.endReinforce();
      }
    }
    // ===== ATTACK =====
    if (S.get().phase === C.PHASES.ATTACK) {
      for (let i = 0; i < 200; i++) {  // safety cap
        const decision = await decideAttack(player, model);
        if (!decision || decision.action === 'stop') break;
        const fromId = decision.from || decision.fromId;
        const toId = decision.to || decision.toId;
        if (!fromId || !toId) break;
        try {
          S.attack(fromId, toId, decision.dice);
        } catch (e) { break; }
        // Pause for animation in UI
        await U.delay(350);
        // If defender eliminated or attacker can't continue, stop
        const st = S.get();
        if (st.phase !== C.PHASES.ATTACK) break;
        const from = st.territories[fromId];
        const to = st.territories[toId];
        if (from.armies < 2 || to.armies < 1 || to.owner === player.id) {
          // re-evaluate next iteration
        }
      }
      S.endAttack();
    }
    // ===== FORTIFY =====
    if (S.get().phase === C.PHASES.FORTIFY) {
      const decision = await decideFortify(player, model);
      if (decision && decision.from && decision.to && decision.count > 0) {
        try { S.fortify(decision.from, decision.to, decision.count); } catch {}
      }
      S.endFortify();
    }
  }

  // Claim phase: pick a random unclaimed territory
  function playClaim(player) {
    const state = S.get();
    const unowned = Object.entries(state.territories).filter(([id, t]) => t.owner === -1);
    if (!unowned.length) return;
    // Pick one with a "good" continent: spread out
    const id = U.pickRandom(unowned.map(([id]) => id));
    S.claimTerritory(id);
  }

  function playPlaceInitial(player) {
    const state = S.get();
    const owned = Object.entries(state.territories).filter(([id, t]) => t.owner === player.id);
    if (!owned.length) return;
    // Place on a border (or random)
    const id = U.pickRandom(owned.map(([id]) => id));
    S.placeArmy(id);
  }

  return { playTurn, playClaim, playPlaceInitial, heuristicReinforce, heuristicAttackStep, heuristicFortify };
})();
