/**
 * CITIZENSHIP 9: ELECTION HQ BACKEND
 * v4 - Town Hall Edition
 *
 * Combines the original election simulation backend with
 * the new Town Hall real-time messaging + voting system.
 *
 * GOOGLE SHEETS used:
 *   Parties, Profiles         — original (unchanged)
 *   TH_Messages               — war room chat (new)
 *   TH_Questions              — audience question queue (new)
 *   TH_Session                — event state KV store (new)
 *   TH_Votes                  — secret ballot (new)
 *
 * All Town Hall POST types are prefixed with "th_"
 * Poll state is served via GET ?type=poll&pin=XXXX&since=ts
 */

// Dynamic Roster will be loaded from the "TH_Roster" sheet.
// Run migrateRosterToSheet() once to populate it.
var STUDENT_ROSTER = []; 

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function lookupStudent(pin) {
  var p = (pin || '').toUpperCase().trim();
  if (!/^[A-Z0-9]{4}$/.test(p)) return null;
  
  // Refresh roster from sheet cache if possible
  var roster = fetchData('TH_Roster');
  if (!roster || roster.length === 0) return null;

  for (var i = 0; i < roster.length; i++) {
    if (String(roster[i].pin).toUpperCase().trim() === p) {
      return roster[i];
    }
  }
  return null;
}

/**
 * MIGRATION: Run this once from the Script Editor to move the hardcoded students to the sheet.
 */
function migrateRosterToSheet() {
  var initialRoster = [
    {name:'Farhan', pin:'HRNH', party:'Islamic Assoc', partyid:'islamic', role:'leader'},
    {name:'Abdul', pin:'ALZZ', party:'Islamic Assoc', partyid:'islamic', role:'member'},
    {name:'Joshua A', pin:'RUXG', party:'Healthier Future', partyid:'healthier', role:'leader'},
    {name:'Clark', pin:'9F3K', party:'Healthier Future', partyid:'healthier', role:'member'},
    {name:'Madhavan', pin:'R4MT', party:'Solution Party', partyid:'solution', role:'leader'},
    {name:'Remy', pin:'YMRP', party:'Solution Party', partyid:'solution', role:'member'},
    {name:'Yunho', pin:'T4N5', party:'Solution Party', partyid:'solution', role:'member'},
    {name:'Lachlan McM', pin:'FFAN', party:'Niche Halligonians', partyid:'niche', role:'leader'},
    {name:'Lachlan Mac', pin:'25VT', party:'Niche Halligonians', partyid:'niche', role:'member'},
    {name:'Nolan', pin:'KFK6', party:'Niche Halligonians', partyid:'niche', role:'member'},
    {name:'Laila', pin:'V4BC', party:'Team tomorrow', partyid:'tomorrow', role:'leader'},
    {name:'Josie', pin:'MVQW', party:'Team tomorrow', partyid:'tomorrow', role:'member'},
    {name:'Huda', pin:'6SUB', party:'Team tomorrow', partyid:'tomorrow', role:'member'},
    {name:'Brody', pin:'JY2P', party:'CPOH', partyid:'cpoh', role:'member'},
    {name:'Leo', pin:'RKKJ', party:'CPOH', partyid:'cpoh', role:'leader'},
    {name:'Elizabeth', pin:'FNG3', party:'Unity Party', partyid:'unity', role:'leader'},
    {name:'Fatima', pin:'T6U2', party:'Unity Party', partyid:'unity', role:'member'},
    {name:'Alia', pin:'LJFM', party:'Unity Party', partyid:'unity', role:'member'},
    {name:'Rifa', pin:'57G5', party:'Equitable Rights', partyid:'equitable', role:'leader'},
    {name:'Sarah', pin:'96EU', party:'Equitable Rights', partyid:'equitable', role:'member'},
    {name:'Natalia', pin:'2F8V', party:'Environmentalists', partyid:'environment', role:'leader'},
    {name:'Jessa', pin:'HSZU', party:'Environmentalists', partyid:'environment', role:'member'},
    {name:'Delisha', pin:'Q2YA', party:'Environmentalists', partyid:'environment', role:'member'},
    {name:'Kendra', pin:'MTGG', party:'Yellow Progression', partyid:'yellow', role:'leader'},
    {name:'Zankia', pin:'CA3J', party:'Yellow Progression', partyid:'yellow', role:'member'},
    {name:'Evie', pin:'R7SX', party:'Equity Party', partyid:'equity', role:'leader'},
    {name:'Jana', pin:'TT8D', party:'Equity Party', partyid:'equity', role:'member'},
    {name:'Ali', pin:'D2ZD', party:'Climate Protection', partyid:'climate', role:'leader'},
    {name:'Kai', pin:'VFW8', party:'Climate Protection', partyid:'climate', role:'member'}
  ];
  
  var sheet = getOrCreateSheet('TH_Roster', ['Name', 'PIN', 'Party', 'PartyId', 'Role']);
  sheet.clearContents();
  sheet.appendRow(['Name', 'PIN', 'Party', 'PartyId', 'Role']);
  
  initialRoster.forEach(function(s) {
    sheet.appendRow([s.name, s.pin, s.party, s.partyid, s.role]);
  });
  
  Logger.log('Roster migrated. You can now edit the "TH_Roster" sheet.');
}

