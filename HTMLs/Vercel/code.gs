/**
 * SITUATION ROOM // SHEET COMMANDER BACKEND (v1.0)
 * 
 * Provides identity-based routing, spreadsheet data persistence,
 * and server-side AI integration for the Situation Room simulation.
 */

// ==========================================
// CORE ROUTING & CONFIG
// ==========================================

// ==========================================
// DYNAMIC LOADER CONFIG
// ==========================================

// UPDATE THIS URL to your Vercel/GitHub raw content base path
// Current Default: Pointing to your new GitHub Repository raw content
const REMOTE_BASE_URL = "https://raw.githubusercontent.com/icumusicvideo-crypto/Vercelpayload/main/";

function doGet(e) {
  const mode = e.parameter.mode;
  const user = getIdentity();
  const deploymentUrl = ScriptApp.getService().getUrl();
  
  let fileName = 'go.html';
  if (mode === 'teacher' && user.role === 'TEACHER') {
    fileName = 'sheet_commander.html';
  }
  
  let htmlContent = "";
  const cache = CacheService.getScriptCache();
  const cached = cache.get(fileName);
  
  if (cached && !e.parameter.nocache) {
    htmlContent = cached;
  } else {
    try {
      const response = UrlFetchApp.fetch(REMOTE_BASE_URL + fileName + "?v=" + new Date().getTime());
      htmlContent = response.getContentText();
      
      // GAS CacheService has a 100KB limit per entry.
      // sheet_commander.html is ~128KB, so we only cache if it fits.
      if (htmlContent.length < 90000) {
        cache.put(fileName, htmlContent, 3600); 
      }
    } catch (err) {
      console.warn("Remote fetch failed, falling back to local: " + err.message);
      try {
        // Fallback: This assumes the files still exist locally in the GAS project
        htmlContent = HtmlService.createTemplateFromFile(fileName.replace('.html', '')).getRawContent();
      } catch (localErr) {
        return HtmlService.createHtmlOutput("<h1>CRITICAL LOADING ERROR</h1><p>The Situation Room could not be reached. Please check your internet or Vercel Proxy URL.</p>");
      }
    }
  }

  // Manual scriptlet replacement (Since we are serving raw HTML strings)
  htmlContent = htmlContent.replace(/<\?!= identity \?>/g, JSON.stringify(user));
  htmlContent = htmlContent.replace(/<\?!= deploymentUrl \?>/g, deploymentUrl);

  return HtmlService.createHtmlOutput(htmlContent)
      .setTitle('Situation Room // ' + (fileName === 'sheet_commander.html' ? 'Commander' : 'Researcher'))
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Clear the UI cache to force a fresh pull from Vercel.
 * Call this via google.script.run.clearUiCache() if needed.
 */
function clearUiCache() {
  const cache = CacheService.getScriptCache();
  cache.removeAll(['go.html', 'sheet_commander.html']);
  return "Cache Cleared.";
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
// AI INTEGRATION: GEMINI ADVERSARY
// ==========================================

/**
 * Call Gemini AI using the API key stored in Spreadsheet.
 */
function callGemini(prompt, systemInstruction = "") {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY missing in Config sheet.");
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: (systemInstruction ? systemInstruction + "\n\n" : "") + prompt }]
      }
    ]
  };
  
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());
  
  if (json.candidates && json.candidates[0].content.parts[0].text) {
    return json.candidates[0].content.parts[0].text;
  } else {
    throw new Error("Gemini AI Error: " + response.getContentText());
  }
}

function saveApiKey(key) {
  const sheet = getOrCreateSheet(TAB_CONFIG, ["Key", "Value"]);
  sheet.getRange(2, 1, 1, 2).setValues([["GEMINI_API_KEY", key]]);
  return true;
}

function getApiKey() {
  const sheet = getOrCreateSheet(TAB_CONFIG, ["Key", "Value"]);
  const data = sheet.getDataRange().getValues();
  if (data.length > 1 && data[1][0] === "GEMINI_API_KEY") {
    return data[1][1];
  }
  return null;
}

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
/**
 * DIAGNOSTIC TOOL: Run this in the GAS Editor to test the pipe.
 * Click "Run" -> "testPipe" and check the Execution Log.
 */
function testPipe() {
  console.log("--- SYSTEM DIAGNOSTIC START ---");
  const user = getIdentity();
  console.log("   User:", user.email, "Role:", user.role);
  
  const files = ['go.html', 'sheet_commander.html'];
  
  files.forEach(fileName => {
    console.log(`\n--- Testing [${fileName}] ---`);
    const testUrl = REMOTE_BASE_URL + fileName + "?v=" + new Date().getTime();
    console.log("   Fetching:", testUrl);
    
    try {
      const response = UrlFetchApp.fetch(testUrl);
      const code = response.getResponseCode();
      const content = response.getContentText();
      console.log("   Response Code:", code);
      console.log("   Content Length:", content.length);
      
      if (content.length > 100) {
        console.log(`   ✅ SUCCESS: ${fileName} fetched.`);
        // Test injection
        const final = content.replace(/<\?!= identity \?>/g, JSON.stringify(user));
        if (final.indexOf(user.email) !== -1) {
          console.log("   ✅ SUCCESS: Identity injected.");
        } else {
          console.warn("   ❌ Error: Injection failed. Check placeholders.");
        }
      } else {
        console.warn("   ❌ Error: Content too short (Check for 404/Empty).");
      }
    } catch (err) {
      console.error(`   ❌ FAIL: ${fileName} - ` + err.message);
    }
  });
  console.log("\n--- DIAGNOSTIC COMPLETE ---");
}
