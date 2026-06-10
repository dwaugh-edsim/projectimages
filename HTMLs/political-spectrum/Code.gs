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
/**
 * FINAL 4 ROSTER — Updated May 5 2026
 * Changes:
 *   - Natalia absent/removed
 *   - Delisha promoted to leader of Environmentalists
 *   - Kendra + Zankia transferred to Environmentalists (from Yellow Progression)
 *   - All non-Final-4 leaders downgraded to 'member' (voter interface)
 *   - Final 4 leaders: Elizabeth (unity), Lachlan McM (niche), Delisha (environment), Madhavan (solution)
 */
function migrateRosterToSheet() {
  var initialRoster = [
    {name:'Farhan',      pin:'HRNH', party:'Islamic Assoc',     partyid:'islamic',     role:'member'},
    {name:'Abdul',       pin:'ALZZ', party:'Islamic Assoc',     partyid:'islamic',     role:'member'},
    {name:'Joshua A',    pin:'RUXG', party:'Healthier Future',  partyid:'healthier',   role:'member'},
    {name:'Clark',       pin:'9F3K', party:'Healthier Future',  partyid:'healthier',   role:'member'},
    {name:'Madhavan',    pin:'R4MT', party:'Solution Party',    partyid:'solution',    role:'leader'},
    {name:'Remy',        pin:'YMRP', party:'Solution Party',    partyid:'solution',    role:'member'},
    {name:'Yunho',       pin:'T4N5', party:'Solution Party',    partyid:'solution',    role:'member'},
    {name:'Lachlan McM', pin:'FFAN', party:'Niche Halligonians',partyid:'niche',       role:'leader'},
    {name:'Lachlan Mac', pin:'25VT', party:'Niche Halligonians',partyid:'niche',       role:'member'},
    {name:'Nolan',       pin:'KFK6', party:'Niche Halligonians',partyid:'niche',       role:'member'},
    {name:'Laila',       pin:'V4BC', party:'Team tomorrow',     partyid:'tomorrow',    role:'member'},
    {name:'Josie',       pin:'MVQW', party:'Team tomorrow',     partyid:'tomorrow',    role:'member'},
    {name:'Huda',        pin:'6SUB', party:'Team tomorrow',     partyid:'tomorrow',    role:'member'},
    {name:'Brody',       pin:'JY2P', party:'CPOH',              partyid:'cpoh',        role:'member'},
    {name:'Leo',         pin:'RKKJ', party:'CPOH',              partyid:'cpoh',        role:'member'},
    {name:'Elizabeth',   pin:'FNG3', party:'Unity Party',       partyid:'unity',       role:'leader'},
    {name:'Fatima',      pin:'T6U2', party:'Unity Party',       partyid:'unity',       role:'member'},
    {name:'Alia',        pin:'LJFM', party:'Unity Party',       partyid:'unity',       role:'member'},
    {name:'Rifa',        pin:'57G5', party:'Equitable Rights',  partyid:'equitable',   role:'member'},
    {name:'Sarah',       pin:'96EU', party:'Equitable Rights',  partyid:'equitable',   role:'member'},
    {name:'Jessa',       pin:'HSZU', party:'Environmentalists', partyid:'environment', role:'member'},
    {name:'Delisha',     pin:'Q2YA', party:'Environmentalists', partyid:'environment', role:'leader'},
    {name:'Kendra',      pin:'MTGG', party:'Environmentalists', partyid:'environment', role:'member'},
    {name:'Zankia',      pin:'CA3J', party:'Environmentalists', partyid:'environment', role:'member'},
    {name:'Evie',        pin:'R7SX', party:'Equity Party',      partyid:'equity',      role:'member'},
    {name:'Jana',        pin:'TT8D', party:'Equity Party',      partyid:'equity',      role:'member'},
    {name:'Ali',         pin:'D2ZD', party:'Climate Protection',partyid:'climate',     role:'member'},
    {name:'Kai',         pin:'VFW8', party:'Climate Protection',partyid:'climate',     role:'member'}
  ];
  
  var sheet = getOrCreateSheet('TH_Roster', ['Name', 'PIN', 'Party', 'PartyId', 'Role']);
  sheet.clearContents();
  sheet.appendRow(['Name', 'PIN', 'Party', 'PartyId', 'Role']);
  
  initialRoster.forEach(function(s) {
    sheet.appendRow([s.name, s.pin, s.party, s.partyid, s.role]);
  });
  
  Logger.log('Roster migrated. You can now edit the "TH_Roster" sheet.');
}

/**
 * LIVE PATCH — Run this from the Apps Script editor RIGHT NOW to apply Final 4 personnel changes
 * WITHOUT wiping votes, messages, or questions.
 *
 * Changes applied:
 *   - Natalia (2F8V) removed (absent)
 *   - Delisha (Q2YA) promoted to leader of Environmentalists
 *   - Kendra  (MTGG) moved to Environmentalists, role: member
 *   - Zankia  (CA3J) moved to Environmentalists, role: member
 *   - Non-Final-4 former leaders downgraded to role: member
 *     (Farhan, Joshua A, Laila, Leo, Rifa, Evie, Ali)
 */
function updateRosterInSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('TH_Roster');
  if (!sheet) { Logger.log('TH_Roster sheet not found. Run migrateRosterToSheet() first.'); return; }

  var data = sheet.getDataRange().getValues();
  // Column indices (0-based): Name(0) PIN(1) Party(2) PartyId(3) Role(4)
  var pinCol = 1, partyCol = 2, partyIdCol = 3, roleCol = 4;

  // Patch map: PIN => {party, partyid, role} or null to delete the row
  var patches = {
    '2F8V': null,
    'Q2YA': {party:'Environmentalists', partyid:'environment', role:'leader'},
    'MTGG': {party:'Environmentalists', partyid:'environment', role:'member'},
    'CA3J': {party:'Environmentalists', partyid:'environment', role:'member'},
    'HRNH': {role:'member'},
    'RUXG': {role:'member'},
    'V4BC': {role:'member'},
    'RKKJ': {role:'member'},
    '57G5': {role:'member'},
    'R7SX': {role:'member'},
    'D2ZD': {role:'member'}
  };

  var rowsToDelete = [];
  for (var i = 1; i < data.length; i++) {
    var pin = String(data[i][pinCol]).toUpperCase().trim();
    if (!patches.hasOwnProperty(pin)) continue;
    var patch = patches[pin];
    if (patch === null) {
      rowsToDelete.push(i + 1);
    } else {
      if (patch.party)   sheet.getRange(i + 1, partyCol + 1).setValue(patch.party);
      if (patch.partyid) sheet.getRange(i + 1, partyIdCol + 1).setValue(patch.partyid);
      if (patch.role)    sheet.getRange(i + 1, roleCol + 1).setValue(patch.role);
      Logger.log('Patched: ' + data[i][0] + ' (' + pin + ')');
    }
  }

  // Delete in reverse so row indices don't shift
  rowsToDelete.reverse().forEach(function(rowNum) {
    sheet.deleteRow(rowNum);
    Logger.log('Deleted row ' + rowNum + ' (Natalia)');
  });

  SpreadsheetApp.flush();
  Logger.log('Roster patch complete. ' + rowsToDelete.length + ' row(s) deleted.');
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

  if (type === 'fb_get') return fbGet(e);

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
// FEEDBACK ENDPOINT (v1)
// ═══════════════════════════════════════════════════════════════════════════════
// GET ?type=fb_get&pin=XXXX
// Returns the feedback record for the student whose PIN matches.
// Rate-limited per IP via CacheService. Teacher PIN is rejected.
// All feedback data lives in a sheet (FB_Feedback) so it can be edited
// without redeploying Code.gs.

