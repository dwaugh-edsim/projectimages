# 🚀 Project Sheetify: Sovereign Teacher Migration

> Migrating SimRoom from centralized Supabase to decentralized Google Sheets deployments.

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      CONTENT LAYER (Public)                     │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  GitHub Pages   │    │    Supabase     │                     │
│  │  (Blob Factory) │    │  (Image CDN)    │                     │
│  └────────┬────────┘    └────────┬────────┘                     │
│           │                      │                               │
│           └──────────┬───────────┘                               │
│                      ▼                                           │
│              Mission JSON Blobs                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │ (Public Fetch)
┌──────────────────────▼──────────────────────────────────────────┐
│                  TEACHER LAYER (Private Per-School)             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            Google Sheet (Master Copy)                     │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌─────────────┐ │   │
│  │  │   Code.gs      │  │  MissionLogs   │  │   Roster    │ │   │
│  │  │  (Router +     │  │    (Sheet)     │  │   (Sheet)   │ │   │
│  │  │   AI Proxy)    │  │                │  │             │ │   │
│  │  └───────┬────────┘  └────────────────┘  └─────────────┘ │   │
│  └──────────┼───────────────────────────────────────────────┘   │
│             │                                                    │
│             ▼ (Web App URL)                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ?view=teacher → Teacher Dashboard                        │   │
│  │  ?view=student  → Student Simulation (default)            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 File Inventory

| File | Purpose | Status |
|------|---------|--------|
| `Code.gs` | Master Apps Script (Router + Backend + Inlined HTML) | ✅ Complete |
| `hybrid_bridge.js` | Transition adapter (Supabase read + Sheet write) | ✅ Complete |
| `config.js` | Config with `SHEET_SCRIPT_URL` | ✅ Updated |
| `go.html` | Student simulation (now with hybrid logging) | ✅ Updated |
| `teachermode.html` | Teacher dashboard (hybrid bridge imported) | ✅ Updated |
| `blobfactory.html` | Blob creation tool (stays on GitHub/Supabase) | 🔜 To Extract |

---

## 🛣️ Roadmap

### Phase 1: Hybrid Bridge (CURRENT) ✅
- [x] Create `hybrid_bridge.js`
- [x] Wire into `go.html` (student logging → Sheet)
- [x] Wire into `teachermode.html`
- [x] Add `SHEET_SCRIPT_URL` to `config.js`

### Phase 2: Stabilization 🔄
- [ ] Test `go.html` end-to-end with deployed Sheet
- [ ] Test `teachermode.html` class/roster management
- [ ] Fix any login/mission loading bugs
- [ ] Verify Devil's Advocate AI proxy through Sheet

### Phase 3: Separation 📂
- [ ] Extract Forge/Builder from `teachermode.html` → `blobfactory.html`
- [ ] Clean `teachermode.html` to deployment-only mode
- [ ] Update `blobfactory.html` with teachermode UI improvements

### Phase 4: Full Sheetification 📦
- [ ] Port `teachermode.html` (non-forge) into `Code.gs` TEACHER_HTML
- [ ] Port `go.html` into `Code.gs` STUDENT_HTML (mostly done)
- [ ] Create "Master Template Sheet" with pre-configured tabs
- [ ] Write teacher-facing "Make a Copy" documentation

### Phase 5: Distribution 🌐
- [ ] Publish Master Template Sheet (View Only)
- [ ] Create video walkthrough for teachers
- [ ] Add in-app setup wizard for API key

---

## 🔐 Security Model

| Data | Location | Access |
|------|----------|--------|
| Mission Content | GitHub / Supabase | Public (read-only) |
| Student Logs | Teacher's Google Sheet | Teacher only |
| Gemini API Key | Script Properties (Vault) | Invisible |
| Class Roster | Teacher's Google Sheet | Teacher only |

---

## 🧪 Testing Checklist

### Deploy Code.gs
1. Create new Google Sheet
2. Extensions → Apps Script
3. Paste `Code.gs` contents
4. Deploy → New Deployment → Web App
5. Copy URL

### Configure Clients
1. Add URL to `config.js` as `SHEET_SCRIPT_URL`
2. Open `go.html` in browser
3. Complete a mission step
4. Check Sheet for "MissionLogs" tab

### Verify AI Proxy
1. Open `?view=teacher` on deployed URL
2. Enter password (`admin` or `sovereign`)
3. Open CONFIG → Enter Gemini API Key → Save
4. Return to student view, trigger Devil's Advocate
5. Confirm AI response appears

---

## 📝 Teacher Setup Instructions (Final)

1. **Get the Kit**: Open [Master Template](URL_TBD) → File → Make a Copy
2. **Deploy**: Extensions → Apps Script → Deploy → New Deployment → Web App
3. **Authorize**: Click through "unverified app" warning
4. **Get URLs**:
   - Students: `https://script.google.com/.../exec`
   - Teacher: `https://script.google.com/.../exec?view=teacher`
5. **Optional AI**: In teacher view, enter Gemini API key

---

*Last Updated: 2026-01-07*
