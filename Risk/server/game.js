// game.js — A single multiplayer Risk game session.
// Owns one isolated engine (fresh RISK_STATE), the connected human sockets,
// the lobby, server-authoritative turn enforcement, heuristic AI turns,
// full-state broadcasts, and an inactivity auto-advance timer for humans.

const { createEngine } = require('./engine');

// AI display name pools (mirrors client main.js). No smack-talk / banter.
const AI_NAMES = {
  aggressive: ['Savage Sam', 'Ruthless Rex', 'Hank the Hammer', 'Aggro Andy'],
  defensive: ['Turtle Terry', 'Fortress Frank', 'Ironclad Ian', 'Bunker Ben'],
  opportunistic: ['Sly Cooper', 'Calculated Carl', 'Scavenger Sam', 'Sneaky Pete'],
  chaotic: ['Wild Willy', 'Mad Max', 'Trigger Tom', 'Loco Leo'],
};

// Per-step delays (ms) so human spectators can follow AI moves.
const DELAY = { claim: 450, place: 350, reinforce: 650, attack: 850, fortify: 500 };

// Human inactivity timeout before the server auto-advances their phase.
const HUMAN_TURN_TIMEOUT_MS = 120000;

class GameSession {
  constructor({ code, humans, ai, personalities }) {
    this.code = code;
    this.engine = createEngine();
    this.C = this.engine.RISK_CONFIG;
    this.S = this.engine.RISK_STATE;
    this.AI = this.engine.RISK_AI;
    this.R = this.engine.RISK_RULES;

    this.humans = humans;     // total human slots
    this.ai = ai;             // number of AI opponents
    this.personalities = (personalities && personalities.length)
      ? personalities.slice()
      : this.C.PERSONALITIES.slice();

    // Lobby state. humanSlots[i] = { name, socket, ready } or null (open).
    this.humanSlots = new Array(humans).fill(null);
    this.started = false;
    this.playerSocket = {};   // playerId -> ws  (humans only)
    this.socketPlayer = {};   // ws -> playerId
    this.reconnectTokens = {}; // slot -> token (for rejoining)
    this.turnTimer = null;
    this.tickScheduled = false;
  }

  // ---------- Lobby ----------
  isFull() {
    return this.humanSlots.every(Boolean);
  }

  humanRoster() {
    return this.humanSlots.map((s, i) => ({
      slot: i, name: s ? s.name : null, ready: s ? !!s.ready : false, isAI: false,
    }));
  }

  addPlayer(name, socket) {
    if (this.started) throw new Error('Game already started');
    const slot = this.humanSlots.findIndex(s => s === null);
    if (slot === -1) throw new Error('Game is full');
    this.humanSlots[slot] = { name: name || `Player ${slot + 1}`, socket, ready: false };
    this.socketPlayer[socketId(socket)] = slot;
    const token = Math.random().toString(36).slice(2);
    this.reconnectTokens[slot] = token;
    return { slot, token };
  }

  removePlayer(socket) {
    const sid = socketId(socket);
    const slot = this.socketPlayer[sid];
    if (slot === undefined) return;
    delete this.socketPlayer[sid];
    if (!this.started) {
      this.humanSlots[slot] = null;
      delete this.reconnectTokens[slot];
    } else {
      // Mid-game disconnect: leave the seat empty. Turn timer will auto-advance.
      const ws = this.playerSocket[slot];
      if (ws === socket) this.playerSocket[slot] = null;
    }
  }

  isEmpty() {
    if (!this.started) {
      return this.humanSlots.every(s => s === null);
    }
    return Object.values(this.playerSocket).every(ws => !ws || ws.readyState !== 1);
  }

  setReady(socket, ready) {
    const slot = this.socketPlayer[socketId(socket)];
    if (slot === undefined) throw new Error('Not in this game');
    if (this.humanSlots[slot]) this.humanSlots[slot].ready = ready;
  }

  canStart() {
    return !this.started && this.isFull() && this.humanSlots.every(s => s && s.ready);
  }

  // ---------- Start ----------
  start() {
    if (!this.canStart()) throw new Error('Cannot start yet (need all players ready)');
    const players = [];
    let colorIdx = 0;
    for (const slot of this.humanSlots) {
      players.push({ name: slot.name, color: colorIdx++, isHuman: true, personality: null });
    }
    const usedNames = new Set(players.map(p => p.name));
    for (let i = 0; i < this.ai; i++) {
      const pers = this.personalities[i % this.personalities.length];
      const pool = AI_NAMES[pers] || ['AI Bot'];
      let pName = pool[i % pool.length];
      let off = 1;
      while (usedNames.has(pName)) { pName = pool[(i + off) % pool.length]; off++; }
      usedNames.add(pName);
      players.push({ name: pName, color: colorIdx++, isHuman: false, personality: pers });
    }

    this.S.init({ players, gameId: this.code });
    this.started = true;
    this.humanSlots.forEach((h, idx) => {
      this.playerSocket[idx] = h ? h.socket : null;
    });
    this.broadcast({ t: 'started' });
    this.broadcastState();
    this.tick();
  }

