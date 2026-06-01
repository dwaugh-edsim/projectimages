# Sunrise Wharf — Improvement Ideas

*Generated from full review of sunrise_wharf.html (1481 lines, monolithic single-file app)*

---

## 1. Content

### 1.1 Missing bibliography entries
Several [cite: XX] references in the body text have no matching entry in BIBLIOGRAPHY. Students clicking those superscripts get nothing. Gaps found:

| Cite ID range | Appears in | Missing from bibliography |
|---|---|---|
| 5, 7-8, 11-17 | Slide 1 | — |
| 22, 25-30 | Slide 2 | — |
| 33-36, 38-39, 41-42, 45-47, 49-54 | Slide 3 | — |
| 57-58, 60-63, 65-67, 69-71, 73-75 | Slide 1/3 | — |
| 77-85, 87-89, 92-97, 99-101, 103 | Slide 3/4 | — |
| 105-110, 113-114, 116-118, 120-122, 124-132 | Slide 4/5 | — |
| 134-136, 138-140, 142-148, 151-159 | Slide 5 | — |
| 161-179 | Slide 6 | — |

**Fix:** Either add the missing sources or remove the orphaned [cite:] tags. A quick audit script could flag these automatically.

### 1.2 Full Box theory — one more sentence
The three-bullet explanation is good, but students might miss the connection to the Sparrow test that follows. Add a bridging sentence:
> This Full Box framing is why the Sparrow Test (next unit) matters — if the box is already full, the government bears the burden of proving any restriction is justified.

### 1.3 Municipal bylaws — add what happens if you break them
Slide 3 lists the bylaws well but does not say what the penalty is for non-compliance. Add one line:
> Violation of s4.2-4.11 can result in vessel impoundment, fines up to ,000, and suspension of dock access permits.

This gives students concrete stakes for the legal analysis.

### 1.4 Slide 6 (The Accord) — the three-sentence protocol is vague
The legal tab says the Accord must address three core elements but does not give students a template. Add a fill-in-the-blank scaffold:
> Draft your three-sentence protocol using this structure:
> 1. The Harbour Authority recognizes...
> 2. All vessels operating on the wharf shall...
> 3. Disputes regarding access shall be resolved through...

### 1.5 Honour of the Crown — external links missing rel=noopener
The dotted-underline tooltip works, but target=_blank links should also have rel=noopener noreferrer for security. Currently missing on all external links.

### 1.6 Slide ordering — consider moving The Warning back
Moving the 2020 violence chapter to position 1 is pedagogically bold but may overwhelm students before they understand the characters. Consider:
- **Option A:** Keep it first but add a Skip to Character Intro button for students who want context first.
- **Option B:** Return to original order (Jordan -> Bubs -> Warning) but keep the historical disclaimer on the Warning slide.

---

## 2. Technical Form

### 2.1 Monolithic file — split into modules
Everything is in one 1481-line HTML file. This makes it hard to:
- Version-control content separately from code
- Reuse the engine for other simulations
- Debug JS errors (browser console line numbers are meaningless)

**Proposal:** Split into three files:
`
sunrise_wharf.html   (structure + CSS)
sunrise_wharf.js     (all JS logic)
mission_data.json    (MISSION_DATA + BIBLIOGRAPHY)
`

### 2.2 mdToHtml() is fragile
The markdown-to-HTML converter (line 1408) only handles ##, **, *, and [cite:]. It breaks on:
- Nested formatting (**text with [cite: 1] inside**)
- Lists (ul, li in body text are raw HTML, not parsed)
- Inline HTML (the div, table, a tags in body strings bypass the parser entirely)

**Fix:** Either use a proper library (marked.js, ~15KB) or pre-render all body content as HTML and store it that way.

### 2.3 No error handling for missing images
If images/chapter3.png is missing, the img shows a broken icon with no fallback. Add:
`js
document.getElementById('exhibit-img').onerror = function() {
    this.src = 'images/placeholder.png';
    this.alt = 'Image unavailable';
};
`

### 2.4 Sync function has no retry logic
The sync() function (line 1324) fails silently on network errors. Students lose work if the Google Apps Script endpoint is down. Add:
- Retry with exponential backoff (3 attempts)
- localStorage fallback: save to browser storage, sync when online
- Visual indicator: Saving... -> Saved / Offline - saved locally

### 2.5 Bibliography URLs — entries 18, 90, 91 all point to the same Osler article
Entry 90 is titled Nova Scotia Supreme Court on Deep Consultation but links to a generic Osler article. Verify these are correct.