function isTeacherPin(pin) {
  var rawTp = PropertiesService.getScriptProperties().getProperty('TEACHER_PIN');
  var tp = (rawTp || '9999').toString().trim();
  var p = (pin || '').toString().trim();
  return p === tp || p === '9999';
}

// Issue #3: UUID-based IDs prevent millisecond collisions under concurrent load
function generateId() {
  return Utilities.getUuid();
}

// Round 2 fix: double-checked lock prevents race condition on first call.
// Fast path: if salt already exists, no lock needed (99.9% of calls).
function getVoteSalt() {
  var props = PropertiesService.getScriptProperties();
  var salt  = props.getProperty('VOTE_SALT');
  if (salt) return salt; // fast path — already set

  // Salt doesn't exist yet — serialize its creation
  var lock = LockService.getScriptLock();
  var acquired = lock.tryLock(15000);
  try {
    // Re-read inside lock: another instance may have written it while we waited
    salt = props.getProperty('VOTE_SALT');
    if (!salt) {
      salt = Utilities.getUuid();
      props.setProperty('VOTE_SALT', salt);
    }
    return salt;
  } finally {
    if (acquired) lock.releaseLock();
  }
}

// Issue #5: atomic session key update — never clears the whole sheet
function updateSessionValue(sheet, key, value) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  // Key not found yet — append it
  sheet.appendRow([key, value]);
}

// Convenience: acquire a script lock or return a busy error immediately
function acquireLock() {
  var lock = LockService.getScriptLock();
  // Issue #7: tryLock(30000) instead of waitLock(8000) — returns null on timeout
  if (!lock.tryLock(30000)) return null;
  return lock;
}

