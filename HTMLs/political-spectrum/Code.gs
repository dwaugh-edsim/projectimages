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

// ─── STUDENT ROSTER ──────────────────────────────────────────────────────────
// Individual 4-char PINs assigned per student.
// partyId is the short key used in TH_Messages and TH_Votes.
var STUDENT_ROSTER = [
  {name:'Farhan',      pin:'HRNH', party:'Islamic Assoc of Halifax',    partyId:'islamic',     role:'leader'},
  {name:'Abdul',       pin:'ALZZ', party:'Islamic Assoc of Halifax',    partyId:'islamic',     role:'member'},
  {name:'Joshua A',    pin:'RUXG', party:'The Healthier Future',         partyId:'healthier',   role:'leader'},
  {name:'Clark',       pin:'9F3K', party:'The Healthier Future',         partyId:'healthier',   role:'member'},
  {name:'Madhavan',    pin:'R4MT', party:'The Party De Solution',        partyId:'solution',    role:'leader'},
  {name:'Remy',        pin:'YMRP', party:'The Party De Solution',        partyId:'solution',    role:'member'},
  {name:'Yunho',       pin:'T4N5', party:'The Party De Solution',        partyId:'solution',    role:'member'},
  {name:'Lachlan McM', pin:'FFAN', party:'The Niche Halligonians',       partyId:'niche',       role:'leader'},
  {name:'Lachlan Mac', pin:'25VT', party:'The Niche Halligonians',       partyId:'niche',       role:'member'},
  {name:'Nolan',       pin:'KFK6', party:'The Niche Halligonians',       partyId:'niche',       role:'member'},
  {name:'Laila',       pin:'V4BC', party:'Team Tomorrow',                partyId:'tomorrow',    role:'leader'},
  {name:'Josie',       pin:'MVQW', party:'Team Tomorrow',                partyId:'tomorrow',    role:'member'},
  {name:'Huda',        pin:'6SUB', party:'Team Tomorrow',                partyId:'tomorrow',    role:'member'},
  {name:'Brody',       pin:'JY2P', party:'Communist Party of Halifax',   partyId:'cpoh',        role:'leader'},
  {name:'Leo',         pin:'RKKJ', party:'Communist Party of Halifax',   partyId:'cpoh',        role:'member'},
  {name:'Elizabeth',   pin:'FNG3', party:'The Unity Party',              partyId:'unity',       role:'leader'},
  {name:'Fatima',      pin:'T6U2', party:'The Unity Party',              partyId:'unity',       role:'member'},
  {name:'Alia',        pin:'LJFM', party:'The Unity Party',              partyId:'unity',       role:'member'},
  {name:'Rifa',        pin:'57G5', party:'Equitable Rights Party',       partyId:'equitable',   role:'leader'},
  {name:'Sarah',       pin:'96EU', party:'Equitable Rights Party',       partyId:'equitable',   role:'member'},
  {name:'Natalia',     pin:'2F8V', party:'Environmentalists at Work',    partyId:'environment', role:'leader'},
  {name:'Jessa',       pin:'HSZU', party:'Environmentalists at Work',    partyId:'environment', role:'member'},
  {name:'Delisha',     pin:'Q2YA', party:'Environmentalists at Work',    partyId:'environment', role:'member'},
  {name:'Kendra',      pin:'MTGG', party:'Yellow Progression Party',     partyId:'yellow',      role:'leader'},
  {name:'Zankia',      pin:'CA3J', party:'Yellow Progression Party',     partyId:'yellow',      role:'member'},
  {name:'Evie',        pin:'R7SX', party:'The Equity Party',             partyId:'equity',      role:'leader'},
  {name:'Jana',        pin:'TT8D', party:'The Equity Party',             partyId:'equity',      role:'member'},
  {name:'Ali',         pin:'D2ZD', party:'Halifax Climate Protection',   partyId:'climate',     role:'leader'},
  {name:'Kai',         pin:'VFW8', party:'Halifax Climate Protection',   partyId:'climate',     role:'member'}
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function lookupStudent(pin) {
  var p = (pin || '').toUpperCase().trim();
  for (var i = 0; i < STUDENT_ROSTER.length; i++) {
    if (STUDENT_ROSTER[i].pin === p) return STUDENT_ROSTER[i];
  }
  return null;
}

function isTeacherPin(pin) {
  var tp = PropertiesService.getScriptProperties().getProperty('TEACHER_PIN') || '';
  return tp.length > 0 && (pin || '').trim() === tp;
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
    if (type === 'th_moderate')        return thModerateQuestion(data.pin, data.questionId, data.status);
    if (type === 'th_set_session')     return thSetSession(data.pin, data.activeParty, data.votingOpen, data.showResults);
    if (type === 'th_cast_vote')       return thCastVote(data.pin, data.partyId);
    if (type === 'th_get_votes')       return thGetVotes(data.pin);

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
  var p = (pin || '').toUpperCase().trim();
  if (isTeacherPin(p)) return handleResponse({ status: 'success', role: 'teacher' });
  var student = lookupStudent(p);
  if (student) return handleResponse({ status: 'success', role: 'student', student: student });
  return handleResponse({ status: 'error', message: 'PIN not found. Check with Mr. Waugh.' });
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

  var lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    var sheet = getOrCreateSheet('TH_Messages', ['ID','Timestamp','PartyId','SenderName','SenderRole','Text','ToLeaderOnly']);
    var id = new Date().getTime().toString();
    sheet.appendRow([id, new Date(), student.partyId, student.name, student.role, text.trim(), toLeaderOnly]);
    return handleResponse({ status: 'success' });
  } finally { lock.releaseLock(); }
}