// Header row for FB_Feedback sheet
var FB_HEADERS = [
  'Name', 'Party', 'Role', 'PIN',
  'G51', 'T51', 'X51', 'Q51',
  'G52', 'T52', 'X52', 'Q52',
  'G53', 'T53', 'X53', 'Q53',
  'Closing', 'Provisional', 'Updated'
];

function fbLookup(pin) {
  var p = (pin || '').toUpperCase().trim();
  if (!/^[A-Z0-9]{4,5}$/.test(p)) return null;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('FB_Feedback');
  if (!sheet || sheet.getLastRow() < 2) return null;

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][3]).toUpperCase().trim() === p) {
      return {
        name:        String(data[i][0] || ''),
        party:       String(data[i][1] || ''),
        role:        String(data[i][2] || ''),
        pin:         p,
        g51:         String(data[i][4] || ''),
        t51:         String(data[i][5] || ''),
        x51:         String(data[i][6] || ''),
        q51:         String(data[i][7] || ''),
        g52:         String(data[i][8] || ''),
        t52:         String(data[i][9] || ''),
        x52:         String(data[i][10] || ''),
        q52:         String(data[i][11] || ''),
        g53:         String(data[i][12] || ''),
        t53:         String(data[i][13] || ''),
        x53:         String(data[i][14] || ''),
        q53:         String(data[i][15] || ''),
        closing:     String(data[i][16] || ''),
        provisional: data[i][17] === true || String(data[i][17]).toUpperCase() === 'TRUE'
      };
    }
  }
  return null;
}

// Per-IP rate limit. 10 requests / 60 seconds. Returns true if allowed.
function fbRateLimitOk(ipKey) {
  if (!ipKey) return true; // no IP available, skip limiting
  var cache = CacheService.getScriptCache();
  var key = 'fb_rl_' + ipKey;
  var current = cache.get(key);
  if (current && parseInt(current, 10) >= 10) return false;
  cache.put(key, String((parseInt(current, 10) || 0) + 1), 60);
  return true;
}

function fbGet(e) {
  // Pull PIN from query string
  var pin = (e.parameter && e.parameter.pin) || '';

  // Reject empty / teacher PIN
  if (!pin) return handleResponse({ status: 'error', code: 'NO_PIN', message: 'Missing PIN.' });
  if (isTeacherPin(pin)) {
    return handleResponse({ status: 'error', code: 'TEACHER_PIN', message: 'Teacher PIN not permitted.' });
  }

  // Rate limit by a best-effort IP key (X-Forwarded-For is not directly accessible in
  // ContentService responses, so we use a hashed browser hint instead if provided).
  var ipKey = (e.parameter && e.parameter.k) || '';
  if (!fbRateLimitOk(ipKey)) {
    return handleResponse({ status: 'error', code: 'RATE_LIMIT', message: 'Too many requests. Wait a minute and try again.' });
  }

  var record = fbLookup(pin);
  if (!record) {
    // Constant-ish delay to discourage PIN enumeration
    Utilities.sleep(250);
    return handleResponse({ status: 'error', code: 'NOT_FOUND', message: 'PIN not recognized.' });
  }
  return handleResponse({ status: 'success', record: record });
}

/**
 * ONE-TIME SETUP: Run this from the script editor to create the FB_Feedback
 * sheet with the correct headers. Then paste student rows in via the Apps
 * Script editor or import the matrix.
 */
function initFeedbackSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('FB_Feedback');
  if (sheet) {
    Logger.log('FB_Feedback already exists. Clearing contents.');
    sheet.clearContents();
  } else {
    sheet = ss.insertSheet('FB_Feedback');
  }
  sheet.appendRow(FB_HEADERS);
  Logger.log('FB_Feedback sheet created with headers. Ready for student rows.');
}

/**
 * BULK IMPORT: Run this once after initFeedbackSheet() to populate the
 * FB_Feedback sheet with the 30 student records that match the moderated
 * grading matrix. Each record maps the matrix fields to the sheet columns.
 *
 * Columns written: Name, Party, Role, PIN, G51, T51, X51, Q51, ... , Closing, Provisional, Updated
 *
 * If a record already exists for a PIN, it is overwritten.
 */
