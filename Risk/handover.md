# Project Handover — Single-Player Risk Game (LLM-Driven AIs)

This document provides a comprehensive overview of the browser-based single-player Risk game. It is designed to help another developer or LLM understand the repository architecture, file structure, state flow, and recent changes to pick up development seamlessly.

---

## 1. Project Overview
The project is a browser-based, single-player implementation of the classic board game **Risk (1959 rules)**. The player competes against 2 to 5 AI opponents powered by Large Language Models (LLMs) or desaturated rule-based heuristics when API queries fail or run locally.

* **Frontend:** Built with vanilla HTML5, CSS3, and JavaScript. No external build tools or frameworks.
* **Backend / LLM Integration:** Google Apps Script (GAS) Web App acts as a server proxy. It handles user accounts, game saving/loading (via a JSON database), and forwards chat completion requests to OpenRouter models (such as `google/gemini-2.5-flash` or `deepseek-v3`).
* **Visual Theme:** A high-quality desaturated vintage parchment cartography layout.

---

## 2. Directory & File Structure

```text
Risk/
├── assets/
│   └── map.svg        # 1000x700 vector map containing path tags with data-territory IDs
├── css/
│   ├── index.css      # Design tokens, variables, layout grids, headers, and topbar styling
│   ├── map.css        # Interactive highlight borders, hover animations, and SVG army badge styles
│   └── ui.css         # Scores, cards, log panels, modal layout, dice animations, and buttons
├── gas/
│   └── Code.gs        # Google Apps Script backend code (account DB, save DB, OpenRouter proxy)
├── js/
│   ├── config.js      # Territory metadata, continent layouts, starting counts, colors, and models
│   ├── utils.js       # debouncing, mixing hex colors, BFS pathfinding, delays, and cryptographic hashes
│   ├── cards.js       # Card deck structures and constructors
│   ├── dice.js        # Dice tray canvas/DOM rotation animations
│   ├── rules.js       # Army bonus calculations, dice match resolvers, and friendly connectivity logic
│   ├── gameState.js   # Central reactive state store, mutations, turn cycling, and event emission
│   ├── map.js         # SVG loading, continent color fills, and inline badge placement
│   ├── gasApi.js      # Fetch wrapper for HTTP requests to the Google Apps Script Web App
│   ├── account.js     # User registration, guest login, and PBKDF2 credential management
│   ├── ai.js          # AI heuristic behaviors, LLM prompts, and JSON response extractors
│   ├── ui.js          # Scoreboards, card hand renderers, event wire-ups, and game logs
│   └── main.js        # Bootstrapper, debounced auto-saver, and turn loop orchestration
├── index.html         # Application markup and script import layout
├── README.md          # Basic project overview
└── handover.md        # This document
```

---

## 3. Core Architecture & Logic Flows

### A. State Management & Reactivity
The game state in [gameState.js](file:///Z:/simroom/Github%20Repos/projectimages/Risk/js/gameState.js) (`window.RISK_STATE`) is reactive and acts as the single source of truth.
* It uses a simple listener subscription pattern: `S.on('event', callback)`.
* Emitted events include: `init`, `player` (active player changes), `phase` (phase transitions), `territory` (territory count/armies change), `log` (new message logged), `cards`, `reinforcements`, and `victory`.
* Any mutation of the state triggers the corresponding event, causing [ui.js](file:///Z:/simroom/Github%20Repos/projectimages/Risk/js/ui.js) and [map.js](file:///Z:/simroom/Github%20Repos/projectimages/Risk/js/map.js) to re-render the affected components.

### B. Game Loop & Turn Orchestration
Orchestrated in [main.js](file:///Z:/simroom/Github%20Repos/projectimages/Risk/js/main.js):
1. `runLoop()` is the main game loop executing a `while (true)` sequence.
2. If `p.isHuman` is true, the loop breaks to hand off control to the UI.
3. If the active player is an AI, `runAITurn(player)` is called.
4. During setup phases (`CLAIM`, `PLACE_INITIAL`), the AI executes synchronous heuristic decisions (`A.playClaim(p)`, `A.playPlaceInitial(p)`).
5. During active gameplay turns (`REINFORCE`, `ATTACK`, `FORTIFY`), the AI delegates decisions to `A.playTurn(p, model)` which calls OpenRouter. If the network call fails or throws, it falls back to desaturated local rule-based heuristics (`heuristicReinforce`, `heuristicAttackStep`, `heuristicFortify`).

---

## 4. Key Implementation Details

### A. Vector Map & Inline SVG Badges
* Territories are defined in `assets/map.svg` using `<path>` elements containing a `data-territory="[id]"` attribute.
* [map.js](file:///Z:/simroom/Github%20Repos/projectimages/Risk/js/map.js) loads the SVG, appends a `<g id="svg-badge-layer">` inside it, and renders army badges dynamically as `<circle>` and `<text>` elements in the SVG namespace. This aligns them directly with the coordinate system (`cx` and `cy` defined in [config.js](file:///Z:/simroom/Github%20Repos/projectimages/Risk/js/config.js)) so they scale perfectly regardless of browser layout changes.

### B. Auto-Save System
* Whenever any state-mutating event fires, a debounced handler in `main.js` clones the current state, adds metadata timestamps, and calls the GAS backend via `G.saveGame(snap)`.

---

## 5. Recent Fixes & Improvements

1. **Badge Coordinates:** Migrated from absolute-positioned HTML elements to native SVG namespace elements. Badges now align and scale correctly in all resolutions.
2. **Vintage Aesthetic:** Replaced raw CSS/JS colors with warm, desaturated parchment values. Borders are colored deep warm brown (`#4a2f0d`) and match the cartography theme.
3. **Auto-Advance Reinforcements:** In `gameState.js`, human reinforcement turns automatically transition to the `ATTACK` phase once all available troops are placed (pending count hits `0`).
4. **Hydration Metadata Recovery:** Updated `hydrate()` in `gameState.js` to restore static metadata (such as `adjacency` lists and `name`) on territories when restoring a saved game.

---

## 6. How to Run & Test
1. Serve the `Risk/` directory using any local web server:
   ```bash
   python -m http.server 8000
   ```
2. Open your browser to `http://localhost:8000/`.
3. To test with backend saving and LLM AI play:
   * Deploy the Google Apps Script in `gas/Code.gs` as a Web App (set execution permissions to "Anyone").
   * Copy the Exec URL and paste it into the backend URL field on the Welcome screen.
4. To test locally: select "Play as Guest". AI actions will default to local rule-based heuristics.
