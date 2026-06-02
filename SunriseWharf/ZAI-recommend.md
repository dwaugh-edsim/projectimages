# ZAI Recommendations for Sunrise Harbour Simulation
## Mi'kmaw Studies 11 Enhancement Plan

---

## Executive Summary

This simulation is a strong foundation for Mi'kmaw Studies 11. It effectively matches the course's inquiry focus, uses multiple perspectives, and connects history to contemporary treaty implementation issues. The current implementation is well-designed but could be strengthened with explicit learning outcomes, deeper reflection prompts, and structured assessment components.

---

## Current Strengths

### What Works Well
- **Scenario-based learning**: Students make decisions rather than passively reading content
- **Multiple perspectives**: Jordan (Mi'kmaw harvester) and Bubs (commercial fisher) provide balanced viewpoints
- **Historical thinking concepts**: Evidence, perspective, cause/consequence, and moral judgment are embedded
- **Rich source material**: Extensive bibliography with primary and secondary sources across multiple tabs
- **Professional UI**: Modern, immersive design that engages students
- **Curriculum alignment**: Naturally supports units on governance, culture, education, and spirituality
- **"Draft an accord" format**: Excellent for assessment requiring evidence-based justification

---

## Priority Recommendations

### 1. Make Learning Outcomes Explicit

**Current State**: Learning objectives are implicit in the simulation flow.

**Recommendation**: Add a clear "Learning Outcomes" section at the beginning of the directive box.

**Suggested Implementation**:
```html
<div style="background: rgba(56, 189, 248, 0.08); border-left: 3px solid var(--accent); padding: 16px; margin: 20px 0;">
    <h4 style="color: var(--accent); margin: 0 0 10px 0; letter-spacing: 1px;">LEARNING OUTCOMES</h4>
    <ul style="margin: 0; padding-left: 20px; line-height: 1.6; font-size: 0.85rem;">
        <li>Analyze Treaty rights under the 1760 Treaties and <em>R. v. Marshall</em> decision</li>
        <li>Compare multiple perspectives on wharf governance and resource management</li>
        <li>Propose a shared governance protocol that balances rights, safety, and reconciliation</li>
        <li>Evaluate evidence from primary and secondary sources to justify decisions</li>
    </ul>
</div>
```

**Placement**: Add to the `#directives-box` section, before the briefing content.

---

### 2. Add Source Use Requirements

**Current State**: Sources are available but no explicit requirement to cite them.

**Recommendation**: Add a "Source Use" prompt for each chapter to ground decisions in evidence.

**Suggested Implementation**:
```javascript
// Add to each slide object in MISSION_DATA
"sourceRequirement": "Use at least one source from the Field Data, Legal Docs, or Intel Feed tabs to support your choice. Reference it in your rationale using [cite: #]."
```

**UI Addition**: Display this prompt above the rationale textarea:
```html
<div style="font-size: 0.75rem; color: var(--text-dim); margin-bottom: 8px; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 4px;">
    <strong>Source Requirement:</strong> Use at least one source from the tabs. Reference using [cite: #] in your rationale.
</div>
```

---

### 3. Add Reflection Prompts After Each Decision

**Current State**: Students write a rationale but no structured reflection on their thinking process.

**Recommendation**: Add reflection questions to deepen historical thinking and make reasoning visible.

**Suggested Implementation**:
```javascript
// Add to each slide object
"reflectionQuestions": [
    "Which perspective did you prioritize in this decision?",
    "What specific evidence influenced your choice?",
    "What trade-off did you accept?"
]
```

**UI Addition**: Add a collapsible "Reflection" section below the rationale:
```html
<div id="reflection-panel" style="margin-top: 15px; border-top: 1px solid var(--border); padding-top: 15px;">
    <div style="font-size: 0.75rem; color: var(--accent); margin-bottom: 10px; letter-spacing: 1px;">REFLECTION (OPTIONAL)</div>
    <textarea id="student-reflection" placeholder="Which perspective did you prioritize? What evidence influenced you? What trade-off did you accept?" style="min-height: 80px;"></textarea>
</div>
```

---

### 4. Add Decision Category Tags

**Current State**: Decisions are binary (Option A/Option B) without categorization.

**Recommendation**: Help students identify the domain of each decision (rights, safety, economics, governance, reconciliation).

**Suggested Implementation**:
```javascript
// Add to each slide object
"decisionCategory": "GOVERNANCE" // or "RIGHTS", "SAFETY", "ECONOMICS", "RECONCILIATION"
```

**UI Addition**: Display category above the interaction prompt:
```html
<div style="display: inline-block; background: rgba(56, 189, 248, 0.15); color: var(--accent); padding: 4px 10px; border-radius: 3px; font-size: 0.7rem; margin-bottom: 10px; letter-spacing: 1px;">
    DECISION DOMAIN: GOVERNANCE
</div>
```

---

### 5. Enhanced Final Protocol Task

**Current State**: Final task is implied through the 6 chapters.

**Recommendation**: Add a structured final protocol drafting task with explicit connection to curriculum outcomes.

**Suggested Implementation**:
```javascript
// Add as slide_7 or a final modal
{
    "id": "slide_final",
    "shortTitle": "Final Protocol",
    "longTitle": "DRAFT THE 2026 WHARF ACCORD",
    "interactionPrompt": "Draft your final three-sentence protocol and explain how it connects to one curriculum outcome.",
    "protocolStructure": [
        "The Harbour Authority recognizes...",
        "All vessels operating on the wharf shall...",
        "Disputes regarding access shall be resolved through..."
    ],
    "curriculumOutcomes": [
        "Analyze the impact of Treaty rights on contemporary governance",
        "Evaluate the role of multiple perspectives in conflict resolution",
        "Propose solutions that balance rights, safety, and reconciliation"
    ]
}
```

---

### 6. Add Role Card Option

**Current State**: All students play the same role (Harbour Authority Chair).

**Recommendation**: Offer optional role cards to enhance perspective-taking.

**Suggested Implementation**:
```javascript
const ROLES = {
    "CHAIR": {
        "name": "Harbour Authority Chair",
        "mandate": "Broker a peace that works for all families on the wharf",
        "priority": "Balance multiple interests"
    },
    "TREATY_HARVESTER": {
        "name": "Mi'kmaw Treaty Harvester",
        "mandate": "Protect the 1760 Treaty right to a moderate livelihood",
        "priority": "Sovereign rights"
    },
    "COMMERCIAL_FISHER": {
        "name": "Commercial Fisher",
        "mandate": "Ensure sustainable fishing for future generations",
        "priority": "Conservation and fair competition"
    },
    "ELDER": {
        "name": "Mi'kmaw Elder",
        "mandate": "Uphold Netukulimk and Treaty as covenant",
        "priority": "Cultural protocols"
    },
    "MEDIATOR": {
        "name": "Independent Mediator",
        "mandate": "Find common ground between all parties",
        "priority": "Dialogue and understanding"
    }
};
```

**UI Addition**: Add role selector to the auth box:
```html
<div class="input-group" style="margin-top: 20px;">
    <label style="color: var(--text-dim); font-size: 0.7rem; font-family: var(--font-p);">Your Role (Optional)</label>
    <select id="student-role" style="background: transparent; border: none; border-bottom: 1px solid var(--border); color: #fff; width: 100%; padding: 10px 0; font-family: var(--font-p); font-size: 0.85rem; cursor: pointer; outline: none;">
        <option value="CHAIR" style="background: #000;">Harbour Authority Chair (Default)</option>
        <option value="TREATY_HARVESTER" style="background: #000;">Mi'kmaw Treaty Harvester</option>
        <option value="COMMERCIAL_FISHER" style="background: #000;">Commercial Fisher</option>
        <option value="ELDER" style="background: #000;">Mi'kmaw Elder</option>
        <option value="MEDIATOR" style="background: #000;">Independent Mediator</option>
    </select>
</div>
```

---

### 7. Add Content Note and Teacher Framing

**Current State**: No explicit framing that this is a learning simulation.

**Recommendation**: Add a content note to contextualize the sensitive nature of the topic.

**Suggested Implementation**:
```html
<div id="content-note" style="background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; padding: 14px 18px; margin: 20px 0; font-size: 0.82rem; line-height: 1.6; color: #fcd34d;">
    <strong>Content Note:</strong> This simulation addresses real conflict histories involving Treaty rights and resource management. This is a learning exercise, not a game about "sides" winning. The goal is to understand multiple perspectives and develop thoughtful, evidence-based solutions. Please approach this activity with respect for all viewpoints represented.
</div>
```

**Placement**: Add to the `#directives-box` section, at the top.

---

### 8. Add Exit Ticket

**Current State**: No quick assessment at the end.

**Recommendation**: Add a simple exit ticket to check understanding.

**Suggested Implementation**:
```javascript
// Add after final slide completion
function showExitTicket() {
    const exitTicket = `
        <div id="exit-ticket" style="position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; align-items: center; justify-content: center;">
            <div style="background: var(--surface); border: 1px solid var(--border); padding: 40px; border-radius: 8px; max-width: 600px; width: 90%;">
                <h2 style="color: var(--accent); margin: 0 0 20px 0;">Exit Ticket</h2>
                <div style="margin-bottom: 20px;">
                    <label style="color: var(--text-dim); font-size: 0.8rem; display: block; margin-bottom: 8px;">1. What is one treaty-based principle the Harbour Authority must recognize?</label>
                    <textarea id="exit-q1" style="min-height: 60px;"></textarea>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="color: var(--text-dim); font-size: 0.8rem; display: block; margin-bottom: 8px;">2. What is one concern from the commercial side that still needs to be addressed?</label>
                    <textarea id="exit-q2" style="min-height: 60px;"></textarea>
                </div>
                <button class="commit-btn" onclick="submitExitTicket()">Submit</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', exitTicket);
}
```

---

### 9. Add Debrief Discussion Prompt

**Current State**: No structured debrief activity.

**Recommendation**: Add a debrief prompt for small group discussion.

**Suggested Implementation**:
```html
<div id="debrief-panel" style="background: rgba(16, 185, 129, 0.08); border-left: 3px solid #10b981; padding: 16px 18px; margin: 20px 0; font-size: 0.85rem; line-height: 1.6; color: #6ee7b7;">
    <strong>Debrief Activity:</strong> In small groups, compare your final accords. Discuss:
    <ul style="margin: 10px 0 0 20px; padding: 0;">
        <li>Why might different choices still be defensible?</li>
        <li>What common themes emerged across your protocols?</li>
        <li>What challenges remain unresolved?</li>
    </ul>