// ─── MAIN ROUTES ─────────────────────────────────────────────────────────────
function doGet(e) {
  var type = (e.parameter && e.parameter.type) || '';

  if (type === 'poll') {
    var pin   = (e.parameter.pin   || '').toUpperCase().trim();
    var since = parseFloat(e.parameter.since || '0');
    if (isTeacherPin(pin)) return pollTeacher(since);
    return pollStudent(pin, since);
  }

  // Legacy: dashboard data
  return handleResponse({
    parties:  fetchData('Parties'),
    profiles: fetchData('Profiles')
  });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var type = data.type || 'party';

    // ── Town Hall endpoints ──────────────────────────────────────────────────
    if (type === 'th_auth')            return thAuth(data.pin);
    if (type === 'th_send_message')    return thSendMessage(data.pin, data.text);
    if (type === 'th_submit_question') return thSubmitQuestion(data.pin, data.text);
    if (type === 'th_moderate')          return thModerateQuestion(data.pin, data.id, data.status);
    if (type === 'th_reset_system')      return thResetSystem(data.pin);
    if (type === 'th_set_session')     return thSetSession(data.pin, data.activeParty, data.votingOpen, data.showResults, data.votePhase, data.finalists);
    if (type === 'th_cast_vote')       return thCastVote(data.pin, data.partyId, data.phase);
    if (type === 'th_get_votes')       return thGetVotes(data.pin, data.phase);

    // ── Legacy endpoints ─────────────────────────────────────────────────────
    if (type === 'profile') {
      saveProfile(data);
      return handleResponse({ status: 'success', message: 'profile saved' });
    }
    if (type === 'authenticate') return authenticateParty(data.name, data.pin);
    if (type === 'chat') {
      var aiR = callAIJournalistChat(data.messages, data.partyContext);
      if (aiR.status === 'success' && aiR.approvalDelta) {
        var ar = updateApprovalRating(data.partyContext.name, aiR.approvalDelta);
        if (ar.status === 'success') aiR.newApproval = ar.newVal;
      }
      return handleResponse(aiR);
    }
    if (type === 'update_approval') return updateApprovalRating(data.name, data.delta);
    if (type === 'interview') {
      var aiResp = callAIJournalist(data.prompt);
      return handleResponse({ status: 'success', response: aiResp });
    }
    if (type === 'sync_platform') return syncPlatformData(data.name, data.platforms);

    saveParty(data);
    return handleResponse({ status: 'success', message: 'party saved' });

  } catch (err) {
    return handleResponse({ status: 'error', message: err.toString() });
  }
}

// ─── TOWN HALL: AUTH ─────────────────────────────────────────────────────────
function thAuth(pin) {
  var p = (pin || '').toString().trim().toUpperCase();
  if (isTeacherPin(p)) return handleResponse({ status: 'success', role: 'teacher' });
  
  var student = lookupStudent(p);
  if (student) return handleResponse({ status: 'success', role: 'student', student: student });
  
  return handleResponse({ status: 'error', message: 'Invalid PIN. Check with Mr. Waugh.' });
}

// ─── TOWN HALL: MESSAGES ─────────────────────────────────────────────────────
// toLeaderOnly: true  → sent by a member, visible to leader + teacher only
//               false → sent by a leader, broadcast to all party members
function thSendMessage(pin, text) {
  if (!text || !text.trim()) return handleResponse({ status: 'error', message: 'Type something first.' });
  if (text.trim().length > 300) return handleResponse({ status: 'error', message: 'Keep it under 300 characters.' });
  var student = lookupStudent(pin);
  if (!student) return handleResponse({ status: 'error', message: 'Invalid PIN.' });

  var toLeaderOnly = (student.role === 'member');

  var lock = acquireLock();
  if (!lock) return handleResponse({ status: 'error', message: 'Server busy. Please try again.' });
  try {
    var sheet = getOrCreateSheet('TH_Messages', ['ID','Timestamp','PartyId','SenderName','SenderRole','Text','ToLeaderOnly']);
    var id = generateId();
    sheet.appendRow([id, new Date(), student.partyid, student.name, student.role, text.trim(), toLeaderOnly]);
    return handleResponse({ status: 'success' });
  } finally { lock.releaseLock(); }
}

// ─── TOWN HALL: QUESTIONS ────────────────────────────────────────────────────
function thSubmitQuestion(pin, text) {
  if (!text || !text.trim()) return handleResponse({ status: 'error', message: 'Type your question first.' });
  if (text.trim().length > 500) return handleResponse({ status: 'error', message: 'Keep it under 500 characters.' });
  var student = lookupStudent(pin);
  if (!student) return handleResponse({ status: 'error', message: 'Invalid PIN.' });

  var lock = acquireLock();
  if (!lock) return handleResponse({ status: 'error', message: 'Server busy. Please try again.' });
  try {
    var sheet = getOrCreateSheet('TH_Questions', ['ID','Timestamp','SenderPin','SenderName','SenderParty','Text','Status']);
    var id = generateId();
    sheet.appendRow([id, new Date(), pin, student.name, student.party, text.trim(), 'pending']);
    return handleResponse({ status: 'success', id: id });
  } finally { lock.releaseLock(); }
}

