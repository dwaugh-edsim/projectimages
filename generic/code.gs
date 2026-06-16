/**
 * GENERIC WEBHOOK BACKEND (v1.0)
 * Google Apps Script for Spreadsheet Data Persistence
 * 
 * Instructions:
 * 1. Open your Google Spreadsheet.
 * 2. Click "Extensions" > "Apps Script".
 * 3. Paste this code into the editor.
 * 4. Rename the default sheet tab to "Submissions" (or it will auto-create/fallback to Sheet1/active tab).
 * 5. Click "Deploy" > "New deployment" > Select type "Web app".
 * 6. Set Access to "Anyone" and Execute as "Me (your account)".
 * 7. Deploy and copy the Web App URL. Paste it as `API_URL` in your HTML files.
 */

function doGet(e) {
  try {
    const action = e.parameter.action;

    // 1. DEBUG: Call with ?action=debug to inspect sheet structures
    if (action === 'debug') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName("Submissions") || ss.getSheetByName("Sheet1") || ss.getActiveSheet();
      const rows = sheet.getDataRange().getValues();
      const allStudents = rows.slice(1).map(r => r[2]);
      return ContentService.createTextOutput(JSON.stringify({ 
        headers: rows[0], 
        rowCount: rows.length - 1,
        allStudents: allStudents,
        firstRows: rows.slice(0, 6) 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. PROGRESS: Fetch progress for all students for the dashboard
    if (action === 'progress') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName("Submissions") || ss.getSheetByName("Sheet1") || ss.getActiveSheet();
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
      
      const simulation = e.parameter.simulation || "generic-simulation";
      const studentProgressMap = {};
      
      // Reconstruct student states chronologically
      for (let i = 1; i < rows.length; i++) {
        const rowStudent = String(rows[i][studentColIdx]).trim();
        const rowSim = String(rows[i][simColIdx]).trim();
        
        if (rowSim === simulation) {
          if (!studentProgressMap[rowStudent]) {
            studentProgressMap[rowStudent] = {
              timestamp: rows[i][timestampColIdx],
              status: rows[i][statusColIdx],
              rationales: rows[i][rationalesColIdx],
              slideTimestamps: {}
            };
          } else {
            studentProgressMap[rowStudent].timestamp = rows[i][timestampColIdx];
            studentProgressMap[rowStudent].status = rows[i][statusColIdx];
            studentProgressMap[rowStudent].rationales = rows[i][rationalesColIdx];
          }
          
          // Reconstruct individual slide timestamps for telemetry progress indicators
          try {
            const rationalesStr = rows[i][rationalesColIdx];
            if (rationalesStr) {
              const responses = JSON.parse(rationalesStr);
              for (const key in responses) {
                if (key === "_timestamps") {
                  const clientTimestamps = responses[key];
                  for (const cKey in clientTimestamps) {
                    if (!studentProgressMap[rowStudent].slideTimestamps[cKey]) {
                      studentProgressMap[rowStudent].slideTimestamps[cKey] = clientTimestamps[cKey];
                    }
                  }
                  continue;
                }
                
                const val = responses[key];
                let isCompleted = false;
                if (val && typeof val === 'string' && val.trim().length > 0) {
                  isCompleted = true;
                }
                
                if (isCompleted && !studentProgressMap[rowStudent].slideTimestamps[key]) {
                  studentProgressMap[rowStudent].slideTimestamps[key] = rows[i][timestampColIdx];
                }
              }
            }
          } catch(err) {}
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ progress: studentProgressMap }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 3. RETRIEVAL: Load single student draft
    const student = e.parameter.student;
    const simulation = e.parameter.simulation;

    if (!student || !simulation) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Missing parameters", received: e.parameter }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Submissions") || ss.getSheetByName("Sheet1") || ss.getActiveSheet();
    const rows = sheet.getDataRange().getValues();

    if (rows.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ rationales: null, debug: "Sheet is empty" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = rows[0].map(h => String(h).toLowerCase().trim());
    const studentColIdx = headers.indexOf("student") > -1 ? headers.indexOf("student") : 2;
    const simColIdx = headers.indexOf("simulation") > -1 ? headers.indexOf("simulation") : 4;
    const rationalesColIdx = headers.indexOf("rationales") > -1 ? headers.indexOf("rationales") : 6;

    let latestRationales = null;

    // Scan backwards to find the latest save
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
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString(), stack: err.stack }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Submissions") || ss.getSheetByName("Sheet1") || ss.getActiveSheet();

    // Init sheet headers if completely empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["timestamp", "block", "student", "subject", "simulation", "status", "rationales"]);
    }

    const newRow = sheet.getLastRow() + 1;
    const rowData = [
      e.parameter.timestamp,
      e.parameter.block,
      e.parameter.student,
      e.parameter.subject,
      e.parameter.simulation,
      e.parameter.status,
      e.parameter.rationales
    ];
    
    sheet.getRange(newRow, 1, 1, rowData.length).setValues([rowData]);
    // Force plain text formatting on rationales to keep JSON quotes intact
    sheet.getRange(newRow, 7).setNumberFormat('@STRING@');

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
