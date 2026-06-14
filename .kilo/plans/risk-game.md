# Single-Player Risk Game — Implementation Plan

## Summary

Build a browser-based single-player Risk board game where a human player competes against 2–5 AI opponents. The game uses the original 1959 Risk rules with all 42 territories, 6 continents, dice combat, card trading, and full turn phases (reinforce → attack → fortify).

A **Google Apps Script (GAS) Web App** acts as a thin backend: it stores the user's OpenRouter API key in `PropertiesService` and proxies LLM calls so the key **never enters the GitHub repo or the browser**. The GAS also hosts a simple cloud-save layer (user accounts → game state) so a player can resume on a different machine or day.

A hand-crafted SVG world map provides the interactive board. Vanilla HTML/CSS/JavaScript on the client with no build step — `index.html` runs from `file://` or any static host.

A **heuristic fallback AI** plays any opponent whose key is missing or whose API call fails.

---

## Key Decisions (Confirmed)

- **LLM Provider**: OpenRouter, accessed **only through a GAS proxy** — the key lives in GAS `PropertiesService` keyed by user account. The browser never sees the raw key.
- **Model dropdown** in setup (3 options):
  1. `openrouter/free` (default, auto-routed free model)
  2. `inclusionai/ling-2.6-flash`
  3. `deepseek/deepseek-v4-flash`
- **Opponents**: Player chooses 2–5 AI opponents at setup.
- **AI personalities**: Each opponent randomly assigned one of {Aggressive, Defensive, Opportunistic, Chaotic}.
- **No animations on AI turns** — resolve quickly with log entries; brisk pace.
- **Build scope**: Core v1 — full rules, hand-crafted SVG map, clean dark UI, GAS proxy + cloud save.
- **Setup flow**: **Original turn-based claiming** — players alternate placing 1 army on an unowned territory until all 42 are owned, then alternate placing remaining armies on their own territories.
- **Map**: Hand-crafted 42 SVG paths matching the classic Risk board layout.
- **Accounts & saves**: GAS holds `{ username, passwordHash, games[] }`. Passwords hashed client-side with PBKDF2 (Web Crypto) before sending — GAS never stores plaintext. Multiple in-flight and completed games per user.

---

## Architecture Overview

```
┌─────────────────────┐       JSON over HTTPS        ┌──────────────────────┐
│  Browser (static)   │ ───────────────────────────▶ │  Google Apps Script  │
│  - index.html       │  POST /exec  {action,...}    │  Web App (Code.gs)   │
│  - js/*  css/*      │ ◀─────────────────────────── │                      │
│  - assets/map.svg   │                              │  • OPENROUTER_KEY    │
│                     │                              │  • User accounts     │
│  Game logic runs    │                              │  • Saved games       │
│  entirely client-   │                              │  • LLM proxy         │
│  side. Server is    │                              │                      │
│  just key storage,  │                              │  Forwards LLM calls  │
│  accounts, saves,   │                              │  to OpenRouter with  │
│  and LLM relay.     │                              │  stored key.         │
└─────────────────────┘                              └──────────────────────┘
```

**Why GAS?** Free, serverless, the user already mentioned it, and `PropertiesService` keeps the key out of GitHub. No hosting, no domain, no CORS gymnastics — GAS Web Apps accept JSON POSTs from any origin when configured to do so.

---

## Project Structure

```
Z:\simroom\Github Repos\projectimages\Risk\
├── index.html
├── css/
│   ├── index.css        # design tokens, layout
│   ├── map.css          # map interactions
│   ├── ui.css           # panels, modals, cards
│   └── animations.css   # micro-animations
├── js/
│   ├── main.js          # bootstrap, game loop
│   ├── config.js        # 42 territories, adjacency, continents
│   ├── gameState.js     # state + event emitter
│   ├── rules.js         # reinforce/combat/cards/fortify
│   ├── map.js           # SVG render & interaction
│   ├── ui.js            # panels, modals, log
│   ├── dice.js          # dice rolls + animation
│   ├── cards.js         # deck, trade-in sets
│   ├── ai.js            # OpenRouter-via-proxy adapter + heuristic
│   ├── account.js       # PBKDF2 hash, login/signup, save/load
│   ├── gasApi.js        # thin client for /exec endpoint
│   └── utils.js         # shuffle, bfs, delays
├── assets/
│   └── map.svg          # 42 territory paths
├── gas/                 # Google Apps Script source (deployed separately)
│   ├── Code.gs          # entry: doPost(e) routes actions
│   ├── Auth.gs          # signup/login/verify
│   ├── Saves.gs         # listGame/loadGame/saveGame/deleteGame
│   ├── LLM.gs           # openRouterChat(system,user) using OPENROUTER_KEY
│   └── appsscript.json  # manifest
├── images/
│   └── riskmap-1.png    # reference image
└── README.md            # deploy + play instructions
```