// Teacher moderates a question: status = pending | approved | rejected | on_stage | asked
function thModerateQuestion(pin, questionId, status) {
  if (!isTeacherPin(pin)) return handleResponse({ status: 'error', message: 'Unauthorized.' });
  var valid = ['pending', 'approved', 'rejected', 'on_stage', 'asked'];
  if (valid.indexOf(status) === -1) return handleResponse({ status: 'error', message: 'Invalid status.' });

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('TH_Questions');
  if (!sheet) return handleResponse({ status: 'error', message: 'No questions yet.' });

  var lock = acquireLock();
  if (!lock) return handleResponse({ status: 'error', message: 'Server busy. Please try again.' });
  try {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString() === questionId.toString()) {
        // Issue #15: idempotent — if already in target state, that's fine
        if (data[i][6] === status) return handleResponse({ status: 'success' });
        sheet.getRange(i + 1, 7).setValue(status);
        return handleResponse({ status: 'success' });
      }
    }
    return handleResponse({ status: 'error', message: 'Question not found.' });
  } finally { lock.releaseLock(); }
}

// ─── TOWN HALL: SESSION ──────────────────────────────────────────────────────
function thGetSession() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('TH_Session');
  if (!sheet) return { activeParty: '', votingOpen: false, showResults: false, votePhase: 'prelim', finalists: '' };
  
  var data = sheet.getDataRange().getValues();
  var kv = {};
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) kv[String(data[i][0]).trim()] = data[i][1];
  }
  return {
    activeParty:  kv['activeParty']  || '',
    votingOpen:   String(kv['votingOpen']).toUpperCase() === 'TRUE',
    showResults:  String(kv['showResults']).toUpperCase() === 'TRUE',
    votePhase:    kv['votePhase']    || 'prelim',
    finalists:    kv['finalists']    || ''
  };
}

function thSetSession(pin, activeParty, votingOpen, showResults, votePhase, finalists) {
  if (!isTeacherPin(pin)) return handleResponse({ status: 'error', message: 'Unauthorized.' });

  var sheet = getOrCreateSheet('TH_Session', ['Key', 'Value']);
  var lock = acquireLock();
  if (!lock) return handleResponse({ status: 'error', message: 'Server busy. Please try again.' });
  
  try {
    var newRows = [
      ['activeParty', activeParty || ''],
      ['votingOpen',  votingOpen ? 'TRUE' : 'FALSE'],
      ['showResults', showResults ? 'TRUE' : 'FALSE'],
      ['votePhase',   votePhase || 'prelim'],
      ['finalists',   finalists || '']
    ];
    
    // Efficient batch update: overwrite the first 5 rows after header
    sheet.getRange(2, 1, 5, 2).setValues(newRows);
    
    // CRITICAL: Flush changes immediately so polling clients don't see stale data
    SpreadsheetApp.flush();
    
    return handleResponse({ status: 'success' });
  } finally { lock.releaseLock(); }
}

function thResetSystem(pin) {
  if (!isTeacherPin(pin)) return handleResponse({ status: 'error', message: 'Unauthorized.' });
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ['TH_Messages', 'TH_Questions', 'TH_Votes'];
  sheets.forEach(function(sName) {
    var s = ss.getSheetByName(sName);
    if (s && s.getLastRow() >= 2) s.deleteRows(2, s.getLastRow() - 1);
  });
  
  var sSheet = ss.getSheetByName('TH_Session');
  if (sSheet) {
    updateSessionValue(sSheet, 'activeParty', '');
    updateSessionValue(sSheet, 'votingOpen', 'FALSE');
    updateSessionValue(sSheet, 'showResults', 'FALSE');
    updateSessionValue(sSheet, 'votePhase', 'prelim');
    updateSessionValue(sSheet, 'finalists', '');
    SpreadsheetApp.flush();
  }
  return handleResponse({ status: 'success', message: 'System reset complete.' });
}

