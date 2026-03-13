# Guess the Country - Architecture & Technology Stack

## Technology Stack Decision: HTML/JavaScript

### Why HTML/JavaScript is the Best Choice

**For the Game:**
- ✅ **Universal Access**: Runs in any modern browser - no installation required
- ✅ **Cross-Platform**: Works on desktop, tablet, and mobile devices
- ✅ **Easy Deployment**: Can be hosted on any static hosting service (GitHub Pages, Netlify, Vercel, R2)
- ✅ **Fast Development**: No build process or compilation needed
- ✅ **Perfect for This Game Type**: Casual, web-based game with simple interactions
- ✅ **Existing Infrastructure**: You already have image_forge.html and R2 storage setup

**For the Management App:**
- ✅ **Integration**: Can reuse the same Google API and R2 upload code from image_forge.html
- ✅ **No Backend Required**: All functionality can be client-side JavaScript
- ✅ **Easy Maintenance**: Single HTML file with embedded CSS/JS
- ✅ **Real-time Preview**: Can test game changes immediately

### Alternative Technologies Considered

| Technology | Pros | Cons | Verdict |
|------------|------|------|---------|
| **Java (Desktop)** | Robust, offline capable | Requires JVM, installation, harder to deploy | ❌ Too complex |
| **Java (Web)** | Enterprise-grade | Requires server, build tools, more complex | ❌ Overkill |
| **React/Vue** | Component-based, scalable | Requires build process, more complex | ❌ Unnecessary |
| **Python (Flask/Django)** | Easy backend | Requires server setup, more complex | ❌ Unnecessary |
| **HTML/JS** | Simple, universal, no build | Limited for complex apps | ✅ **Perfect fit** |

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Game Management Dashboard                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Image Generation Panel                                     │ │
│  │  - Load CSV prompts                                        │ │
│  │  - Generate images (Google Gemini API)                     │ │
│  │  - Upload to R2                                            │ │
│  │  - Preview images                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Game Data Editor                                          │ │
│  │  - Edit country names                                      │ │
│  │  - Write/edit clues (5 per country)                        │ │
│  │  - Assign images to countries                              │ │
│  │  - Set difficulty levels                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Export/Import                                             │ │
│  │  - Export game data as JSON                                │ │
│  │  - Import existing game data                               │ │
│  │  - Download complete game package                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Game Data (JSON)                             │
│  {                                                              │
│    "countries": [                                               │
│      {                                                          │
│        "id": 1,                                                 │
│        "name": "Japan",                                         │
│        "imageUrl": "https://r2-url...",                        │
│        "clues": [...],                                          │
│        "difficulty": "medium"                                   │
│      }                                                          │
│    ]                                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Player Game Interface                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Main Menu                                                  │ │
│  │  - Select game mode                                         │ │
│  │  - View leaderboard                                        │ │
│  │  - View achievements                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Gameplay Screen                                            │ │
│  │  - Full-screen image display                                │ │
│  │  - Progressive clue revelation                              │ │
│  │  - Country guess input (autocomplete)                       │ │
│  │  - Timer display                                            │ │
│  │  - Score display                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Results Screen                                            │ │
│  │  - Show correct answer                                     │ │
│  │  - Display points earned                                   │ │
│  │  - "Learn More" popup with country facts                    │ │
│  │  - Continue to next round                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
guess-the-country game/
├── Game-idea.md                      # Game concept document
├── ARCHITECTURE.md                   # This file
├── GENERATION_INSTRUCTIONS.md         # Image generation guide
├── prompts.csv                       # AI image prompts
├── game-manager.html                 # Management dashboard
├── game.html                         # Main player game
├── game-data.json                    # Game configuration
└── assets/                           # Optional local assets
```

## Key Features

### Game Manager (game-manager.html)
1. **Image Generation**
   - Load prompts from CSV
   - Generate images via Google Gemini API
   - Upload to R2 storage
   - Preview and regenerate

2. **Game Data Editor**
   - Add/edit/delete countries
   - Write 5 progressive clues per country
   - Assign images to countries
   - Set difficulty levels

3. **Export/Import**
   - Export complete game data as JSON
   - Import existing game data
   - Download game package (HTML + JSON)

### Player Game (game.html)
1. **Game Modes**
   - Classic Mode (5 rounds)
   - Time Attack (60 seconds)
   - Streak Mode (continuous)
   - Daily Challenge
   - Region Focus

2. **Core Gameplay**
   - Full-screen image display
   - Progressive clue revelation (timed)
   - Country autocomplete input
   - Real-time scoring

3. **Progression**
   - Score tracking
   - Leaderboard (local storage)
   - Achievements
   - Country badges

## Data Flow

1. **Creation Flow:**
   ```
   CSV Prompts → Image Generation → R2 Upload → Game Data Editor → JSON Export
   ```

2. **Game Flow:**
   ```
   Load JSON → Select Mode → Display Image → Reveal Clues → Player Guess → Score → Next Round
   ```

## Storage Strategy

- **Images:** Cloudflare R2 (CDN, fast, reliable)
- **Game Data:** JSON file (can be hosted with game)
- **Player Progress:** LocalStorage (client-side)
- **Leaderboard:** LocalStorage (can be upgraded to backend later)

## Performance Considerations

- **Image Loading:** Lazy loading, progressive enhancement
- **Game Data:** Small JSON (< 100KB), loads instantly
- **Caching:** Browser cache for images, localStorage for progress
- **Mobile:** Responsive design, touch-optimized

## Security Considerations

- **API Keys:** Stored in localStorage (management app only)
- **CORS:** R2 configured for public read access
- **Input Validation:** Sanitize all user inputs
- **Rate Limiting:** Built-in delays for API calls

## Future Scalability

If the game grows, can easily add:
- Backend API for real-time leaderboards
- User authentication
- Multiplayer mode
- Database for user-generated content
- Analytics tracking

---

**Recommended Next Steps:**
1. Build `game-manager.html` with image generation integration
2. Create `game.html` with core gameplay
3. Implement clue system and scoring
4. Add game modes and features
5. Test and deploy