// ─── TOWN HALL: QUESTIONS ────────────────────────────────────────────────────
function thSubmitQuestion(pin, text) {
  if (!text || !text.trim()) return handleResponse({ status: 'error', message: 'Type your question first.' });
  if (text.trim().length > 500) return handleResponse({ status: 'error', message: 'Keep it under 500 characters.' });
  var student = lookupStudent(pin);
  if (!student) return handleResponse({ status: 'error', message: 'Invalid PIN.' });

  var lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    var sheet = getOrCreateSheet('TH_Questions', ['ID','Timestamp','SenderPin','SenderName','SenderParty','Text','Status']);
    var id = new Date().getTime().toString();
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

  var lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString() === questionId.toString()) {
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
  if (!sheet || sheet.getLastRow() < 2) return { activeParty: '', votingOpen: false, showResults: false };
  var data = sheet.getDataRange().getValues();
  var kv = {};
  for (var i = 0; i < data.length; i++) { if (data[i][0]) kv[String(data[i][0])] = data[i][1]; }
  return {
    activeParty:  kv['activeParty']  || '',
    votingOpen:   kv['votingOpen']   === 'TRUE',
    showResults:  kv['showResults']  === 'TRUE'
  };
}

function thSetSession(pin, activeParty, votingOpen, showResults) {
  if (!isTeacherPin(pin)) return handleResponse({ status: 'error', message: 'Unauthorized.' });
  var sheet = getOrCreateSheet('TH_Session', ['Key', 'Value']);
  var lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    sheet.clearContents();
    sheet.appendRow(['Key', 'Value']);
    sheet.appendRow(['activeParty',  activeParty  || '']);
    sheet.appendRow(['votingOpen',   votingOpen   ? 'TRUE' : 'FALSE']);
    sheet.appendRow(['showResults',  showResults  ? 'TRUE' : 'FALSE']);
    return handleResponse({ status: 'success' });
  } finally { lock.releaseLock(); }
}

// ─── TOWN HALL: VOTING ───────────────────────────────────────────────────────
function thCastVote(pin, partyId) {
  var student = lookupStudent(pin);
  if (!student) return handleResponse({ status: 'error', message: 'Invalid PIN.' });

  // Server-side: cannot vote for own party
  if (student.partyId === partyId) {
    return handleResponse({ status: 'error', message: 'You cannot vote for your own party.' });
  }

  var session = thGetSession();
  if (!session.votingOpen) {
    return handleResponse({ status: 'error', message: 'Voting is not open yet. Wait for Mr. Waugh.' });
  }

  // Hash PIN so sheet doesn't contain raw PINs
  var hash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, pin + '_HWX26')
    .map(function(b) { return (b & 0xFF).toString(16).padStart(2, '0'); }).join('');

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
    return handleResponse({ status: 'success', message: 'Your vote has been cast!' });
  } finally { lock.releaseLock(); }
}

function thGetVotes(pin) {
  if (!isTeacherPin(pin)) return handleResponse({ status: 'error', message: 'Unauthorized.' });
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('TH_Votes');
  if (!sheet || sheet.getLastRow() < 2) return handleResponse({ status: 'success', totals: {}, total: 0 });
  var data = sheet.getDataRange().getValues();
  var totals = {};
  for (var i = 1; i < data.length; i++) {
    var p = data[i][2];
    totals[p] = (totals[p] || 0) + 1;
  }
  return handleResponse({ status: 'success', totals: totals, total: data.length - 1 });
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
      if (row[2] !== student.partyId) continue; // wrong party
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

  // On-stage question (leaders only)
  var onStageQ = null;
  if (student.role === 'leader') {
    var qSheet = ss.getSheetByName('TH_Questions');
    if (qSheet && qSheet.getLastRow() >= 2) {
      var qData = qSheet.getDataRange().getValues();
      for (var j = qData.length - 1; j >= 1; j--) {
        if (qData[j][6] === 'on_stage') {
          onStageQ = { id: qData[j][0], text: qData[j][5] };
          break;
        }
      }
    }
  }

  // Own question statuses (status only — no text leak)
  var myQuestions = [];
  var qSheet2 = ss.getSheetByName('TH_Questions');
  if (qSheet2 && qSheet2.getLastRow() >= 2) {
    var qData2 = qSheet2.getDataRange().getValues();
    for (var k = 1; k < qData2.length; k++) {
      if (qData2[k][2] === pin) {
        myQuestions.push({ id: qData2[k][0], status: qData2[k][6] });
      }
    }
  }

  // Has this student already voted?
  var hasVoted = false;
  var vSheet = ss.getSheetByName('TH_Votes');
  if (vSheet && vSheet.getLastRow() >= 2) {
    var hash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, pin + '_HWX26')
      .map(function(b) { return (b & 0xFF).toString(16).padStart(2, '0'); }).join('');
    var vData = vSheet.getDataRange().getValues();
    for (var v = 1; v < vData.length; v++) {
      if (vData[v][1] === hash) { hasVoted = true; break; }
    }
  }

  return handleResponse({
    status: 'success',
    session: session,
    student: student,
    messages: messages,
    myQuestions: myQuestions,
    onStageQuestion: onStageQ,
    hasVoted: hasVoted
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

  // Vote count
  var voteCount = 0;
  var vSheet = ss.getSheetByName('TH_Votes');
  if (vSheet) voteCount = Math.max(0, vSheet.getLastRow() - 1);

  return handleResponse({
    status: 'success', session: session,
    questions: questions, messages: messages, voteCount: voteCount
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
