# Risk Multiplayer — Architecture & Decisions Overview

This document explains how single-player Risk was extended into a real-time
multiplayer game (humans on separate computers + a configurable number of AI
opponents), what was built, and **why** each decision was made.

---

## 1. The starting point

The original game is a **pure browser app**:

- Vanilla JS, no build step. Each module is an IIFE that assigns to a global
  (`window.RISK_CONFIG`, `window.RISK_RULES`, `window.RISK_STATE`, …).
- A Google Apps Script (GAS) backend only handles **accounts, save/load, and an
  LLM proxy** for AI opponents. There is **no game state** on the server.
- All rules, combat, the reactive state store, and the AI (LLM + heuristic
  fallback) live in the browser.

Key implication: the rules engine (`rules.js`), the card deck (`cards.js`), the
central state machine (`gameState.js`) and the AI heuristics (`ai.js`) are
**already written as mostly-pure functions**. That fact drives the whole design.

---

## 2. Target

- **2–3 humans on separate computers** + **2–3 AI opponents** (both counts are
  variable; total 2–6 players).
- **No smack-talk / banter** in multiplayer.
- Host on the **Render.com free tier** as a Node.js web service (per the user's
  chosen deployment approach).

---

## 3. High-level architecture

```
 ┌──────────────────────── Browser (each player) ────────────────────────┐
 │  index.html + existing UI/map/dice rendering                          │
 │  RISK_STATE  =  read-only MIRROR (re-hydrated from server snapshots)  │
 │  multiplayer.js  →  WebSocket client + lobby + network hooks          │
 └───────────────────────────────▲───────────────────────────────────────┘
                                 │  WebSocket (wss://…/ws)
                                 │  JSON messages: actions up, full state down
 ┌───────────────────────────────┴───────────────────────────────────────┐
 │                    Node.js server (server/)                           │
 │  index.js   HTTP static (serves the client) + WebSocket server        │
 │  game.js    GameSession: lobby, turn enforcement, AI driver, timer    │
 │  engine.js  loads the SAME browser modules via a vm `window` shim     │
 └───────────────────────────────────────────────────────────────────────┘
```

The single most important property: **the server is authoritative**. Clients
never mutate game state directly — they send *action requests*, the server
validates and applies them, then broadcasts the new full state to everyone.

---

## 4. The central decision: reuse the browser modules on the server

### What
`server/engine.js` evaluates the **unmodified** client files
(`config.js`, `utils.js`, `rules.js`, `cards.js`, `gameState.js`, `ai.js`)
inside an isolated Node `vm` context that provides a fake `window` object:

```js
const sandbox = { window: {}, crypto, TextEncoder, Math, Date, Set, … };
vm.createContext(sandbox);
for (const f of MODULE_FILES) vm.runInContext(read(f), sandbox);
return sandbox.window;   // { RISK_CONFIG, RISK_RULES, RISK_STATE, RISK_AI, … }
```

### Why
- **Zero duplication of game logic.** The 42-territory board, adjacency graph,
  combat resolution, reinforcement math, card trade-ins, and AI heuristics are
  defined once and shared by both single-player and multiplayer. A rule fix or
  board edit in `config.js`/`rules.js` automatically applies to both modes.
- **The code was already shaped for it.** Because every module is an IIFE that
  depends only on `window.RISK_*`, they can be loaded in any context that
  supplies `window` — including Node. The state module's singleton pattern even
  gives us free per-game isolation (see below).
- **Avoids a risky port.** Rewriting rules in a second language/format would be
  where subtle "multiplayer plays differently" bugs are born.

### Per-game isolation
`RISK_STATE` holds its state in a module-level closure, so a single loaded copy
is one game. `createEngine()` therefore returns a **fresh** context per game, so
concurrent games never share state. Each `GameSession` owns its own engine.

---

## 5. Server design (`server/`)

### `engine.js`
The `vm` loader described above. Pure plumbing, no game logic.

### `game.js` — `GameSession`
One per room. Responsibilities:

- **Lobby:** human slots (2–6), ready flags, AI count + personalities, a 4-char
  room code. `canStart()` requires all human slots filled and ready.
