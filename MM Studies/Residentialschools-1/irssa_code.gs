function doGet(e) {
  try {
    const student = e.parameter.student;
    const simulation = e.parameter.simulation;
    
    if (!student || !simulation) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Missing parameters" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const rows = sheet.getDataRange().getValues();
    
    // We assume columns: Timestamp, Block, Student, Subject, Simulation, Status, Rationales
    // Look backwards from the bottom to find the latest save for this student and simulation
    let latestRationales = null;
    
    // Find column indexes based on headers
    const headers = rows[0];
    const studentCol = headers.indexOf("student");
    const simCol = headers.indexOf("simulation");
    const rationalesCol = headers.indexOf("rationales");
    
    // If headers exist, use them. Otherwise, fallback to hardcoded indexes (adjust as needed based on your sheet)
    // Assuming: 0:timestamp, 1:block, 2:student, 3:subject, 4:simulation, 5:status, 6:rationales
    const sCol = studentCol > -1 ? studentCol : 2;
    const mCol = simCol > -1 ? simCol : 4;
    const rCol = rationalesCol > -1 ? rationalesCol : 6;

    for (let i = rows.length - 1; i >= 1; i--) {
      if (rows[i][sCol] === student && rows[i][mCol] === simulation) {
        latestRationales = rows[i][rCol];
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
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // If sheet is empty, add headers
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["timestamp", "block", "student", "subject", "simulation", "status", "rationales"]);
    }
    
    sheet.appendRow([
      e.parameter.timestamp,
      e.parameter.block,
      e.parameter.student,
      e.parameter.subject,
      e.parameter.simulation,
      e.parameter.status,
      e.parameter.rationales
    ]);

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