### 2.6 No content security policy
The page loads external scripts (GSAP, vanilla-tilt, Google Fonts) without a CSP header. Add a meta http-equiv=Content-Security-Policy to prevent XSS if the Google Apps Script endpoint is ever compromised.

### 2.7 Hardcoded API URL in script tag
Line 7: const API_URL = ... is exposed in source. If this is a student-facing app, the endpoint could be scraped. Consider moving it to a server-side proxy or loading it dynamically.

### 2.8 No keyboard navigation
Students cannot tab through options or use Enter/Space to select. Add tabindex=0 and role=button to .option-btn elements, plus keydown handlers.

### 2.9 alert() for validation
Lines 1291 and 1456 use alert() for input validation. This blocks the UI and is inaccessible. Replace with inline error messages.

---

## 3. Display and UX

### 3.1 Hero images — 42vh is too tall on small screens
On a 1366x768 Chromebook, 42vh = ~322px. The image takes up nearly half the viewport, leaving little room for text. Consider:
- height: 35vh on screens < 900px tall
- Collapsible hero: click to expand/collapse the image

### 3.2 Tab labels are inconsistent
The tabs are: Overview | Field Data | Legal Docs | Intel Feed
But the nav rail says: CHAPTER 01: The Warning
And the right panel says: Operational Task

The terminology shifts between military/HUD language and academic language. Pick one register and stick with it. If the aesthetic is Harbour Authority simulation, use:
- Briefing | Evidence | Legal Framework | Intelligence

### 3.3 Right panel — Commit to Protocol auto-advances
Line 1462: after save, it auto-loads the next slide. Students cannot review their previous answers without navigating back manually. Add a Save and Stay option or a Review All button at the end.

### 3.4 No progress indicator
Students do not know how far they are. Add a progress bar or Chapter 3 of 6 indicator in the header or footer.

### 3.5 Footnotes panel — URLs are too long
The footnote list shows full URLs. These wrap poorly and are hard to read. Show the domain only and keep the full URL as a clickable link.

### 3.6 Newspaper briefing — date is dynamic but simulation is set in 2026
Line 1319: the date shows the actual current date. If a student opens this in 2027, the date will be wrong. Pin the date to April 29, 2026.

### 3.7 Splash screen — no Enter key support
Students must click Begin. Add keydown listener for Enter key on the splash screen.

### 3.8 Color contrast — accent blue on dark background
The accent #38bdf8 on bg #030405 has a contrast ratio of ~7.5:1, which passes WCAG AA. But text-dim #94a3b8 on bg is only ~5.1:1, which is borderline. Consider darkening the background or lightening the dim text slightly.

### 3.9 No print stylesheet
If a teacher wants to print the simulation for offline use, the dark theme wastes ink and the layout breaks. Add a @media print block that inverts colors and hides interactive elements.

### 3.10 Mobile — no responsive layout below 900px
The media query at line 636 only handles max-width: 1400px. Below ~900px, the three-column grid collapses poorly. Add a mobile breakpoint that stacks columns vertically and hides the right panel behind a toggle.

---

## 4. Quick Wins (low effort, high impact)

| # | Change | Effort |
|---|--------|--------|
| 1 | Add rel=noopener noreferrer to all target=_blank links | 5 min |
| 2 | Replace alert() with inline error messages | 10 min |
| 3 | Add Enter-key support on splash screen | 2 min |
| 4 | Pin newspaper date to April 29, 2026 | 1 min |
| 5 | Add image onerror fallback | 2 min |
| 6 | Add progress indicator (Chapter 3 of 6) | 15 min |
| 7 | Shorten footnote URLs to domain-only display | 10 min |
| 8 | Add localStorage fallback for sync | 30 min |

---

## 5. Structural Concerns

### 5.1 The simulation has no end state
After slide 6, saveProgress() does nothing special. There is no summary screen, no export of the student protocol, no comparison with peers. Consider adding a Final Review slide that shows all six judgments and rationales side-by-side, with an Export Protocol button.

### 5.2 No teacher dashboard
The Google Apps Script backend saves student state, but there is no interface for teachers to view submissions. This is out of scope for the HTML file but worth noting as a dependency.

### 5.3 The 4-letter passcode is unused
The login screen collects a 4-letter PIN but it is only stored and used for sync lookups. It does not gate access or add security. Consider removing it or explaining its purpose to students.

---

*Review date: 2026-06-01*
*File version: post-67b622a (truncation fixes applied)*
