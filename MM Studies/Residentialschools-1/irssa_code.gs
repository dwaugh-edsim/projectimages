function doGet(e) {
  try {
    const action = e.parameter.action;

    // DEBUG: Call with ?action=debug to inspect the sheet structure
    if (action === 'debug') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName("Sheet1") || ss.getActiveSheet();
      const rows = sheet.getDataRange().getValues();
      const allStudents = rows.slice(1).map(r => r[2]); // All values in student col
      return ContentService.createTextOutput(JSON.stringify({ 
        headers: rows[0], 
        rowCount: rows.length - 1,
        allStudents: allStudents,
        firstRows: rows.slice(0, 6) 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    // PROGRESS: Fetch progress for all students
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
      
      const simulation = e.parameter.simulation || "IRSSA Settlement Dossier";
      const studentProgressMap = {};
      
      // Loop from end to start to get the latest row for each student
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

    // SAVE via GET (reliable cross-origin from Chromebooks)
    if (action === 'save') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName("Sheet1") || ss.getActiveSheet();
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
      // Force rationales column (col 7) to plain text to preserve JSON quotes
      sheet.getRange(newRow, 7).setNumberFormat('@STRING@');
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const student = e.parameter.student;
    const simulation = e.parameter.simulation;

    if (!student || !simulation) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Missing parameters", received: e.parameter }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Sheet1") || ss.getActiveSheet();
    const rows = sheet.getDataRange().getValues();

    if (rows.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ rationales: null, debug: "Sheet is empty" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Find column indexes from headers (case-insensitive)
    const headers = rows[0].map(h => String(h).toLowerCase().trim());
    const sCol = headers.indexOf("student");
    const mCol = headers.indexOf("simulation");
    const rCol = headers.indexOf("rationales");

    // Fallback to hardcoded positions if headers aren't found
    const studentColIdx = sCol > -1 ? sCol : 2;
    const simColIdx = mCol > -1 ? mCol : 4;
    const rationalesColIdx = rCol > -1 ? rCol : 6;

    let latestRationales = null;
    let debugInfo = { headers: rows[0], studentColIdx, simColIdx, rationalesColIdx, searchingFor: student, searchingSim: simulation, rowsChecked: 0 };

    for (let i = rows.length - 1; i >= 1; i--) {
      const rowStudent = String(rows[i][studentColIdx]).trim();
      const rowSim = String(rows[i][simColIdx]).trim();
      debugInfo.rowsChecked++;

      if (rowStudent === student.trim() && rowSim === simulation.trim()) {
        latestRationales = rows[i][rationalesColIdx];
        debugInfo.foundAtRow = i;
        break;
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ rationales: latestRationales, debug: debugInfo }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString(), stack: err.stack }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Sheet1") || ss.getActiveSheet();

    // Add headers if sheet is empty
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
    // Force rationales column (col 7) to plain text to preserve JSON quotes
    sheet.getRange(newRow, 7).setNumberFormat('@STRING@');

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
