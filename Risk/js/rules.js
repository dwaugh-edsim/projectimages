// rules.js — Pure Risk rules: reinforcement calc, combat, card trade, fortify, etc.
// All functions are pure: they take state and return new state or computed values.
window.RISK_RULES = (function () {
  const C = window.RISK_CONFIG;
  const U = window.RISK_UTILS;

  // ---------- Reinforcements ----------
  function calculateReinforcements(player, territories) {
    // Count territories owned by player
    const owned = Object.values(territories).filter(t => t.owner === player.id);
    const territoryBonus = Math.max(3, Math.floor(owned.length / 3));

    // Continent bonuses
    let continentBonus = 0;
    for (const contId in C.CONTINENTS) {
      const cont = C.CONTINENTS[contId];
      const ownsAll = cont.territoryList.every(tid => territories[tid] && territories[tid].owner === player.id);
      if (ownsAll) continentBonus += cont.bonus;
    }

    // Card trade-in values: caller adds these separately via getCardTradeBonus()
    return { territoryBonus, continentBonus, total: territoryBonus + continentBonus };
  }

  // ---------- Card Sets ----------
  // Find all valid trade-in sets in a hand.
  // A valid set is 3 cards of the same type, OR 1 of each (infantry, cavalry, artillery).
  // Wilds substitute for any type. 3 wilds also valid.
  function findValidCardSets(hand) {
    const sets = [];
    // 1-of-each combinations
    const hasInf = hand.find(c => c.type === 'infantry');
    const hasCav = hand.find(c => c.type === 'cavalry');
    const hasArt = hand.find(c => c.type === 'artillery');
    if (hasInf && hasCav && hasArt) {
      sets.push([hasInf.id, hasCav.id, hasArt.id]);
    }
    // 3-of-a-kind
    const byType = { infantry: [], cavalry: [], artillery: [] };
    for (const c of hand) {
      if (c.type !== 'wild' && byType[c.type]) byType[c.type].push(c);
    }
    for (const t of Object.keys(byType)) {
      const arr = byType[t];
      // need 3 from same type (wilds can fill)
      const wilds = hand.filter(c => c.type === 'wild');
      const need = 3;
      // enumerate combinations
      const combos = combinationsWithWilds(arr, wilds, need);
      for (const combo of combos) sets.push(combo);
    }
    return sets;
  }

  function combinationsWithWilds(typedCards, wilds, need) {
    const out = [];
    const n = typedCards.length;
    for (let mask = 0; mask < (1 << n); mask++) {
      const picked = [];
      for (let i = 0; i < n; i++) if (mask & (1 << i)) picked.push(typedCards[i]);
      if (picked.length > need) continue;
      const wildsNeeded = need - picked.length;
      if (wildsNeeded < 0 || wildsNeeded > wilds.length) continue;
      const combo = picked.map(c => c.id);
      for (let i = 0; i < wildsNeeded; i++) combo.push(wilds[i].id);
      if (combo.length === need) out.push(combo);
    }
    return out;
  }

  // Trade-in value for the Nth set traded this game globally.
  function tradeSetValue(setsTraded) {
    const table = C.CARD_TRADE_VALUES;
    if (setsTraded < table.length) return table[setsTraded];
    return table[table.length - 1] + (setsTraded - table.length + 1) * 5;
  }

  // Compute the territory bonus for a traded set: +2 armies on the traded
  // territory card if you own it (only one such card can be in the set).
  function getCardTerritoryBonus(cardIds, hand, territories, playerId) {
    let bonus = 0;
    for (const id of cardIds) {
      const card = hand.find(c => c.id === id);
      if (card && card.territoryId) {
        const t = territories[card.territoryId];
        if (t && t.owner === playerId) bonus += 2;
      }
    }
    return bonus;
  }

  function mustTradeCards(hand) {
    return hand.length >= 5;
  }

  // ---------- Combat ----------
  // Roll N dice (1-6 each).
  function rollDice(count) {
    const rolls = [];
    for (let i = 0; i < count; i++) rolls.push(U.randomInt(1, 6));
    return rolls.sort((a, b) => b - a);
  }

  // Resolve a battle given attacker dice and defender dice.
  // Ties go to the defender.
  function resolveCombat(attackerRolls, defenderRolls) {
    let attackerLosses = 0;
    let defenderLosses = 0;
    const pairs = Math.min(attackerRolls.length, defenderRolls.length);
    for (let i = 0; i < pairs; i++) {
      if (attackerRolls[i] > defenderRolls[i]) defenderLosses++;
      else attackerLosses++; // ties go to defender
    }
    return { attackerLosses, defenderLosses };
  }

  // Determine dice counts for an attack.
  function pickDiceCounts(attackerArmies, defenderArmies) {
    let att = 1;
    if (attackerArmies >= 4) att = 3;
    else if (attackerArmies >= 3) att = 2;
    let def = 1;
    if (defenderArmies >= 2) def = 2;
    return { attackerDice: att, defenderDice: def };
  }

  // Full battle: pick dice, roll, resolve. Returns structured result.
  function rollBattle(attackerArmies, defenderArmies) {
    const { attackerDice, defenderDice } = pickDiceCounts(attackerArmies, defenderArmies);
    const aRolls = rollDice(attackerDice);
    const dRolls = rollDice(defenderDice);
    const result = resolveCombat(aRolls, dRolls);
    return {
      attackerRolls: aRolls,
      defenderRolls: dRolls,
      attackerDice,
      defenderDice,
      attackerLosses: result.attackerLosses,
      defenderLosses: result.defenderLosses,
    };
  }

  // ---------- Attack validity ----------
  // A territory can attack if it has >= 2 armies and at least one adjacent enemy.
  function canAttack(territoryId, territories) {
    const t = territories[territoryId];
    if (!t || t.armies < 2) return false;
    return getAttackableTargets(territoryId, territories).length > 0;
  }

  function getAttackableTargets(territoryId, territories) {
    const t = territories[territoryId];
    if (!t) return [];
    return t.adjacency.filter(aid => {
      const a = territories[aid];
      return a && a.owner !== t.owner;
    });
  }

  // ---------- Fortify connectivity ----------
  // BFS from `from` over friendly territories to find which territories
  // can be a fortify target. Returns the connected friendly set.
  function getConnectedFriendly(fromId, playerId, territories) {
    const start = territories[fromId];
    if (!start || start.owner !== playerId) return new Set();
    const connected = new Set([fromId]);
    const queue = [fromId];
    while (queue.length) {
      const cur = queue.shift();
      for (const nb of territories[cur].adjacency) {
        if (connected.has(nb)) continue;
        if (territories[nb].owner === playerId) {
          connected.add(nb);
          queue.push(nb);
        }
      }
    }
    // Exclude the source (you fortify from it, not to it)
    connected.delete(fromId);
    return connected;
  }

  // ---------- Ownership helpers ----------
  function countTerritories(playerId, territories) {
    return Object.values(territories).filter(t => t.owner === playerId).length;
  }

  function countArmies(playerId, territories) {
    return Object.values(territories)
      .filter(t => t.owner === playerId)
      .reduce((sum, t) => sum + t.armies, 0);
  }

  function ownsContinent(playerId, contId, territories) {
    const cont = C.CONTINENTS[contId];
    return cont.territoryList.every(tid => territories[tid] && territories[tid].owner === playerId);
  }

  function getOwnedContinentBonuses(playerId, territories) {
    const out = [];
    for (const contId in C.CONTINENTS) {
      if (ownsContinent(playerId, contId, territories)) {
        out.push({ contId, bonus: C.CONTINENTS[contId].bonus });
      }
    }
    return out;
  }

  // Win probability estimate: probability attacker wins given dice
  // (rough Monte Carlo lookup or analytical). For UI hints.
  // We use a simple analytical approximation:
  //   - Per die pair, P(attacker wins) ≈ (15/36), P(defender wins) ≈ (21/36).
  //   - Then combine across pairs.
  function winProbability(attackerArmies, defenderArmies) {
    const { attackerDice, defenderDice } = pickDiceCounts(attackerArmies, defenderArmies);
    const trials = 5000;
    let wins = 0;
    for (let i = 0; i < trials; i++) {
      let a = attackerArmies, d = defenderArmies;
      while (a > 1 && d > 0) {
        const { attackerDice: ad, defenderDice: dd } = pickDiceCounts(a, d);
        const aR = rollDice(ad);
        const dR = rollDice(dd);
        const pairs = Math.min(ad, dd);
        let aLoss = 0, dLoss = 0;
        for (let p = 0; p < pairs; p++) {
          if (aR[p] > dR[p]) dLoss++;
          else aLoss++;
        }
        a -= aLoss; d -= dLoss;
      }
      if (d === 0) wins++;
    }
    return wins / trials;
  }

  return {
    calculateReinforcements,
    findValidCardSets,
    tradeSetValue,
    getCardTerritoryBonus,
    mustTradeCards,
    rollDice,
    resolveCombat,
    pickDiceCounts,
    rollBattle,
    canAttack,
    getAttackableTargets,
    getConnectedFriendly,
    countTerritories,
    countArmies,
    ownsContinent,
    getOwnedContinentBonuses,
    winProbability,
  };
})();
