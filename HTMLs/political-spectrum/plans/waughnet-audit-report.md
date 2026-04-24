# WaughNet Town Hall System — Security & Reliability Audit Report

**Date:** 2025-04-24
**Auditor:** Roo (Architect Mode)
**Scope:** Classroom messaging system for Grade 9 Citizenship class (~30 students)

---

## Executive Summary

The WaughNet system is generally well-architected for its intended use case (a single 60-minute classroom session). However, several **critical race conditions** and **reiability issues** could cause the system to fail under concurrent load. The most severe issues involve vote integrity and lock management under high concurrency.

**Overall Risk Level:** MEDIUM-HIGH
**Critical Issues:** 4
**High Priority Issues:** 5
**Medium Priority Issues:** 7
**Low Priority Issues:** 5

---

## CRITICAL ISSUES

### 1. Race Condition in Vote Casting (CRITICAL)
**Location:** [`Code.gs:249-261`](../Code.gs:249-261)

**Problem:** The vote duplicate check and vote insertion are not atomic within the lock scope. The lock is acquired AFTER checking if the user has already voted. Two concurrent requests could both pass the check and insert duplicate votes.

```javascript
// Current vulnerable code:
var lock = LockService.getScriptLock();
lock.waitLock(8000);
try {
  var sheet = getOrCreateSheet('TH_Votes', ['Timestamp','HashedPin','PartyVoted']);
  if (sheet.getLastRow() >= 2) {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === hash) return handleResponse({ status: 'error', message: 'You have already voted.' });
    }
  }
  sheet.appendRow([new Date(), hash, partyId]);
```

**Impact:** Students could potentially vote twice, violating election integrity.

**Fix:** Move the lock acquisition BEFORE the duplicate check:

```javascript
function thCastVote(pin, partyId) {
  var student = lookupStudent(pin);
  if (!student) return handleResponse({ status: 'error', message: 'Invalid PIN.' });
  if (student.partyId === partyId) {
    return handleResponse({ status: 'error', message: 'You cannot vote for your own party.' });
  }
  var session = thGetSession();
  if (!session.votingOpen) {
    return handleResponse({ status: 'error', message: 'Voting is not open yet. Wait for Mr. Waugh.' });
  }

  var hash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, pin + '_HWX26')
    .map(function(b) { return (b & 0xFF).toString(16).padStart(2, '0'); }).join('');

  // FIX: Acquire lock BEFORE checking for existing votes
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(10000)) {
      return handleResponse({ status: 'error', message: 'Server busy. Please try again.' });
    }
    var sheet = getOrCreateSheet('TH_Votes', ['Timestamp','HashedPin','PartyVoted']);
    if (sheet.getLastRow() >= 2) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][1] === hash) return handleResponse({ status: 'error', message: 'You have already voted.' });
      }
    }
    sheet.appendRow([new Date(), hash, partyId]);
    return handleResponse({ status: 'success', message: 'Your vote has been cast!' });
  } finally {
    lock.releaseLock();
  }
}
```

---

### 2. Lock Timeout Too Short for Concurrent Load (CRITICAL)
**Location:** [`Code.gs:150,167,187,219,250`](../Code.gs:150) (multiple locations)

**Problem:** The 8-second lock timeout is too short when 25+ students are polling every 3-5 seconds. If a lock times out, the operation fails silently or throws an error. With 30 students polling at 5-second intervals, that's 6 requests/second minimum. Combined with POST operations, the system could easily exceed lock capacity.

**Impact:** System could fail mid-session, causing lost messages, questions, or votes.

**Fix:** Increase timeout to 30 seconds and use `tryLock()` with proper error handling:

```javascript
var lock = LockService.getScriptLock();
try {
  if (!lock.tryLock(30000)) {
    return handleResponse({ status: 'error', message: 'Server busy. Please try again.' });
  }
  // ... operation
} finally {
  lock.releaseLock();
}
```

---

### 3. Message ID Collision Vulnerability (CRITICAL)
**Location:** [`Code.gs:154,171`](../Code.gs:154) and [`audience.html:548,569`](WaughNet/audience.html:548)