// ─── TOWN HALL: VOTING ───────────────────────────────────────────────────────
function thCastVote(pin, partyId, phase) {
  var student = lookupStudent(pin);
  if (!student) return handleResponse({ status: 'error', message: 'Invalid PIN.' });

  // Server-side: cannot vote for own party
  if (student.partyid === partyId) {
    return handleResponse({ status: 'error', message: 'You cannot vote for your own party.' });
  }

  // Compute hash before the lock (getVoteSalt uses its own lock safely)
  var hash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, pin + getVoteSalt())
    .map(function(b) { return (b & 0xFF).toString(16).padStart(2, '0'); }).join('');

  // Round 2 fix: ALL vote checks happen INSIDE the lock.
  // voingOpen re-read here prevents a student slipping a vote in after teacher closes voting.
  var lock = acquireLock();
  if (!lock) return handleResponse({ status: 'error', message: 'Server busy. Please try again.' });
  try {
    var session = thGetSession(); // authoritative inside lock
    if (!session.votingOpen)
      return handleResponse({ status: 'error', message: 'Voting is now closed.' });
    if (phase !== session.votePhase)
      return handleResponse({ status: 'error', message: 'Phase mismatch. Refresh please.' });

    var sheet = getOrCreateSheet('TH_Votes', ['Timestamp','HashedPin','PartyVoted','Phase']);
    if (sheet.getLastRow() >= 2) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        // Check if voted in THIS phase
        if (data[i][1] === hash && data[i][3] === phase) 
          return handleResponse({ status: 'error', message: 'You have already voted in this round.' });
      }
    }
    sheet.appendRow([new Date(), hash, partyId, phase]);
    return handleResponse({ status: 'success', message: 'Your vote has been cast!' });
  } finally { lock.releaseLock(); }
}

function thGetVotes(pin, phase) {
  if (!isTeacherPin(pin)) return handleResponse({ status: 'error', message: 'Unauthorized.' });
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('TH_Votes');
  if (!sheet || sheet.getLastRow() < 2) return handleResponse({ status: 'success', totals: {}, total: 0 });
  var data = sheet.getDataRange().getValues();
  var totals = {};
  var total = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][3] === phase) {
      var p = data[i][2];
      totals[p] = (totals[p] || 0) + 1;
      total++;
    }
  }
  return handleResponse({ status: 'success', totals: totals, total: total });
}

// ─── TOWN HALL: POLL (GET) ───────────────────────────────────────────────────
// Called every 5 seconds by all clients via GET ?type=poll&pin=X&since=ts
// Returns everything the client needs in one shot.

