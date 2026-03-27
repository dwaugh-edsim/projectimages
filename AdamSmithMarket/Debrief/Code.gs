const DEBRIEF_SHEET_NAME = 'Debriefs';

/**
 * Handles GET requests (Loading progress via PIN)
 */
function doGet(e) {
  const action = e.parameter.action;
  const pin = e.parameter.pin;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'fetch_debrief' && pin) {
    const dbSheet = ss.getSheetByName(DEBRIEF_SHEET_NAME);
    if (!dbSheet) return successJSON({ status: 'not_found' });
    
    const data = dbSheet.getDataRange().getValues();
    // Search for PIN in column B (index 1)
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][1]).trim() === String(pin).trim()) {
            return successJSON({
                status: 'success',
                name: data[i][2],
                responses: data[i][3]
            });
        }
    }
  }
  return successJSON({ status: 'not_found' });
}

/**
 * Handles POST requests (Saving/Submitting progress)
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const pin = String(payload.pin).trim();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'submit_debrief') {
      let dbSheet = ss.getSheetByName(DEBRIEF_SHEET_NAME);
      
      if (!dbSheet) {
        dbSheet = ss.insertSheet(DEBRIEF_SHEET_NAME);
        dbSheet.appendRow(['Timestamp', 'PIN', 'Name', 'Responses (JSON)', 'Flat Data...']);
        dbSheet.setFrozenRows(1);
      }

      const responses = payload.responses || [];
      const flatResponses = [];
      responses.forEach(r => {
        flatResponses.push(r.definition);
        flatResponses.push(r.match);
      });

      const rowData = [
        new Date(),
        pin,
        payload.name || 'Anonymous',
        JSON.stringify(responses),
        ...flatResponses
      ];

      // Find existing row for this PIN to avoid duplicates
      const data = dbSheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][1]).trim() === pin) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex !== -1) {
        // Update existing row
        dbSheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      } else {
        // Append new row
        dbSheet.appendRow(rowData);
      }

      return successJSON({ status: 'success', message: 'Debrief recorded.' });
    }
    
    return successJSON({ status: 'error', message: 'Unknown action' });

  } catch (error) {
    return successJSON({ status: 'error', message: error.toString() });
  }
}

/**
 * Helper to return JSON response
 */
function successJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Initial setup helper
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(DEBRIEF_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(DEBRIEF_SHEET_NAME);
    sheet.appendRow(['Timestamp', 'PIN', 'Name', 'Responses (JSON)', 'Flat Data...']);
    sheet.setFrozenRows(1);
  }
}
