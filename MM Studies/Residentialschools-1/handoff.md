# Handoff: Nora Bernard Project — MMIWG Enhancement

**Source file:** `nora_bernard_project.html`  
**Inspiration doc:** `reddress-1.txt`  
**Goal:** Weave the MMIWG (Missing & Murdered Indigenous Women & Girls) national crisis into the existing gamified investigation workspace, grounding it in Nora Bernard's specific Mi'kmaw story.

---

## Current State of the HTML

The workspace has **6 Evidence Logs** (slides) navigated via a left sidebar:

| Log | Title | Key Content |
|-----|-------|-------------|
| LOG 01 | Incident Briefing: Historical Origins | Shubenacadie school history, dual admin structure, redacted facts |
| LOG 02 | Deprivation & Neglect | Malnutrition, student deaths table (23 names), case testimonies |
| LOG 03 | Litigation & Mobilization | Nora's biography, Indian Act "marrying out", class-action timeline |
| LOG 04 | Cultural Testimony & Resilience | Rita Joe's "I Lost My Talk" — interactive clickable stanza analysis |
| LOG 05 | Inquiry Pathway | 7 pathway options (A–G) with dynamic form fields |
| LOG 06 | Case Archival & Submission | Review all responses + final submit to Google Sheets API |

The app has student login (block/name/PIN), autosave to Google Sheets, local storage fallback, GSAP animations, and a gamified "classified investigation" aesthetic.

---

## Planned Enhancements (from reddress-1.txt)

### 1. New LOG 05: MMIWG Connection (insert before current Pathway slide)
- **Re-number** all subsequent logs: current LOG 05 → LOG 06, current LOG 06 → LOG 07
- New LOG 05 content:
  - **Thematic Bridge Table** — 5-row table linking Nora Bernard project elements to MMIWG curriculum outcomes (G5, C1, C2, C3, E2)
  - **Framing callout:** "Nora Bernard isn't just a residential school story — she is a Mi'kmaw woman whose life and death embody the intersections of colonial policy, gender-based discrimination, intergenerational trauma, and resilient leadership."
  - **Interactive Comparative Case Study** — side-by-side cards for Nora Bernard vs. Annie Mae Aquash (or Charisma Denny), with guiding question: *What patterns of systemic failure do we see? What forms of resistance emerge?*
  - **MMIWG Timeline Extension** — add milestones (1990s survivor testimonies, 2004 Sisters in Spirit launch, 2014 NWAC report, 2019 Final Report "Reclaiming Power and Place") alongside the existing Nora/Shubenacadie timeline
  - **New inquiry question (ans-q5):** *How does Nora Bernard's life and murder connect to the broader MMIWG crisis? What does her story reveal about the intersection of colonial policy and gender-based violence against Indigenous women?*

### 2. New Pathway H: MMIWG Calls for Justice
- Add to the pathway `<select>` in LOG 06 (formerly LOG 05):
  - `Pathway H: MMIWG Calls for Justice Action`
- Dynamic fields for Pathway H:
  - Choose one Call for Justice (dropdown: education / memorialization / supporting families / police accountability)
  - Design a Mi'kmaw-centered school or community action (e.g., Red Dress display, advocacy letter to MLA, NSNWA partnership proposal)
  - 200-word rationale connecting the chosen Call to Nora's story

### 3. Extend the LOG 03 Timeline (Nora's litigation timeline)
- Add MMIWG milestones *after* the 2008/2022 posthumous honours entry:
  - **2004** — Native Women's Association of Canada launches *Sisters in Spirit* to document MMIWG cases
  - **2014** — NWAC releases report documenting 582 cases of missing/murdered Indigenous women
  - **2016** — National Inquiry into MMIWG formally launched
  - **2019** — Final Report *"Reclaiming Power and Place"* released, calling the crisis a genocide; 231 Calls for Justice issued

### 4. "Two Ways I Talk" Art Project Callout (LOG 04 — Rita Joe slide)
- After the existing poem interactive area, add a **project callout box**:
  - Title: `CREATIVE RESPONSE: Two Ways I Talk`
  - Prompt: *Inspired by Stanza 3 ("Two ways I talk"), create a dual-panel artwork: one side showing silencing (residential school/MMIWG erasure), the other showing reclamation (language, art, advocacy). Include a Mi'kmaw word or phrase.*
  - Link to Mi'kmawey Debert archives for language reference
  - This feeds into Pathway H or stands alone as a creative extension

### 5. Persistent Crisis Support Resources Banner
- Add a discreet but visible **support resources bar** — either:
  - A collapsible panel in the sidebar footer (preferred — low visual disruption), or
  - A fixed slim banner at the bottom of the workspace
- Content:
  - **Mi'kmaq Crisis & Referral Line:** 1-855-379-2099
  - **MMIWG National Support Line:** 1-844-413-6649
  - **NCTR Support:** 1-877-534-1058

### 6. Update the Mission Briefing Overlay
- Current briefing leads with "build the evidence base for the lawsuit."
- Revise to lead with **resistance** before harm (per trauma-informed guidance):
  > *"Nora Bernard was a strategist who changed Canadian law. Your mission begins with understanding how she fought back — and then investigating the systems that made her fight necessary."*
- Add a note: *"This investigation touches on difficult themes. Support resources are available in the sidebar at any time."*

### 7. JavaScript / State Updates
- Add `ans-q5` textarea to `gatherState()`, `restoreState()`, `updateNavCompleteness()`, `updateReviewSlide()`
- Add Pathway H fields to the pathway input gathering logic
- Update nav sidebar: add `nav-step-4` for new MMIWG LOG, shift existing nav items to indices 5 and 6
- Update `totalSlides` count: 6 → 7
- Update "Evidence Log X of 6" labels: LOG 05 text → "Evidence Log 5 of 7", LOG 06 → "6 of 7", LOG 07 → "7 of 7"
- Update review slide to show 6 items (add LOG 05 MMIWG response)

---

## Files to Modify

| File | Change |
|------|--------|
| `nora_bernard_project.html` | All changes above — new slide HTML, updated nav, extended timeline, new pathway, support banner, JS updates |

## Files Referenced (read-only)

| File | Role |
|------|------|
| `reddress-1.txt` | Source of all enhancement ideas |

---

## Curriculum Outcomes Addressed by Enhancements

| Outcome | How |
|---------|-----|
| **G5** — Evaluate adverse effects of discriminatory policies | MMIWG bridge table, Indian Act "marrying out" policy analysis |
| **C1** — Colonial legislation targeting Indigenous women | Pathway H Calls for Justice, Comparative Case Study |
| **C2/C3/C4** — Storytelling as resistance and healing | "Two Ways I Talk" art project, Rita Joe ↔ MMIWG families |
| **E2** — Systemic devaluation of Indigenous life | MMIWG timeline, Shubenacadie deaths → MMIWG pipeline |
| **Citizenship Competency** | Action proposal in Pathway H, NSNWA partnership design |

---

## Critical Guidance (from reddress-1.txt)

> ⚠️ **Trauma-Informed Sequencing:** Always lead with resistance/organizing before delving into MMIWG violence. Pair difficult content with strength, community, and solutions.

> ⚠️ **Avoid "Victim-Only" Narratives:** Frame both topics through sovereignty, resilience, and leadership. Nora wasn't just a survivor — she was a strategist. MMIWG families aren't just grieving — they are leading a national movement.

> ⚠️ **Localize:** Keep focus on Nova Scotia and Mi'kma'ki — Shubenacadie, Millbrook First Nation, NSNWA, Mi'kmawey Debert Cultural Centre.