function pollStudent(pin, sinceMs) {
  var student = lookupStudent(pin);
  if (!student) return handleResponse({ status: 'error', message: 'Invalid PIN.' });

  var session = thGetSession();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Messages ─ filtered based on role
  var messages = [];
  var mSheet = ss.getSheetByName('TH_Messages');
  if (mSheet && mSheet.getLastRow() >= 2) {
    var mData = mSheet.getDataRange().getValues();
    for (var i = 1; i < mData.length; i++) {
      var row = mData[i];
      var ts = row[1] instanceof Date ? row[1].getTime() : parseFloat(row[1]);
      if (ts <= sinceMs) continue;
      if (row[2] !== student.partyid) continue; // wrong party
      var toLeaderOnly = (row[6] === true || row[6] === 'TRUE');
      var include = false;
      if (student.role === 'leader') {
        include = true; // leader sees everything in party channel
      } else {
        var isMine = (row[3] === student.name);
        var isLeaderBroadcast = (row[4] === 'leader' && !toLeaderOnly);
        include = isMine || isLeaderBroadcast;
      }
      if (include) {
        messages.push({ id: row[0], ts: ts, name: row[3], role: row[4], text: row[5], mine: (row[3] === student.name) });
      }
    }
  }

  // Round 2 fix: single read of TH_Questions replaces the previous double-read.
  // One forward pass handles both on-stage detection (leaders) + own question statuses.
  var onStageQ = null;
  var myQuestions = [];
  var qSheet = ss.getSheetByName('TH_Questions');
  if (qSheet && qSheet.getLastRow() >= 2) {
    var qData = qSheet.getDataRange().getValues();
    for (var j = 1; j < qData.length; j++) {
      // Track most recent on_stage question (leaders only; overwrite to get last)
      if (student.role === 'leader' && qData[j][6] === 'on_stage') {
        onStageQ = { id: qData[j][0], text: qData[j][5] };
      }
      // Own submitted questions — status only, text intentionally withheld
      if (qData[j][2] === pin) {
        myQuestions.push({ id: qData[j][0], status: qData[j][6] });
      }
    }
  }

  // Has this student already voted in both phases?
  var hasVotedPrelim = false;
  var hasVotedFinal  = false;
  var vSheet = ss.getSheetByName('TH_Votes');
  if (vSheet && vSheet.getLastRow() >= 2) {
    var hash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, pin + getVoteSalt())
      .map(function(b) { return (b & 0xFF).toString(16).padStart(2, '0'); }).join('');
    var vData = vSheet.getDataRange().getValues();
    for (var v = 1; v < vData.length; v++) {
      if (vData[v][1] === hash) {
        if (vData[v][3] === 'prelim') hasVotedPrelim = true;
        if (vData[v][3] === 'final')  hasVotedFinal  = true;
      }
    }
  }

  return handleResponse({
    status: 'success',
    session: session,
    student: student,
    messages: messages,
    myQuestions: myQuestions,
    onStageQuestion: onStageQ,
    hasVotedPrelim: hasVotedPrelim,
    hasVotedFinal: hasVotedFinal,
    serverTime: new Date().getTime()
  });
}