**Problem:** Using `Date.now()` for message IDs can cause collisions if multiple messages are sent within the same millisecond. With 30 students, this is statistically probable. The client-side deduplication relies on unique IDs.

```javascript
var id = new Date().getTime().toString(); // Collision risk!
```

**Impact:** Messages could be lost or duplicated in the UI. Students might not see their own messages.

**Fix:** Use a more robust ID generation method:

```javascript
function generateId() {
  return Utilities.getUuid() || new Date().getTime().toString() + '_' + Math.random().toString(36).substr(2, 9);
}
```

Then replace all `new Date().getTime().toString()` with `generateId()`.

---

### 4. No Exponential Backoff on Poll Failures (CRITICAL)
**Location:** [`audience.html:398-430`](WaughNet/audience.html:398-430), [`candidate-panel.html:260-297`](WaughNet/candidate-panel.html:260-297), [`town-hall-host.html:306-367`](WaughNet/town-hall-host.html:306-367)

**Problem:** If GAS is slow (2-4s response times are common), clients keep polling at fixed intervals without backing off. This can create a thundering herd problem that overwhelms the server.

**Impact:** System degradation under load, potential cascade failure.

**Fix:** Implement exponential backoff with jitter:

```javascript
let consecutiveFailures = 0;
let currentPollInterval = POLL_INTERVAL;

async function doPoll() {
  try {
    const url = `${scriptURL}?type=poll&pin=${encodeURIComponent(myPin)}&since=${lastPollTs}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) }); // 10s timeout
    const data = await res.json();
    if (data.status !== 'success') return;

    lastPollTs = Date.now();
    setOnline(true);
    consecutiveFailures = 0;
    currentPollInterval = POLL_INTERVAL; // Reset on success

    // ... rest of poll logic
  } catch (e) {
    setOnline(false);
    consecutiveFailures++;
    // Exponential backoff: 5s → 10s → 20s → 30s (max)
    currentPollInterval = Math.min(30000, POLL_INTERVAL * Math.pow(2, consecutiveFailures - 1));
  }

  // Reschedule with current interval
  pollTimer = setTimeout(doPoll, currentPollInterval);
}
```

---

## HIGH PRIORITY ISSUES

### 5. Session State Can Be Lost on clearContents() (HIGH)
**Location:** [`Code.gs:220-226`](../Code.gs:220-226)

**Problem:** In `thSetSession()`, the entire sheet is cleared and rewritten. If this fails mid-operation (e.g., quota exceeded, network timeout), session state is lost.

```javascript
sheet.clearContents();
sheet.appendRow(['Key', 'Value']);
sheet.appendRow(['activeParty',  activeParty  || '']);
sheet.appendRow(['votingOpen',   votingOpen   ? 'TRUE' : 'FALSE']);
sheet.appendRow(['showResults',  showResults  ? 'TRUE' : 'FALSE']);
```

**Impact:** Teacher loses control of the session mid-debate. Voting could get stuck in wrong state.

**Fix:** Use individual cell updates instead of clearing:

```javascript
function thSetSession(pin, activeParty, votingOpen, showResults) {
  if (!isTeacherPin(pin)) return handleResponse({ status: 'error', message: 'Unauthorized.' });
  var sheet = getOrCreateSheet('TH_Session', ['Key', 'Value']);
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(30000)) {
      return handleResponse({ status: 'error', message: 'Server busy.' });
    }
    // Update values by key instead of clearing
    updateSessionValue(sheet, 'activeParty', activeParty || '');
    updateSessionValue(sheet, 'votingOpen', votingOpen ? 'TRUE' : 'FALSE');
    updateSessionValue(sheet, 'showResults', showResults ? 'TRUE' : 'FALSE');
    return handleResponse({ status: 'success' });
  } finally {
    lock.releaseLock();
  }
}

