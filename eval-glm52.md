# Project Evaluation: Risk (Vanilla JS + Google Apps Script)

## Project Snapshot

A browser-based single-player Risk game against LLM-driven AI opponents. ~3,700 lines of
hand-rolled vanilla JS across 13 modules, plus a Google Apps Script (GAS) backend that proxies
OpenRouter and stores per-user saves. No build step, no npm dependencies, no tests.

```
Risk/
├── README.md, handover.md       docs
├── index.html, calibrate.html   entry + coordinate tool
├── assets/map.svg               board vector
├── css/{index,map,ui,animations}.css
├── gas/Code.gs                  backend (auth, saves, LLM proxy)
├── images/riskmap-1.png         4.6 MB raster background
└── js/
    ├── config.js     (196)  static data: territories, adjacency, continents, models
    ├── utils.js      (120)  helpers (escapeHtml, BFS, crypto, debounce)
    ├── rules.js      (235)  PURE rules: dice, combat, cards, trade, connectivity
    ├── cards.js      ( 19)  deck ops
    ├── dice.js       ( 47)  dice rendering
    ├── gameState.js  (438)  single source of truth + event emitter
    ├── map.js        (173)  SVG board rendering + interaction
    ├── ui.js         (712)  panels, modals, scoreboard, settings
    ├── ai.js         (493)  AI decision engine: heuristics + LLM
    ├── banter.js     (626)  chat UI + LLM smack-talk templates
    ├── gasApi.js     ( 80)  fetch wrapper → GAS backend
    ├── account.js    ( 53)  auth (PBKDF2)
    └── main.js       (309)  bootstrap + game-loop orchestrator
```

---

## STRENGTHS

1. **Clean architecture for a framework-less app.** Pure rules (`rules.js`, `config.js`) are fully
   decoupled from state (`gameState.js`) and rendering (`map.js`, `ui.js`). The dependency graph is
   layered and documented in README/handover.
2. **Reactive single-source-of-truth state.** `gameState.js` exposes a tiny `on/emit` pub/sub; map
   and UI subscribe. Predictable and debuggable.
3. **Graceful LLM degradation.** Every AI decision falls back to substantive local heuristics
   (threat assessment, continent-completion scoring, card-hunting bounties, choke-point
   defense). The game is fully playable offline; the LLM is an enhancement, not a dependency.
4. **High-quality AI heuristics.** Multi-factor scoring beats most tutorial Risk AIs
   (`ai.js:172-305` `heuristicReinforce`, etc.).
5. **Good secret hygiene server-side.** OpenRouter key lives in `PropertiesService`, never
   serialized to the client (`Code.gs:144`).
6. **Strong password hashing.** PBKDF2-SHA256, 200k iterations, 16-byte per-user salt
   (`account.js:7`) — exceeds OWASP minimums.
7. **Correct SVG-badge implementation.** Territory army counters are built in the SVG coordinate
   system (`map.js:117-142`), not absolutely-positioned HTML — scales perfectly.
8. **Polished UX/design.** Cohesive parchment/dark theme via CSS custom properties, CSS dice
   animation, debounced autosave, save-status indicator, auto-advance reinforce, personality-driven
   banter with a "drunk mode" easter egg.
9. **Excellent README & handover docs** — architecture diagram, setup, threat model, troubleshooting.
10. **Cross-device save/resume** via GAS-backed per-user storage.

---

## WEAKNESSES

### Security

- **XSS via `innerHTML` with user-controlled data:**
  - `map.js:65` — tooltip injects `owner` (player name, user-controlled) unescaped.
  - `ui.js:190-194` — settings opponent row injects `p.name`.
  - `ui.js:242-247` — saved-games list joins player names → **stored XSS** across devices.
  - `banter.js:374-377` — `senderName` unescaped (text is escaped).
- **Committed live backend URL with no rate limiting.** `gasApi.js:9` hard-codes a real GAS `exec`
  URL. Signup is public, so anyone can create an account and spam `llmChat` to burn the project's
  OpenRouter quota. No rate limiting in `Code.gs`.
