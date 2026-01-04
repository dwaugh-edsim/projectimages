# Teacher's Quick Start Guide
## Critical Juncture Operations (v76)

This guide gets you creating missions in 10 minutes. For technical details, see `PROJECT_DOCUMENTATION.md`.

---

## 🚀 Getting Started

### Step 1: Open Teacher Mode
Go to: **[teachermode.html](https://dwaugh-edsim.github.io/projectimages/HTMLs/teachermode.html)**

### Step 2: Sign In
Click the Google sign-in button. Your email must be on the authorized teacher list.

### Step 3: Enter the Forge
Click **"CREATE // NEW MISSION"** to start building.

---

## 🔨 The 5-Phase Mission Forge

### Phase 1: BRAINSTORM 💡
**Screen**: Chat view

**What to do**:
1. Select your **Country → Region → Course** from the dropdowns
2. Check the **curriculum outcomes** that apply to your mission
3. Type your mission idea in the **Idea Box**
4. Click **SUBMIT COMMAND**
5. The AI will propose **3 scenario concepts**
6. Refine with follow-up messages until you have one solid direction
7. Click **AUTHORIZE NEXT PHASE →**

**Example input**: *"I want a mission about the Cuban Missile Crisis where students are Kennedy advisors deciding whether to blockade, invade, or negotiate."*

---

### Phase 2: DEEP SEARCH 🔍
**Screen**: Chat view

**What to do**:
1. Discuss the mission architecture with AI
2. Define the **10-slide structure**
3. Identify primary sources and evidence types
4. Click **AUTHORIZE NEXT PHASE →**

---

### Phase 3: NARRATIVE 📝
**Screen**: Chat view

**What to do**:
1. Work through each slide's content
2. Create tab content:
   - **PRIMARY**: Historical documents, photos
   - **LEGAL**: Laws, policies, treaties
   - **INTEL**: Analysis, context, interpretations
3. Design **decision checkpoints** where students must choose
4. Click **AUTHORIZE NEXT PHASE →**

---

### Phase 4: ASSETS 🎨
**Screen**: Grid view (19 slots)

**What to do**:
1. **Hero Slot**: The main splash/cover image
2. **S1A through S9B**: Two images per slide (primary + alternate)

**For each slot**:
- **Option A**: Paste a URL (Unsplash, Wikimedia, YouTube, PDF, etc.)
- **Option B**: Enter an AI prompt and click **⚡ GEN** to generate
- **Option C**: Click **R2** to permanently save to cloud storage

**Tips**:
- Historical photos work best as pasted URLs
- AI generation is great for abstract concepts or reconstructions
- Click **⚡ GENERATE ALL** to batch-generate all slots with prompts

---

### Phase 5: BIRTH 🧬
**Screen**: Review view

**What to do**:
1. Review the **Validation Checklist**:
   - ✓ Mission Title
   - ✓ Mission ID
   - ✓ 10 Slides
   - ✓ Images assigned
   - ✓ Glossary terms
2. Fix any issues by going **BACK**
3. Choose your export:
   - **BIRTH TO JSON**: Generate final mission data
   - **DOWNLOAD .BLOB**: Save locally for backup
   - **DEPLOY TO COMMAND CENTER**: Publish to student system

---

## 💾 Save Your Work

### Save In-Progress
At any phase, click **SAVE IDEA** in the header:
- Enter a name (e.g., "Cuban Missile v2")
- Saves your current phase, chat history, and all data
- Works even if you close the browser

### Resume Later
Click **LOAD IDEA**:
- See list of your saved ideas
- Click one to restore exactly where you left off

---

## 🖼️ Image Sources

### Free Stock Images
- [Unsplash](https://unsplash.com) - High quality photos
- [Pexels](https://pexels.com) - Free stock photos
- [Wikimedia Commons](https://commons.wikimedia.org) - Historical images

### Primary Documents
- [Library of Congress](https://loc.gov) - US historical documents
- [National Archives](https://archives.gov) - Government records
- [British Library](https://bl.uk) - UK historical materials

### AI Generation
- Built-in **Flux 2 Pro** via OpenRouter
- First use prompts for API key (get free credits at [openrouter.ai](https://openrouter.ai))
- Best for: Reconstructions, abstract concepts, custom illustrations

---

## 🎯 Tips for Great Missions

### Structure
- **Slide 1**: Hook/introduction with compelling image
- **Slides 2-4**: Build context and evidence
- **Slide 5**: First decision point
- **Slides 6-8**: Consequences and new evidence
- **Slide 9**: Final decision or reflection
- **Slide 10**: Debrief/historical outcome

### Evidence Tabs
- **PRIMARY**: "Source X shows that..."
- **LEGAL**: "According to the treaty/law..."
- **INTEL**: "Analysts believe..." or "In hindsight..."

### Decision Points
- Give 2-3 clear choices
- Make each choice defensible with evidence
- Avoid obvious "right" answers
- Require written rationale citing specific evidence

---

## 👥 Student Access

Once published, students access missions at:
**[simroom_LIVE.html](https://dwaugh-edsim.github.io/projectimages/HTMLs/simroom_LIVE.html)**

They'll need:
- Their name
- 6-digit PIN (you assign these)
- Mission selection from the lobby

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Not authorized" on login | Contact admin to add your email to allowlist |
| Image won't generate | Check OpenRouter key in browser console |
| R2 upload fails | Verify worker is deployed at correct URL |
| Phase won't advance | Check if AI response completed, try SKIP TO BIRTH |
| Can't find saved idea | Check if you're logged in as same Google account |

---

## 📚 More Resources

- **Full Documentation**: `PROJECT_DOCUMENTATION.md`
- **Test Suite**: `test_integration.html` (verify API connections)
- **Image Forge**: `image_forge.html` (standalone batch generator)
- **Schema Reference**: `capsule_schema.md` (mission JSON structure)

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` (in Idea Box) | Submit command |
| `Ctrl+S` | Save idea (when focus in forge) |

---

**Questions?** Check the PROJECT_DOCUMENTATION.md or reach out to your admin.

**Your terminal is now an Archive of Decision. Build bravely. 🦾🏛️⚔️📜**