function populateFeedbackFromMatrix() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('FB_Feedback');
  if (!sheet) {
    Logger.log('FB_Feedback sheet not found. Run initFeedbackSheet() first.');
    return;
  }

  // Each record: [Name, Party, Role, PIN, G51, T51, X51, Q51, G52, T52, X52, Q52, G53, T53, X53, Q53, Closing, Provisional]
  // Quotes (Q*) are passed as empty strings and edited in the sheet after import if needed.
  var rows = [
    ['Madhavan', 'The Party De Solution', 'Leader', 'R4MT',
      '4', 'You picked issues people actually cared about.',
        'Your platform hit three things that matter to students and families: better schools, safer buses, and actual healthcare in schools instead of just an ice pack. But what set you apart was the funding idea -- partnering with Subway so people get something back while supporting schools. You weren\'t just listing promises. You were thinking about why people would buy in.',
        'I was going for the happiness and the involvement of the population in my promises and even in my funding.',
      '3+', 'You understood how politics actually works.',
        'Your reflection showed you get something a lot of adults don\'t fully grasp: that likability and policy are always tangled together, and that in a small election like ours, personal connections can swing everything. You connected this to real-world politics, which shows you were thinking beyond the classroom. An even stronger response would map out more of how government revenue actually works in Canada -- pairing your creative funding ideas with established mechanisms like federal/provincial transfers would make the platform more resilient.',
        'Likability and buying votes absolutely mattered in a vote that consisted of 17 people... this absolutely matters in real life.',
      '4', 'You were the engine of your party.',
        'You took raw drafts from your teammates and turned them into political language. You wrote the strategy. You led the speech. You thought about coalition-building after the election was over. That\'s not just participation -- that\'s leadership with depth.',
        'I can help parties work together by giving them a common enemy to fight against, or even getting them to slightly move their policies to match the other\'s so that they have something in common to fight for.',
      'Madhavan, you led a party that came up with one of the most creative campaign ideas in the class. The Subway partnership wasn\'t just a gimmick -- it showed you were thinking about how to actually fund promises in a way people would get behind.', false],

    ['Joshua', 'The Healthier Future', 'Leader', 'RUXG',
      '4', 'Your issues were specific and real.',
        'You didn\'t just say \'fix healthcare.\' You talked about 50,000 new doctors, cutting medical school from 10 years to 5, a sin tax on harmful products, and e-prescriptions to speed up diagnosis.',
        'Policy was overall more effective due to the great ideas people said and the way they presented.',
      '3+', 'You understood how governments pay for things.',
        'Your platform used a sin tax -- a real government revenue tool that exists in countries around the world. You didn\'t invent it, but you understood why it works and how to pitch it. Pairing it with a second funding mechanism -- federal transfers, efficiency cuts, or reallocation -- would strengthen the plan further so it doesn\'t collapse if the sin tax underperforms.',
        'Likability made a good part in this election but policy was overall more effective.',
      '4', 'You did everything, and you owned it.',
        'In a two-person group, there\'s nowhere to hide. You made the entire project, script, roles, and slideshow. Your speech didn\'t win as many votes as you hoped, and you were honest about that.',
        'I made the entire project, script, roles and slideshow so I contributed the most in my group.',
      'Joshua, you carried a two-person party on your shoulders and you did it without excuses. You made the project, the script, the roles, and the slideshow -- all of it.', false],

    ['Lachlan', 'The Niche Haligonians', 'Leader', 'FFAN',
      '4', 'You picked fights worth having.',
        'Healthcare, education, and housing. But what made your platform stand out was the funding source: redirecting military scholarship money into walk-in clinics and smaller classrooms. You knew that would be controversial, and you leaned into it.',
        'The Niche Haligonians funding plan has been heavily attacked, as many see it as selfish and not giving funds to those who need it. I believe I have a fix for their funding plan that will satify the complaints of others.',
      '3+', 'You understood how budgets work.',
        'Your funding plan was a real policy argument about where public money should go, and your post-win Secret Menu compromise shows you understood that budgeting is about choices, not totals. Adding a second funding mechanism as a backup -- in case the military reallocation got blocked -- would make the platform more resilient.',
        'They are willing to compremise if thats what the people want, and I believe we should all try to work together.',
      '4', 'You did everything, then thought about what comes next.',
        'You wrote the speech. You handled the AI journalist. You delegated the financial plan to Nolan. And then, after winning, you immediately started thinking about how to satisfy the opposition. That\'s governance-level thinking.',
        'I did everything in the war room and in the campaign... I did the speech on my own, facts etc.',
      'Lachlan, you won the election and then immediately started thinking about how to govern. That\'s not normal for a Grade 9 project.', false],

    ['Rifa', 'Equitable Rights Party', 'Leader', '57G5',
      '4', 'Your platform was the most detailed in the class.',
        'The Equitable Rights Party didn\'t just say \'fix healthcare.\' You proposed specialized hospital departments, expanded public healthcare to include dental and vision, and tied wage growth to inflation. That\'s a policy platform.',
        'My biggest contribution would be creating the 2 minute speech and creating the slides for the speech. I was pranked by my partner so we had a short time period to finish the speech and I think the effort was worth it.',
      '4', 'You used a real multi-tool revenue plan.',
        'Your funding plan used sin taxes, luxury goods taxes, corporate tax tiers, AND cutting wasteful spending. That\'s a four-piece revenue strategy, which is what a real balanced budget looks like.',
        'As a citizen, actively engaging yourself with your own country can help you understand the issue and your support along with others can help party\'s realize the severity of the issue.',
      '4', 'You did everything in a two-person party, under pressure.',
        'You were the strategist, the financial planner, the speechwriter, and the slide creator. You worked the press conference. You were pranked by your partner and still delivered.',
        'I find it amusing that a single vote can change the whole government from a possible zero to hero... there is a little pressure that comes with this powerful choice.',
      'Rifa, your reflection was the most thoughtful in the class. You didn\'t just describe what you did -- you thought about what it meant.', false],

    ['Natalia', 'Environmentalists at Work', 'Leader', 'ABCDE',
      '4', 'Your platform had the most substance.',
        'Clean technology, coastal protection, offshore energy regulation -- and you backed it all up with specific policy history, like the 2019 Coastal Protection Act and the federal climate grants your party planned to apply for.',
        'I focused on making our message clear and connecting with people emotionally. I think my communication style helped win over voters because I tried to be confident and relatable.',
      '4', 'You referenced real legislation and named the funding streams behind it.',
        'Your platform named the 2019 Coastal Protection Act, its 2024 replacement, carbon tax revenue, and federal climate grants. That\'s the difference between knowing a problem exists and understanding how government actually creates and pays for the response.',
        'In real life, both matter, people want leaders with good ideas, but also someone they trust and relate to.',
      '4', 'You drove every deliverable.',
        'Speech, financial plan, slideshow. You did all three. And you were intentional about your communication style -- you thought about confidence and relatability as tools, not just personality traits.',
        'Since we only lost by one vote, it shows our strategy was effective.',
      'Natalia, you led the Environmentalists at Work from start to finish. You wrote the speech, built the financial plan, and made the slideshow.', false],

    ['Yunho', 'The Party De Solution', 'Member', 'T4N5',
      '3', 'Your party had strong issues.',
        'The Party De Solution\'s platform -- school funding, bus safety, nurse offices -- was creative and well-structured. You were part of building it. Your observation about social media influence on voting shows you were thinking about how people actually make decisions.',
        'Some people are not really interested on government thing and they commonly vote for the people who they saw in a good way on YouTube or Instagram.',
      '2+', 'You were honest about how voting works in practice.',
        'Your reflection didn\'t demonstrate deep structural knowledge of government, but your honesty about social voting -- \'I even voted for the party that members are my friend\' -- shows you were paying attention to the dynamics of the election.',
        'Likability will matter more than policy in this election because some people are not really interested on government thing.',
      '3+', 'You followed the leader and challenged the opposition.',
        'You participated actively under Madhavan\'s direction. And during the Town Hall, you asked 2 questions -- including a specific challenge to the Environmentalists: \'your slides state that you are going to protect the coastlines in Nova Scotia, but there is no information on how, why is that?\' That\'s not just following directions -- that\'s engaging with the opposition.',
        'Your slides state that you are going to protect the coastlines in Nova Scotia, but there is no information on how, why is that? (Town Hall question)',
      'Yunho, your honesty was one of the strengths of your reflection. You admitted you voted for your friends, and you connected that to how social media influences real elections. That self-awareness is valuable. You were an active member of the Party De Solution under Madhavan\'s direction, and you contributed to one of the strongest platforms in the class. And during the Town Hall, you challenged the Environmentalists on their coastal protection plans -- asking them to explain exactly how they\'d do it. That\'s opposition research in action.', false],

    ['Clark', 'The Healthier Future', 'Member', '9F3K',
      '3+', 'You thought about how issues are evaluated.',
        'Clark was a supporting member of a two-person party, so individual issue-selection credit is limited -- the platform (50k doctors, sin tax, e-prescriptions) was primarily Joshua\'s build. The 3+ rests on your Q4 reflection, which is one of the most analytically strong in the class: you draw a clear line between classroom popularity voting and real-world policy-based elections, and you identify how candidates can manipulate perception. That\'s genuine critical thinking about how issues are evaluated, even though you weren\'t the one picking them. The 3+ rather than 3 reflects the depth of your reflection, not separate platform authorship.',
        'There\'s also strategies where people can fake their goodness just to get trust and popular, but when they actually get elected they can change and reveal who they really are.',
      '3+', 'You understood the gap between classroom and reality.',
        'Your Q4 answer was exceptional. You recognized that in a Grade 9 election, popularity drives votes, but in real elections, policy should matter more -- and that politicians can be deceptive. That\'s a level of political awareness that goes beyond the assignment. An even stronger response would pair this real-world political awareness with a specific demonstration of how Canadian government structure works -- federal/provincial/municipal layers, revenue tools, jurisdictional scope. You were the strongest reader of the room; showing you\'re also the strongest explainer of the machinery would be the next layer.',
        'In this election, it basically isn\'t a real election, we\'re also still in only grade 9, which means a lot of people who vote right now actually doesn\'t quit know about who to vote.',
      '3', 'Your civic action plan was the most detailed.',
        'You described a full process: put up signs, form a group, host meetings, discuss and negotiate, and approach party leaders about changing policies. That\'s not theoretical -- that\'s a playbook for actual civic engagement.',
        'We can group together as an organization by putting signs outside that says \'anyone who oppose the Niche party contact us\' on it, then once we\'re grouped we can host meetings, discuss or negotiate about vote a specific party.',
      'Clark, your Q4 answer was one of the best in the class. You drew a clear line between our classroom election and real elections, and you thought about how politicians can fake their image to win trust. That\'s critical thinking that goes beyond the assignment. You were the second member of a two-person party, and you supported Joshua effectively. Your civic action plan -- grassroots organizing, meetings, negotiating with party leaders -- was the most specific anyone described.', false],

    ['Lachlan Mac', 'The Niche Haligonians', 'Member', '25VT',
      '3', 'You understood the need for compromise.',
        'The Niche Haligonians platform is strong and complete, and you contributed as a member. Your Q3 shows practical compromise thinking, and your 6 Town Hall questions -- including challenges on offshore energy and climate laws vs housing -- show you were interrogating other parties\' issue claims in real time. An even stronger response would see you driving the issue selection rather than just supporting it -- taking the lead on which issues to challenge and why.',
        'The Niche Haligonians can do something like changing their funding plan to something less argumentative to help settle with other groups and compromise with other groups.',
      '3', 'You understood how stakes affect elections.',
        'Your Q4 answer was one of the more nuanced in the class: \'Likability also matters in the real world elections but just a lot less, it definitely depends of the stakes of the vote.\' You understood that the higher the stakes, the more policy matters relative to personality. As a member, your contribution was the strategic engagement side -- slideshow, debate questions, and information feeding. Pairing this insight with structural authorship -- taking the lead on which funding mechanism to use and why -- would strengthen your response even more.',
        'Likability also matters in the real world elections but just a lot less, it definitely depends of the stakes of the vote therefore varying based on factors like stakes of the election.',
      '4', 'You were everywhere -- and the Town Hall data proves it.',
        'Slideshow. Debate questions. Real-time information feeding during the AI interview. Tracking other parties\' responses. And 6 Town Hall questions submitted (1 on_stage, 5 pending) -- the third-highest in the class. You challenged the Environmentalists on offshore energy, climate laws, and financial sustainability. That\'s consistent, sustained democratic engagement across the entire unit.',
        'My biggest contribution was making the slideshow and through asking questions during the debate through the niche website and feeding him information of other parties and responses throughout his speech. (he was kind of a work hog).',
      'Lachlan, you were the person behind the scenes who made the Niche Haligonians run. You made the slideshow, asked debate questions, fed real-time information to Lachlan McM during the AI journalist interview, and tracked other parties\' responses. And during the Town Hall, you submitted 6 questions -- the third-highest in the class -- challenging the Environmentalists on offshore energy, climate laws vs housing, and financial sustainability. Your \'(he was kind of a work hog)\' comment tells me you were paying attention to group dynamics the whole time. Not every contribution happens at the podium. Some of the most important work happens in the background, and you did it consistently.', false],

    ['Nolan', 'The Niche Haligonians', 'Member', 'KFK6',
      '3', 'Your civic ideas were specific and creative.',
        'Your Q3 answer wasn\'t just \'people should work together.\' You talked about putting solar panels on grocery store roofs, replacing diesel buses with electric ones, and forming citizen groups to push government cooperation. Those are real, actionable ideas.',
        'Something I could do as a citizen is try to make a little group up and maybe try to push the government in power to talk with the other parties... Like we could try and make it so grocery stores put up solar panels on all there roofs.',
      '3', 'You helped write the winning financial plan.',
        'Lachlan came up with the general ideas for the Niche Haligonians\' funding plan, and you put them into words. That required understanding how government funding actually works -- what\'s realistic, what\'s controversial, and how to explain it. You were the writer who translated Lachlan\'s ideas into the war room text, which is real work. An even stronger response would see you taking the lead on the structural decisions too -- which funding source, why military scholarships -- rather than just executing on someone else\'s architectural choices.',
        'When it came to the financial part in the war room I came up with the general ideas and Nolan put them into words to form our funding plan. (Lachlan McM on Nolan)',
      '3+', 'You supported the leader and contributed to the win.',
        'You took the leader\'s ideas and made them into a real funding plan. You helped with the war room. And your Q1 answer shows you felt the weight of participation: \'It\'s like holding the future in your own hands, and you basically control what the future could be.\' That\'s genuine civic agency.',
        'It feels powerful to have the choice of who\'s going to be the next government leader, especially if it\'s by a 1-vote difference. It\'s like holding the future in your own hands.',
      'Nolan, you were part of the winning team, and you did more than just follow directions. You helped write the financial plan -- Lachlan came up with the ideas and you put them into words. That\'s real contribution. Your reflection showed genuine civic thinking: solar panels on grocery store roofs, electric buses, citizen groups pushing government to cooperate. You thought about what you\'d actually do as a citizen, not just what happened in class.', false],

    ['Leo', 'Communist Party of Halifax', 'Member', 'RKKJ',
      '3', 'You challenged other parties on their issues.',
        'Your party\'s platform didn\'t get locked in, but you didn\'t stop engaging. During the Town Hall, you asked about renewable energy sources, sponsorship backup plans, and teacher funding. You were interrogating other parties\' issue claims -- which is its own form of issue engagement. You were thinking critically about whether their promises were realistic.',
        'What if the company gets exposed for something bad? (Town Hall question to Party De Solution)',
      '2+', 'You thought about policy feasibility.',
        'Your Town Hall questions showed you were thinking about how policies actually work -- renewable energy specifics, sponsorship risks, teacher salary costs. That\'s the kind of thinking that shows up when you understand that government decisions have real consequences and trade-offs.',
        'How will you pay these new teachers if you want smaller classrooms -- more teachers means more money you have to pay out. (Town Hall question)',
      '3', 'You were one of the most active participants in the Town Hall.',
        '6 questions submitted -- the second-highest in the class. Two selected for the stage. You challenged multiple parties with specific, thoughtful questions. Among students whose parties didn\'t complete their platforms, you stand out for how much effort you put into the process. You showed up for the Town Hall in a way that mattered.',
        'If this sponsor thing goes wrong and they don\'t ever want to sponsor you, do you have a backup? (Town Hall question)',
      'Leo, your reflection was brief, but your actions during the Town Hall speak volumes. You submitted 6 questions during the Final Four debate -- the second-highest in the class. You challenged parties on sponsorship risks, renewable energy specifics, and teacher funding. Two of your questions were selected for the stage. When your party\'s platform didn\'t get locked in, you didn\'t check out -- you leaned into the Town Hall and participated more actively than almost anyone else. That tells me you were paying attention the whole time, and you cared about the process even when your own party wasn\'t on stage.', false],

    ['Alia', 'The Unity Party', 'Member', 'LJFM',
      '3', 'You helped shape the party\'s message.',
        'The Unity Party addressed transit, internships, and healthcare. You made the debate points and helped with the speech, which means you were part of deciding how to communicate those issues to voters.',
        'I think my biggest contribution in this project was making up the debate points and helping out on the speech and making the leader gain their confidence.',
      '2+', 'You understood social dynamics in elections.',
        'Your reflection focused more on social dynamics than government structure, but your observation that \'connections is key when it comes to electing\' shows you were paying attention to how votes actually get decided.',
        'Way more people than you think vote for the person that they are mutual with.',
      '3', 'You built the leader\'s confidence.',
        'Practicing the speech with Elizabeth until she felt comfortable is a real contribution. Not everyone has to be the one at the podium. You made sure the person who was at the podium was ready.',
        'Making the leader gain their confidence by practicing over and over again until they felt comfortable.',
      'Alia, you did something in this project that doesn\'t show up in platform documents: you built your leader\'s confidence. You practiced with Elizabeth over and over until she felt comfortable getting up and speaking. That\'s a form of democratic engagement that matters just as much as writing a policy. You also made debate points and helped with the speech. Behind-the-scenes work is still work, and yours helped the Unity Party win the primary.', false],

    ['Josie', 'Team Tomorrow', 'Member', 'MVQW',
      '3', 'Your party had specific, measurable goals.',
        'Team Tomorrow\'s platform -- 20% tuition cut, 10 new clinics by 2030, 5,000 housing units -- was one of the most specific in the class. You contributed to the goals.',
        'I contributed into writing the different goals and ideas our party has.',
      '2+', 'You were honest about social voting.',
        'Your Q4 answer acknowledged that people voted for friends, and you recognized that this could lead to bad outcomes \'because their ideas might not be as good.\' That\'s a practical understanding of a real democratic problem.',
        'If a lot of people elect people they want to just because they are \'Friends\' and this might end bad because their ideas might not be as good.',
      '3', 'You contributed to goals and slides.',
        'You wrote goals, helped with the background slide, and voted based on policy. That\'s solid engagement. Your Q3 focus on common goals -- \'improving schools, healthcare, or safety, instead of only party differences\' -- is a good civic instinct.',
        'As a citizen, I can help the parties understand each others ideas and make sure they can focusing on understanding the common goals.',
      'Josie, you contributed to Team Tomorrow\'s goals and helped with the background slide. You voted thoughtfully -- for the party you thought had the best ideas, not just your friends. Your honesty about social voting (\'I even voted for the party that members are my friend\') and your concern about what happens when people elect friends over policy shows you were thinking about the consequences of democratic choices.', false],

    ['Elizabeth', 'The Unity Party', 'Leader', 'FNG3',
      '3', 'You made your issues heard.',
        'The Unity Party addressed transit, internships, and healthcare. Your platform existed, and you communicated it well enough to win the primary. Your reflection shows you understood that presentation is part of how issues gain traction -- comparing your party\'s plans to others and pointing out what you\'d do better.',
        'A communication style I used was comparng myself to other groups and pointing out the thing my party would do better and I believe that brought in voters.',
      '3', 'You saw both sides of what wins elections.',
        'Your Q4 answer recognized that likability and presentation both matter in elections. You noticed that some people voted for friends while others voted based on speeches and answers. That balanced view shows you were paying attention to the dynamics of the election. An even stronger response would connect this voter-behaviour insight to government structure itself -- the platform text (transit, internships, healthcare) could go deeper on revenue tools and jurisdictional scope to show how elections connect to the machinery they\'re choosing. Your Q3 answer about managing party egos is mature and shows democratic thinking.',
        'Likability absolutely mattered in this election seeing as the winning party\'s friends voted that party but I know several people who voted a party because of how good they spoke and how they answered question.',
      '3+', 'You led with confidence.',
        'You got up and spoke. You used comparative strategy. You won the primary. And your reflection about party egos -- \'if we show that we only like one party it would probably make their ego go higher and not want to work with the other party\' -- shows you were thinking about democratic dynamics beyond just winning.',
        'I was the leader of the Unity Party and my biggest contribution was getting up there and saying my speech with confidence giving us the first win.',
      'Elizabeth, you won the primary. That\'s not nothing. You stood up in front of the class, delivered your speech with confidence, and used a comparative strategy that brought in voters. Your party didn\'t lock in their platform, but your speech was strong enough to win the first round anyway. That tells me you understand something important: how you say something matters as much as what you say. Your observation about party egos was one of the most mature reflections in the class.', false],

    ['Sarah', 'Equitable Rights Party', 'Member', '96EU',
      '3', 'You helped build a serious platform.',
        'The Equitable Rights Party\'s platform -- hospital ER divisions, expanded healthcare including dental and vision, wage growth tied to inflation -- was one of the most detailed in the class. You worked on the communications message and the financial plan, which means you were thinking about both what to say and how to pay for it.',
        'My biggest contributions in my team was working on the communications message and working on the financial plan with our team leader.',
      '3+', 'You understood the representative system.',
        'When you talked about contacting your representatives to encourage compromise, you showed that you understand how citizens are supposed to interact with government. That\'s not just textbook knowledge -- it\'s a plan for how you\'d actually participate in democracy. You co-wrote the financial plan with Rifa, bringing the citizen-engagement layer while she built the budget structure -- that\'s the right division of labor. Taking the lead on architecting the financial plan in the future would be the next layer to explore.',
        'As a citizen, I can contact my representatives to encourage compromise and model respectful dialogue in my own conversation to show that cooperation matters more than conflict.',
      '3+', 'You contributed to the work that mattered.',
        'Two of three war room deliverables -- communications and finance. That\'s significant involvement. And your reflection shows you took the process seriously. The line about \'one vote\' isn\'t just clever writing. It\'s the voice of someone who felt what it means to participate.',
        'Knowing that my vote makes this much of a difference is both mesmerizing and overwhelming because it serves as a reminder that no vote is ever just \'one vote\'.',
      'Sarah, your reflection had one of the most memorable lines in the class: \'no vote is ever just one vote, because of that one vote the government is what it is today.\' That\'s not just a good sentence -- it shows you actually felt the weight of democratic participation. You worked on both the communications message and the financial plan for the Equitable Rights Party, which means you were involved in two of the three war room deliverables. Your party\'s platform was one of the most detailed, and you were part of building it.', false],

    ['Kendra', 'Environmentalists at Work', 'Member', 'MTGG',
      '3+', 'Your civic strategy covered the whole cycle.',
        'Your Q3 answer wasn\'t just \'compromise.\' You described a full process: compromise on issues, focus on local problems, share correct information, pressure leaders to cooperate, vote wisely, and if none of that works, trigger a new election. That\'s thinking about democracy as a system, not just a moment.',
        'By all the parties compromising a bit and getting some things from each party and focusing on local problems, similarities between wants, correct information, pressure leaders and vote wisely. And if not the other parties \'pulling the plug\' and starting another vote.',
      '3', 'You put policy before personality.',
        'You recognized that likability matters but shouldn\'t be the deciding factor. \'I do think it matters, but only to a certain extent.\' That\'s a balanced position that shows you were thinking about what elections are supposed to be about.',
        'I do think that many people are looking at the leaders as a person rather than the actual policies. I do think it matters, but only to a certain extent.',
      '3+', 'You supported your team where it counted.',
        'During the Town Hall, you fed Delisha answers and gave her short topics to build on. That\'s real-time strategic support. Not everyone has to be the person at the podium -- some of the most important democratic work happens behind the scenes, and you did it.',
        'I answered a lot of questions and gave more short topics for her to go on with. Yes, it helped Delisha not stumble for an answer.',
      'Kendra, you were new to the class and you still produced some of the best work in the unit. Your civic strategy was the most structured anyone described: compromise, focus on local problems, correct information, pressure leaders, vote wisely, and if that fails, trigger a new election. That\'s not just a list -- that\'s a full democratic cycle. You supported Delisha during the Town Hall, feeding her answers so she wouldn\'t have to stumble. That\'s the kind of behind-the-scenes work that makes a party function.', false],

    ['Zankia', 'Environmentalists at Work', 'Member', 'CA3J',
      '3+', 'Your party addressed real problems.',
        'The Environmentalists\' platform covered clean technology, coastal protection, and offshore energy regulation. Your original party (Yellow Progression) also addressed healthcare, environment, and cost of living. You were thinking about issues that actually affect people.',
        'The parties would perhaps have to make compromises like changing their funding strategy to the same as the other parties so that they will be open to working with them.',
      '3', 'You distinguished classroom from reality.',
        'You understood that our classroom election was driven by friendships, but that real elections are different: \'it doesn\'t matter how popular you are if your promises are unrealistic you won\'t get any of the votes.\' That distinction shows you were thinking about how democracy actually works outside of school.',
        'I think it is more about politics in real life because it doesn\'t matter how popular you are if your promises are unrealistic you wont get any of the votes.',
      '3+', 'You did the work that kept your party running.',
        'All the slides. War room help. Questions during the debate. That\'s three different kinds of contribution. And you took the vote seriously -- you felt guilty about switching your vote, which tells me you understood that your choice had real consequences for the simulation.',
        'I did all the slides and I helped with the war room and the three squares we had to fill. I also sent in a few questions.',
      'Zankia, you did all the slides for your party, helped with the war room, and sent in questions during the debate. That\'s concrete, visible work. And your reflection was honest in a way that matters: you felt guilty about switching your vote, and you thought carefully about why. You also made a sharp observation about real elections: \'it doesn\'t matter how popular you are if your promises are unrealistic you won\'t get any of the votes.\' You and Kendra produced excellent work, and the vote count doesn\'t change that.', false],

    ['Laila', 'Team Tomorrow', 'Leader', 'V4BC',
      '4', 'Your platform had real numbers.',
        '20% tuition cut. 10 new clinics by 2030. 5,000 affordable housing units. Those aren\'t vague promises -- they\'re measurable goals with a timeline, and as party leader you set them with your team. You were thinking about what voters could actually hold a government accountable for. That\'s the difference between a wish list and a platform.',
        'I feel that my speech and what i decided to say would have probably helped us to get votes and obviously what we chose for our promises.',
      '3+', 'You named four funding streams, not one.',
        'Your platform\'s funding plan -- federal transfers, efficiency cuts, luxury goods taxes, AND taxes on empty homes kept as investments -- showed you understood that government services cost money and that there are several different ways to raise it. Layering four mechanisms is a real budget, not a single fragile source. An even stronger response would defend these mechanisms against trade-offs in the platform text itself -- showing what happens if any one of those streams underperforms would make the plan more convincing.',
        'I feel that likability did matter for this election... but some people including myself voted on what I thought was the best/most reasonable.',
      '3+', 'You led with respect and clarity.',
        'You developed policies with your team, delivered the speech, and emphasized respectful engagement as a civic strategy. \'Helping the parties compromise and agree on goals, speaking up and asking questions respectfully and calmly to avoid lots of fighting.\' That\'s leadership with character.',
        'As a citizen I can help by helping the parties compromise and agree on goals, speaking up and asking questions respectfully and calmly to avoid lots of fighting.',
      'Laila, you led Team Tomorrow with a clear voice and a focus on respectful engagement. Your platform had specific numbers -- 20% tuition cut, 10 new clinics by 2030, 5,000 affordable housing units -- and you delivered the speech that sold it. Your emphasis on calm, respectful communication as a civic tool was mature beyond your years. You voted based on policy, not friendship, and you said so. That takes integrity.', false],

    ['Jessa', 'Environmentalists at Work', 'Member', 'HSZU',
      '4', 'You built the intellectual foundation.',
        'You didn\'t just pick issues -- you connected them to the UN Sustainable Development Goals, defined the political spectrum positioning, and found real problems that needed fixing. \'Voters saw what problems we saw in the world and how we were going to fix it.\' That\'s the difference between listing promises and building a movement.',
        'My biggest contribution in these whole 3 weeks of brainstorming would be created the ideas we could use, such as helping Natalia with her speech, giving her touching sentences to use, making our party name, listing our SDG goals.',
      '3+', 'You understood how minority governments work.',
        'Your reflection showed you understood something specific about minority governments: they work through negotiation and exchange. You described exactly how you\'d do it -- offer support in exchange for environmental protections. That\'s transactional governance, and it\'s how minority parliaments actually function. You brought the governance-theory layer; Natalia brought the legislation layer. Combining your negotiation thinking with the structural detail -- naming the Coastal Protection Act, federal grants, and how they\'d be deployed -- would take your response to the next level.',
        'I could negotiate, by saying if I helped and supported them, I would ask for something in return which could be something I want.',
      '4', 'You were the ideas person, and your ideas won votes.',
        'You established the party\'s entire direction. Goals, name, SDG connections, spectrum positioning, speech content. Your ideas won over voters. And you were engaged for three full weeks, not just the day of the presentation. That sustained commitment is what real democratic participation looks like.',
        'I provided what my party members COULD write and find real problems we need to fix. My ideas did actually win over voters.',
      'Jessa, you were the intellectual engine of the Environmentalists. You established the party\'s goals, created the name, listed the SDG connections, defined the political spectrum positioning, and wrote touching sentences for Natalia\'s speech. That\'s three weeks of sustained, focused work. And your reflection showed you were thinking about actual governance -- how you\'d negotiate with the winning party to get environmental protections in exchange for your support. You weren\'t just playing a game. You were thinking about how democracy actually works.', false],

    ['Delisha', 'Environmentalists at Work', 'Leader (Final Four)', 'Q2YA',
      '4', 'You carried the environmental platform into the Final Four.',
        'The Environmentalists at Work had the most detailed platform in the class, and you were a major part of building it. When it came time to defend it in the Town Hall, you were the one at the front of the room. That\'s not just understanding issues -- that\'s owning them.',
        '',
      '4', 'You defended a legislation-heavy platform in real time.',
        'Leading the Final 4 Town Hall meant responding to challenges about the 2019 Coastal Protection Act, federal climate grants, carbon tax revenue, and the offshore energy trade-offs -- live, in front of the class, with no script. You had to defend specific government actions, not just opinions. That\'s the hardest version of this outcome: you can\'t fake your way through a question about a real Act. You did it. Teacher observation confirms this is full structural engagement.',
        '',
      '4', 'You led when it mattered most.',
        'Major participant throughout. Credited as a party member on the Final 4 title slide and contributed to the slide deck. Stepped into the leader role for the Town Hall when Natalia was absent. Debated in front of the class. Your commitment to the process was clear from start to finish.',
        '',
      'Delisha, you stepped up when your party needed you most. When Natalia was absent, you took over as leader and debated in the Final Four Town Hall. That takes guts. You were a major participant throughout the entire unit, and your contributions to the slide deck and platform are proof of your commitment. You didn\'t submit a reflection, but your actions throughout the unit speak louder than any form response ever could. You showed up, you contributed, and when the pressure was on, you led.', false],

    ['Farhan', 'Islamic Associations of Halifax', 'Leader', 'HRNH',
      '3+', 'Your platform was the broadest and most ambitious.',
        'You didn\'t pick one or two issues. You picked a worldview: humanitarianism, pluralism, anti-corruption, environmental responsibility, healthcare. And you backed it up with a 13% tax budget broken down by sector. That\'s not a platform -- that\'s a governing philosophy. An even stronger response would go further on the justification layer: specific reasoning for why these issues, why this prioritization, and what the civic traction path looks like. Even stronger responses would explain not just what the values are but how they connect to electoral and policy outcomes.',
        'Promoting humanitarianism, pluralism, also known as respecting other grounds, and responsibility for the environment. This style of protecting life also increases trust, increases a stable economy.',
      '3+', 'You broke down a real budget.',
        'Marine/livestock 1.5%, Court and law 2%, forest/eco-society 3.5%, housing 1.3%, humanitarian 5.7%. That level of detail shows you were thinking about how a government actually allocates money across competing priorities -- and you prioritized humanitarian (5.7%) over court and forest, which is a values choice, not just arithmetic. Not many students went that deep. Showing what would get cut to make room for these allocations -- which is the harder question -- would strengthen your response even more.',
        'Democracy feels like \'promote me on the stage, I promote your business\'... the margin of the vote may be persuasive, but promoting your investment is what determines a person\'s choice.',
      '3+', 'You led with conviction.',
        'You created one of the most detailed platforms in the class. Your reflection reads like a manifesto because you care about these issues. You were one of the biggest contributors in the unit, and your party\'s platform was a direct reflection of your values. An even stronger response would distinguish your personal contribution from the party\'s voice -- reflecting on what *you* specifically did, not just what the platform stands for. The platform itself is evidence of deep engagement.',
        'Working together to create a better, more efficient nation, economy, and honest administration. Faster, much easier to crack the problems and create solutions to people\'s needs. No debates, work and pluralism.',
      'Farhan, you built a platform that was bigger than any other party\'s. Humanitarianism, anti-corruption, social welfare, pluralism, environmental responsibility, healthcare -- and you backed it all up with a detailed tax budget breakdown. Your reflection reads like a manifesto because you genuinely believe in these values. That passion came through in your platform and in the way you led your party. You were one of the biggest contributors in the class.', false],

    ['Abdul', 'Islamic Associations of Halifax', 'Member', 'ALZZ',
      '2+', 'Your party had strong issues.',
        'The Islamic Associations\' platform was ambitious and detailed. You were part of the party, and the platform\'s focus on humanitarianism and social welfare was meaningful.',
        '',
      '2+', 'Your reflection was brief.',
        'Your Q4 answer didn\'t engage deeply with the question, but you were part of a party that created a detailed tax budget breakdown. That counts for something.',
        'It will not be in the real life election will have about 3 m people.',
      '2+', 'You tried to contribute, and that matters.',
        'You made slides and gave ideas. The fact that your leader didn\'t use most of them is a group dynamics issue, not a reflection of your effort. You were there, you participated, and you tried to make the party better.',
        'I made the slide I gave him ideas for what to add on it and he did not add any of it he added some but not most.',
      'Abdul, I can see from your reflection that you tried to contribute. You made slides, you gave ideas, and you wrote talking points for Farhan. The frustration in your reflection is real -- \'he did not add any of it he added some but not most.\' That\'s a hard situation when you\'re putting in work and it doesn\'t get used. The Islamic Associations had a strong platform, and you were part of building it, even if your individual contributions didn\'t always make it to the final version.', false],

    ['Ali', 'Halifax Climate Protection Party', 'Leader', 'D2ZD',
      '3', 'You set the issues for your party and challenged the others.',
        'As party leader, you chose the issues Climate Protection ran on -- 1 million trees, renewable energy by 2035, banning single-use plastics by 2028. Those are substantive goals. And during the Town Hall, your 8 questions actively interrogated other parties\' issue choices on ER staffing, transit overcrowding, coastline funding, and the Kazakhstan comparison. That\'s issue engagement, even without a written reflection.',
        '',
      '2+', 'Your Town Hall questions showed policy understanding.',
        'You asked about ER staffing shortages, transit overcrowding, coastline funding costs, and economic stability. Those questions show you were thinking about how government policies actually work and what trade-offs they require.',
        'How will your plan actually increase the number of doctors and nurses instead of just promising faster service? (Town Hall question to Unity Party)',
      '3', 'You were the most active questioner in the Town Hall.',
        '8 questions submitted -- the most of anyone in the class. 3 were selected for the stage. You challenged the Unity Party on ER staffing and transit overcrowding, the Niche Haligonians on their Kazakhstan comparison and happiness metrics, and the Environmentalists on coastline funding. That level of engagement with the democratic process is significant. You were thinking critically about every party\'s platform, not just your own.',
        'You compared us to Kazakhstan, but they have very different culture and systems. Why is that a fair comparison for our country? (Town Hall question to Niche Haligonians)',
      'Ali, you didn\'t submit a reflection, and your party\'s platform didn\'t get locked in. But the Town Hall data tells a different story: you submitted 8 questions during the Final Four debate -- the most of anyone in the class. Three were selected for the stage. You asked about ER staffing, transit overcrowding, coastline funding, happiness metrics, Kazakhstan comparisons, and economic trade-offs. You were clearly paying attention and thinking critically about every party\'s platform. The Climate Protection Party had real ideas, and you were engaged in the democratic process even if the formal reflection didn\'t capture it.', false],

    ['Kai', 'Halifax Climate Protection Party', 'Member', 'VFW8',
      '2+', 'Your party had real environmental issues.',
        'Climate Protection\'s platform -- 1 million trees, renewable energy by 2035, banning single-use plastics -- was substantive. You helped with the research. But without presenting, the issues didn\'t get the scrutiny they deserved.',
        'In the process of making the script I helped with the research and typing it and making it look good. Too bad we didnt present because we had a fair shot at winning the vote.',
      '2+', 'Your reflection was honest but brief.',
        'You showed understanding of the election dynamics -- one vote, the power of personality -- and your Q4 insight about likability shows you were paying attention to how votes get decided.',
        'Civilians are not going to vote for a personality they don\'t like, if a canidate is not likeable or they don\'t match the right energy the voter will lose interest.',
      '2+', 'You contributed, but the group couldn\'t follow through.',
        'You did research, typing, and made sure the content was clear. That\'s real work. But the team didn\'t present, which limits the evidence of full engagement. Your Q3 idea about asking \'neutral questions\' to bridge parties is a solid civic strategy.',
        'I made sure everything made sense so nobody got confused and bored of my presentation, when someone gets even just a little bored they will not choose you for their vote.',
      'Kai, your team didn\'t get to present, and that\'s frustrating. But you showed up, you helped with research and typing, and you made sure the content made sense. Your reflection was honest about what happened: \'Too bad we didn\'t present because we had a fair shot at winning the vote.\' That tells me you believed in your party\'s platform. Sometimes the work doesn\'t get the audience it deserves, but the effort still counts.', false],

    ['Evie', 'The Equity Party', 'Leader', 'R7SX',
      '3', 'Your platform had a clear philosophy.',
        'The Equity Party\'s focus on equity over equality, accessibility, disability programs, and the carbon tax rebate showed a distinct and thoughtful approach to issues. You led the party that built it.',
        '',
      '2+', 'No reflection submitted.',
        'Without a reflection, I can\'t assess your understanding of government structure. Your party\'s platform showed some understanding of government funding, but I don\'t know your individual perspective.',
        '',
      '3', 'Led a party with a clear direction.',
        'You led the Equity Party, which had a distinct philosophical identity. The platform exists in the opposition research hub. But without a reflection, I can\'t confirm the details of your individual contribution.',
        '',
      'Evie, you led the Equity Party with a clear philosophical direction: equity over equality, accessibility for all, and programs for people with disabilities. That\'s a distinct and meaningful platform. Without a reflection, I don\'t have your side of the story, but the platform you built tells me you were thinking about who gets left behind by systems that treat everyone the same.', false],

    ['Isaac', 'Communist Party of Halifax', 'Member', 'ISAC',
      '2+', 'Limited evidence.',
        'CPOH had some platform ideas (transit, housing, cost of living) but didn\'t lock them in. Without a reflection, I can\'t assess your individual engagement with the issues, so this sits at the participation floor.',
        '',
      '2+', 'No reflection submitted.',
        'Without a reflection or completed platform, I can\'t assess your understanding of government structure. This is the participation floor, not a judgment on what you might know.',
        '',
      '2+', 'Limited evidence.',
        'No reflection, incomplete party. There\'s very little individual evidence of engagement, but you were part of the simulation and the floor for any participant is 2+.',
        '',
      'Isaac, there\'s not much individual evidence to work with here. You didn\'t submit a reflection, and your party (CPOH) didn\'t complete their platform. You were on the roster and that counts as participation, but I\'d want to see more next time. If there were circumstances that affected your participation, I\'d want to know about them. The door is open to do more.', false],

    ['Brody', 'Communist Party of Halifax', 'Member', 'JY2P',
      '1+', 'Limited evidence.',
        'Largely absent during the unit. CPOH\'s platform existed but wasn\'t completed. Without a reflection or consistent presence, there\'s very little evidence of engagement with issues.',
        '',
      '1+', 'No evidence.',
        'Without consistent participation, there\'s no evidence of engagement with government structure.',
        '',
      '1', 'Largely absent.',
        'Largely absent during the unit. No reflection. The CPOH party didn\'t complete their platform. Very limited evidence of any engagement.',
        '',
      'Brody, you were largely absent during this unit. Without consistent participation, there\'s limited evidence to assess. If there were circumstances that affected your attendance, that context matters.', false],

    ['Remy', 'The Party De Solution', 'Member', 'YMRP',
      '3', 'Your party had strong issues.',
        'The Party De Solution\'s platform -- Subway partnership, school bus seatbelts, nurse offices -- was creative and specific, and you were part of the party that built it. An even stronger response would include your reflection so I can see your personal engagement with the issue selection -- what drew you to these issues, and why you thought they mattered. Your Town Hall question showed you were thinking critically about opposition platforms, which is a strong evidence point.',
        '',
      '2+', 'No reflection submitted.',
        'Without a reflection, I can\'t assess your understanding of government structure. Your party\'s platform showed understanding, but I don\'t know your individual contribution to that understanding.',
        '',
      '3', 'You challenged the opposition with a specific policy question.',
        'Your Town Hall question was substantive: \'What exactly does the coastal protection act you want to bring back entail? What will happen if you implement it? Will the coastlines stop being eroded by not building near them?\' That\'s not a throwaway question -- it\'s a detailed policy challenge that shows you were reading the opposition research and thinking critically about it.',
        'What exactly does the coastal protection act you want to bring back entail? What will happen if you implement it? (Town Hall question)',
      'Remy, you were part of the Party De Solution, which had one of the strongest platforms in the class. Without a reflection, I don\'t know the details of what you contributed in the war room. But during the Town Hall, you asked a detailed question about the Coastal Protection Act -- pushing the Environmentalists to explain exactly what the act would do and whether it would actually stop erosion. That\'s the kind of critical thinking that makes a democracy work.', false],

    ['Huda', 'Team Tomorrow', 'Member', '6SUB',
      '3', 'Your party had strong issues.',
        'Team Tomorrow\'s platform was specific and well-structured. You were listed as a member.',
        '',
      '2+', 'No evidence.',
        'Without a reflection, I can\'t assess your understanding of government structure.',
        '',
      '2+', 'No individual evidence.',
        'Listed as a member of Team Tomorrow. No reflection or other individual evidence of contribution.',
        '',
      'Huda, I don\'t have much to work with. You were listed as a member of Team Tomorrow, which had a strong platform, but there\'s no reflection or other individual evidence to assess your contribution. The grades above are provisional and based on roster membership only -- they do not reflect confirmed individual work. If you were present and engaged, that context is missing from the record. If there were circumstances that affected your participation, that context matters.', true],

    ['Fatima', 'The Unity Party', 'Member', 'T6U2',
      '3', 'Your party addressed real issues.',
        'The Unity Party\'s platform covered transit, internships, and healthcare. You were listed as a member.',
        '',
      '2+', 'No evidence.',
        'Without a reflection, I can\'t assess your understanding of government structure.',
        '',
      '2+', 'Party member, but role unclear.',
        'Listed as a member of the Unity Party, which won the primary. No reflection to confirm individual contribution.',
        '',
      'Fatima, you were part of the Unity Party, which won the primary round. Without a reflection, I don\'t know your individual contribution, but your party\'s platform addressed transit, internships, and healthcare. The grades above are provisional and based on roster membership only -- they do not reflect confirmed individual work. If you had the chance to tell your story, I\'d want to hear it.', true],

    ['Jana', 'The Equity Party', 'Member', 'TT8D',
      '3', 'Your party had a distinct platform.',
        'The Equity Party focused on equity over equality, accessibility, and disability programs. You were listed as a member.',
        '',
      '2+', 'No evidence.',
        'Without a reflection, I can\'t assess your understanding of government structure.',
        '',
      '2+', 'Party member, but role unclear.',
        'Listed as a member of the Equity Party. No reflection to confirm individual contribution.',
        '',
      'Jana, you were part of the Equity Party, which had a clear philosophical direction. Without a reflection, I don\'t know your individual contribution, but the platform your party built was distinct and meaningful. The grades above are provisional and based on roster membership only -- they do not reflect confirmed individual work. If you had the chance to share your experience, I\'d want to hear it.', true]
  ];

  // Write rows starting at row 2 (after header)
  var startRow = sheet.getLastRow() + 1;
  if (startRow < 2) startRow = 2;
  sheet.getRange(startRow, 1, rows.length, FB_HEADERS.length - 1).setValues(rows);
  SpreadsheetApp.flush();
  Logger.log('Wrote ' + rows.length + ' rows starting at row ' + startRow + '. All 30 students seeded.');
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
