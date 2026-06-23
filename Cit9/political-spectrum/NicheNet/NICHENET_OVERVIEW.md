# NicheNet Town Hall: System Overview
**Deployment Ready — Halifax West 2026**

This document provides context for any AI assistant (Antigravity) picking up the task of managing the NicheNet Town Hall system on a new machine.

## 🏗️ Architecture
NicheNet is a real-time classroom interaction system built on a serverless Google stack:
- **Database**: Google Sheets (used for persistent storage).
- **Backend**: Google Apps Script (`Code.gs`) providing a JSON API via `doPost`/`doGet`.
- **Frontend**: Vanilla HTML5/CSS3/JavaScript (located in `/NicheNet/`).
- **Communication**: Polling with exponential backoff and server-time synchronization.

## 📂 File Structure
- `Code.gs`: The soul of the system. Handles atomic locks, salted vote hashing, moderation logic, and session state. Includes a hardcoded `9999` safety fallback for the teacher PIN.
- `data.js`: Shared configuration. **CRITICAL**: Contains the `scriptURL` pointing to the live GAS deployment.
- `/NicheNet/town-hall-host.html`: The Moderator Console (Teacher dashboard).
- `/NicheNet/audience.html`: The Student App (Question submission, voting, team chats).
- `/NicheNet/candidate-panel.html`: The Candidate Dashboard (sees approved questions only).

## 🚀 Key Features
### 1. Two-Phase Voting
- **Prelim**: All 12 parties appear on the ballot.
- **Final**: Only teacher-selected "Finalists" appear on the ballot.
- Backend tracks `hasVotedPrelim` and `hasVotedFinal` separately per student.

### 2. The 2026 Party Roster
The system is currently configured for 12 parties (updated 24 April):
- **Equitable Rights Party Of Halifax** (Maroon: #5c0000)
- **The Equity Party** (Purple: #ce3bf7)
- **The Islamic Associations of Halifax** (Green: #1d6825)
- **The Healthier Future** (Blue: #3b82f6)
- **The Party De Solution** (White: #ffffff)
- **The Niche Halligonians** (White: #ffffff)
- **Team tomorrow** (Pink: #f43bf7)
- **Communist Party Of Halifax (CPOH)** (Red: #ff0000)
- **The Unity Party** (Cyan: #3bf4f7)
- **Environmentalists at Work** (Dark Green: #144a0d)
- **The yellow progression party** (Yellow: #ecee81)
- **The Halifax Climate Protection Party** (Blue: #3b82f6)

### 3. The Question Pipeline
- Students submit questions (limited to 500 characters).
- Teacher moderates: **Pending** → **Approved** (Visible to class) or **On Stage** (Visible to candidates).
- Candidates see only "On Stage" questions in real-time.

### 4. War Rooms (Messaging)
- Leaders can **Broadcast** to their whole team.
- Team members can only send private **Tips** to their leader.
- No cross-party communication.

## 🛡️ Hardening & Reliability (Post-Audit Round 3)
- **Connectivity**: Uses "Simple Requests" (no JSON Content-Type) to bypass Google Apps Script CORS preflight limitations.
- **Concurrency**: High-load protection using `LockService.getScriptLock()` with a 30s timeout.
- **Deduplication**: Message deduplication on the client; vote deduplication on the server via MD5 salted hashing.
- **Throttling**: Exponential backoff (5s → 30s) prevents "thundering herd" issues on Google's script quotas.
- **Security**: Teacher PIN required for all administrative actions. Safety fallback PIN set to `9999`.

## 🔧 Operational Maintenance
- If the system "lags," refresh the Moderator Console first.
- To reset everything: Clear lines 2+ in `TH_Votes`, `TH_Questions`, and `TH_Messages` sheets.
- **IMPORTANT**: Any changes to `Code.gs` require a **New Deployment** in Google Apps Script. Ensure `data.js` always matches the latest "Web App" deployment URL.
