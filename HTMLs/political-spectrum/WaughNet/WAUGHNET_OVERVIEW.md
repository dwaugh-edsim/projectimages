# WaughNet Town Hall: System Overview
**Deployment Ready — Halifax West 2026**

This document provides context for any AI assistant (Antigravity) picking up the task of managing the WaughNet Town Hall system on a new machine.

## 🏗️ Architecture
WaughNet is a real-time classroom interaction system built on a serverless Google stack:
- **Database**: Google Sheets (used for persistent storage).
- **Backend**: Google Apps Script (`Code.gs`) providing a JSON API via `doPost`/`doGet`.
- **Frontend**: Vanilla HTML5/CSS3/JavaScript (located in `/WaughNet/`).
- **Communication**: Polling with exponential backoff and server-time synchronization.

## 📂 File Structure
- `Code.gs`: The soul of the system. Handles atomic locks, salted vote hashing, moderation logic, and session state.
- `data.js`: Shared configuration. **CRITICAL**: Contains the `scriptURL` pointing to the live GAS deployment.
- `/WaughNet/town-hall-host.html`: The Moderator Console (Teacher dashboard).
- `/WaughNet/audience.html`: The Student App (Question submission, voting, team chats).
- `/WaughNet/candidate-panel.html`: The Candidate Dashboard (sees approved questions only).

## 🚀 Key Features
### 1. Two-Phase Voting
- **Prelim**: All 12 parties appear on the ballot.
- **Final**: Only teacher-selected "Finalists" appear on the ballot.
- Backend tracks `hasVotedPrelim` and `hasVotedFinal` separately per student.

### 2. The Question Pipeline
- Students submit questions (limited to 500 characters).
- Teacher moderates: **Pending** → **Approved** (Visible to class) or **On Stage** (Visible to candidates).
- Candidates see only "On Stage" questions in real-time.

### 3. War Rooms (Messaging)
- Leaders can **Broadcast** to their whole team.
- Team members can only send private **Tips** to their leader.
- No cross-party communication.

## 🛡️ Hardening & Reliability (Post-Audit Round 3)
- **Concurrency**: High-load protection using `LockService.getScriptLock()` with a 30s timeout.
- **Deduplication**: Message deduplication on the client; vote deduplication on the server via MD5 salted hashing.
- **Throttling**: Exponential backoff (5s → 30s) prevents "thundering herd" issues on Google's script quotas.
- **Security**: Teacher PIN required for all administrative actions (`thSetSession`, `thModerate`, `thGetVotes`).

## 🔧 Operational Maintenance
- If the system "lags," refresh the Moderator Console first.
- To reset everything: Clear lines 2+ in `TH_Votes`, `TH_Questions`, and `TH_Messages` sheets.
- Ensure `data.js` always matches the latest "Web App" deployment URL from Google Apps Script.