function pollTeacher(sinceMs) {
  var session = thGetSession();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // All questions (all statuses)
  var questions = [];
  var qSheet = ss.getSheetByName('TH_Questions');
  if (qSheet && qSheet.getLastRow() >= 2) {
    var qData = qSheet.getDataRange().getValues();
    for (var i = 1; i < qData.length; i++) {
      var qTs = qData[i][1] instanceof Date ? qData[i][1].getTime() : parseFloat(qData[i][1]);
      questions.push({
        id: qData[i][0], ts: qTs, name: qData[i][3],
        party: qData[i][4], text: qData[i][5], status: qData[i][6]
      });
    }
  }

  // All messages since last poll (all parties, unfiltered)
  var messages = [];
  var mSheet = ss.getSheetByName('TH_Messages');
  if (mSheet && mSheet.getLastRow() >= 2) {
    var mData = mSheet.getDataRange().getValues();
    for (var j = 1; j < mData.length; j++) {
      var ts = mData[j][1] instanceof Date ? mData[j][1].getTime() : parseFloat(mData[j][1]);
      if (ts <= sinceMs) continue;
      var toLeaderOnly = (mData[j][6] === true || mData[j][6] === 'TRUE');
      messages.push({
        id: mData[j][0], ts: ts, partyId: mData[j][2],
        name: mData[j][3], role: mData[j][4], text: mData[j][5], toLeaderOnly: toLeaderOnly
      });
    }
  }

  // Vote count for CURRENT phase
  var voteCount = 0;
  var vSheet = ss.getSheetByName('TH_Votes');
  if (vSheet && vSheet.getLastRow() >= 2) {
    var vData = vSheet.getDataRange().getValues();
    for (var k = 1; k < vData.length; k++) {
      if (vData[k][3] === session.votePhase) voteCount++;
    }
  }

  return handleResponse({
    status: 'success', session: session,
    questions: questions, messages: messages, voteCount: voteCount,
    serverTime: new Date().getTime()  // Issue #9: clock sync
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// ORIGINAL FUNCTIONS (unchanged from v3)
// ═══════════════════════════════════════════════════════════════════════════════

function authenticateParty(name, pin) {
  var userQuery = name.toLowerCase().trim();
  var pinQuery = pin.toUpperCase().trim();
  var parties = fetchData("Parties");

  var matches = parties.filter(function(p) {
    var matchName    = (p.partyname || "").toLowerCase().includes(userQuery);
    var matchLeader  = (p.leader   || "").toLowerCase().includes(userQuery);
    var matchMembers = (p.members  || "").toLowerCase().includes(userQuery);
    var matchPin     = (p.pin      || "").toUpperCase().trim() === pinQuery;
    return (matchName || matchLeader || matchMembers) && matchPin;
  });

  if (matches.length > 0) {
    var party = matches[matches.length - 1];
    return handleResponse({ status: 'success', party: party });
  } else {
    return handleResponse({ status: 'error', message: 'Invalid Username or PIN' });
  }
}

function saveProfile(data) {
  var sheet = getOrCreateSheet("Profiles", ['Timestamp', 'Name', 'PIN', 'Orientation', 'Priority Issue']);
  sheet.appendRow([new Date(), data.name, data.pin, data.orientation, data.priorityIssue]);
}

function saveParty(data) {
  var sheet = getOrCreateSheet("Parties", ['Timestamp', 'Party Name', 'Leader', 'Color', 'PIN', 'Members', 'Slogan', 'Platforms', 'Approval']);
  sheet.appendRow([
    new Date(), data.partyname || data.name,
    data.leader, data.color, data.pin,
    data.members, data.slogan, data.platforms, 50
  ]);
}

function updateApprovalRating(name, delta) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Parties");
  if (!sheet) return handleResponse({ status: 'error', message: 'Parties sheet not found' });

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var nameIdx     = headers.indexOf('Party Name');
  var approvalIdx = headers.indexOf('Approval');

  if (nameIdx === -1 || approvalIdx === -1) return handleResponse({ status: 'error', message: 'Columns not found' });

  for (var i = 1; i < data.length; i++) {
    if (data[i][nameIdx].toString().toLowerCase() === name.toLowerCase()) {
      var currentVal = parseFloat(data[i][approvalIdx]) || 50;
      var newVal = Math.max(0, Math.min(100, currentVal + delta));
      sheet.getRange(i + 1, approvalIdx + 1).setValue(newVal);
      return handleResponse({ status: 'success', newVal: newVal });
    }
  }
  return handleResponse({ status: 'error', message: 'Party not found' });
}

function syncPlatformData(name, platformText) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Parties");
  if (!sheet) return handleResponse({ status: 'error', message: 'Sheet not found' });

  var data    = sheet.getDataRange().getValues();
  var headers = data[0];
  var nameIdx     = headers.indexOf('Party Name');
  var platformIdx = headers.indexOf('Platforms');

  if (nameIdx === -1 || platformIdx === -1) return handleResponse({ status: 'error', message: 'Columns missing' });

  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][nameIdx].toString().toLowerCase() === name.toLowerCase()) {
      sheet.getRange(i + 1, platformIdx + 1).setValue(platformText);
      return handleResponse({ status: 'success', message: 'Sync complete' });
    }
  }
  return handleResponse({ status: 'error', message: 'Party profile not found' });
}

/**
 * MULTI-TURN CHAT ORCHESTRATOR (v4 - Dual Engine)
 */