- **Client-side hashing is replayable.** Server string-compares the hash (`Code.gs:78`) with no
  nonce/re-stretching, so a leaked hash ≈ a leaked password.
- **4.6 MB PNG committed to git** (`images/riskmap-1.png`) — permanently bloats repo history.

### Correctness Bugs

- **Double army-move after conquest.** `gameState.attack` auto-moves armies
  (`gameState.js:302-318`) AND `main.js:247-285` re-prompts and re-mutates state — inconsistent and
  can produce invalid counts. `sliderMax` at `main.js:251` is computed off post-move values.
- **Dead code in TDZ-adjacent position.** `config.js:217-220` — `getTerritory` references
  `TERRITORY_LOOKUP` declared *after* the `return`; works by lazy-resolution accident; also never
  exported or called.
- **Fragile log-string parsing.** `ui.js:552-563` regex-extracts dice from human log text instead of
  consuming the structured `combat` event `gameState` already emits (`gameState.js:298`).
- **Blocking `confirm()`.** `ui.js:454` uses synchronous native dialog mid-attack.
- **Fabricated model IDs.** `config.js:188-191` lists `inclusionai/ling-2.6-flash`,
  `deepseek/deepseek-v4-flash`, `openrouter/free` — none are real OpenRouter models, so every LLM
  call fails and silently falls back to heuristics.
- **O(n²) id recovery** in `ui.js:673` (`Object.keys(...).find(...)` to recover an id it already has).
- **Debug UI shipped in production.** `btn-skip-claim` (`index.html:107`) always present.
- **No `hydrate()` schema validation** (`gameState.js:88-93`) — corrupted saves produce silent breakage.
- **`Math.random` unseeded** — untestable and non-replayable.

### Maintainability

- **Zero automated tests** on an eminently testable (pure rules) codebase.
- **No `package.json`, lint, formatter, TypeScript, build, or CI.**
- **IIFE-on-`window` pattern** is untestable in isolation and creates a brittle fixed load order
  (`index.html:286-298`).
- **Duplication:** `escapeHtml` (ui.js:692, banter.js:382), `updateTradeButton` (ui.js:319 +
  main.js:308-317, with dead else-branch), conquest modal hand-built twice (main.js:254-272 vs
  ui.js:600-611).
- **Dead code:** `rules.rollBattle`, `rules.canAttack`, `rules.getCardTerritoryBonus`,
  `utils.bfs`, `utils.groupBy`, `map.js:12 highlightSet`.
- **Oversized functions:** `heuristicReinforce` (133 lines), `gameState.attack` (62 lines mixing
  4 concerns), `banter.getLLMBanterReply` (66 lines), `wireDiceModal` (65 lines).
- **`banter.js` (626 lines)** mixes chat UI + prompt assembly + template dictionary + slurring.
- **GAS deploys are copy-paste** — no CLASP; drift between repo and deployed code is likely.

### Performance

- **`rules.winProbability` runs a 5,000-trial Monte Carlo per call** (`rules.js:214-235`), invoked
  per candidate attack inside the AI hot loop (`ai.js:315`) — tens of thousands of synchronous
  battles per AI turn. Never memoized.
- **`getConnectedFriendly` BFS recomputed** per (source,target) pair in `ai.js:401,420,436`.
- **`renderLog` rebuilds 200 rows** on every log event (`ui.js:341-353`) instead of appending.
- **`map.render()` does full re-render** of all badges on most events despite per-territory updates
  existing.
- **13 unbundled, unminified script tags.**
- **4.6 MB uncompressed map image.**

### Accessibility

- No `role="dialog"` / `aria-modal` / focus-trap on any modal.
- No `aria-live` on toasts, game log, or chat.
- **Zero keyboard support** for the map (territories not focusable).
- Color is the only ownership differentiator (color-blind unfriendly; 60/40 blend worsens it).
- Icon-only buttons (💾 ↩) rely on `title` only.
- `calibrate.html` missing `<html lang>`.

