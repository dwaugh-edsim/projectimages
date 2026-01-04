# Situation Room: Complete Project Documentation
## Critical Juncture Operations Platform (v76)

---

# 📋 TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [File Inventory](#file-inventory)
4. [Backend Services](#backend-services)
5. [Teacher Mode (Mission Forge)](#teacher-mode)
6. [Image Forge](#image-forge)
7. [Student Experience](#student-experience)
8. [API Reference](#api-reference)
9. [Database Schema](#database-schema)
10. [Deployment Guide](#deployment-guide)
11. [Security](#security)
12. [Changelog](#changelog)

---

# PROJECT OVERVIEW

## What Is This?

The **Situation Room** is an immersive educational platform where students navigate "Critical Juncture Operations" — structured historical turning points that require evidence-based decision-making.

## Core Philosophy

- **Watershed Navigation**: Each mission is a historical inflection point
- **Decision-Driven Analysis**: Students choose paths under pressure
- **Evidence Framework**: PRIMARY (sources) / LEGAL (policy) / INTEL (analysis)
- **Mandatory Rationales**: Students cite specific evidence for decisions
- **Immersive UI**: Tech-noir "Situation Room" aesthetic

## Target Users

| User | Interface | Purpose |
|------|-----------|---------|
| **Teachers** | `teachermode.html` | Create, edit, deploy missions |
| **Students** | `simroom_LIVE.html` | Play missions, record decisions |
| **Administrators** | Supabase Dashboard | Manage data, monitor usage |

---

# SYSTEM ARCHITECTURE

## High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (CLIENT)                          │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ teachermode.html│ simroom_LIVE.html│ image_forge.html           │
│ (Mission Forge) │ (Student Player) │ (Asset Generator)          │
└────────┬────────┴────────┬────────┴────────┬────────────────────┘
         │                 │                  │
         ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVICES                            │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ Supabase        │ Cloudflare R2   │ OpenRouter                  │
│ (Database/Auth) │ (Image Storage) │ (AI Generation)             │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

## Frontend Stack

- **Pure HTML/CSS/JavaScript** — No framework, maximum portability
- **Google Fonts**: Inter, Oswald, JetBrains Mono
- **External Libraries**: Quill.js (rich text), Google Identity Services

## Backend Services

| Service | Provider | Purpose | Cost |
|---------|----------|---------|------|
| **Database** | Supabase | Missions, progress, auth | Free tier |
| **Image CDN** | Cloudflare R2 | Generated assets | Free 10GB |
| **AI Images** | OpenRouter | Flux 2 Pro generation | Pay-per-use |
| **AI Text** | OpenRouter | Brainstorm, narrative | Pay-per-use |
| **Auth** | Google OAuth | Teacher identity | Free |

---

# FILE INVENTORY

## Core Application Files

| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| `HTMLs/teachermode.html` | Teacher interface + Mission Forge | ~4300 | Active |
| `HTMLs/simroom_LIVE.html` | Student mission player | ~2000 | Active |
| `HTMLs/image_forge.html` | Batch AI image generator | ~970 | Active |
| `HTMLs/blobhospital.html` | Legacy blob editor | ~1500 | Legacy |
| `HTMLs/supabase_bridge.js` | Database integration layer | ~200 | Active |
| `HTMLs/test_integration.html` | API test suite | ~320 | Dev tool |

## Worker Files

| File | Purpose |
|------|---------|
| `workers/r2-upload-worker.js` | Cloudflare Worker for R2 uploads |
| `workers/wrangler.toml` | Worker deployment config |

## Documentation

| File | Purpose |
|------|---------|
| `HTMLs/teacher_guide.md` | This file |
| `HTMLs/capsule_schema.md` | Mission JSON structure |
| `HTMLs/Gem instructions.md` | AI prompt guidelines |
| `HTMLs/knowledge_archive.md` | Historical reference data |

## Generated Content

| Directory | Purpose |
|-----------|---------|
| `generated/` | Legacy GitHub-stored images |
| R2 Bucket: `imageassets` | Current image storage |

---

# BACKEND SERVICES

## Supabase

**Project URL**: (configured in `supabase_bridge.js`)

### Tables

| Table | Purpose |
|-------|---------|
| `missions` | Published mission JSON blobs |
| `student_progress` | Decision tracking per student |
| `forge_ideas` | Work-in-progress mission saves |
| `classes` | Class/roster management |

### Key Functions in `supabase_bridge.js`

```javascript
SupabaseBridge.saveMission(missionData)    // Deploy mission
SupabaseBridge.getMissions()               // List all missions
SupabaseBridge.saveIdea(ideaData)          // Save WIP
SupabaseBridge.fetchIdeas(teacherId)       // Get saved ideas
SupabaseBridge.loadIdea(ideaId)            // Restore WIP
```

## Cloudflare R2

**Account ID**: `27b9b456ffb00615ded7d16756eb8bd8`
**Bucket**: `imageassets`
**Public URL**: `https://pub-292f442cf18e4af8987995ef35671754.r2.dev`
**Worker URL**: `https://proud-tooth-42cf.icumusicvideo.workers.dev`

### Upload Flow

1. Browser converts image to JPG (canvas)
2. POST base64 to worker with filename
3. Worker signs S3 request, uploads to R2
4. Returns public URL

### Worker Environment Variables

| Variable | Purpose |
|----------|---------|
| `ACCESS_KEY_ID` | R2 S3-compatible access key |
| `SECRET_ACCESS_KEY` | R2 S3-compatible secret |

## OpenRouter

**API Endpoint**: `https://openrouter.ai/api/v1/chat/completions`

### Models Used

| Model | ID | Purpose |
|-------|-----|---------|
| Flux 2 Pro | `black-forest-labs/flux.2-pro` | Image generation |
| Gemini Flash | `google/gemini-2.0-flash-exp:free` | Text (free tier) |
| MiMo V2 | `xiaomi/mimo-v2-flash:free` | Text (free tier) |

### Key Storage

- **localStorage key**: `TM_OPENROUTER_KEY`
- Prompted on first use, persists locally

---

# TEACHER MODE

## The 5-Phase Mission Forge

### Phase 1: BRAINSTORM (Chat)
- Select curriculum outcomes
- Describe mission concept
- AI proposes 3 scenario options
- Refine to one direction

### Phase 2: DEEP SEARCH (Chat)  
- Research architecture
- Define 10-slide structure
- Identify evidence sources

### Phase 3: NARRATIVE (Chat)
- Write content per slide
- Create tab content (Primary/Legal/Intel)
- Design decision points

### Phase 4: ASSETS (Grid - 19 Slots)
- 1 Hero/Splash image
- 18 Exhibit images (2 per slide × 9 slides)
- Per slot: Prompt input, Generate button, R2 upload

### Phase 5: BIRTH (Review)
- JSON validation checklist
- Live preview
- Deploy to Supabase or download .blob

## Key UI Elements

| Element | Purpose |
|---------|---------|
| Pipeline Stepper | Shows/switches phases |
| Curriculum Zone | Select course outcomes |
| Idea Box | Chat input for AI |
| SAVE IDEA / LOAD IDEA | Persist work-in-progress |
| SKIP TO BIRTH | Jump to final phase |

## State Variables

```javascript
currentPhaseIndex    // Current phase (0-4)
forgePipeline        // Array of phase IDs
forgeHistory         // Chat message history
accumulatedData      // Mission JSON being built
```

---

# IMAGE FORGE

Standalone batch image generator with dual-provider support.

## Features

- 10 parallel generation slots
- Master prompt prefix
- Per-slot prompts
- PNG/JPG download
- R2/Git upload
- Debug console

## Providers

| Provider | Auth Method | Notes |
|----------|-------------|-------|
| OpenRouter | API Key | Recommended, simple |
| Google AI Studio | API Key | Experimental image gen |
| Vertex AI | OAuth | Enterprise, complex |

## Slot Actions

| Button | Action |
|--------|--------|
| ⚡ GEN | Generate image from prompt |
| PNG | Download as PNG |
| JPG | Convert & download as JPG |
| GIT | Upload to GitHub (legacy) |
| R2 | Upload to Cloudflare R2 |

---

# STUDENT EXPERIENCE

## Login Flow

1. Enter name
2. Enter 6-digit PIN
3. System validates against class roster
4. Redirects to mission lobby

## Mission Flow

1. **Lobby**: View available/assigned missions
2. **Briefing**: Read mission context
3. **Investigation**: 
   - Navigate 10 slides
   - View evidence tabs
   - Make decisions at checkpoints
4. **Rationale**: Write justification citing evidence
5. **Debrief**: See class results (teacher-controlled)

## Decision Recording

Each decision writes to `student_progress`:
- Student ID
- Mission ID
- Slide number
- Choice made
- Rationale text
- Timestamp

---

# API REFERENCE

## Supabase Bridge

```javascript
// Save mission
await SupabaseBridge.saveMission({
  id: 'mission_id',
  title: 'Mission Title',
  slides: [...],
  metadata: {...}
});

// Get all missions
const missions = await SupabaseBridge.getMissions();

// Save WIP idea
await SupabaseBridge.saveIdea({
  ideaId: 'uuid',
  teacherId: 'email',
  name: 'My Idea',
  ideaData: { forgeHistory, accumulatedData, ... }
});
```

## R2 Worker

```javascript
// Upload image
const response = await fetch(
  'https://proud-tooth-42cf.icumusicvideo.workers.dev?filename=my_image.jpg',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: 'data:image/jpeg;base64,...' })
  }
);
const data = await response.json();
// { success: true, url: 'https://pub-...r2.dev/my_image.jpg', filename: 'my_image.jpg' }
```

## OpenRouter

```javascript
// Generate image
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'black-forest-labs/flux.2-pro',
    messages: [{ role: 'user', content: 'A blue cube on white background' }]
  })
});
// Response contains image URL in message.images[0].image_url.url
```

---

# DATABASE SCHEMA

## missions

```sql
CREATE TABLE missions (
  id TEXT PRIMARY KEY,
  title TEXT,
  data JSONB,
  teacher_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published BOOLEAN DEFAULT FALSE
);
```

## forge_ideas

```sql
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

## student_progress

```sql
CREATE TABLE student_progress (
  id SERIAL PRIMARY KEY,
  student_id TEXT,
  mission_id TEXT,
  slide_num INTEGER,
  decision TEXT,
  rationale TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

# DEPLOYMENT GUIDE

## Quick Start (GitHub Pages)

1. Fork/clone `dwaugh-edsim/projectimages`
2. Enable GitHub Pages on `main` branch
3. Access at `https://YOUR-USER.github.io/projectimages/HTMLs/teachermode.html`

## Production Setup

### 1. Supabase
- Create project at supabase.com
- Run SQL schemas above
- Update URL/key in `supabase_bridge.js`
- Enable Row Level Security

### 2. Cloudflare R2
- Create R2 bucket (`imageassets`)
- Deploy worker from `workers/r2-upload-worker.js`
- Add environment variables (ACCESS_KEY_ID, SECRET_ACCESS_KEY)
- Enable public access on bucket

### 3. OpenRouter
- Get API key at openrouter.ai
- Add credits for image generation
- Key is stored per-user in localStorage

---

# SECURITY

## Client-Side Storage

| Key | Location | Purpose |
|-----|----------|---------|
| `TM_OPENROUTER_KEY` | localStorage | OpenRouter API key |
| `GITHUB_TOKEN` | localStorage | Legacy GitHub upload |
| `TM_FORGE_PIPELINE` | localStorage | Custom phase order |
| `TM_FORGE_IDEA_*` | localStorage | Local idea backups |

## Server-Side Security

- **R2 Credentials**: Hidden in Cloudflare Worker environment
- **Supabase RLS**: Row Level Security on all tables
- **Teacher Allowlist**: Hardcoded in `teachermode.html` (line ~1626)

## Authentication Flow

1. Google OAuth via Identity Services
2. Email checked against `AUTHORIZED_TEACHERS` array
3. Unauthorized users get read-only access

---

# CHANGELOG

## v76 (2026-01-04)
- Multi-screen workflow (Chat → Assets Grid → Birth Review)
- 19-slot asset grid with A/B variants
- Cloudflare R2 integration (replaced GitHub for assets)
- OpenRouter Flux 2 Pro integration
- SAVE/LOAD IDEA functionality
- Integration test suite

## v65-75
- Supabase migration from Google Sheets
- Image Forge batch generation
- Blob Hospital editor
- Phase-based forge pipeline

## v1-64
- Initial development
- Google Sheets backend
- Basic mission player

---

**Your terminal is now an Archive of Decision. Everything hangs on the choice. 🦾🏛️⚔️📜**
