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
  // SESSION RETRIEVAL (Resume work)
  if (e.parameter.action === 'get_state') {
    const sheet = getOrCreateSheet('CanvasSubmissions');
    const rows = sheet.getDataRange().getValues();
    const searchName = (e.parameter.studentNameOnly || "").trim().toUpperCase();
    const searchPin = (e.parameter.studentPin || "").trim().toUpperCase();
    const searchBlock = (e.parameter.classCode || "").trim();

    let nameExists = false;
    let pinMatches = false;
    let latestState = null;

    for (let i = rows.length - 1; i >= 1; i--) {
        const cellValue = String(rows[i][2]);
        const namePart = cellValue.split('(')[0].trim().toUpperCase();
        const pinPart = (cellValue.match(/\(([^)]+)\)/) || [])[1] || "";
        const rowBlock = rows[i][1];
        const rowMissionId = rows[i][3];

        if (namePart === searchName && rowBlock === searchBlock) {
            // Check missionId only if provided (backwards compatible for Leo)
            if (!e.parameter.missionId || rowMissionId === e.parameter.missionId) {
                nameExists = true;
                if (pinPart.toUpperCase() === searchPin) {
                    pinMatches = true;
                    try {
                        latestState = {
                            judgments: JSON.parse(rows[i][5] || "{}"),
                            responses: JSON.parse(rows[i][6] || "{}"),
                            score: rows[i][8]
                        };
                        break;
                    } catch (err) {
                        console.error("Error parsing state for row " + i, err);
                        // Continue searching if this row was corrupted
                    }
                }
            }
        }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, state: latestState, nameExists: nameExists, pinMatches: pinMatches }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // DASHBOARD DATA (For the Teacher Dashboard)
  if (e.parameter.action === 'get_dashboard') {
    const sheet = getOrCreateSheet('CanvasSubmissions');
    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    
    const data = rows.slice(1)
      .filter(row => row[2] && String(row[5]).trim() !== "Choices") // Skip header duplicates or empty rows
      .map(row => {
        try {
          return {
            timestamp: row[0],
            block: row[1],
            codename: row[2],
            missionId: row[3],
            choices: JSON.parse(row[5] || "{}"),
            rationales: JSON.parse(row[6] || "{}"),
            verdict: row[8]
          };
        } catch (e) {
          console.error("Skipping corrupted row: " + row[2], e);
          return null;
        }
      })
      .filter(item => item !== null);
    
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Support JSON status checks
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

    // COMPATIBILITY LAYER: Detect new Master Edition payload (like Leo 1752)
    let codename = data.codename || data.studentName || 'Anonymous';
    let joinCode = data.joinCode || data.classCode || '';
    let choices = data.choices || [];
    let rationales = data.rationales || [];

    if (data.action === "save_state" && data.state) {
        const state = typeof data.state === 'string' ? JSON.parse(data.state) : data.state;
        choices = state.judgments || [];
        rationales = state.responses || [];
        if (state.finalVerdict) data.score = state.finalVerdict;
    }
    
    sheet.appendRow([
      new Date(),
      joinCode,
      codename,
      data.missionId || 'unknown',
      data.missionTitle || 'Leo 1752 Simulation',
      JSON.stringify(choices),
      JSON.stringify(rationales),
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