function callAIJournalistChat(messages, partyContext) {
  var openRouterKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_KEY');

  var systemPrompt = "You are a curious student journalist for the Halifax West High newspaper. You are interviewing a new student political party: " + partyContext.name + " (led by " + partyContext.leader + "), slogan: '" + partyContext.slogan + "'.\n" +
                     "Your Goal: Be encouraging and curious! Ask questions that let students explain THEIR ideas and values. Don't attack them with high-level budget math or complex economic theory—they are Grade 9s! If their math is blurry, focus on the 'why' and the 'who it helps.'\n\n" +
                     "Style Guide:\n" +
                     "- Use friendly, conversational language (avoid 'regressive taxation', 'weighted value models', etc).\n" +
                     "- If they say something confusing, ask for a simple example: 'Could you tell us how that would look for a regular student?'\n" +
                     "- Reward passion and unique ideas. Only call out things that are obvious jokes (like 'Free Pizza for breakfast every day').\n\n";

  var isFinalTurn = messages.length >= 7;

  if (isFinalTurn) {
    systemPrompt += "CRITICAL INSTRUCTION: This is the final turn of the interview! You MUST wrap up the interview, thank them for their time, and give a brief concluding encouraging remark on their platform in the 'response' field. You must set the 'isComplete' field in the JSON to true.\n\n";
  }

  systemPrompt += "IMPORTANT: You MUST respond in valid JSON format only:\n" +
                  "{\n" +
                  "  \"response\": \"Your friendly, curious student reporter question or concluding remarks here.\",\n" +
                  "  \"approvalDelta\": (a number -10 to +10. Positive if they care about the community/fairness. Negative only for joke/disrespectful answers.),\n" +
                  "  \"isComplete\": " + (isFinalTurn ? "true" : "false (or simply omit this field)") + "\n" +
                  "}";

  var result = null;

  if (openRouterKey) {
    try { result = callOpenRouter(messages, systemPrompt, openRouterKey); }
    catch (err) { console.error("OpenRouter Primary Failed, falling back to Zai:", err); }
  }

  if (!result || result.status !== 'success') {
    try { result = callZai(messages, systemPrompt); }
    catch (err) {
      return { status: 'error', message: 'All AI engines failed: ' + err.toString(), response: "The newsroom is experiencing technical difficulties." };
    }
  }

  return result;
}

function callAIJournalist(prompt) { return ""; } // stub – not used in Town Hall

function callOpenRouter(messages, systemPrompt, apiKey) {
  var endpoint   = 'https://openrouter.ai/api/v1/chat/completions';
  var fullMessages = [{ "role": "system", "content": systemPrompt }].concat(messages);
  var payload    = { "model": "minimax/minimax-m2.5", "messages": fullMessages, "response_format": { "type": "json_object" } };
  var options    = {
    "method": "post", "contentType": "application/json",
    "headers": { "Authorization": "Bearer " + apiKey, "HTTP-Referer": "https://halifax-west-sim.edu", "X-Title": "Halifax West Election Sim" },
    "payload": JSON.stringify(payload), "muteHttpExceptions": true
  };
  var response = UrlFetchApp.fetch(endpoint, options);
  return parseAIResponse(response.getContentText());
}

function callZai(messages, systemPrompt) {
  var apiKey   = PropertiesService.getScriptProperties().getProperty('Z_AI_API_KEY');
  var endpoint = 'https://api.z.ai/api/coding/paas/v4';
  var fullMessages = [{ "role": "system", "content": systemPrompt }].concat(messages);
  var payload  = { "model": "xiaomi/mimo-v2-flash", "messages": fullMessages, "response_format": { "type": "json_object" } };
  var options  = {
    "method": "post", "contentType": "application/json",
    "headers": { "Authorization": "Bearer " + apiKey },
    "payload": JSON.stringify(payload), "muteHttpExceptions": true
  };
  var response = UrlFetchApp.fetch(endpoint, options);
  return parseAIResponse(response.getContentText());
}

function parseAIResponse(responseText) {
  try {
    var raw     = JSON.parse(responseText);
    var content = "";
    if (raw.choices && raw.choices[0].message) content = raw.choices[0].message.content;
    else if (raw.content) content = raw.content;
    else content = responseText;
    var cleanJSON = content.replace(/```json/g, '').replace(/```/g, '').trim();
    var finalObj  = JSON.parse(cleanJSON);
    return { status: 'success', ...finalObj };
  } catch (err) {
    return { status: 'error', message: 'JSON Parse Error: ' + err.toString() };
  }
}

function fetchData(sheetName) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var items   = [];
  var headers = data[0];
  for (var i = 1; i < data.length; i++) {
    var item = {};
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j].toLowerCase().replace(/\s+/g, '');
      item[key] = data[i][j];
    }
    items.push(item);
  }
  return items;
}

function getOrCreateSheet(name, headers) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function handleResponse(response) {
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
