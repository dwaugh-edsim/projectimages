/**
 * Google Apps Script Backend for Service Learning
 * VERSION: 2.1 (Robust CORS + Error Handling)
 * 
 * IMPORTANT:
 * 1. This script should be "Bound" to your Google Sheet.
 *    (Open Sheet -> Extensions -> Apps Script)
 * 2. If it is NOT bound, you must replace the SS_ID below.
 */

const SS_ID = null;

const PIN_LIST = {
  'Farhan': 'HRNH', 'Abdul': 'ALZZ', 'Joshua A': 'RUXG', 'Clark': '9F3K',
  'Madhavan': 'R4MT', 'Remy': 'YMRP', 'Yunho': 'T4N5', 'Lachlan McM': 'FFAN',
  'Lachlan Mac': '25VT', 'Nolan': 'KFK6', 'Laila': 'V4BC', 'Josie': 'MVQW',
  'Huda': '6SUB', 'Brody': 'JY2P', 'Leo': 'RKKJ', 'Elizabeth': 'FNG3',
  'Fatima': 'T6U2', 'Alia': 'LJFM', 'Rifa': '57G5', 'Sarah': '96EU',
  'Jessa': 'HSZU', 'Delisha': 'Q2YA', 'Kendra': 'MTGG', 'Zankia': 'CA3J',
  'Evie': 'R7SX', 'Jana': 'TT8D', 'Ali': 'D2ZD', 'Kai': 'VFW8', 'Natalia': 'RING', 'Isaac': 'CASK'
};

function getSheet() {
  let ss;
  if (SS_ID) {
    ss = SpreadsheetApp.openById(SS_ID);
  } else {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  if (!ss) throw new Error("Could not find Spreadsheet. Ensure script is bound or SS_ID is set.");
  
  let sheet = ss.getSheetByName("MissionLogs");
  if (!sheet) {
    sheet = ss.insertSheet("MissionLogs");
    sheet.appendRow(["StudentId", "MissionTitle", "ReflectionJSON", "Timestamp"]);
  }
  return sheet;
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    const studentId = e.parameter.studentId;
    const pin = e.parameter.pin;
    const missionTitle = e.parameter.missionTitle;

    if (action === 'LOGIN') {
      const correctPin = PIN_LIST[studentId];
      const isSuccess = (correctPin && correctPin === (pin || '').toUpperCase());
      return createJsonResponse({ success: isSuccess });
    }

    if (action === 'GET_ALL_PROGRESS') {
      const sheet = getSheet();
      const rows = sheet.getDataRange().getValues();
      const results = [];
      for (let i = 1; i < rows.length; i++) {
        results.push({
          StudentId: rows[i][0],
          MissionTitle: rows[i][1],
          ReflectionJSON: rows[i][2],
          Timestamp: rows[i][3]
        });
      }
      return createJsonResponse(results);
    }

    const sheet = getSheet();
    const rows = sheet.getDataRange().getValues();
    
    let content = null;
    for (let i = rows.length - 1; i >= 1; i--) {
      if (rows[i][0] === studentId && rows[i][1] === missionTitle) {
        content = rows[i][2];
        break;
      }
    }

    return createJsonResponse({ content: content });
  } catch (err) {
    return createJsonResponse({ error: err.toString(), success: false });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const sheet = getSheet();
    const rows = sheet.getDataRange().getValues();
    
    let foundIndex = -1;
    for (let i = rows.length - 1; i >= 1; i--) {
      if (rows[i][0] === payload.studentId && rows[i][1] === payload.missionTitle) {
        foundIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (foundIndex !== -1) {
      sheet.getRange(foundIndex, 3).setValue(payload.reflection);
      sheet.getRange(foundIndex, 4).setValue(payload.timestamp);
    } else {
      sheet.appendRow([
        payload.studentId,
        payload.missionTitle,
        payload.reflection,
        payload.timestamp
      ]);
    }

    return createJsonResponse({ success: true });
  } catch (err) {
    return createJsonResponse({ error: err.toString(), success: false });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
