/**
 * SITUATION ROOM // SHEET COMMANDER BACKEND (v1.0)
 * 
 * Provides identity-based routing, spreadsheet data persistence,
 * and server-side AI integration for the Situation Room simulation.
 */

// ==========================================
// CORE ROUTING & CONFIG
// ==========================================

function doGet(e) {
  // Support both UI serving and JSON status checks
  if (e.parameter.action === 'status') {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'Mission Control Online', version: '2.0' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const mode = e.parameter.mode;
  const user = getIdentity();
  
  // Everyone starts in the Student Lobby ('go')
  // Teachers get an "Admin" button there to switch to 'sheet_commander' via ?mode=teacher
  let templateName = 'go';
  
  if (mode === 'teacher' && user.role === 'TEACHER') {
    templateName = 'sheet_commander';
  }
  
  const template = HtmlService.createTemplateFromFile(templateName);
  template.identity = JSON.stringify(user);
  template.deploymentUrl = ScriptApp.getService().getUrl();
  
  return template.evaluate()
      .setTitle('Situation Room // ' + (templateName === 'sheet_commander' ? 'Commander' : 'Researcher'))
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Receive submissions from Gemini Canvas Mission Player.
 * Deploy this script as a Web App to accept POST requests.
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    const sheet = getOrCreateSheet('CanvasSubmissions', [
      'Timestamp', 'JoinCode', 'Codename', 'MissionID', 
      'MissionTitle', 'Choices', 'Rationales', 'DebateLog', 'Score'
    ]);
    
    sheet.appendRow([
      new Date(),
      data.joinCode || '',
      data.codename || 'Anonymous',
      data.missionId || 'unknown',
      data.missionTitle || '',
      JSON.stringify(data.choices || []),
      JSON.stringify(data.rationales || []),
      JSON.stringify(data.debateLog || []),
      data.score || 0
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Mission logged!' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Identify the current user and their role.
 */
function getIdentity() {
  const userEmail = Session.getActiveUser().getEmail() || "anonymous";
  const ownerEmail = Session.getEffectiveUser().getEmail();
  
  // Simple owner check - the effective user is the script owner/deployer (the teacher)
  const isOwner = (userEmail === ownerEmail);
  
  return {
    email: userEmail,
    role: isOwner ? "TEACHER" : "STUDENT",
    isOwner: isOwner,
    teacherEmail: ownerEmail
  };
}

// ==========================================
// DATA LAYER: SPREADSHEET PERSISTENCE
// ==========================================

const TAB_CLASSES = "Classes";
const TAB_LOGS = "Logs";
const TAB_CONFIG = "Config";

/**
 * Fetch all classes and their assigned missions.
 */
function getClasses() {
  const sheet = getOrCreateSheet(TAB_CLASSES, ["Name", "Passcode", "MissionIDs"]);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  return data.slice(1).map(row => ({
    name: row[0],
    class_name: row[0],
    code: row[1],
    id: row[1],
    passcode: row[1],
    mission_ids: row[2] ? JSON.parse(row[2]) : []
  }));
}

/**
 * Delete a class by passcode.
 */
function deleteClass(passcode) {
  const sheet = getOrCreateSheet(TAB_CLASSES, ["Name", "Passcode", "MissionIDs"]);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === passcode) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

/**
 * Update a class by passcode.
 */
function updateClass(passcode, updates) {
  const sheet = getOrCreateSheet(TAB_CLASSES, ["Name", "Passcode", "MissionIDs"]);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === passcode) {
      if (updates.class_name) sheet.getRange(i + 1, 1).setValue(updates.class_name);
      if (updates.mission_ids) sheet.getRange(i + 1, 3).setValue(JSON.stringify(updates.mission_ids));
      return true;
    }
  }
  return false;
}

/**
 * Save or update a class.
 */
function saveClass(className, passcode) {
  const sheet = getOrCreateSheet(TAB_CLASSES, ["Name", "Passcode", "MissionIDs"]);
  const data = sheet.getDataRange().getValues();
  let rowIdx = -1;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === passcode) {
      rowIdx = i + 1;
      break;
    }
  }
  
  if (rowIdx > 0) {
    sheet.getRange(rowIdx, 1).setValue(className);
  } else {
    sheet.appendRow([className, passcode.toUpperCase(), "[]"]);
  }
  return true;
}

/**
 * Push a mission to a class.
 */
function pushMission(passcode, missionId) {
  const sheet = getOrCreateSheet(TAB_CLASSES, ["Name", "Passcode", "MissionIDs"]);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === passcode) {
      let missions = data[i][2] ? JSON.parse(data[i][2]) : [];
      if (!missions.includes(missionId)) {
        missions.push(missionId);
        sheet.getRange(i + 1, 3).setValue(JSON.stringify(missions));
      }
      return true;
    }
  }
  return false;
}

/**
 * Log a student decision.
 */
function logDecision(logData) {
  const sheet = getOrCreateSheet(TAB_LOGS, ["Timestamp", "Email", "MissionID", "Step", "Decision", "Rationale"]);
  sheet.appendRow([
    new Date(),
    logData.email || getIdentity().email,
    logData.missionId,
    logData.stepIndex,
    logData.decision,
    logData.rationale
  ]);
  return true;
}

/**
 * Fetch logs for the teacher dashboard.
 */
function fetchSimulationLogs() {
  const sheet = getOrCreateSheet(TAB_LOGS, ["Timestamp", "Email", "MissionID", "Step", "Decision", "Rationale"]);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  // Transform into dashboard stats
  return data.slice(1).map(row => ({
    student_name: row[1],
    mission_id: row[2],
    score: row[3], // Step index acting as score/progress
    created_at: row[0]
  }));
}

// ==========================================
// AI INTEGRATION REMOVED
// ==========================================
// Devil's Advocate now uses pre-authored challenges instead of runtime AI.
// No student data ever leaves the teacher's Google Sheet.
// This ensures full compliance with student data privacy regulations.

// ==========================================
// UTILITIES
// ==========================================

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers) sheet.appendRow(headers);
  }
  return sheet;
}