---

## Component Plan

### 1. `config.js` — Board Data
- 42 territories with `id`, `name`, `continent`, `cardType`, `adjacency[]`, `cx/cy` for label.
- 6 continents: N.America (9/5), S.America (4/2), Europe (7/5), Africa (6/3), Asia (12/7), Australia (4/2).
- Full adjacency including bridges: Alaska↔Kamchatka, Greenland↔Iceland, Brazil↔N.Africa, W.Europe↔N.Africa, etc.
- Starting armies: `{2:40, 3:35, 4:30, 5:25, 6:20}`.
- Card escalation: `[4,6,8,10,12,15] + 5 thereafter`.
- 6 player colors.

### 2. `gameState.js` — Central State
- Reactive event emitter: `on(event, fn)`, `emit(event, data)`.
- State shape: `phase` (`'claim'|'placeInitial'|'reinforce'|'attack'|'fortify'|'gameOver'`), `currentPlayer`, `players[]`, `territories{id:{owner,armies}}`, `cardDeck`, `discardPile`, `setsTraded`, `turnConquered`, `turnNumber`, `log[]`, `meta:{gameId, createdAt, lastSavedAt, playerUserId}`.
- Mutation methods: `placeArmy`, `attack`, `conquer`, `fortify`, `tradeCards`, `endPhase`, `endTurn`.
- `serialize()` / `hydrate(snapshot)` for save/load.

### 3. `rules.js` — Pure Rules
- `calculateReinforcements(player, territories)` — `floor(territories/3)` min 3 + continent bonuses + card bonus.
- `getValidCardSets(hand)` — 3-of-a-kind or 1-of-each; wilds substitute.
- `mustTradeCards(hand)` — true if ≥5.
- `resolveCombat(attackerRolls, defenderRolls)` — sort desc, compare pairs, ties to defender → `{attackerLosses, defenderLosses}`.
- `getAttackableTargets(territoryId)` — adjacent enemies if source has ≥2 armies.
- `getConnectedTerritories(territoryId, playerId)` — BFS over friendly chain.
- `checkElimination` / `checkVictory`.

### 4. `dice.js`
- `rollDice(count)` → array of 1–6.
- `rollBattle(attackerArmies, defenderArmies)` — picks dice counts (up to 3 vs 2) and resolves.
- CSS 3D dice animation triggered by result.

### 5. `cards.js`
- 44-card deck: 14 of each symbol + 2 wilds, shuffled.
- `findValidSets(hand)`, `tradeSetValue(setsTraded)`.
- UI: card fan in side panel, click to select (3 cards), "Trade" button.

### 6. `assets/map.svg`
- 42 `<path>` elements grouped by continent.
- Each path: `data-territory="alaska"` etc.
- Continent base colors: yellow NA, red SA, brown Africa, blue Europe, green Asia, purple Australia.
- Cross-ocean connectors as faint lines.
- Hidden `<text>`/positioned badges for army counts.

### 7. `map.js`
- Inject SVG into DOM.
- Color each territory by owner (mix continent color with player color 60/40).
- Army badge: circular div positioned at territory's `cx/cy`.
- Phase-aware click handler:
  - **Claim / PlaceInitial**: click unowned (claim) or own (placeInitial) territory → place 1 army.
  - **Reinforce**: click friendly territory → place 1 army.
  - **Attack**: click friendly with ≥2 → highlight adjacent enemies; click enemy → open dice modal.
  - **Fortify**: click source → highlight connected friendlies; click target → open slider.

### 8. `index.html` + CSS files
- Layout: top bar (turn/phase) / side panel (scoreboard, cards, log) / main map / bottom action bar.
- Dark mode with gold accents. Fonts: Cinzel (headings) + Inter (body) from Google Fonts.
- Glass-morphism panels with `backdrop-filter: blur`.
- Modals: **Welcome/Login**, **New Game Setup**, **Load Game**, **Card Trade**, **Dice**, **Army Slider**, **Victory**.

### 9. `ui.js`
- Welcome screen: Login / Create Account / Play as Guest.
- Setup screen (after login): opponents count, model dropdown, AI personality mix toggle, "Start".
- Phase indicator (3 dots: Reinforce ● Attack ○ Fortify).
- Action buttons: End Reinforce, End Attack (skip), End Fortify, End Turn.
- Auto-save indicator + manual "Save & Quit" button.
- Dice modal with animated roll + result.
- Card trade modal.
- Army count slider (post-conquest / fortify / initial placement batch).
- Event log with color-coded entries (combat=red, reinforce=blue, victory=gold).
- Victory / defeat screen with "Save Final State" + "New Game".

