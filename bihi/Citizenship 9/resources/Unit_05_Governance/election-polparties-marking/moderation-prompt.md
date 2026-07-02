# Moderation Prompt for Citizenship 9 Election Grading

Copy the text below and paste it into a new LLM session. Attach or link the marking guide and grading materials so the LLM can review the work.

---

## The Prompt

You are reviewing the outcome-based grading of a Grade 9 Citizenship election simulation. The unit covered three outcomes from Unit 5: Governance:
- **5.1 Issue Valuation** — how issues become valued in government/society
- **5.2 Government Structure** — structure, operation, and selection of government in Canada
- **5.3 Democratic Engagement** — strategies to meaningfully engage in a democratic process

Students were graded 1–4 on each outcome, with the following scale:
- **4** = Fully committed, completed role, contributed meaningfully
- **3+** = Strong engagement with standout moments
- **3** = Some meaningful engagement, decent understanding
- **2+** = Emerging engagement, some contribution but limited depth (minimum floor for participation)
- **2** = Very little done, shallow or perfunctory
- **1+** = Marginal presence
- **1** = Essentially absent

The grading was done by a teacher using the following evidence hierarchy:
1. Teacher observation (primary)
2. Work submissions (platforms, slides, opposition research, speeches)
3. Town Hall question data (42 questions submitted during Final Four debate)
4. Reflection responses (4-question post-election Google Form)
5. Party platform quality (party-level, mapped to individuals)
6. Voting data (engagement evidence only, NOT a grading factor)

**Your task is to moderate the grades.** Specifically:

1. **Read the marking guide** at the provided file path. It contains the file locations for all evidence artifacts and the grading rationale.

2. **Read the grading matrix** — the full student-by-student breakdown with grades, justifications, and evidence quotes.

3. **Read the student feedback HTML** — the personalized feedback each student will see.

4. **For each student, check:**
   - Is the grade supported by the evidence cited?
   - Is the justification specific enough? Does it reference actual student work or quotes?
   - Is the grade consistent with the evidence hierarchy? (Teacher observation > Town Hall data > reflections > platform quality)
   - Does the feedback in the HTML match the grade and justification in the matrix?
   - Are there any students whose grade seems too high or too low given the evidence?
   - Are there any students who were underweighted or overweighted?

5. **Flag any concerns** with:
   - Specific student name
   - Which outcome (5.1, 5.2, or 5.3)
   - What the issue is (grade too high/low, justification weak, feedback doesn't match)
   - What evidence you would need to resolve the concern
   - A suggested alternative grade if applicable

6. **Also check for:**
   - Consistency across the class (are similar levels of effort getting similar grades?)
   - Students who were noted as "major participants" by the teacher — are their grades reflecting that?
   - Students who were largely absent — are their grades appropriately low?
   - The Town Hall question data — were students who asked many questions appropriately recognized?
   - Students without reflections — were they graded based on other evidence fairly?

7. **Provide a moderation report** with:
   - Summary of overall grade distribution
   - List of any grades you would change (and why)
   - List of any justifications that need strengthening
   - List of any feedback mismatches between matrix and HTML
   - Any patterns or concerns across the class
   - An overall verdict: Are these grades defensible? Sound? Fair?

**Important context:**
- This is a Grade 9 class. Grammar and spelling should not affect grades — understanding is the focus.
- Group dynamics affected platform completeness (missing students, uneven motivation). Individual grades should reflect individual contribution, not just party success.
- Vote counts are NOT a grading factor. Junior-high social dynamics, not platform quality, drove vote outcomes.
- The ICA written test (April 17) is a SEPARATE assessment piece. Do not use ICA scores or feedback.
- Teacher observation is the primary evidence. The teacher knows who showed up and who drove the work.

**File paths** (all under the project root):
- Marking guide: `Cit9/election-polparties-marking/marking-guide.html`
- Grading matrix: `Cit9/election-polparties-marking/election-grading-matrix.md`
- Student feedback: `Cit9/election-polparties-marking/election-feedback.html`
- Student list: `Cit9/election-polparties-marking/student-list.csv`
- Reflection responses: `Cit9/election-polparties-marking/election-reflection-1.csv`
- Town Hall data: `Cit9/election-polparties-marking/Cit9 Politics.xlsx` (TH_Questions sheet)
- Party platforms: `HTMLs/political-spectrum/party-summaries.md` or `HTMLs/political-spectrum/opposition-research.html` (embedded)
- Town Hall votes (context only): `HTMLs/political-spectrum/Cit9 Politics - TH_Votes.csv`
- Roster with PINs: `HTMLs/political-spectrum/Code.gs` (lines 53–81)
- Unit context: `HTMLs/political-spectrum/INSTRUCTION-DOCUMENT.md`, `HTMLs/political-spectrum/Campaign_Trail_Assignment.md`
- Final 4 slides (with author credits): `HTMLs/political-spectrum/assets/Final4/*.jpg`
- Foundational outcomes: `Cit9/PerceptionVsReality/Foundational_Outcomes.md`

Be thorough, specific, and fair. This is real assessment work that will be shared with students.
