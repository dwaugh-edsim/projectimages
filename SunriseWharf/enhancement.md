# Sunrise Harbour — Enhancement Recommendations

*Evaluated against the Mi'kmaw Studies 11 Curriculum Guide (NS, 2016) and the existing simulation architecture.*

---

## How This Document Works

The ZAI recommendations document proposed 10 enhancements. I've reviewed each one against:

1. **The actual curriculum** — inquiry-based, holistic, built around "How am I connected to the First Peoples of Nova Scotia?"
2. **The simulation as it exists today** — 6 chapters, rich sourcing, binary decisions, rationale writing, Google Sheets sync.
3. **Classroom reality** — Grade 11 students, 75-minute blocks, a single HTML file served locally.

Each recommendation below gets a verdict: **ADOPT**, **ADAPT** (take the idea but change it), **DEFER** (good idea but not yet), or **SKIP** (doesn't fit).

---

## 1. Learning Outcomes in the Directive Box

**ZAI says**: Add a bulleted list of formal learning outcomes to the splash screen.

**Verdict: SKIP**

The splash screen we just built speaks directly to students in plain language: *"You run the wharf."* Bolting on a formal outcomes list ("Analyze Treaty rights under the 1760 Treaties and *R. v. Marshall*") would undercut that voice immediately. Students don't read outcomes lists — they skip them. The simulation already *embeds* every one of those outcomes in its chapter structure. The curriculum guide emphasizes inquiry, not upfront objective-posting.

> [!TIP]
> If you need formal outcomes for admin or accreditation, put them in a **separate teacher-facing document** or on the `about.html` page — not in the student interface.

---

## 2. Source Use Requirements

**ZAI says**: Require students to cite at least one source using `[cite: #]` in their rationale.

**Verdict: ADAPT**

The idea is right. The simulation already has a rich bibliography with 40+ sources, and students should be grounding their decisions in evidence. But the `[cite: #]` format is clunky for students who are writing 2–3 sentences in a small textarea.

**Recommended approach**: Add a short prompt above the rationale textarea that says something like:

> *"Back it up. Name at least one thing you read in the tabs that made you pick this."*

This keeps the plain-spoken voice, nudges evidence use, and doesn't require a formal citation syntax. The teacher can assess source use when reading the exported rationales.

**Effort**: Low. One line of text above the textarea, plus a `sourceHint` property per slide if you want it chapter-specific.

---

## 3. Reflection Prompts After Each Decision

**ZAI says**: Add a collapsible reflection panel with questions like "Which perspective did you prioritize?"

**Verdict: ADOPT (simplified)**

This is the strongest recommendation in the document. The curriculum guide's inquiry model depends on students making their thinking visible. Right now students pick an option and write a rationale, but they aren't prompted to name the trade-off they made.

**Recommended approach**: Don't add a separate reflection panel (too much UI clutter). Instead, change the rationale textarea placeholder to rotate per-chapter with a targeted reflection prompt. Examples:

| Chapter | Placeholder Prompt |
|---------|-------------------|
| 1 — The Warning | *"What would you tell the families at Middle West Pubnico about your plan?"* |
| 2 — Jordan's Claim | *"Whose future are you protecting with this choice — and whose are you risking?"* |
| 3 — Bubs's Claim | *"What's the trade-off you're accepting here?"* |
| 4 — Role of Elders | *"Could this work if the Elder and the Mayor don't trust each other?"* |
| 5 — Living Treaty | *"Is a 260-year-old promise more powerful than a 2026 bylaw? Why?"* |
| 6 — The Accord | *"Would Jordan sign this? Would Bubs? Why or why not?"* |

This is one new data property per slide and zero new UI elements.

**Effort**: Low. Add a `reflectionPrompt` string to each slide in `MISSION_DATA`, and use it as the textarea placeholder in `loadSlide()`.

---

## 4. Decision Category Tags

**ZAI says**: Tag each decision with a domain label (GOVERNANCE, RIGHTS, SAFETY, etc.).

**Verdict: SKIP**

This is an academic categorization exercise that adds visual noise without deepening student thinking. The chapters already have descriptive titles ("Jordan's Claim", "Living Treaty") that signal the domain. A `DECISION DOMAIN: GOVERNANCE` badge feels like UI decoration, not pedagogy.

---

## 5. Enhanced Final Protocol Task

**ZAI says**: Add a structured 7th slide with sentence starters ("The Harbour Authority recognizes...") and curriculum outcome connections.

**Verdict: ADOPT (already partially exists)**

Chapter 6 already contains this exact scaffold in its Legal tab:

> 1. The Harbour Authority recognizes...
> 2. All vessels operating on the wharf shall...
> 3. Disputes regarding access shall be resolved through...

The simulation doesn't need a separate 7th slide — it needs to make Chapter 6 feel like the **culmination**. Two small changes would do this:

1. **Lock Chapter 6** until at least 4 of 5 previous chapters have been committed. This prevents students from skipping straight to the end.
2. **Expand the Chapter 6 rationale box** — allow a longer response (increase min character count, maybe use a larger textarea) since this is the final protocol.

**Effort**: Medium. Add a `chaptersCompleted` check before unlocking slide 6, and conditionally resize the textarea.

---

## 6. Role Cards

**ZAI says**: Let students pick from 5 different roles (Chair, Treaty Harvester, Commercial Fisher, Elder, Mediator).

**Verdict: DEFER**

This is a strong idea for a future version, but implementing it now creates significant problems:

- The entire simulation is written *from the Chair's perspective*. Every chapter prompt, every option label, and every rationale question assumes you're the neutral arbiter. Switching to "Mi'kmaw Treaty Harvester" without rewriting all the prompts would feel hollow.
- It doubles the assessment burden — the teacher now needs to evaluate whether a student's response is consistent with their chosen role, not just whether it's evidence-based.
- The curriculum guide emphasizes understanding *multiple* perspectives, not adopting a single one. The Chair role already forces this by making students weigh competing claims.

> [!IMPORTANT]
> **If you want role-play later**: Build it as a separate "Advanced Mode" where the same 6 chapters are re-framed from each perspective. This is a semester project, not a quick add.

---

## 7. Content Note

**ZAI says**: Add a yellow warning box about sensitive content at the top of the directives splash.

**Verdict: ADAPT**

A content note is responsible practice. But the ZAI version reads like a legal disclaimer ("This is a learning exercise, not a game about 'sides' winning"). That tone clashes with the direct voice we established.

**Recommended approach**: Add one sentence to the existing directive box, woven into the narrative:

> *"Fair warning: what you're about to read includes real events — arson, threats, gear destruction. It happened to real people. Treat it that way."*

This maintains the voice, respects the gravity of the content, and doesn't break immersion with a yellow warning banner.

**Effort**: Minimal. One sentence added to the `#directives-box` HTML.

---

## 8. Exit Ticket

**ZAI says**: Pop up a two-question exit ticket after the final chapter.

**Verdict: ADOPT**

This is practical and curriculum-aligned. The inquiry model benefits from a quick synthesis check. But the ZAI implementation (a full-screen modal with two textareas) is heavier than it needs to be.

**Recommended approach**: After the student commits Chapter 6, show a brief completion screen in the center deck (not a modal overlay) with:

1. *"Name one thing the Harbour Authority must get right or this Accord fails."*
2. *"What's the hardest part of this job that no protocol can fix?"*

Save these responses to the same Google Sheets backend. This gives the teacher a snapshot of each student's synthesis without adding another modal layer.

**Effort**: Medium. New `showCompletion()` function, two textareas, one additional sync call.

---

## 9. Debrief Discussion Prompt

**ZAI says**: Add a green panel with small-group discussion questions.

**Verdict: ADOPT (on completion screen)**

This belongs on the completion screen from #8, not embedded in a chapter. After a student submits their exit ticket, show a static panel:

> **Talk it out.** Find someone who picked a different option on Chapter 2 or 3. Ask them why. See if you can explain their reasoning better than they can.

This is more engaging than a generic "compare your accords" prompt because it targets specific chapters where students likely diverged.

**Effort**: Minimal. Static HTML on the completion screen.

---

## 10. Civic Learning Question

**ZAI says**: Add a question connecting the simulation to real-world civic engagement.

**Verdict: SKIP (for the simulation itself)**

This is a teacher discussion question, not a student interface element. The simulation should end with the exit ticket and debrief prompt. The "What would change if this were a real wharf?" conversation happens in the classroom, not on screen. Putting it in the simulation risks making the ending feel like a worksheet.

---

## Assessment Rubric

**ZAI says**: Build a four-tier rubric (Exemplary / Proficient / Developing / Emerging) into the simulation.

**Verdict: DEFER (create separately)**

The rubric categories ZAI proposed are solid:
- Accuracy of facts & source use
- Quality of reasoning & justification
- Demonstration of multiple perspectives
- Quality of protocol & reflection

But a rubric belongs in a **teacher-facing document**, not in the student simulation. Build it as a separate PDF or Google Doc that maps each rubric row to the specific chapter data that gets exported to Google Sheets. This way the teacher has a marking guide that directly references the student output.

---

## Summary: What to Build

| # | Enhancement | Verdict | Effort |
|---|------------|---------|--------|
| 1 | Learning outcomes list | SKIP | — |
| 2 | Source nudge in rationale | ADAPT | Low |
| 3 | Per-chapter reflection prompts | ADOPT | Low |
| 4 | Decision category tags | SKIP | — |
| 5 | Chapter 6 gate + expanded textarea | ADOPT | Medium |
| 6 | Role cards | DEFER | — |
| 7 | Content note (one sentence) | ADAPT | Minimal |
| 8 | Exit ticket on completion screen | ADOPT | Medium |
| 9 | Debrief prompt on completion | ADOPT | Minimal |
| 10 | Civic question | SKIP | — |
| — | Assessment rubric (separate doc) | DEFER | — |

### Recommended Build Order

1. **Content note sentence** → drop into `#directives-box` (5 minutes)
2. **Source nudge + reflection prompts** → add `sourceHint` and `reflectionPrompt` to each slide, update `loadSlide()` to set textarea placeholder (30 minutes)
3. **Chapter 6 gating** → add completion check before unlocking final chapter (30 minutes)
4. **Completion screen with exit ticket + debrief** → new `showCompletion()` function after Ch6 commit (1 hour)

**Total estimated effort: ~2 hours of development.**

---

*Prepared by Antigravity based on evaluation of ZAI/Perplexity recommendations against the Mi'kmaw Studies 11 Curriculum Guide (NS, 2016) and the current sunrise_wharf.html simulation.*
*Date: June 2, 2026*