### 10. `ai.js` — OpenRouter-via-Proxy + Heuristic Fallback
- `LLMAdapter` class:
  - `constructor({proxyUrl, token, model, accountId})`
  - `complete(systemPrompt, userPrompt)` → POSTs to `gasApi.llmChat({system,user,model})`; the GAS proxy adds the OpenRouter key server-side and returns the assistant text.
  - Retry once on network/5xx; fall back to heuristic on any error.
- Board-state serializer → compact text (~600 tokens): ownership, army counts, continent progress, hand size, threats.
- Personality prefix: Aggressive / Defensive / Opportunistic / Chaotic.
- 3 decision calls per turn:
  1. **Reinforce**: returns `{ cardTrade: [3 cardIds] | null, placements: {territoryId: count} }`.
  2. **Attack loop**: returns `{ action: "attack"|"stop", from, to, dice }` until stop.
  3. **Fortify**: returns `{ from, to, count } | null`.
- `parseJSON` tolerates markdown code fences and stray prose.
- **Heuristic fallback** (proxy unreachable / model error):
  - Reinforce: own borders + near-complete continents; auto-trade at 5+ cards picking the highest-value set.
  - Attack: attack while win probability ≥55% AND attacker has ≥2 surplus; stop otherwise.
  - Fortify: move from interior to most-threatened border.

### 11. `account.js` — Client Auth
- `hashPassword(password, salt)` — PBKDF2-SHA256, 200k iterations, via `crypto.subtle`. Returns hex string.
- `signup({proxyUrl, username, password})` → server returns `{userId, sessionToken}`.
- `login({proxyUrl, username, password})` → server verifies hash, returns session token.
- `resumeSession()` — read `localStorage.risk_session`, validate with `whoami`, refresh if expired.
- Guest mode: locally generates a `guest_<uuid>` account via `signup` so saves work cross-device too.

### 12. `gasApi.js` — Thin GAS Client
- `call(action, payload, sessionToken)` — POSTs JSON `{action, payload, sessionToken}` to the configured Web App URL.
- Wraps all server actions: `signup`, `login`, `whoami`, `saveGame`, `listGames`, `loadGame`, `deleteGame`, `llmChat`.
- Returns `{ok:true, data}` or throws on `{ok:false, error}`.
- Surfaces friendly errors (network, 401, rate limit).

### 13. `main.js` — Game Loop & Orchestration
- Boot: show welcome → login → setup → init state.
- **Claiming phase**: each player in turn order picks one unowned territory → 1 army. AI players auto-pick (e.g. random or spread evenly).
- **Initial-placement phase**: each player in turn order places 1 army on their own territory until they've placed all starting armies.
- **Play turn** per player:
  - **Human**: hand off to UI; on End Turn → save → next.
  - **AI**: "Thinking…" overlay → reinforce → animate → attack loop (animate each) → fortify → save → short delay (800ms) → next.
- **Auto-save**: every state mutation debounced 2s → `gasApi.saveGame(snapshot)`. Also save on `End Turn`, on tab close (`beforeunload`), and on `Save & Quit`.
- **Resume**: from welcome screen, "Load Game" lists user's games; pick one → `loadGame` → `gameState.hydrate(snapshot)` → resume at current player + phase.
- Victory check after each turn.

### 14. `utils.js`
- `shuffle` (Fisher-Yates), `randomInt`, `delay(ms)`, `deepClone`, `bfs`, `groupBy`, `debounce`.

---

## Google Apps Script Backend (`gas/`)

### `Code.gs` — Router
```
function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const {action, payload, sessionToken} = body;
  const session = verifySession(sessionToken);  // attaches userId if valid
  switch(action) {
    case 'signup':     return Auth.signup(payload);
    case 'login':      return Auth.login(payload);
    case 'whoami':     return {ok:true, data: session};
    case 'saveGame':   return Saves.saveGame(session, payload);
    case 'listGames':  return Saves.listGames(session);
    case 'loadGame':   return Saves.loadGame(session, payload);
    case 'deleteGame': return Saves.deleteGame(session, payload);
    case 'llmChat':    return LLM.openRouterChat(session, payload);
    default: return {ok:false, error:'unknown action'};
  }
}
```

### `Auth.gs`
- `signup({username, passwordHash, salt})`:
  - Validate username (3–24 chars, unique), reject if taken.
  - Store under `PropertiesService`: key `user:<username>` → JSON `{userId, salt, passwordHash, createdAt}`.
  - Issue `sessionToken` (random 32-byte hex), store `session:<token>` → `{userId, username, issuedAt}` with 30-day expiry.
- `login({username, passwordHash})`:
  - Look up user, compare hashes constant-time.
  - Issue session token.
- `verifySession(token)` → returns `{userId, username}` or `null`.