  // ---------- Messaging ----------
  send(socket, msg) {
    if (socket && socket.readyState === 1) {
      socket.send(JSON.stringify(msg));
    }
  }

  broadcast(msg) {
    const data = JSON.stringify(msg);
    for (const id in this.playerSocket) {
      const ws = this.playerSocket[id];
      if (ws && ws.readyState === 1) ws.send(data);
    }
  }

  broadcastState() {
    const snap = this.S.snapshot();
    for (const id in this.playerSocket) {
      const ws = this.playerSocket[id];
      this.send(ws, { t: 'state', state: snap, yourPlayerId: parseInt(id, 10) });
    }
  }

  // ---------- Turn enforcement ----------
  currentSocket() {
    const s = this.S.get();
    if (!s) return null;
    return this.playerSocket[s.currentPlayer] || null;
  }

  assertYourTurn(socket) {
    const s = this.S.get();
    const slot = this.socketPlayer[socketId(socket)];
    if (slot === undefined) throw new Error('Not in this game');
    if (!this.started) throw new Error('Game not started');
    if (s.currentPlayer !== slot) throw new Error('Not your turn');
    return slot;
  }

  // Reset the inactivity timer whenever a human is expected to act.
  resetTurnTimer() {
    if (this.turnTimer) clearTimeout(this.turnTimer);
    const s = this.S.get();
    if (!s || s.phase === this.C.PHASES.GAME_OVER) return;
    const p = s.players[s.currentPlayer];
    if (!p || !p.isHuman) return;
    this.turnTimer = setTimeout(() => this.autoAdvanceHuman(), HUMAN_TURN_TIMEOUT_MS);
  }

  autoAdvanceHuman() {
    const s = this.S.get();
    if (!s || s.phase === this.C.PHASES.GAME_OVER) return;
    const p = s.players[s.currentPlayer];
    if (!p || !p.isHuman) return;
    try {
      const ph = s.phase;
      if (ph === this.C.PHASES.CLAIM) {
        const u = Object.values(s.territories).find(t => t.owner === -1);
        if (u) this.S.claimTerritory(u.id);
      } else if (ph === this.C.PHASES.PLACE_INITIAL || ph === this.C.PHASES.REINFORCE) {
        const owned = Object.values(s.territories).filter(t => t.owner === p.id);
        while ((s.players[p.id].pendingReinforcements || (s.placeInitialRemaining || {})[p.id]) && owned.length) {
          try { this.S.placeArmy(owned[Math.floor(Math.random() * owned.length)].id); } catch { break; }
        }
        if (s.phase === this.C.PHASES.REINFORCE) this.S.endReinforce();
      } else if (ph === this.C.PHASES.ATTACK) {
        this.S.endAttack();
      } else if (ph === this.C.PHASES.FORTIFY) {
        this.S.endFortify();
      }
    } catch (e) { /* ignore */ }
    this.broadcastState();
    this.tick();
  }

  // ---------- Main driver ----------
  // Called after any mutation. Schedules AI work or arms the human timer.
  tick() {
    if (this.tickScheduled) return;
    const s = this.S.get();
    if (!s || s.phase === this.C.PHASES.GAME_OVER) { this.broadcastState(); return; }
    const p = s.players[s.currentPlayer];
    if (p.isHuman) {
      this.broadcastState();
      this.resetTurnTimer();
      return;
    }
    // AI turn: schedule one step.
    this.tickScheduled = true;
    const delay = this.aiStepDelay(s.phase);
    setTimeout(() => { this.tickScheduled = false; this.aiStep(); }, delay);
  }

  aiStepDelay(phase) {
    const P = this.C.PHASES;
    if (phase === P.CLAIM) return DELAY.claim;
    if (phase === P.PLACE_INITIAL) return DELAY.place;
    if (phase === P.REINFORCE) return DELAY.reinforce;
    if (phase === P.ATTACK) return DELAY.attack;
    if (phase === P.FORTIFY) return DELAY.fortify;
    return 500;
  }

