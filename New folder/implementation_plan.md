# TeacherMode Version Comparison - Missing Functionality Report

## Overview
Comparing **teachermode-old.html** (264KB, 5479 lines, working version from yesterday) with **teachermode.html** (90KB, 1699 lines, new DaisyUI/Tailwind redesign).

The new version has a modern UI redesign but is missing critical functionality.

---

## 📊 **File Statistics**

| Metric | Old Version | New Version | Delta |
|--------|------------|-------------|-------|
| File Size | 264KB | 90KB | **-66% (174KB removed)** |
| Lines | 5,479 | 1,699 | **-69% (3,780 lines removed)** |
| UI Framework | Custom CSS | DaisyUI/Tailwind | Complete redesign |

---

## 🔴 **CRITICAL MISSING FUNCTIONS**

### Narrative Phase Functions
1. **`parseNarrativeResponse(text)`** - MISSING
   - **Purpose**: Extracts structured slide data from AI's narrative prose
   - **Impact**: Without this, slides won't populate from AI output
   - **Location in Old**: Lines ~2640-2740
   - **Features**:
     - Extracts mission title
     - Parses slide blocks (type, title, content, prompts, options)
     - Extracts intelligence tabs (primary, legal, intel)
     - Extracts glossary terms
     - Includes fallback parser for unstructured responses

### Media/Assets Phase Functions
2. **`extractAIPromptsFromHistory()`** - MISSING
   - **Purpose**: Parses markdown tables from AI responses to extract image prompts
   - **Impact**: Image prompts won't auto-populate in Media phase
   - **Location in Old**: Lines ~2613-2637
   - **Features**:
     - Supports both 4-column and 6-column table formats
     - Skips markdown table separator rows
     - Distributes 19 prompts (1 hero + 18 exhibits)

3. **`renderAssetsScreen()`** - MISSING
   - **Purpose**: Renders the 19-slot image grid for Media phase
   - **Impact**: Media phase won't display
   - **Location in Old**: Lines ~2820-2920
   - **Features**:
     - Hero image slot + 18 exhibit slots
     - Shows slide titles from narrative
     - GEN and R2 buttons per slot

4. **`saveAllAssetsToR2()`** - MISSING
   - **Purpose**: Batch uploads all images to Cloudflare R2
   - **Impact**: Users must manually save each image
   - **Location in Old**: Lines ~3144-3183
   - **Features**:
     - Batch processing with progress feedback
     - Delay between uploads to avoid server overload

### Birth Phase Functions
5. **`sanitizeForBirth(data)`** - MISSING
   - **Purpose**: Strips base64 image data from JSON export
   - **Impact**: Exported .blob files will contain huge base64 strings instead of R2 URLs
   - **Location in Old**: Lines ~3367-3407
   - **Features**:
     - Filters out data:image URLs
     - Keeps only R2/HTTP URLs
     - Deep copy to preserve original data

6. **`renderBirthScreen()`** - MISSING
   - **Purpose**: Renders Birth phase validation and JSON preview
   - **Impact**: Birth phase won't display properly
   - **Location in Old**: Lines ~3189-3236
   - **Features**:
     - Validation panel (title, ID, slide count, images)
     - JSON preview
     - Metadata input fields

7. **`downloadBirthedBlob()`** - MISSING (or not using sanitization)
   - **Purpose**: Exports mission as .blob file
   - **Impact**: May export with base64 images if sanitization is missing

### Save/Load System
8. **`saveIdea()`** - MISSING
   - **Purpose**: Saves work-in-progress to Supabase
   - **Impact**: Users can't save their progress
   - **Location in Old**: Lines ~2179-2206

9. **`loadIdea(ideaId, teacherId)`** - MISSING
   - **Purpose**: Loads saved ideas from Supabase
   - **Impact**: Users can't resume previous work
   - **Location in Old**: Lines ~2250-2307

10. **`promptLoadIdea()`** - MISSING
    - **Purpose**: Shows list of saved ideas for selection
    - **Impact**: No UI to access saved work
    - **Location in Old**: Lines ~2217-2251

### UI Enhancement Functions
11. **`updatePhaseBadge(phaseId, badgeText)`** - MISSING
    - **Purpose**: Shows visual feedback (e.g., "10 slides" badge on Narrative phase)
    - **Impact**: No visual confirmation of extraction success
    - **Location in Old**: Lines ~2364-2377

---

