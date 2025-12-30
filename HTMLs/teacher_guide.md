# Teacher's Guide: Situation Room Ecosystem (v65.48)

Welcome to the **Situation Room** — an advanced platform for rigorous historical investigations and administrative simulations. This guide explains how to create, test, and deploy mission-based learning experiences.

---

## 🔍 Core Philosophy
We replace traditional "games" with **Administrative Investigation**:

- **Digital DBQ Framework**: Each mission is a structured Document-Based Question.
- **Evidence-Driven Decisions**: Students analyze documents across three tabs:
  - **PRIMARY** (Historical sources)
  - **LEGAL** (Policies/laws)
  - **INTEL** (Analysis/intelligence)
- **Mandatory Rationales**: Students cite specific evidence to justify every decision.
- **Immersive Interface**: A tech-noir "Situation Room" design for focused inquiry.

---

## 🛠️ Teacher Workflow: 3-Step Process

### 1. Create Missions (The Gem)
**Purpose**: Turn any topic into a structured mission.
**How to Use**:
- Follow the [Gem Instructions](http://dwaug-edsim.github.io/projectimages/HTMLs/Gem%20instructions.md) to brief the AI.
- **Output**: A raw `.blob` file (mission data with slides, tabs, and questions).

### 2. Test Missions (Teacher Mode)
**Purpose**: Verify mission quality before student use.
**How to Use**:
- Load your `.blob` file into [teachermode_LIVE.html](http://dwaug-edsim.github.io/projectimages/HTMLs/teachermode_LIVE.html).
- **Check**: Image clarity, source accuracy, and decision logic.

### 3. Edit Missions (Blob Hospital)
**Purpose**: Refine missions without coding.
**How to Use**:
- Open [blobhospital.html](http://dwaug-edsim.github.io/projectimages/HTMLs/blobhospital.html) → **Admit** your `.blob` file.
- **Tools**:
  - **Surgical Theatre**: Edit content in all tabs (WYSIWYG editor).
  - **Asset Monitor**: Update images/credits.
  - **Diagnostic Dashboard**: Adjust metadata, glossaries, and outcomes.
  - **Defibrillate**: Reset if errors occur.
- **Final Step**: **Discharge** (export) the stabilized `.blob`.

---

## 👥 Student Experience
1. **Login**: Secure access with name + 6-digit PIN.
2. **Lobby**: View available missions and assigned roles.
3. **Investigation**: Analyze evidence → Make recorded decisions → File rationales.

---

## 🚀 Deployment
1. **Host**: Deploy [simroom_LIVE.html](http://dwaug-edsim.github.io/projectimages/HTMLs/simroom_LIVE.html) (Mission Control) to your server or GitHub Pages.
2. **Inject**: Ensure `.blob mission files are accessible to the system.
3. **Command**: Use backend tools to manage rosters and monitor decisions.

---

**Your terminal is now an Archive of Decision. 🦾🏛️⚖️**