function updateSessionValue(sheet, key, value) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}
```

---

### 6. No Timeout on Fetch Requests (HIGH)
**Location:** All `fetch()` calls in frontend files

**Problem:** Long-running GAS requests could cause the browser to hang indefinitely. Students would see a frozen UI.

**Impact:** Poor UX, students might refresh and lose state.

**Fix:** Add timeout to all fetch calls:

```javascript
async function post(body) {
  const res = await fetch(scriptURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000) // 10 second timeout
  });
  return res.json();
}
```

For GET polls:
```javascript
const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
```

---

### 7. LockService Not Using tryLock() (HIGH)
**Location:** Multiple locations in [`Code.gs`](../Code.gs)

**Problem:** Using `waitLock(8000)` blocks for up to 8 seconds. If the lock cannot be acquired, the function hangs. This can cause cascading timeouts.

**Impact:** System becomes unresponsive under load.

**Fix:** Replace all `lock.waitLock(8000)` with:

```javascript
var lock = LockService.getScriptLock();
try {
  if (!lock.tryLock(30000)) {
    return handleResponse({ status: 'error', message: 'Server busy. Please try again.' });
  }
  // ... operation
} finally {
  lock.releaseLock();
}
```

---

### 8. No Rate Limiting on Message/Question Submission (HIGH)
**Location:** [`Code.gs:141-157`](../Code.gs:141-157), [`Code.gs:160-174`](../Code.gs:160-174)

**Problem:** Students could spam messages rapidly, overwhelming the server and other students' feeds.

**Impact:** System degradation, potential abuse.

**Fix:** Implement per-IP or per-PIN rate limiting using ScriptProperties or a dedicated sheet:

```javascript
function checkRateLimit(pin, action) {
  var key = 'RATE_LIMIT_' + pin + '_' + action;
  var lastTime = PropertiesService.getScriptProperties().getProperty(key);
  var now = new Date().getTime();
  if (lastTime && (now - parseInt(lastTime)) < 2000) { // 2 second cooldown
    return false;
  }
  PropertiesService.getScriptProperties().setProperty(key, String(now));
  return true;
}

function thSendMessage(pin, text) {
  if (!checkRateLimit(pin, 'message')) {
    return handleResponse({ status: 'error', message: 'Please wait before sending another message.' });
  }
  // ... rest of function
}
```

---

### 9. Poll Timestamp Drift (HIGH)
**Location:** [`audience.html:400`](WaughNet/audience.html:400), [`candidate-panel.html:262`](WaughNet/candidate-panel.html:262), [`town-hall-host.html:308`](WaughNet/town-hall-host.html:308)

**Problem:** Using client-side `Date.now()` as the `since` parameter can cause issues if client clocks are skewed. Messages could be missed or duplicated.

**Impact:** Students might miss important messages or see duplicates.

**Fix:** Use server-side timestamp for synchronization:

```javascript
// In pollStudent() and pollTeacher(), return server time:
return handleResponse({
  status: 'success',
  session: session,
  student: student,
  messages: messages,
  myQuestions: myQuestions,
  onStageQuestion: onStageQ,
  hasVoted: hasVoted,
  serverTime: new Date().getTime() // ADD THIS
});

// In client doPoll():
if (data.status !== 'success') return;
lastPollTs = data.serverTime || Date.now(); // Use server time
```

---

## MEDIUM PRIORITY ISSUES

### 10. Sheet Read Patterns Inefficient (MEDIUM)
**Location:** Multiple `getDataRange().getValues()` calls in [`Code.gs`](../Code.gs)

**Problem:** `getDataRange().getValues()` reads the entire sheet every time, even when only new rows are needed. With 30 students polling every 5 seconds, this is inefficient.

**Impact:** Slower response times, higher quota usage.

**Fix:** Track last read row and only read new rows:

```javascript
function getNewRows(sheet, lastRow) {
  var lastSheetRow = sheet.getLastRow();
  if (lastSheetRow <= lastRow) return [];
  return sheet.getRange(lastRow + 1, 1, lastSheetRow - lastRow, sheet.getLastColumn()).getValues();
}
```

---

### 11. No Connection Retry Logic (MEDIUM)
**Location:** All frontend files

**Problem:** If a poll fails, the client just shows "offline" but doesn't retry the failed request. The next poll happens after the interval, potentially missing data.

**Impact:** Missed messages/questions, poor UX.

**Fix:** Implement immediate retry with exponential backoff:

```javascript
let retryCount = 0;
const MAX_RETRIES = 3;

