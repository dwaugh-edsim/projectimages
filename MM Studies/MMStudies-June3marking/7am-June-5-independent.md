# 7am · June 5 · Independent Project Descriptions

## What I did
- Read `blockA-C-June5.csv` (2,511 rows) and filtered to rows where the simulation is `Independent Project - Description Draft`.
- Deduplicated by `(block, student)`, keeping the **most recent timestamp** for each (the CSV is full of `INCREMENTAL_SAVE` auto-saves, so this drops keystroke noise and keeps the student's final draft).
- Parsed the `rationales` JSON to pull out `title` and `description`.
- Wrote a printable HTML template at `independentdescriptions.html`.

## What you get
`independentdescriptions.html` — 19 cards, styled like **gallery wall text** (think museum placard, not recipe card):
- Cream paper, charcoal ink, Cormorant Garamond serif for the title/description, Inter for the meta.
- Thin double-rule frame (outer + hairline inner) — classic museum-label look.
- Eyebrow line: `INDEPENDENT PROJECT · MI'KMAW STUDIES 11`
- A small fleuron ornament between eyebrow and title.
- Italic byline under the title, divider, then the description in justified-friendly serif.
- Footer with the student's block and term.

## How to print
- Open the HTML in a browser. There are four toolbar buttons:
  - **Print** — send to printer (default is screen grid view).
  - **Gallery view** — 2-column screen layout.
  - **Card grid** — auto-fill responsive grid (default).
  - **One card per page** — preview at 5×7 in, one card per page.
- For printable individual cards: click **One card per page**, then **Print**. The `@page` rule is `letter` with 0.5″ margins and each card is sized to 5×7 in, one per page, with a `page-break-after` between cards.
- For an overview poster of all cards: leave it in **Card grid** mode and print — each card stays on its own row but multiple cards per sheet is fine.

## To re-use this template with new data
The script `build_html.py` (in temp) reads the CSV and rebuilds the HTML. To repopulate, just re-run it after the CSV updates. The JS `DATA` array is inlined into the page, so the HTML is fully self-contained — no network calls, no external deps beyond the Google Fonts link (Inter + Cormorant Garamond).

## Caveats / things to double-check
- **DAVE (ABBA)** in A Block submitted a description titled **"REILEY'S ART PROJECT"** — confirmed by user to be a joke, disregard.
- A few students left `title` blank. For those, the template falls back to the first line of the description, truncated to 80 chars. Affected students: **Kyle Parsons, KOEN, Sophie, Caleb**. If you want a manual title for these, edit the `title` field in the inlined `DATA` array at the bottom of the HTML.
- **Empty descriptions** were filtered out — no card is shown for students who never wrote anything.
- The description text preserves the students' original whitespace, typos, and informal spelling (e.g. "meseccasary", "abbacasary", "Canadiens"). This is gallery-authentic, but flag if you want a proofread pass.

## Counts
- **A Block (Waugh):** 7 students
- **C Block (Waugh):** 12 students
- **Total:** 19 cards

## Files touched
- ✏️ Created: `independentdescriptions.html`
- 📝 Created: `7am-June-5-independent.md` (this file)
- 📖 Read: `blockA-C-June5.csv`
- 📖 Read: `Independentprojects/student-appraisals.html` (style reference)
