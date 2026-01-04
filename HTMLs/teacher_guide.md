# Teacher's Guide: Critical Juncture Operations (v76)

Welcome to the **Situation Room** — a platform for high-stakes historical inquiry. This guide explains the system architecture and how to create, test, and deploy missions.

---

## 🏗️ System Architecture

### Frontend (Browser-Based)
| Component | File | Purpose |
|-----------|------|---------|
| **Mission Control** | `simroom_LIVE.html` | Student-facing simulation player |
| **Teacher Mode** | `teachermode.html` | Create, edit, test, deploy missions |
| **Image Forge** | `image_forge.html` | Batch AI image generation |
| **Blob Hospital** | `blobhospital.html` | Legacy editor for .blob files |
| **Test Suite** | `test_integration.html` | Verify API integrations |

### Backend Services
| Service | Provider | Purpose |
|---------|----------|---------|
| **Database** | Supabase | Mission storage, student progress, auth |
| **Image Storage** | Cloudflare R2 | Generated assets (JPG), public CDN |
| **AI Image Gen** | OpenRouter (Flux 1.1 Pro) | Generate mission imagery |
| **AI Text Gen** | OpenRouter | Mission brainstorm, narrative |
| **Auth** | Google OAuth | Teacher identity verification |

### API Integrations
| Integration | Configuration |
|-------------|---------------|
| **Supabase** | `supabase_bridge.js` - URL/Key in file |
| **Cloudflare R2** | Worker at `proud-tooth-42cf.icumusicvideo.workers.dev` |
| **OpenRouter** | Key stored in `localStorage` (TM_OPENROUTER_KEY) |
| **GitHub** | Optional for legacy asset commits |

---

## 🔍 Core Philosophy

**Critical Juncture Operations** replace games with structured decision points:

- **Watershed Navigation**: Each mission is a historical turning point
- **Decision-Driven Analysis**: Students choose paths under pressure
- **Evidence Framework**:
  - **PRIMARY** (Historical sources)
  - **LEGAL** (Policies/laws)  
  - **INTEL** (Analysis/intelligence)
- **Mandatory Rationales**: Students cite evidence to justify decisions
- **Immersive UI**: Tech-noir "Situation Room" design

---

## 🛠️ Teacher Mode Workflow

### The 5-Phase Forge

| Phase | Screen Type | Purpose |
|-------|-------------|---------|
| **1. BRAINSTORM** | Chat | Bounce ideas with AI, select curriculum outcomes, refine to one scenario |
| **2. DEEP SEARCH** | Chat | Research architecture, 10-slide structure |
| **3. NARRATIVE** | Chat | Content creation per slide |
| **4. ASSETS** | Grid (19 slots) | Generate/paste images: 1 Hero + 18 exhibits |
| **5. BIRTH** | Review | Validate JSON, deploy or download |

### Asset Generation
- **⚡ GEN** button: Generate via OpenRouter Flux 1.1 Pro
- **R2** button: Convert to JPG (85% quality) → Upload to Cloudflare R2 → Get public URL

### Save/Load Ideas
- **SAVE IDEA**: Preserves phase, history, curriculum, settings (Supabase or localStorage)
- **LOAD IDEA**: Resume work-in-progress sessions

---

## 👥 Student Experience

1. **Login**: Secure access with name + 6-digit PIN
2. **Lobby**: View available missions and assigned roles
3. **Investigation**: Analyze evidence → Make recorded decisions → File rationales
4. **Debrief**: Review class decisions and outcomes

---

## 🖼️ Image Forge (Standalone)

Batch image generation with multiple providers:

| Provider | Models | Auth |
|----------|--------|------|
| **OpenRouter** | Flux 1.1 Pro, DALL-E 3, etc. | API Key |
| **Google AI** | Gemini 2.0 Flash (experimental) | API Key or OAuth |

Features:
- 10 parallel slots with individual prompts
- Master prompt prefix for batch generation
- PNG/JPG download
- Direct R2/Git upload

---

## 🚀 Deployment

### For Teachers
1. Open `teachermode.html`
2. Sign in with Google
3. Create mission through the 5-phase forge
4. Deploy to Command Center (Supabase)

### For Administrators
1. **Database**: Set up Supabase project with required tables:
   - `missions` (mission JSON storage)
   - `student_progress` (decision tracking)
   - `forge_ideas` (work-in-progress saves)
2. **Storage**: Configure Cloudflare R2 bucket + worker
3. **DNS**: Optionally add custom domain to R2 for production

### Required Supabase Tables

```sql
-- Forge ideas (work-in-progress)
CREATE TABLE forge_ideas (
    id SERIAL PRIMARY KEY,
    idea_id TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    name TEXT,
    idea_data JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(idea_id, teacher_id)
);
```

---

## 📁 File Structure

```
projectimages/
├── HTMLs/
│   ├── teachermode.html      # Main teacher interface
│   ├── simroom_LIVE.html     # Student simulation player
│   ├── image_forge.html      # AI image generator
│   ├── blobhospital.html     # Legacy blob editor
│   ├── test_integration.html # API test suite
│   └── supabase_bridge.js    # Database integration
├── workers/
│   ├── r2-upload-worker.js   # Cloudflare R2 upload proxy
│   └── wrangler.toml         # Worker config
└── generated/                # Legacy GitHub image storage
```

---

## 🔐 Security Notes

- **API Keys**: Stored in `localStorage` (client-side, per-browser)
- **R2 Credentials**: Hidden in Cloudflare Worker (never exposed)
- **Teacher Auth**: Google OAuth with allowlist in `teachermode.html`
- **Student Data**: Protected by Supabase Row Level Security

---

**Your terminal is now an Archive of Decision. Everything hangs on the choice. 🦾🏛️⚔️📜**
