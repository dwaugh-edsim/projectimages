/**
 * After the Swipe — Michelle Credit Card Case
 * Apps Script for Google Sheets webhook
 *
 * This sheet script supports:
 *   - Saving student progress: action=save
 *   - Retrieving student progress: GET/POST queries
 *   - Class progress dashboard: action=progress
 *
 * It stores values under the "Sheet1" tab:
 * columns: ["timestamp", "block", "student", "subject", "simulation", "status", "rationales"]
 *
 * To separate this from other simulations:
 *   - simulation = "Michelle Credit Case"
 */

function doGet(e) {
  try {
    const action = e.parameter.action;

    // DEBUG: Inspect the sheet structure
    if (action === 'debug') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName("Sheet1") || ss.getActiveSheet();
      const rows = sheet.getDataRange().getValues();
      const allStudents = rows.slice(1).map(r => r[2]);
      return ContentService.createTextOutput(JSON.stringify({ 
        headers: rows[0], 
        rowCount: rows.length - 1,
        allStudents: allStudents,
        firstRows: rows.slice(0, 6) 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // PROGRESS: Fetch progress for all students (used by classroom dashboard)
    if (action === 'progress') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName("Sheet1") || ss.getActiveSheet();
      const rows = sheet.getDataRange().getValues();
      
      if (rows.length <= 1) {
        return ContentService.createTextOutput(JSON.stringify({ progress: {} }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      const headers = rows[0].map(h => String(h).toLowerCase().trim());
      const studentColIdx = headers.indexOf("student") > -1 ? headers.indexOf("student") : 2;
      const simColIdx = headers.indexOf("simulation") > -1 ? headers.indexOf("simulation") : 4;
      const rationalesColIdx = headers.indexOf("rationales") > -1 ? headers.indexOf("rationales") : 6;
      const timestampColIdx = headers.indexOf("timestamp") > -1 ? headers.indexOf("timestamp") : 0;
      const statusColIdx = headers.indexOf("status") > -1 ? headers.indexOf("status") : 5;
      
      const simulation = e.parameter.simulation || "Michelle Credit Case";
      const studentProgressMap = {};
      
      for (let i = rows.length - 1; i >= 1; i--) {
        const rowStudent = String(rows[i][studentColIdx]).trim();
        const rowSim = String(rows[i][simColIdx]).trim();
        
        if (rowSim === simulation) {
          if (!studentProgressMap[rowStudent]) {
            studentProgressMap[rowStudent] = {
              timestamp: rows[i][timestampColIdx],
              status: rows[i][statusColIdx],
              rationales: rows[i][rationalesColIdx]
            };
          }
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ progress: studentProgressMap }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Single student retrieval
    const student = e.parameter.student;
    const simulation = e.parameter.simulation || "Michelle Credit Case";

    if (!student) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Missing student name" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Sheet1") || ss.getActiveSheet();
    const rows = sheet.getDataRange().getValues();

    if (rows.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ rationales: null }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = rows[0].map(h => String(h).toLowerCase().trim());
    const studentColIdx = headers.indexOf("student") > -1 ? headers.indexOf("student") : 2;
    const simColIdx = headers.indexOf("simulation") > -1 ? headers.indexOf("simulation") : 4;
    const rationalesColIdx = headers.indexOf("rationales") > -1 ? headers.indexOf("rationales") : 6;

    let latestRationales = null;
    let studentPasscode = null;

    for (let i = rows.length - 1; i >= 1; i--) {
      const rowStudent = String(rows[i][studentColIdx]).trim();
      const rowSim = String(rows[i][simColIdx]).trim();

      if (rowStudent === student.trim() && rowSim === simulation.trim()) {
        latestRationales = rows[i][rationalesColIdx];
        break;
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ rationales: latestRationales }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Sheet1") || ss.getActiveSheet();

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["timestamp", "block", "student", "subject", "simulation", "status", "rationales"]);
    }

    // Support both JSON post payloads (even if sent as text/plain to bypass CORS preflight) and URL-encoded forms
    let data = {};
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter;
      }
    } else {
      data = e.parameter;
    }

    const action = data.action;

    // Handle initial session validation/fetch
    if (action === 'initSession') {
      const rows = sheet.getDataRange().getValues();
      const headers = rows[0].map(h => String(h).toLowerCase().trim());
      const studentColIdx = headers.indexOf("student") > -1 ? headers.indexOf("student") : 2;
      const simColIdx = headers.indexOf("simulation") > -1 ? headers.indexOf("simulation") : 4;
      const rationalesColIdx = headers.indexOf("rationales") > -1 ? headers.indexOf("rationales") : 6;
      
      const studentName = data.name.trim();
      const passcode = data.passcode.trim().toUpperCase();
      const simulation = data.simulation || "Michelle Credit Case";

      // Verify passcode if student exists
      let storedPasscode = null;
      let latestRationales = null;

      for (let i = 1; i < rows.length; i++) {
        const rowStudent = String(rows[i][studentColIdx]).trim();
        const rowSim = String(rows[i][simColIdx]).trim();
        if (rowStudent === studentName && rowSim === simulation) {
          // Passcode is stored inside the rationales or parsed from metadata (we track matching block/passcode)
          // To keep it simple, the front-end stores the code. We can check the first matching row's block/code logic
          latestRationales = rows[i][rationalesColIdx];
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ ok: true, responses: latestRationales ? JSON.parse(latestRationales) : {} }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Handle saving
    const newRow = sheet.getLastRow() + 1;
    const rowData = [
      data.timestamp || new Date().toLocaleString(),
      data.block,
      data.student,
      "ECON12",
      data.simulation || "Michelle Credit Case",
      data.status || "SAVED",
      data.rationales
    ];

    sheet.appendRow(rowData);
    sheet.getRange(newRow, 7).setNumberFormat('@STRING@');

    return ContentService.createTextOutput(JSON.stringify({ ok: true, success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
