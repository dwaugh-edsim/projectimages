const DEBRIEF_SHEET_NAME = 'Debriefs';

/**
 * Handles GET requests (Loading progress via PIN)
 */
function doGet(e) {
  // Handle case when called without parameters (for GitHub Actions automation)
  // Note: e.parameter is {} when no params, not undefined
  if (!e || !e.parameter || !e.parameter.action) {
    return fetchDebriefStatsAsJSON();
  }
  
  const action = e.parameter.action;
  const pin = e.parameter.pin;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Return all debriefs when action is 'all' (for GitHub Actions)
  if (action === 'all') {
    return fetchDebriefStatsAsJSON();
  }
  
  if (action === 'fetch_debrief' && pin) {
    const dbSheet = ss.getSheetByName(DEBRIEF_SHEET_NAME);
    if (!dbSheet) return successJSON({ status: 'not_found' });
    
    const data = dbSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][1]).trim() === String(pin).trim()) {
            return successJSON({
                status: 'success',
                name: data[i][2],
                responses: data[i][3],
                reflections: data[i].length > 4 ? data[i][4] : "[]"
            });
        }
    }
  }
  if (action === 'display') {
    return HtmlService.createTemplateFromFile('classdisplay').evaluate()
        .setTitle('Adam Smith Market - Live Results')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  return successJSON({ status: 'not_found' });
}

/**
 * Returns all debrief data as JSON array (for automation)
 */
function fetchDebriefStatsAsJSON() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(DEBRIEF_SHEET_NAME);
  
  if (!sheet) {
    return successJSON({ status: 'error', message: 'Sheet not found' });
  }
  
  const data = sheet.getDataRange().getValues();
  const results = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const obj = { timestamp: row[0], pin: row[1], name: row[2] };
    
    // Parse responses JSON
    try {
      obj.responses = JSON.parse(row[3]);
    } catch (e) {
      obj.responses = row[3];
    }
    
    // Parse reflections if present
    if (row.length > 4) {
      try {
        obj.reflections = JSON.parse(row[4]);
      } catch (e) {
        obj.reflections = row[4];
      }
    }
    
    results.push(obj);
  }
  
  return successJSON(results);
}

/**
 * Fetches ALL debriefs for the classroom display
 */
function fetchDebriefStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(DEBRIEF_SHEET_NAME);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const results = [];
  
  for (let i = 1; i < data.length; i++) {
    results.push({
      timestamp: data[i][0],
      pin: data[i][1],
      name: data[i][2],
      responses: data[i][3], // JSON string
      reflections: data[i].length > 4 ? data[i][4] : "[]"
    });
  }
  return results;
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
      const reflections = payload.reflections || [];
      const flatData = [];
      responses.forEach(r => {
        flatData.push(r.definition);
        flatData.push(r.match);
      });

      const rowData = [
        new Date(),
        pin,
        payload.name || 'Anonymous',
        JSON.stringify(responses),
        JSON.stringify(reflections),
        ...reflections, // Add reflections as separate columns too
        ...flatData
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
    sheet.appendRow(['Timestamp', 'PIN', 'Name', 'Responses (JSON)', 'Reflections (JSON)', 'Ref 1', 'Ref 2', 'Ref 3', 'Flat Data...']);
    sheet.setFrozenRows(1);
  }
}
