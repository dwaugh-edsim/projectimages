# Risk — Single-Player Edition

A browser-based implementation of the classic 1959 Risk board game, where you face off against 2–5 AI opponents. The AIs are powered by **OpenRouter** LLM calls, but your API key never leaves the server.

## Architecture

```
Browser (static)  →  Google Apps Script Web App  →  OpenRouter
                       • OPENROUTER_KEY (server-only)
                       • user accounts
                       • saved games
```

The **Google Apps Script (GAS) Web App** acts as a thin backend:
- Stores the OpenRouter API key in `PropertiesService` (never sent to the browser or GitHub)
- Stores user accounts (PBKDF2-hashed passwords, per-user random salt)
- Stores saved games so you can resume on another machine
- Forwards LLM chat requests to OpenRouter with the key attached server-side

The browser never sees the OpenRouter key. The only secret that touches your machine is the **GAS Web App URL** (which is public anyway — security comes from `PropertiesService`, not URL secrecy).

## Play Locally

Just open `index.html` in a modern browser. Or serve the folder with any static server:

```bash
# from the Risk/ folder
python -m http.server 8000
# then visit http://localhost:8000
```

## One-Time Setup: Deploy the GAS Backend

1. Go to https://script.google.com → **New project**.
2. Delete the default `Code.gs` content and paste the entire contents of `gas/Code.gs` from this repo.
3. Click **Project Settings** (gear icon) → **Script Properties** → **Add script property**:
   - Property: `OPENROUTER_KEY`
   - Value: your OpenRouter API key (get one at https://openrouter.ai/keys)
4. Click **Deploy → New deployment**:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (anonymous POSTs from the game)
5. Click **Deploy**, copy the Web App URL.
6. Open `index.html` in your browser → paste the URL into the **Backend URL** field on the welcome screen → sign in or play as guest.

The default backend URL is already prefilled with the demo deployment; you can override it locally.

## Game Flow

1. **Welcome** — sign in, create account, or play as guest. A guest account is auto-created so saves work cross-device.
2. **Setup** — pick your name, color, number of AI opponents (2–5), AI model, and personalities.
3. **Claim phase** — each player takes turns claiming one unowned territory.
4. **Initial placement** — players alternate placing starting armies on their own territories.
5. **Play** — for each turn:
   - **Reinforce** — get `territories/3` (min 3) + continent bonuses + card trade-in armies. Place them on your territories.
   - **Attack** — pick a source (≥2 armies) and adjacent enemy. Roll dice. Repeat as long as you want.
   - **Fortify** — once per turn, move armies along your connected territories.
6. **Win** — own all 42 territories.

## AI Personalities

Each opponent is randomly assigned one of:
- **Aggressive** — attacks whenever odds are decent
- **Defensive** — fortifies borders, picks fights carefully
- **Opportunistic** — targets the weakest player
- **Chaotic** — surprising moves, occasional bluffs

## File Layout

```
Risk/
├── index.html
├── css/             # design tokens, ui, map, animations
├── js/
│   ├── config.js    # 42 territories, 6 continents, adjacency graph
│   ├── utils.js     # shuffle, bfs, PBKDF2 hashing
│   ├── rules.js     # pure Risk rules: reinforce, combat, cards, fortify
│   ├── gameState.js # reactive state + event emitter
│   ├── cards.js     # 44-card deck management
│   ├── dice.js      # dice animation
│   ├── map.js       # SVG map rendering & interaction
│   ├── ui.js        # panels, modals, side panel
│   ├── gasApi.js    # client → GAS bridge
│   ├── account.js   # signup/login/guest (PBKDF2)
│   ├── ai.js        # OpenRouter-via-proxy + heuristic fallback
│   └── main.js      # bootstrap, game loop orchestration
├── assets/
│   └── map.svg      # 42 hand-crafted territory paths
├── gas/
│   └── Code.gs      # self-contained GAS backend (deploy this)
└── images/
    └── riskmap-1.png   # reference image
```

## Security Notes

- **OpenRouter key** lives in GAS Script Properties only. It is not committed, not in `localStorage`, not visible to the browser.
- **Passwords** are hashed client-side with PBKDF2-SHA256 (200,000 iterations, per-user 16-byte salt). GAS stores only the hash.
- **Sessions** are random 32-byte hex tokens with 30-day expiry, stored in `localStorage` on the client.
- All traffic is HTTPS (GAS Web Apps are served over HTTPS).

## Troubleshooting

- **`Auth is not defined`** — your deployed `Code.gs` is the old IIFE version. Re-paste the contents of `gas/Code.gs` from this repo and **Deploy → New version**.
- **CORS / fetch errors** — make sure the Web App is deployed with access "Anyone" (not "Anyone with Google account").
- **OpenRouter 401** — your `OPENROUTER_KEY` Script Property is missing or invalid. Re-check Project Settings.
- **Map not loading** — open `index.html` via a local server (`python -m http.server`) not `file://` if your browser blocks `fetch()` for local SVG.

## License

MIT