- **Start:** builds the player list (humans first, then AI with personality
  names/colors), calls `RISK_STATE.init(...)`, maps each human slot to its
  WebSocket, and kicks off the turn driver.
- **Authoritative turn enforcement:** `assertYourTurn(socket)` checks that the
  acting socket owns `state.currentPlayer`. All phase rules are enforced by
  `RISK_STATE`'s own functions (they throw on illegal moves); the server
  catches and returns the error to that client only.
- **AI driver (`tick` / `aiStep`):** a cooperative loop. `tick()` looks at the
  current player/phase: if it's a human, it broadcasts state and arms the
  inactivity timer; if it's an AI, it schedules one `aiStep()` after a short
  delay. `aiStep()` performs **one logical action** (one claim, one placement
  batch, one battle, one fortify), broadcasts, and re-ticks. The delays make AI
  moves watchable for the humans (≈450–850 ms per step).
- **Heuristic-only AI:** the server deliberately uses the *heuristic* AI
  (`heuristicReinforce`, `heuristicAttackStep`, `heuristicFortify`,
  `playClaim`, `playPlaceInitial`) and **not** the LLM path. Reasons:
  deterministic, instant, no API key/secret on the server, no cost, and no
  latency variance between turns. (The LLM functions reference `RISK_GAS`,
  which is simply absent on the server; the heuristics never touch it.)
- **Inactivity timer:** if a human doesn't act within 120 s, the server
  auto-advances their phase (auto-claim/place, then skip attack/fortify) so a
  stalled or disconnected player can't freeze the game. This is the MVP
  replacement for "AI takes over a disconnected player".
- **Broadcasting:** after every mutation the server sends a full
  `{ t:'state', state, yourPlayerId }` snapshot to every connected human. Full
  snapshots (rather than diffs) keep the client trivially correct at the cost of
  a bit of bandwidth — an easy trade for a turn-based game.

### `index.js`
- Serves the **static client** (the whole `Risk/` folder) over HTTP, so the
  single Render web service is both game server *and* website. The client's
  default WebSocket URL is derived from `location.host`, so on Render no
  configuration is needed (`wss://<app>.onrender.com/ws`).
- Runs a `ws` WebSocketServer on the same port at path `/ws`.
- Routes messages: lobby commands (`create`/`join`/`ready`/`start`) vs in-game
  actions (`claim`/`place`/`attack`/…). Keeps a `games` registry keyed by room
  code and a per-socket → game map; cleans up on disconnect.

### `package.json`
`start: node index.js`, `engines.node >= 18`, single dependency `ws`. On Render
you point the Web Service at the `server/` folder (root directory) and it runs
`npm install && npm start`.

---

## 6. Client design (`js/multiplayer.js` + small edits)

The guiding idea: **don't rewrite the UI — make the existing UI network-aware.**

### The local state becomes a mirror
In multiplayer the client's `RISK_STATE` is **read-only**. On every server
snapshot it calls `RISK_STATE.hydrate(snapshot)`, which (via the existing
`'init'` event) triggers the normal `renderAll()` path. So all the existing
map/scoreboard/log/cards/victory rendering works unchanged.

### Routing mutations to the network
A handful of UI spots called `RISK_STATE` directly to mutate. They now check a
`window.RISK_NET` shim that is only set in multiplayer:

- `onMapClick` (claim / place / reinforce) → `RISK_NET.claim/placeArmy`
- fortify slider confirm → `RISK_NET.fortify`
- The dice modal's roll already used a hook (`onAttack`); in multiplayer that
  hook is replaced with one that sends `{t:'attack'}` and returns a Promise
  that resolves when the server's `attackResult` ack arrives — so the existing
  dice animation plays the **actual** server-resolved dice.

All the phase-end buttons (`End Reinforce/Attack/Fortify/Turn`, `Trade Set`)
already went through `UI` hooks, so `multiplayer.js` simply overrides those
hooks with network senders in `enterGame()`. GAS-only controls (Save, Settings,
the LLM model picker) are hidden, and Quit reloads to the menu.

### Disabling the local AI loop
`main.js`'s `runLoop()` (which runs AI locally) and banter init are guarded by
`window.RISK_MULTIPLAYER_ACTIVE`, so the server is the sole turn authority and
no smack-talk loads.