</div>
```

**Placement**: Add to the final slide or as a completion screen.

---

### 10. Add Civic Learning Question

**Current State**: No explicit connection to real-world civic engagement.

**Recommendation**: Add a question about real-world application.

**Suggested Implementation**:
```javascript
// Add to final slide
"civicQuestion": "What would change if this were a real wharf in your community? How could you apply what you learned here to local governance issues?"
```

---

## Assessment Framework

### Recommended Rubric

Create a rubric with four categories:

| Category | Exemplary | Proficient | Developing | Emerging |
|----------|-----------|------------|------------|----------|
| **Accuracy of Facts & Source Use** | Consistently uses multiple sources accurately; citations are precise and relevant | Uses sources accurately; citations are generally correct | Uses some sources but with minor inaccuracies | Minimal or incorrect source use |
| **Quality of Reasoning & Justification** | Reasoning is nuanced; acknowledges trade-offs; justification is thorough and evidence-based | Reasoning is clear; justification is supported by evidence | Reasoning is basic; justification is limited | Reasoning is unclear or absent |
| **Demonstration of Multiple Perspectives** | Shows deep understanding of all perspectives; balances competing interests fairly | Shows understanding of multiple perspectives; acknowledges complexity | Shows limited understanding of perspectives | Focuses on single perspective |
| **Quality of Protocol & Reflection** | Protocol is clear, actionable, and well-justified; reflection is insightful | Protocol is clear and justified; reflection is present | Protocol is basic; reflection is minimal | Protocol is incomplete; reflection absent |

---

## Implementation Priority

### Phase 1: Quick Wins (Can be implemented immediately)
1. ✅ Add learning outcomes to directive box
2. ✅ Add content note and teacher framing
3. ✅ Add source use requirement prompt
4. ✅ Add decision category tags

### Phase 2: Enhanced Learning (Requires moderate development)
5. ✅ Add reflection prompts after each decision
6. ✅ Add exit ticket functionality
7. ✅ Add debrief discussion prompt
8. ✅ Add civic learning question

### Phase 3: Advanced Features (Requires significant development)
9. ✅ Add role card option
10. ✅ Create structured final protocol task
11. ✅ Build assessment rubric integration

---

## Technical Implementation Notes

### Code Modifications Required

1. **HTML Changes**:
   - Add learning outcomes section to `#directives-box`
   - Add content note at top of directive box
   - Add reflection panel below rationale textarea
   - Add source requirement prompt above textarea
   - Add decision category display above interaction prompt
   - Add role selector to auth box