---

## PRIORITIZED SUGGESTIONS FOR IMPROVEMENT

### P0 — Security (before any public deployment)
1. Escape all user-controlled strings in `innerHTML` sinks (`map.js:65`, `ui.js:190`, `ui.js:242`,
   `banter.js:374`). Centralize `escapeHtml` in `utils.js`.
2. Add per-session rate limiting in `Code.gs` for `signup`/`login`/`llmChat` (CacheService counter).
3. Remove the committed live GAS URL from `gasApi.js:9`, or gate deployment behind a non-public URL.
4. Move `riskmap-1.png` out of git, compress to WebP/JPG, purge history (`git filter-repo`).

### P1 — Correctness
5. Reconcile the double army-move after conquest (choose one owner: gameState OR main, not both).
6. Delete `getTerritory`/`TERRITORY_LOOKUP` (config.js:217-220).
7. Fix `ui.js:673` with `Object.entries`.
8. Stop parsing dice from the log; consume the `combat` event.
9. Replace `confirm()` with the custom modal system.
10. Fix model IDs in `config.js:188-191` to real OpenRouter IDs.
11. Gate `btn-skip-claim` behind `?debug=1`.
12. Make RNG injectable/seeded.

### P2 — Architecture
13. Migrate IIFE-on-`window` → ES modules (`<script type="module">`); enables Node-importable tests.
14. Add a build step (Vite) for minify/bundle/sourcemap/HMR.
15. Split `banter.js` (templates/llm/ui) and `ai.js` (heuristics/llm).
16. Consolidate `escapeHtml`; delete dead code & duplicate `updateTradeButton`.
17. Decompose `gameState.attack` (resolveDice/applyConquest/checkElimination/checkVictory).
18. Add `hydrate()` schema validation + a global `unhandledrejection` toast.

### P3 — Performance
19. Memoize or analytically table-approximate `winProbability`.
20. Cache `getConnectedFriendly` per fortify decision.
21. Make `renderLog` append-only.
22. Add `.gitignore`; compress/lazy-load map image.

### P4 — Accessibility
23. `role="dialog"` + `aria-modal` + focus-trap on all modals.
24. `aria-live="polite"` on log/chat/toast regions.
25. Make territories keyboard-focusable (`tabindex="0"` + Enter/Space).
26. Add patterns/icons (not just color) for ownership + a legend.
27. `aria-label` on icon-only buttons; `lang` on calibrate.html.

### P5 — Testing / Tooling
28. Add `package.json` with eslint, prettier, vitest.
29. Unit-test `rules.js` first (combat, dice, cards, trades, continents, BFS).
30. Add a deterministic `gameState` integration test (full turn cycle).
31. Playwright smoke test: welcome → guest → start → claim → place → reinforce → attack → fortify.
32. Add JSDoc types or TypeScript; CLASP for `Code.gs`.

### P6 — Documentation
33. Add a `LICENSE` file (README claims MIT).
34. JSDoc the `gameState` public API.
35. Reconcile `handover.md` with `config.js`; stop referencing the nonexistent `rebuild_map.py`.

---

## Overall Assessment

A **well-architected, charmingly-designed hobby project** with genuinely clean separation of
concerns, strong AI heuristics with offline fallback, and good visual polish. Its pure-rules layer
and reactive state design are its standout assets. However, it carries **real security issues**
(several XSS sinks, a public committed backend with no rate limiting), **notable correctness bugs**
(conquest army-move double counting, fabricated model IDs, fragile log parsing), **zero tests** on
a highly testable codebase, **no tooling**, and **significant a11y gaps**. The 4.6 MB committed PNG and
unbundled scripts are the main performance concerns.

Highest-leverage fixes in order: (1) XSS sinks, (2) rate limiting + remove committed URL,
(3) test runner + ES modules + `rules.js` unit tests, (4) conquest army-move bug, (5) memoize
`winProbability`, (6) modal a11y + keyboard map interaction.