### Lobby
Built dynamically by `multiplayer.js` (Create/Join tabs, name, server URL,
humans/AI counts, personality checkboxes, ready + start). A "Play Multiplayer"
button was added to the existing welcome modal, so single-player is untouched.

---

## 7. Decisions and their rationale (summary)

| Decision | Why |
|---|---|
| **Server-authoritative, full-state snapshots** | Simplest correctness model for a turn-based game; clients can't desync or cheat. Bandwidth is negligible. |
| **Reuse browser modules via `vm` shim** | One source of truth for rules/board/AI; no port; single-player keeps working. |
| **Fresh engine context per game** | Gives free per-game isolation from the state module's singleton design. |
| **Heuristic AI only on the server** | Deterministic, free, instant, no secrets/keys, no latency spikes. |
| **WebSocket (not HTTP polling, not GAS)** | GAS can't do push/WebSockets (6-min timeout, request/response only). Polling is impractical for live turns. `ws` on Render is the minimal real-time option. |
| **One Render web service = static host + WS server** | Single deploy, single URL, zero client config. |
| **No smack-talk in multiplayer** | Banter module simply isn't initialized in MP mode (per requirement). |
| **Inactivity auto-advance (120 s)** | Robustness: a disconnected/AFK human can't lock the game. (True "AI takeover" is a documented future enhancement.) |
| **MVP: auto-move on conquest = dice count (no extra-move slider)** | Keeps the protocol simple; players compensate via Fortify. Noted as a future enhancement. |
| **In-memory game store** | Free tier has no DB; matches the "ephemeral games" tradeoff. A restart ends active games. |

---

## 8. Bug fixed along the way

`ai.js` `heuristicReinforce` had a latent bug: it built `owned` as an array of
**objects** but iterated it with `for (const [id, t] of owned)` (expecting
`[id, t]` pairs), throwing *"… is not iterable"*. It was never hit in
single-player because the LLM path is used there. Multiplayer relies on the
heuristic AI, so this was fixed (`for (const t of owned)` + `const id = t.id`).
The fix also improves single-player's heuristic fallback.

---

## 9. File map

```
Risk/
├── index.html              (+) Multiplayer button, multiplayer.js/css links
├── css/multiplayer.css     (new) lobby styles
├── js/
│   ├── multiplayer.js      (new) WS client, lobby, network hooks
│   ├── ai.js               (fix) heuristicReinforce iteration bug
│   ├── main.js             (edit) multiplayer boot, guard runLoop + banter
│   └── ui.js               (edit) route mutations via RISK_NET; "(you)" label
└── server/                 (new) Node multiplayer server
    ├── engine.js           vm shim that loads the shared browser modules
    ├── game.js             GameSession: lobby, turns, AI driver, timer, broadcast
    ├── index.js            HTTP static + WebSocket server + message routing
    ├── package.json        start script, ws dependency
    └── .gitignore
```

---

## 10. Verification done

- **Engine integration:** a headless test drives a full 4-seat game
  (2 humans auto-played + 2 AI) through claim → initial placement (all 42
  territories distributed) → reinforce/attack/fortify cycling, with combat
  changing territory counts and players converging toward elimination — **zero
  runtime errors** after the heuristic fix.
- **Syntax:** all new/edited JS files pass `node --check`.
- **Server boot:** the server starts, logs its listen port, and serves
  `index.html`, `multiplayer.js`, and the assets over HTTP (confirmed the
  multiplayer wiring is present in the served page).

---

## 11. Known limitations / future enhancements

- **Ephemeral state:** a server restart drops in-progress games (free-tier
  tradeoff). Persisting snapshots (e.g., to Render Disk / a tiny DB) would add
  resume support.
- **Conquest extra-move slider** is not offered in MP (auto-move = dice count).
- **Reconnection** by player ID (rejoin the same seat after a refresh) is not
  yet implemented; a refresh currently returns to the menu.
- **Spectating** disconnected seats / replaying AI for them is a natural next
  step beyond the current inactivity auto-advance.
- **Render cold starts** (~15 min idle) will drop the WebSocket; a client
  reconnect prompt would smooth this over.
```