2. **JavaScript Changes**:
   - Extend `MISSION_DATA.slides` with new properties:
     - `sourceRequirement`
     - `reflectionQuestions`
     - `decisionCategory`
     - `civicQuestion`
   - Add `ROLES` object for role card functionality
   - Add `showExitTicket()` function
   - Modify `saveProgress()` to include reflection responses
   - Add `submitExitTicket()` function

3. **CSS Changes**:
   - Style new reflection panel
   - Style decision category badges
   - Style exit ticket modal
   - Style debrief panel

---

## Conclusion

The Sunrise Harbour simulation is already a strong educational tool for Mi'kmaw Studies 11. The recommended enhancements will:

1. **Make learning explicit** through clear outcomes and source requirements
2. **Deepen historical thinking** through structured reflection
3. **Enhance assessment** through rubric-aligned tasks
4. **Support multiple perspectives** through role cards and debrief activities
5. **Connect to civic learning** through real-world application questions

These changes align with the curriculum's emphasis on evidence, perspective, historical thinking, and the essential question: "How are we connected to the history and culture of the First Peoples of Nova Scotia?"

---

## Additional Resources

### Curriculum Connections
- **Mi'kmaw Studies 11 Outcomes**: Governance, Culture, Education, Spirituality
- **Historical Thinking Concepts**: Evidence, Perspective, Cause & Consequence, Moral Judgment
- **UNDRIP**: Articles 3 (Self-Determination), 18 (Decision-Making), 21 (Economic Development)

### Key Legal Concepts
- **Section 35**: Constitutional recognition of Aboriginal and Treaty rights
- **Honour of the Crown**: Government duty to act with integrity
- **Sparrow Test**: Justification test for rights infringement
- **Marshall Decision**: Moderate livelihood right under 1760 Treaties

---

*Document prepared by ZAI based on Perplexity recommendations and analysis of sunrise_wharf.html*
*Date: June 2, 2026*