### `Saves.gs`
- Storage: per user, key `games:<userId>` → array of game snapshots. Each snapshot = the full `gameState.serialize()` JSON.
- `saveGame(session, {gameId, snapshot, isFinal})` → upsert; if `isFinal`, mark `status:'finished'`.
- `listGames(session)` → return array `{gameId, createdAt, lastSavedAt, status, currentPlayer, turnNumber, players:[{name,color,eliminated,territoryCount}]}` (no full snapshot, for the picker UI).
- `loadGame(session, {gameId})` → return full snapshot.
- `deleteGame(session, {gameId})`.
- Cap: warn (not enforce) at 50 active games per user.

### `LLM.gs`
- `OPENROUTER_KEY` stored in `PropertiesService.getProperty('OPENROUTER_KEY')`. **Set once via `setApiKey()` admin function or manually in Project Settings → Script Properties.**
- `openRouterChat(session, {model, system, user, maxTokens=600, temperature=0.4})`:
  - `UrlFetchApp.fetch('https://openrouter.ai/api/v1/chat/completions', {method:'post', contentType:'application/json', payload:JSON.stringify({model, messages:[{role:'system',content:system},{role:'user',content:user}], max_tokens:maxTokens, temperature}), headers:{Authorization:`Bearer ${OPENROUTER_KEY}`}})`
  - Return `{ok:true, data:{text, model, usage}}`.
  - 30s timeout; 1 automatic retry on 5xx/429 with backoff.
- `setApiKey(key)` — simple admin function that sets the property (could be called from a hidden admin URL param `?admin=1&key=...` or pasted in the GAS editor).

### `appsscript.json`
```
{
  "timeZone": "America/Halifax",
  "dependencies": {},
  "webapp": { "executeAs": "USER_DEPLOYING", "access": "ANYONE_ANONYMOUS" },
  "exceptionLogging": "STACKDRIVER"
}
```

### Deployment steps (documented in `README.md`)
1. Go to script.google.com → New project.
2. Paste `Code.gs`, `Auth.gs`, `Saves.gs`, `LLM.gs`, `appsscript.json`.
3. Set Script Property `OPENROUTER_KEY` (Project Settings → Script Properties).
4. Deploy → New deployment → Web app → Execute as **Me**, Access **Anyone** (anonymous POSTs from the game).
5. Copy Web App URL → paste into the game's "Backend URL" field on first run (saved to localStorage).

---

## Security & Privacy Notes

- **OpenRouter key** is stored only in GAS Script Properties. The browser never sees it. It is never sent to GitHub or committed.
- **Passwords** are hashed client-side with PBKDF2 (200k iterations, per-user random salt). GAS stores only the hash + salt. Even a GAS data breach would not yield plaintext passwords.
- **No PII** required — only a username and password.
- **Session tokens** are random 32-byte hex, 30-day expiry, stored in `localStorage` on the client.
- **HTTPS** end-to-end (GAS Web Apps are served over HTTPS).
- `.gitignore` should include any local dev config; `gas/` script source is safe to commit (no secrets).
- The repo on GitHub contains **no secrets, no keys, no user data**.

---

## Implementation Order

1. **Foundation**: `config.js` + `utils.js`.
2. **State + Rules**: `gameState.js` + `rules.js` + `cards.js` + `dice.js`.
3. **Map**: `assets/map.svg` + `map.js`.
4. **UI shell**: `index.html` + 4 CSS files + `ui.js` (with welcome/setup screens).
5. **GAS backend**: `gas/*.gs` deployed separately, plus `gasApi.js` + `account.js` on the client. Verify signup/login/save/load round-trip.
6. **Loop**: `main.js` with heuristic AI — verifies rules + save/load end-to-end.
7. **LLM AI**: add `ai.js` calling the GAS `llmChat` action. Fall back to heuristic on error.
8. **Polish**: dice animation, log coloring, victory screen, mobile-friendly touches, `.gitignore`, `README.md`.

---

## Verification

- **Rules spot-checks**: territory/3 reinforcements, continent bonus, card escalation, dice ties to defender, fortify connectivity, forced card trade at 5+, elimination card transfer, victory at 42/42.
- **End-to-end playthrough**: human vs 2 AIs (heuristic) — finish a full game.
- **Cross-device resume**: complete a turn on machine A, refresh page, log in on machine B, load game, continue.
- **LLM path**: with `OPENROUTER_KEY` set, AI calls proxy → proxy calls OpenRouter → response parsed → move applied.
- **No-secret check**: `git grep -i "sk-or\|openrouter.*key\|passwordHash.*="` returns nothing committed.
- All files open via `file://` in modern browser (no server needed on the client).

---

## Out of Scope (v1)

- Sound effects
- Mobile-optimized touch
- Networked multiplayer
- Mission cards / secret objectives variant
- Email-based password recovery (GAS doesn't send email easily; users who lose passwords start a new account)
