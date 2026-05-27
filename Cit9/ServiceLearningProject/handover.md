# Grade 9 Citizenship Service Learning — Project Handover

This document provides a comprehensive overview of the **Service Learning Action Intelligence** digital workspace project. It details the project's background context, frontend and backend architecture, data model, changes implemented today, and next steps for the incoming LLM/developer.

---

## 1. Project Context & Background
* **Target Audience**: Grade 9 Citizenship students (Dave Waugh's class, A Block) working in a shared-device school environment on Google Chromebooks.
* **Objective**: A 14-day Service Learning Action Project. Students select one of seven community-impact "Missions", research the underlying systemic issue (e.g., e-waste, Indigenous water access, fast fashion, or data privacy), track daily action logs, record quantitative measurements, and complete a final reflection.
* **Shared-device constraint**: Because multiple students share Chromebooks and frequently close tabs or log out, login state must be resilient. Login sessions are stored in `localStorage` rather than `sessionStorage` so students don't lose progress when the browser restarts.

---

## 2. System Architecture

The project is built as a lightweight static web app backed by a Google Apps Script webhook and Google Sheets.

```mermaid
graph TD
    A[Menu.html: Login / Mission Selection] -->|Redirect| B[File.html: Student Workspace]
    B ↔|POST: Save Data / GET: Retrieve Logs| C[Google Apps Script Webhook]
    C ↔|Read/Write Rows| D[Google Sheets DB]
    E[StatusPanel.html: Teacher Dashboard] ↔|GET: All Student Progress| C
    E -->|POST: Publish Feedback| C
    E -->|API Request| F[Qwen AI Model: qwen3.6-plus]
```

### Components Inventory

1. **`Menu.html`** ([Menu.html](file:///e:/Antigravity/simroom/Github%20Repos/projectimages/Cit9/ServiceLearningProject/Menu.html))
   * **Purpose**: Entry gateway. Shows the roster, verifies student PINs, and displays the 7 missions cards.
   * **State**: Directs the student to `File.html` once authenticated.

2. **`File.html`** ([File.html](file:///e:/Antigravity/simroom/Github%20Repos/projectimages/Cit9/ServiceLearningProject/File.html)) (New)
   * **Purpose**: The student workspace. Replaces the old `Dossier.html`. Contains a 7-tab panel layout:
     1. **Briefing**: General context, mission outline, and the personalized `📋 Today's Focus` task list.
     2. **Step 1: Plan**: Mission selection, team roles, and commitment rationale.
     3. **Step 2: Research**: 4 dynamic clue questions (tailored to selected mission) and source citations.
     4. **Step 3: Log**: Freeform action log tracker.
     5. **Step 4: Measure**: Numerical measurement tracking.
     6. **Step 5: Reflect**: Self-reflection prompt.
     7. **Guidelines**: Nova Scotia curriculum connections and evaluation rubrics.
   * **Special Section**: **Battery Diversion Lab** (only appears when mission `CIT-001` is selected). Allows students to log battery entries (type, quantity, safety taped status).

3. **`StatusPanel.html`** ([StatusPanel.html](file:///e:/Antigravity/simroom/Github%20Repos/projectimages/Cit9/ServiceLearningProject/StatusPanel.html))
   * **Purpose**: The teacher dashboard. Tracks all students' status indicators (empty, started, complete) per step.
   * **LLM Quality Reviewer**: Contains a dedicated tab for grading. Pulls student answers, runs them through the Qwen API for feedback drafting, allows manual edits, and pushes the final grade/comments back.

4. **`code.gs`** ([code.gs](file:///e:/Antigravity/simroom/Github%20Repos/projectimages/Cit9/ServiceLearningProject/code.gs))
   * **Purpose**: Google Apps Script backend sheet writer/reader. Runs in web app mode.

---

## 3. Data Integration & Local Storage

### Webhook API
* **Endpoint URL**: `https://script.google.com/macros/s/AKfycbwwQekbSK1nU7vHMWoowMb49k-75aPQv5zrcAPbNFXC24Akk4jo2un-IYSDReC-JqQ0EA/exec`
* **GET Requests**:
  * `?action=LOGIN&studentId={name}&pin={pin}`: Verifies student authentication.
  * `?action=GET_ALL_PROGRESS`: Returns a JSON array containing all student log submissions.
* **POST Requests**:
  * Body: `{"studentId": "{name}", "missionTitle": "CIT9_RESEARCH_INTEL", "reflection": "{JSON_stringified_form_data}", "timestamp": "{ISO_date}"}`
  * Note: Teacher feedback is pushed by writing a new reflection entry containing the `teacherFeedback` key merged inside the student's submission.

### LocalStorage Schema
| Storage Key | Scope | Purpose |
| :--- | :--- | :--- |
| `sl_friday_user` | All | Stores the logged-in student name (e.g. `Abdul`, `Farhan`). |
| `sl_v2_missionSelect` | All | Stores the active mission code (e.g. `CIT-001`, `CIT-002`). |
| `sl_local_{studentName}` | Student | Local backup JSON containing all current input field text. Used to prevent data loss. |
| `sl_teacher_ai_key` | Teacher | Saves the teacher's Qwen API key (keeps key out of source control/public Apps Script URL). |
| `diversionLab` | Student | Logs battery data objects `[{name, type, qty, taped, time}]` for the battery lab. |

### Roster & PIN Mapping
Offline verification PINs reside in `Menu.html` and `File.html`:
```json
{
  "Farhan": "HRNH", "Abdul": "ALZZ", "Joshua A": "RUXG", "Clark": "9F3K",
  "Madhavan": "R4MT", "Remy": "YMRP", "Yunho": "T4N5", "Lachlan McM": "FFAN",
  "Lachlan Mac": "25VT", "Nolan": "KFK6", "Laila": "V4BC", "Josie": "MVQW",
  "Huda": "6SUB", "Brody": "JY2P", "Leo": "RKKJ", "Elizabeth": "FNG3",
  "Fatima": "T6U2", "Alia": "LJFM", "Rifa": "57G5", "Sarah": "96EU",
  "Jessa": "HSZU", "Delisha": "Q2YA", "Kendra": "MTGG", "Zankia": "CA3J",
  "Evie": "R7SX", "Jana": "TT8D", "Ali": "D2ZD", "Kai": "VFW8", "Natalia": "RING"
}
```

### The 7 Missions
1. `CIT-001`: **The Battery Scavenger** (Responsible Consumption - E-waste/Cobalt supply chains)
2. `CIT-002`: **The Tap Audit** (Clean Water & Sanitation - HRM privilege vs. Indigenous boil-water advisories)
3. `CIT-003`: **The Phantom Load** (Affordable & Clean Energy - Standby power & NS coal generation)
4. `CIT-004`: **The Wardrobe Reset** (Responsible Consumption - Fast fashion & garment worker labor rights)
5. `CIT-005`: **The Data Diet** (Digital footprints, algorithms, and echo chambers)
6. `CIT-006`: **The Zero-Waste Audit** (Single-use plastics & waste colonialism)
7. `CIT-007`: **The Ink Trap** (Printer cartridge hardware loss-leaders & manufacturer locking chips)

---

## 4. Work Completed & Active Tasks (2026-05-21)

Today, we are executing a final cleanup and stabilization sweep focused on customizing project-specific instructions, removing redundant questions, resolving remaining workspace gateway issues, and committing our final state to git:

### 1. Customized Day 1 Setup & Logistics
* **Challenge**: The Day 1 instructions (Target Area, Safety/Materials, Parent Pitch) in Step 3 of `File.html` were generic and physical-only, which did not make sense for digital or service projects like **CIT-005: The Data Diet** (which needs "Target Settings & Apps" rather than a physical area).
* **Solution**: Defined a customized dynamic dictionary mapping each of the 7 projects to specific Target Labels, Target Descriptions, Safety guidelines, Parent Pitches, and custom textarea placeholders. Added logic to update these fields automatically when a student loads their workspace or changes projects.

### 2. Removal of "What is your team role?" Question
* **Challenge**: The prompt requested deleting the team role question as it's no longer needed for project planning.
* **Solution**: Purged the `#personalRole` textarea from Step 1 in `File.html`. Adjusted the auto-saving mechanism, validation code, tab-gating requirements, and `StatusPanel.html` heuristic checks/AI prompt generator to ignore the team role field.

### 3. Restoration of Menu.html Dossier Overlay
* **Challenge**: A syntax error (duplicate declaration of `let labData` and a dangling template literal) broke the file selection overlay in `Menu.html`.
* **Solution**: Wrapped the dossier template literal in `openFile(id)` correctly, cleaned up the duplicate variable, and converted the launch anchor to a styled commit button that stores the selected mission to `localStorage` and routes the student directly to `File.html`.

### 4. Storage Migration (Session to Local Storage)
* Changed `sessionStorage` to `localStorage` for `sl_friday_user` and `sl_v2_missionSelect` across `Menu.html` and `File.html`. 
* Closing a browser tab or restarting Chromebooks will no longer lock students out or dump their credentials.

### 2. Dual-Layer Resilient Login & Authentication
* **Timeout-bounded Webhook**: Added a 4-second timeout to the cloud login query using an `AbortController` in both `Menu.html` and `File.html`.
* **Offline Local Fallback**: If the Google Apps Script Webhook is unreachable, times out, or fails due to school Wi-Fi issues, the client automatically authenticates the student locally using the hardcoded `PIN_LIST` mapping.

### 3. Chronological Merge Recovery (`retrieveData`)
* To recover from empty overwrites, `retrieveData()` gets *all* database entries for the active student name.
* It sorts entries chronologically ascending and iterates through them to merge data fields, ensuring that **non-empty values never get overwritten by an empty form field save**.
* It then merges the local backup `sl_local_{studentName}` on top, ensuring the most recent edits survive even if offline.

### 4. Sequential Tab Gating & Warning Modal
* Prevented students from skipping steps. Step tabs (Plan ➔ Research ➔ Log ➔ Measure ➔ Reflect) gate progression:
  * **Research** is locked until **Plan** is complete (topic selected, why/role descriptions > 10 chars).
  * **Log** is locked until **Research** is complete (all 4 questions answered > 10 chars, 2 sources provided).
  * And so on.
* Attempting to click locked tabs triggers a retro modal listing exactly which requirements are missing.

### 5. Smart, Personalized Todo Checklist Card
* Created `📋 Today's Focus` card on the Briefing tab of `File.html`.
* Evaluates the student's exact input levels dynamically on every save.
* Generates 2-4 concrete, highly action-oriented checklist items (e.g. *"Answer 2 remaining research questions in Step 2"*, or *"Add your second source citation"*).
* Features quick-action "Go → Step N" buttons to let students jump straight to the source input area.

### 6. Teacher Dashboard & Qwen AI Grading Integration
* Rebuilt the **LLM Quality Reviewer** tab inside `StatusPanel.html`.
* Added a secure text field for the teacher's Qwen API key (stored locally in `localStorage` under `sl_teacher_ai_key` so it doesn't get pushed to git).
* **AI Engine**: Calls Qwen API `qwen3.6-plus` endpoint (`https://coding-intl.dashscope.aliyuncs.com/v1/chat/completions`).
* **Sequential Processing**: Prompts Qwen sequentially for each student, presenting their research answers and mission background, returning:
  * A quality score (Excellent, Adequate, or Needs Work).
  * A short constructive feedback paragraph.
* **Human-in-the-Loop Review**: The teacher can read the drafted review, modify the text, adjust the quality rating, and click **Publish Feedback** to POST it to the sheet.
* **Banner Notification**: When the teacher publishes feedback, a yellow banner (`#feedbackBanner`) automatically slides in at the top of the student's `File.html` workspace containing the teacher's exact text.

### 7. In-Class Offline Research Audits & Parser Stabilization
* **First Run (May 21)**: 
  * Analyzed `live_student_data.json` from the webhook database (25 active student records, 4 idle).
  * Generated the initial class dashboard and identified minor gaps (Gemini placeholders, cutoff sentences).
* **Second Run & Parser Fix (May 26)**:
  * Dave uploaded `Cit9ServiceLearning - MissionLogs (1).csv` (5.06 MB, 2,588 rows) representing the state of the class after another session.
  * **Parser Stabilization**: Discovered a critical crash in the original PowerShell parsing logic: when parsing raw `ReflectionJSON` strings, the script attempted to dynamically assign values on the `PSCustomObject` returned by `ConvertFrom-Json` (e.g. `$parsed.topic = ...`). This throws a runtime exception in Windows PowerShell 5.1 and silently skipped the student's records in the `catch {}` block (causing them to show as empty/missing). 
  * Fixed this in `analyze_new_csv.ps1` by performing all data accumulation and key normalization (`topic` vs `missionSelect`, `studentId` vs `studentName`) safely inside a standard PowerShell hashtable (`$merged`) rather than mutating the parsed object.
  * Rebuilt the summary using `build_summary.ps1` to correctly reflect all students' latest records.
* **Significant Student Progress**:
  * **10 Students** are now fully complete with Step 1, Step 2, and Step 3 Setup Plans and ready for home logs (Alia, Delisha, Elizabeth, Farhan, Jessa, Joshua A, Kai, Lachlan Mac, Lachlan McM, Nolan).
  * **7 Students** completed Step 1 & 2 but only need to write their Step 3 Setup Plan (Kendra, Natalia, Remy, Rifa, Sarah, Yunho, Madhavan). 
  * Sarah, Natalia, Kendra, and Remy have successfully transitioned from blank pages to complete research and plans.
  * Only **3 students** remain completely idle (Brody, Fatima, Jana).
* **New Lapses Identified**:
  * **Keyboard Mashes**: Abdul entered `"lkfi3hfiphq2i;fphjfope2hfop2qhfoph"` for his final reflection text. Leo entered `"eeeeeeeeeeee"` for Clue 2.
  * **AI & Gibberish Citations**: Abdul used Google Gemini and ChatGPT as primary sources; Nolan used `"uih9 8 88"` and `"r3w r 3w"`; Joshua A used `"none other used"`.
  * **Incomplete Setup Template**: Josie wrote the headers `"-parent script: ... -target areas: ... -safety & materials: ..."` in Step 3 but left the actual content blank.
* **Deliverable**: Generated the updated [research_audit_report.md](file:///C:/Users/dave/.gemini/antigravity-ide/brain/9961cb78-808e-4f29-8fef-5b9d88215c49/research_audit_report.md) featuring the new status board, custom walkthrough scripts, and details of these new lapses.

### 8. Project Due Date Countdown Timer (2026-05-26)
* **Objective**: Add a real-time countdown timer to track the project deadline of June 9, 2026 at 23:59:59.
* **Implementation**: Added customized countdown containers and JavaScript logic to:
  * `StatusPanel.html` (Teacher Dashboard header: `#statusCountdown`)
  * `Menu.html` (Student Portal gateway banner: `#menuCountdown`)
  * `ResearchSlides.html` (Classroom Presentation Slide 1: `#slideCountdown`)
* **Behavior**: Computes time difference against the target datetime (`2026-06-09T23:59:59`) and updates the respective elements every second. Displays a friendly countdown string (e.g. `14d 8h 33m 21s remaining`) and falls back to a clear `OVERDUE!` warning once the deadline has passed.

---

## 5. Next Steps for Handover Developer

The next developer should perform these critical validation checks to verify the changes:

### 1. Chromebook / Shared Device Testing
* Log in as a test student (e.g., `Evie` with PIN `R7SX`) on a Chromebook or an incognito tab.
* Progress through Step 1 (Plan). Check that:
  1. The progress bar updates.
  2. The next tab (Research) unlocks.
  3. The `📋 Today's Focus` todo card matches your input state.
* Close the browser tab. Re-open `File.html` and verify that the student is logged in automatically and all inputs are successfully merged and restored.

### 2. Live Qwen AI call validation
* Open `StatusPanel.html` in the browser.
* Paste a valid Qwen API Key in the API Key box (Key format: `sk-sp-d397...`).
* Click **Run AI Reviews** and watch the console network tab to verify successful execution and parsing.
* Edit one feedback draft, change the badge to "Excellent", and click **Publish**. Verify that it posts to the Google sheet.

### 3. Verify Feedback Banner round-trip
* In the student's `File.html`, refresh the workspace after publishing a teacher review.
* Ensure the yellow `#feedbackBanner` appears showing the exact published critique.

### 4. Cleanup Template HTML in Menu.html
* Inspect `Menu.html` around the file overlay sections (`closeFile()` and `file-content` refs). 
* Since mission files now redirect directly to `File.html`, ensure any leftover modal/overlay code in `Menu.html` is fully retired or does not interfere with gateway rendering.