  aiStep() {
    const s = this.S.get();
    if (!s || s.phase === this.C.PHASES.GAME_OVER) { this.broadcastState(); return; }
    const p = s.players[s.currentPlayer];
    if (p.isHuman) { this.tick(); return; }
    try {
      const P = this.C.PHASES;
      if (s.phase === P.CLAIM) {
        this.AI.playClaim(p);
      } else if (s.phase === P.PLACE_INITIAL) {
        this.AI.playPlaceInitial(p);
      } else if (s.phase === P.REINFORCE) {
        this.aiReinforce(p);
      } else if (s.phase === P.ATTACK) {
        this.aiAttackOnce(p);
      } else if (s.phase === P.FORTIFY) {
        this.aiFortify(p);
      }
    } catch (e) {
      console.error(`[${this.code}] AI step error:`, e.message);
    }
    this.broadcastState();
    this.tick();
  }

  // ---------- AI phase implementations (heuristic only, no LLM) ----------
  aiReinforce(player) {
    const p = this.S.get().players[player.id];
    if ((p.pendingReinforcements || 0) <= 0) { this.S.endReinforce(); return; }
    const plan = this.AI.heuristicReinforce(p);
    if (plan.cardTrade && plan.cardTrade.length === 3) {
      try { this.S.tradeCards(plan.cardTrade); } catch (e) { /* ignore */ }
    }
    const placements = plan.placements || {};
    for (const tid in placements) {
      for (let i = 0; i < placements[tid]; i++) {
        try { this.S.placeArmy(tid); } catch (e) { break; }
      }
    }
    // Place any leftovers on a random owned territory.
    let cur = this.S.get().players[player.id];
    while ((cur.pendingReinforcements || 0) > 0) {
      const owned = Object.values(this.S.get().territories).filter(t => t.owner === player.id);
      if (!owned.length) break;
      try { this.S.placeArmy(owned[Math.floor(Math.random() * owned.length)].id); } catch { break; }
      cur = this.S.get().players[player.id];
    }
    this.S.endReinforce();
  }

  aiAttackOnce(player) {
    const decision = this.AI.heuristicAttackStep(player);
    if (!decision || decision.action === 'stop') { this.S.endAttack(); return; }
    const fromId = decision.from || decision.fromId;
    const toId = decision.to || decision.toId;
    try { this.S.attack(fromId, toId, decision.dice); } catch (e) { this.S.endAttack(); }
  }

  aiFortify(player) {
    const decision = this.AI.heuristicFortify(player);
    if (decision && decision.from && decision.to && decision.count > 0) {
      try { this.S.fortify(decision.from, decision.to, decision.count); } catch (e) { /* ignore */ }
    }
    this.S.endFortify();
  }

  // ---------- Human actions (validated) ----------
  applyAction(socket, msg) {
    const slot = this.assertYourTurn(socket);
    const s = this.S.get();
    const p = s.players[s.currentPlayer];
    let attackResult = null;

    try {
      switch (msg.t) {
        case 'claim':
          this.S.claimTerritory(msg.territoryId);
          break;
        case 'place':
          this.S.placeArmy(msg.territoryId);
          break;
        case 'endReinforce':
          this.S.endReinforce();
          break;
        case 'tradeCards':
          this.S.tradeCards(msg.cardIds);
          break;
        case 'attack': {
          const res = this.S.attack(msg.from, msg.to, msg.dice);
          attackResult = {
            aRolls: res.aRolls, dRolls: res.dRolls,
            attackerLosses: res.result.attackerLosses, defenderLosses: res.result.defenderLosses,
            conquered: res.conquered,
          };
          break;
        }
        case 'endAttack':
          this.S.endAttack();
          break;
        case 'fortify':
          if (msg.from && msg.to && msg.count > 0) this.S.fortify(msg.from, msg.to, msg.count);
          break;
        case 'endFortify':
          this.S.endFortify();
          break;
        case 'conquestMove':
          if (msg.from && msg.to && msg.count > 0) this.S.conquestMove(msg.from, msg.to, msg.count);
          break;
        case 'endTurn':
          this.S.endTurn();
          break;
        default:
          throw new Error('Unknown action ' + msg.t);
      }
    } catch (e) {
      this.send(socket, { t: 'error', message: e.message });
      return;
    }

    // If a human conquered, auto-move stands at the dice count (no extra-move slider in MVP).
    // Broadcast the new state to everyone, and a combat-result ack to the attacker.
    this.broadcastState();
    if (attackResult) {
      this.send(socket, { t: 'attackResult', ...attackResult });
    }
    this.tick();
  }
}

function socketId(socket) {
  // Use the ws object identity via a cached property.
  if (socket.__pid === undefined) socket.__pid = Math.random().toString(36).slice(2);
  return socket.__pid;
}

module.exports = { GameSession };
