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

    const playersInfo = state.players.map(p => {
      const totalArmies = Object.values(state.territories)
        .filter(t => t.owner === p.id)
        .reduce((sum, t) => sum + t.armies, 0);
      const totalTerritories = Object.values(state.territories)
        .filter(t => t.owner === p.id).length;
      return {
        id: p.id,
        name: p.name,
        cards: p.cards.length,
        eliminated: p.eliminated,
        isHuman: p.isHuman,
        totalArmies,
        totalTerritories
      };
    });

    const ownedContinents = R.getOwnedContinentBonuses(player.id, state.territories);
    const continentProgress = {};
    for (const contId in C.CONTINENTS) {
      const cont = C.CONTINENTS[contId];
      const own = cont.territoryList.filter(tid => state.territories[tid].owner === player.id).length;
      continentProgress[contId] = { name: cont.name, own, total: cont.territoryList.length, bonus: cont.bonus };
    }
    return {
      you: { id: player.id, name: player.name, cards: player.cards.length, pendingReinforcements: player.pendingReinforcements || 0 },
      players: playersInfo,
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
Opponent status (name, cards in hand, total armies, total territories): ${JSON.stringify(board.players.filter(p => p.id !== board.you.id && !p.eliminated))}
You MAY trade a card set first (returns armies immediately you can place this turn). Card set must be 3 of a kind or 1-of-each (infantry/cavalry/artillery); wilds substitute.

Return JSON of the form:
{
  "cardTrade": [ "cardId1","cardId2","cardId3" ] | null,
  "placements": { "territoryId": count, ... }
}
- The sum of placements plus the trade-in value must equal your total available (pendingReinforcements + tradeBonus).
- Prioritize borders of continents you already own or are close to completing.
- If an opponent is weak (low total armies) and has cards (especially >= 3), prioritize reinforcing borders adjacent to them so you can eliminate them and take their cards.
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
Opponent status (name, cards in hand, total armies, total territories): ${JSON.stringify(board.players.filter(p => p.id !== board.you.id && !p.eliminated))}
Your territories with >=2 armies and their adjacent enemies:
${JSON.stringify(board.territories.filter(t => t.armies >= 2).map(t => ({
  id: t.id, name: t.name, armies: t.armies,
  enemies: t.adj.filter(a => a.owner !== player.id).map(a => ({ id: a.id, armies: a.armies, ownerName: a.ownerName }))
})))}
Return JSON:
{ "action": "attack" | "stop", "from": "territoryId", "to": "territoryId", "dice": 1|2|3 }
Choose "stop" if no good targets. Otherwise attack if expected value is positive.
- Prioritize completing continents.
- Prioritize completely eliminating a weak opponent who has cards (to steal their cards!). If they are down to 1-3 territories and you can take them, go for it.`;
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
Set from/to to null to skip. Otherwise move count armies along a friendly-connected path from a safe interior territory to a threatened border.`;
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
    
    let cardTrade = null;
    if (R.mustTradeCards(player.cards)) {
      const sets = R.findValidCardSets(player.cards);
      if (sets.length) cardTrade = sets[0];
    }
    
    const owned = Object.entries(state.territories)
      .filter(([id, t]) => t.owner === player.id)
      .map(([id, t]) => ({ id, ...t, cont: C.TERRITORIES[id].continent }));

    // Identify opponents and calculate strategic bounties
    const opponents = state.players.filter(p => !p.eliminated && p.id !== player.id)
      .map(p => {
        const totalArmies = Object.values(state.territories).filter(t => t.owner === p.id).reduce((sum, t) => sum + t.armies, 0);
        const totalTerritories = Object.values(state.territories).filter(t => t.owner === p.id).length;
        
        // Bounty base: reward for cards. If they have >= 3 cards, it's a huge deal.
        let bounty = p.cards.length * 12;
        if (p.cards.length >= 3) bounty += 20;
        
        // Scale bounty: much higher if they are overall weak/vulnerable
        bounty = bounty * (25 / (totalArmies + 5));
        
        // Extra bonus if they are close to complete elimination
        if (totalTerritories <= 3) {
          bounty += (4 - totalTerritories) * 25;
        }
        
        return { id: p.id, cards: p.cards.length, totalArmies, totalTerritories, bounty };
      });

    // Score each owned territory
    const score = {};
    for (const [id, t] of owned) {
      const adj = C.TERRITORIES[id].adjacency || [];
      const enemyNeighbors = adj.filter(a => state.territories[a].owner !== player.id).map(a => state.territories[a]);
      const isBorder = enemyNeighbors.length > 0;
      
      if (!isBorder) {
        score[id] = 0; // Don't reinforce 100% safe interior regions
        continue;
      }

      const maxEnemy = Math.max(...enemyNeighbors.map(n => n.armies));
      const threat = Math.max(0, maxEnemy - t.armies);

      // Base score for being a border, heavily weighted by immediate threat
      let s = 10 + threat * 3.0;

      // Continent Completion & Defense Priority
      const contId = C.TERRITORIES[id].continent;
      const cont = C.CONTINENTS[contId];
      const ownInCont = cont.territoryList.filter(tid => state.territories[tid].owner === player.id).length;
      const totalInCont = cont.territoryList.length;
      const contPct = ownInCont / totalInCont;

      if (ownInCont === totalInCont) {
        // We own the continent! Is this territory a border of the continent?
        const isContinentBorder = adj.some(a => C.TERRITORIES[a].continent !== contId && state.territories[a].owner !== player.id);
        if (isContinentBorder) {
          s += 35; // Heavily defend continent borders to preserve bonus!
        }
      } else {
        // We are trying to conquer this continent.
        // Does this territory border an enemy territory inside the SAME continent?
        const bordersEnemyInSameCont = adj.some(a => C.TERRITORIES[a].continent === contId && state.territories[a].owner !== player.id);
        if (bordersEnemyInSameCont) {
          s += contPct * 25; // Priority launches to finish the continent
          if (totalInCont - ownInCont <= 2) {
            s += 20; // Extra push if we are extremely close (1-2 territories left)
          }
        }
      }

      // Card Hunter / Elimination Priority
      for (const enemy of enemyNeighbors) {
        const opp = opponents.find(o => o.id === enemy.owner);
        if (opp && opp.bounty > 0) {
          s += opp.bounty;
        }
      }

      // Choke point bonus: if it borders multiple enemies
      s += enemyNeighbors.length * 2.5;

      score[id] = s - t.armies * 0.1;
    }

    const sortedBorders = owned.filter(t => score[t.id] > 0).sort((a, b) => score[b.id] - score[a.id]);
    const placements = {};
    let remaining = available;

    if (sortedBorders.length === 0) {
      if (owned.length > 0) {
        placements[owned[0].id] = remaining;
      }
      return { cardTrade, placements };
    }

    // Distribute reinforcements: First, ensure all threatened borders have enough defense
    while (remaining > 0) {
      let allocated = false;
      for (const t of sortedBorders) {
        if (remaining <= 0) break;
        const tId = t.id;
        const currentPlacements = placements[tId] || 0;
        const currentTotal = t.armies + currentPlacements;
        const adj = C.TERRITORIES[tId].adjacency;
        const enemyNeighbors = adj.filter(a => state.territories[a].owner !== player.id).map(a => state.territories[a]);
        const maxEnemy = enemyNeighbors.length ? Math.max(...enemyNeighbors.map(n => n.armies)) : 0;
        
        const targetDefense = maxEnemy + 2;
        if (currentTotal < targetDefense) {
          const diff = Math.min(remaining, targetDefense - currentTotal);
          placements[tId] = currentPlacements + diff;
          remaining -= diff;
          allocated = true;
        }
      }
      
      // If we met defense needs on all borders or have leftovers, stack the rest on the absolute highest scored territory
      if (!allocated && remaining > 0) {
        const bestId = sortedBorders[0].id;
        placements[bestId] = (placements[bestId] || 0) + remaining;
        remaining = 0;
      }
    }

    return { cardTrade, placements };
  }

  function heuristicAttackStep(player) {
    const state = S.get();
    const candidates = [];
    const owned = Object.entries(state.territories).filter(([id, t]) => t.owner === player.id && t.armies >= 2);
    for (const [fromId, from] of owned) {
      for (const toId of from.adjacency) {
        const to = state.territories[toId];
        if (to.owner === player.id) continue;
        const wp = R.winProbability(from.armies, to.armies);
        
        // Exclude low probability attacks to prevent AI from being suicidal
        if (wp < 0.45) continue;
        
        let score = wp * 2.0;

        // Continent completion & defense bonus
        const contId = C.TERRITORIES[toId].continent;
        const cont = C.CONTINENTS[contId];
        const ownInCont = cont.territoryList.filter(tid => state.territories[tid].owner === player.id).length;
        const totalInCont = cont.territoryList.length;
        
        if (ownInCont === totalInCont - 1) {
          score += 6.0; // Complete continent!
        } else if (ownInCont < totalInCont) {
          // Reclaim continent: if enemy holds this territory but we own the rest of the continent
          const enemyInCont = cont.territoryList.filter(tid => state.territories[tid].owner !== player.id);
          if (enemyInCont.length === 1 && enemyInCont[0] === toId) {
            score += 5.0; // Reclaim continent bonus!
          } else {
            score += (ownInCont / totalInCont) * 3.0; // Push to get more of this continent
          }
        }

        // Eliminating player / Card hunting bonus
        const targetOwner = state.players[to.owner];
        if (targetOwner && !targetOwner.eliminated) {
          const targetTerritories = Object.values(state.territories).filter(t => t.owner === to.owner);
          const cardsCount = targetOwner.cards.length;
          
          if (targetTerritories.length === 1) {
            score += 10.0 + cardsCount * 3.0; // Massively prioritize complete elimination for cards!
          } else if (targetTerritories.length <= 3) {
            score += 3.0 + (cardsCount * 1.5) / targetTerritories.length;
          }
        }

        // Penalty for risky attacks that aren't strategically critical
        const targetOwnerTerritories = Object.values(state.territories).filter(t => t.owner === to.owner).length;
        const isCritical = (ownInCont === totalInCont - 1) || (targetOwnerTerritories === 1);
        if (wp < 0.6 && !isCritical) {
          score -= 1.5;
        }

        if (from.armies > to.armies + (wp >= 0.7 ? 0 : 1)) {
          candidates.push({ fromId, toId, wp, score, attackerDice: Math.min(3, from.armies - 1) });
        }
      }
    }
    if (!candidates.length) return { action: 'stop' };
    candidates.sort((a, b) => b.score - a.score);
    const c = candidates[0];
    return { action: 'attack', from: c.fromId, to: c.toId, dice: c.attackerDice };
  }

  function heuristicFortify(player) {
    const state = S.get();
    const owned = Object.entries(state.territories).filter(([id, t]) => t.owner === player.id);
    
    // Identify safe interior territories (all neighbors are owned by the player) and have spare armies
    const safe = owned.filter(([id, t]) => t.adjacency.every(a => state.territories[a].owner === player.id) && t.armies > 1);
    
    // Identify border territories
    const borders = owned.filter(([id, t]) => t.adjacency.some(a => state.territories[a].owner !== player.id));
    
    if (!borders.length) return { from: null, to: null, count: 0 };

    // Calculate threat for all borders: max enemy armies adjacent - our armies
    const borderThreats = borders.map(([id, t]) => {
      const enemyArmies = t.adjacency.filter(a => state.territories[a].owner !== player.id).map(a => state.territories[a].armies);
      const maxEnemy = enemyArmies.length ? Math.max(...enemyArmies) : 0;
      return { id, t, threat: maxEnemy - t.armies, maxEnemy };
    });

    // Sort borders by threat descending to find the ones in greatest danger
    borderThreats.sort((a, b) => b.threat - a.threat);

    // 1. Try to fortify from safe interior territories to the most threatened borders
    for (const target of borderThreats) {
      let bestFromId = null;
      let maxSpare = 0;
      
      for (const [fromId, t] of safe) {
        const spare = t.armies - 1;
        if (spare > maxSpare) {
          const connected = R.getConnectedFriendly(fromId, player.id, state.territories);
          if (connected.has(target.id)) {
            maxSpare = spare;
            bestFromId = fromId;
          }
        }
      }
      if (bestFromId && maxSpare > 0) {
        return { from: bestFromId, to: target.id, count: maxSpare };
      }
    }

    // 2. If no safe interior moves, try to fortify from low-threat borders to high-threat borders
    // A border has surplus if threat is very negative (our armies exceed enemy max by at least 4)
    const surplusBorders = borderThreats.filter(b => b.threat <= -4 && b.t.armies > 2);
    const needyBorders = borderThreats.filter(b => b.threat >= 0);

    for (const target of needyBorders) {
      for (const source of surplusBorders) {
        const connected = R.getConnectedFriendly(source.id, player.id, state.territories);
        if (connected.has(target.id)) {
          // Leave behind maxEnemy + 2 armies (minimum 1)
          const keep = Math.max(1, source.maxEnemy + 2);
          const count = source.t.armies - keep;
          if (count > 0) {
            return { from: source.id, to: target.id, count };
          }
        }
      }
    }

    // 3. Fallback: just move any safe interior armies to any connected border
    for (const [fromId, t] of safe) {
      const spare = t.armies - 1;
      if (spare > 0) {
        const connected = R.getConnectedFriendly(fromId, player.id, state.territories);
        for (const borderId of connected) {
          const isBorder = state.territories[borderId].adjacency.some(a => state.territories[a].owner !== player.id);
          if (isBorder) {
            return { from: fromId, to: borderId, count: spare };
          }
        }
      }
    }

    return { from: null, to: null, count: 0 };
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