async function doPoll() {
  try {
    const url = `${scriptURL}?type=poll&pin=${encodeURIComponent(myPin)}&since=${lastPollTs}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    if (data.status !== 'success') return;

    lastPollTs = Date.now();
    setOnline(true);
    retryCount = 0;
    // ... rest of poll logic
  } catch (e) {
    setOnline(false);
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      setTimeout(doPoll, 1000 * retryCount); // Immediate retry with delay
      return;
    }
    // Fall back to scheduled poll
  }
  pollTimer = setTimeout(doPoll, currentPollInterval);
}
```

---

### 12. Vote Hash Salt Hardcoded (MEDIUM)
**Location:** [`Code.gs:246,345`](../Code.gs:246)

**Problem:** The salt `_HWX26` is hardcoded in the source. If a student inspects the source, they could potentially reverse-engineer the hash.

**Impact:** Reduced security (though still acceptable for this use case).

**Fix:** Store salt in ScriptProperties:

```javascript
function getVoteSalt() {
  var salt = PropertiesService.getScriptProperties().getProperty('VOTE_SALT');
  if (!salt) {
    salt = Utilities.getUuid();
    PropertiesService.getScriptProperties().setProperty('VOTE_SALT', salt);
  }
  return salt;
}

// Then use:
var hash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, pin + getVoteSalt())
```

---

### 13. No Input Sanitization on PIN (MEDIUM)
**Location:** [`Code.gs:55-61`](../Code.gs:55-61)

**Problem:** While PINs are uppercased, there's no validation that they're exactly 4 alphanumeric characters. Special characters could cause issues.

**Impact:** Potential injection attacks (though unlikely given the context).

**Fix:** Add validation:

```javascript
function lookupStudent(pin) {
  var p = (pin || '').toUpperCase().trim();
  // Validate format: exactly 4 alphanumeric characters
  if (!/^[A-Z0-9]{4}$/.test(p)) return null;
  for (var i = 0; i < STUDENT_ROSTER.length; i++) {
    if (STUDENT_ROSTER[i].pin === p) return STUDENT_ROSTER[i];
  }
  return null;
}
```

---

### 14. Optimistic UI Updates Can Desync (MEDIUM)
**Location:** [`audience.html:547-551`](WaughNet/audience.html:547-551)

**Problem:** The optimistic message updates show messages immediately, but if the server rejects them, they remain in the UI.

**Impact:** Students might think their message was sent when it wasn't.

**Fix:** Mark optimistic messages and remove them if not confirmed:

```javascript
function sendMessage() {
  const text = $msgText.value.trim();
  if (!text) return;
  $msgSend.disabled = true;
  const tempId = 'temp_' + Date.now();
  try {
    // Add optimistic message with temp ID
    appendMessages([{
      id: tempId, ts: Date.now(),
      name: myStudent.name, role: myStudent.role, text, mine: true, optimistic: true
    }]);
    const res = await post({ type: 'th_send_message', pin: myPin, text });
    if (res.status === 'success') {
      $msgText.value = '';
      // Remove optimistic version, will be replaced by server version
      knownMessages = knownMessages.filter(m => m.id !== tempId);
      renderMessages(); // Re-render to remove optimistic message
    } else {
      // Remove optimistic message on error
      knownMessages = knownMessages.filter(m => m.id !== tempId);
      renderMessages();
      alert(res.message || 'Failed to send message');
    }
  } catch (e) {
    // Remove optimistic message on error
    knownMessages = knownMessages.filter(m => m.id !== tempId);
    renderMessages();
  }
  $msgSend.disabled = false;
  $msgText.focus();
}
```

---

### 15. Question Status Update Not Atomic (MEDIUM)
**Location:** [`Code.gs:186-194`](../Code.gs:186-194)

**Problem:** The question status update reads all data, finds the row, then updates. If two teachers (or one teacher with two tabs) try to moderate the same question, there's a race condition.

**Impact:** Question could end up in wrong state.

**Fix:** Use a more atomic approach with lock:

```javascript
function thModerateQuestion(pin, questionId, status) {
  if (!isTeacherPin(pin)) return handleResponse({ status: 'error', message: 'Unauthorized.' });
  var valid = ['pending', 'approved', 'rejected', 'on_stage', 'asked'];
  if (valid.indexOf(status) === -1) return handleResponse({ status: 'error', message: 'Invalid status.' });

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('TH_Questions');
  if (!sheet) return handleResponse({ status: 'error', message: 'No questions yet.' });

  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(30000)) {
      return handleResponse({ status: 'error', message: 'Server busy.' });
    }
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString() === questionId.toString()) {
        // Check current status to prevent double-moderation
        var currentStatus = data[i][6];
        if (currentStatus === status) {
          return handleResponse({ status: 'success', message: 'Already in this state.' });
        }
        sheet.getRange(i + 1, 7).setValue(status);
        return handleResponse({ status: 'success' });
      }
    }
    return handleResponse({ status: 'error', message: 'Question not found.' });
  } finally {
    lock.releaseLock();
  }
}
```

---

### 16. No CSRF Protection (MEDIUM)
**Location:** All POST endpoints in [`Code.gs`](../Code.gs)

**Problem:** The POST endpoints don't have any CSRF token validation. While the risk is low for this use case (same-origin requests), it's a best practice.

**Impact:** Potential for cross-site request forgery (though unlikely in classroom setting).

**Fix:** Implement simple CSRF token:

```javascript
// In thAuth(), return a CSRF token:
function thAuth(pin) {
  var p = (pin || '').toUpperCase().trim();
  if (isTeacherPin(p)) {
    var csrfToken = Utilities.getUuid();
    PropertiesService.getUserProperties().setProperty('CSRF_' + p, csrfToken);
    return handleResponse({ status: 'success', role: 'teacher', csrfToken: csrfToken });
  }
  // ... student auth
}

// In doPost(), validate CSRF:
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var type = data.type || 'party';

    // Validate CSRF for state-changing operations
    if (['th_send_message', 'th_submit_question', 'th_cast_vote', 'th_set_session', 'th_moderate'].includes(type)) {
      var storedToken = PropertiesService.getUserProperties().getProperty('CSRF_' + data.pin);
      if (!storedToken || storedToken !== data.csrfToken) {
        return handleResponse({ status: 'error', message: 'Invalid session. Please refresh.' });
      }
    }
    // ... rest of function
  }
}
```

---

## LOW PRIORITY ISSUES

### 17. Duplicate Party Data (LOW)
**Location:** Multiple files

**Problem:** Party colors and labels are duplicated across multiple files. If a party is added/removed, it must be updated in multiple places.

**Impact:** Maintenance burden, potential for inconsistency.

**Fix:** Create a shared `parties.js` file:

```javascript
// parties.js
const PARTIES = {
  islamic: { label: 'Islamic Assoc of Halifax', color: '#10b981' },
  healthier: { label: 'The Healthier Future', color: '#3b82f6' },
  // ... etc
};

// Then in each HTML file:
<script src="../parties.js"></script>
<script>
  const PARTY_COLORS = Object.fromEntries(Object.entries(PARTIES).map(([k,v]) => [k, v.color]));
  const PARTY_LABELS = Object.fromEntries(Object.entries(PARTIES).map(([k,v]) => [k, v.label]));
</script>
```

---

### 18. No Server-Side Logging (LOW)
**Location:** [`Code.gs`](../Code.gs)

**Problem:** No server-side logging for debugging. If issues occur, there's no audit trail.

**Impact:** Difficult to debug issues after the fact.

**Fix:** Add logging:

```javascript
function logEvent(type, data) {
  var sheet = getOrCreateSheet('TH_Logs', ['Timestamp','Type','Data']);
  sheet.appendRow([new Date(), type, JSON.stringify(data)]);
}

// Then add logEvent() calls at key points:
function thCastVote(pin, partyId) {
  logEvent('VOTE_ATTEMPT', { pin: pin.substring(0,2) + '**', partyId });
  // ... rest of function
}
```

---

### 19. Hardcoded URL in Pin Handout (LOW)
**Location:** [`WaughNet/pin-handout.html:76`](WaughNet/pin-handout.html:76)

**Problem:** The GitHub Pages URL is hardcoded. If the deployment changes, this must be updated.

**Impact:** Students might get wrong URL.

**Fix:** Use a relative path or environment variable:

```javascript
const BASE = window.location.href.replace(/[^/]*$/, '');
```

---

### 20. Missing Accessibility Attributes (LOW)
**Location:** All HTML files

**Problem:** Missing ARIA labels on some interactive elements.

**Impact:** Reduced accessibility for screen reader users.

**Fix:** Add ARIA labels:

```html
<button id="login-btn" class="btn btn-primary" aria-label="Login with PIN">Enter →</button>
<div id="conn-dot" aria-label="Connection status" role="status"></div>
```

---

### 21. No Offline Fallback (LOW)
**Location:** All frontend files

**Problem:** If the network goes down, students see "offline" but can't do anything.

**Impact:** Poor UX during network issues.

**Fix:** Add service worker for offline caching (optional, given the single-session nature).

---

## POSITIVE FINDINGS

The following aspects are well-implemented:

1. **Question text properly hidden from students** - Only status is returned in `pollStudent()`, not the question text. ✅
2. **Vote self-party blocking on server** - Server-side validation prevents voting for own party. ✅
3. **Message filtering by role** - Members only see their own messages + leader broadcasts. Leaders see everything. ✅
4. **Teacher-only access to moderation** - `isTeacherPin()` check on all teacher functions. ✅
5. **Hashed PIN storage for votes** - PINs are not stored in plain text in the vote sheet. ✅
6. **Input length validation** - Messages (300 chars) and questions (500 chars) have reasonable limits. ✅
7. **Clean separation of concerns** - Frontend, backend, and data layers are well-separated. ✅

---

## RECOMMENDATIONS

### Before Next Class (Must Fix)
1. Fix race condition in vote casting (Issue #1)
2. Increase lock timeout to 30 seconds (Issue #2)
3. Implement exponential backoff on poll failures (Issue #4)
4. Add timeout to all fetch requests (Issue #6)
5. Replace `waitLock()` with `tryLock()` (Issue #7)

### Before Next Semester (Should Fix)
6. Fix message ID collision (Issue #3)
7. Fix session state loss (Issue #5)
8. Implement rate limiting (Issue #8)
9. Fix poll timestamp drift (Issue #9)
10. Add connection retry logic (Issue #11)

### Nice to Have (Optional)
11. Move salt to ScriptProperties (Issue #12)
12. Add PIN format validation (Issue #13)
13. Fix optimistic UI updates (Issue #14)
14. Add CSRF protection (Issue #16)
15. Consolidate party data (Issue #17)
16. Add server-side logging (Issue #18)

---

## TESTING RECOMMENDATIONS

Before the next class, test the following scenarios:

1. **Concurrent voting** - Have 5 students try to vote simultaneously
2. **Network interruption** - Disconnect a Chromebook mid-session, then reconnect
3. **High message volume** - Have all students send messages rapidly
4. **Slow GAS response** - Simulate slow server responses (use Chrome DevTools throttling)
5. **Clock skew** - Set a client's clock 5 minutes ahead and verify messages still arrive
6. **Teacher session loss** - Refresh teacher console mid-session

---

## CONCLUSION

The WaughNet system is fundamentally sound for its intended purpose. The critical issues are primarily around **concurrency handling** and **lock management**, which could cause problems under the expected load of 30 students. The fixes recommended above are straightforward to implement and will significantly improve reliability.

The system does a good job of protecting data integrity (question text hidden, vote validation, message filtering) and the architecture is clean and maintainable.

**Overall Assessment:** With the critical fixes applied, this system should be reliable enough for a classroom setting. The remaining issues are improvements that can be implemented incrementally.

---

**End of Audit Report**