## ⚠️ **POTENTIALLY MISSING FEATURES**

### Phase Advancement
- **`advancePhase()`** - EXISTS but needs verification
  - Old version had logic to unlock Birth phase when advancing from Media
  - Need to check if new version has this

### Deep Search Phase
- **`renderDeepSearch()`** - EXISTS (line 851)
  - May have reduced functionality compared to old version
  - Old version had "Tailor Prompt with AI" feature

### Image Generation
- **`generateAsset(slotId)`** - NOT FOUND
  - AI image generation per slot
  - OpenRouter/Flux integration

- **`generateAllAssets()`** - NOT FOUND
  - Batch generate all 19 images

- **`saveAssetToGit(slotId)`** - NOT FOUND
  - Individual R2 upload with JPG conversion

---

## ✅ **WHAT EXISTS IN NEW VERSION**

Functions that appear to be present:
- `switchMainTab(tabName)` - Tab navigation
- `log(msg, type)` - Console logging
- `getCurrentPhase()` - Phase tracking
- `renderPipelineStepper()` - Phase visualizer
- `updateForgeUI()` - Main UI update
- `addForgeChat(role, message)` - Chat display
- `resetForge()` - Reset functionality
- `processForge()` - Main AI processing
- `callAI(prompt)` - AI API calls
- `advancePhase()` - Phase progression
- Google Auth functions
- Workshop/deployment functions
- Curriculum functions

---

## 🎯 **RESTORATION PRIORITY**

### High Priority (Breaks Core Workflow)
1. **`parseNarrativeResponse`** - Without this, the entire Narrative → Media → Birth flow breaks
2. **`sanitizeForBirth`** - Prevents huge binary data in exports
3. **`renderAssetsScreen`** + **`extractAIPromptsFromHistory`** - Media phase won't work
4. **`renderBirthScreen`** - Birth phase won't display

### Medium Priority (Major UX Impact)
5. **`saveIdea`** + **`loadIdea`** + **`promptLoadIdea`** - Can't save/resume work
6. **`saveAllAssetsToR2`** - Tedious to save images one by one
7. **`updatePhaseBadge`** - Helpful visual feedback

### Lower Priority (Nice to Have)
8. **`generateAsset`** + **`generateAllAssets`** - Can use external tools
9. Workshop enhancements
10. Deep Search "Tailor Prompt" feature

---

## 📋 **RESTORATION STRATEGY**

### Phase 1: Core Functionality [COMPLETED]
1. [x] Add `parseNarrativeResponse`
2. [x] Add `sanitizeForBirth`
3. [/] Verify `advancePhase` has Birth unlock logic
4. [x] Add `deployMission` with sanitization (replaced `downloadBirthedBlob`)

### Phase 2: Media Phase [IN PROGRESS]
5. [x] Add `extractAIPromptsFromHistory`
6. [x] Add `renderAssetsScreen` (adapted to DaisyUI)
7. [x] Add image generation functions
8. [x] Add `saveAllAssetsToR2`
9. [ ] Add `GENERATE ALL` and `SAVE ALL` buttons to UI

### Phase 3: Birth Phase [COMPLETED]
10. [x] Add `renderBirthScreen` (adapted to DaisyUI)
11. [x] Verify JSON preview works

### Phase 4: Save/Load System [COMPLETED]
12. [x] Add `saveIdea`, `loadIdea`, `openIdeaLoader` (replaced `promptLoadIdea`)
13. [x] Verify Supabase integration

### Phase 5: Polish [UPCOMING]
14. [ ] Add `updatePhaseBadge` for slide count feedback
15. [ ] Add "Authorize Next Phase" button to main input panel
16. [ ] Add "NEXT PHASE" button to AI chat responses
17. [ ] Test end-to-end workflow

---

## 🔍 **COMPATIBILITY NOTES**

**UI Framework Change**: Old version used custom CSS Grid/Flexbox, new version uses DaisyUI/Tailwind classes. When restoring functions, we'll need to:
- Keep function logic intact
- Adapt HTML generation to use DaisyUI components
- Update class names from custom CSS to Tailwind utilities
- Use DaisyUI modal/alert/button components where appropriate

**Example Adaptation**:
```javascript
// Old: Custom CSS
html += `<div class="asset-slot" style="background:#111; border:1px solid #333;">`;

// New: DaisyUI/Tailwind
html += `<div class="card bg-base-100 border border-base-content/20">`;
```

