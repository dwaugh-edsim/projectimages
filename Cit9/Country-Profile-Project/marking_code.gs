// Google Apps Script backend for Country Profile Project Grading
// 1. Create a Google Sheet.
// 2. Open Extensions > Apps Script.
// 3. Paste this code.
// 4. Deploy as a Web App:
//    - Execute as: "Me"
//    - Who has access: "Anyone"
// 5. Copy the Web App URL and paste it into 'grading_dashboard.html' at the 'GAS_URL' placeholder.

const SHEET_NAME = 'Evaluations';

function doGet(e) {
  return ContentService.createTextOutput("GAS Grading Server is Active.")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // 10 second timeout
    
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    // Create sheet and set headers if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        'Timestamp', 
        'Student Name(s)', 
        'Topic ID', 
        'Country', 
        'Issue', 
        'Intro Score', 
        'Actions Score', 
        'Consequences Score', 
        'Canada Score', 
        'Reflection Score', 
        'Overall Level',
        'Has 2+ Citations',
        'Has Visual Layout',
        'Praise Feedback', 
        'Next Steps Feedback'
      ]);
      // Format headers
      sheet.getRange(1, 1, 1, 15).setFontWeight('bold').setBackground('#f1f5f9');
    }
    
    // Check if an evaluation for this student/topic already exists to overwrite or update it
    const lastRow = sheet.getLastRow();
    let existingRowIndex = -1;
    if (lastRow > 1) {
      const values = sheet.getRange(2, 2, lastRow - 1, 2).getValues(); // Get Student Name and Topic ID columns
      for (let i = 0; i < values.length; i++) {
        if (values[i][0] === data.studentNames && values[i][1] == data.topicId) {
          existingRowIndex = i + 2; // +2 due to 1-indexing and header row
          break;
        }
      }
    }
    
    const rowData = [
      new Date(),
      data.studentNames,
      data.topicId,
      data.country,
      data.issue,
      data.scores.intro || 'Unscored',
      data.scores.actions || 'Unscored',
      data.scores.consequences || 'Unscored',
      data.scores.canada || 'Unscored',
      data.scores.reflection || 'Unscored',
      data.overallLevel,
      data.checkCitations ? 'Yes' : 'No',
      data.checkVisuals ? 'Yes' : 'No',
      data.praise,
      data.nextSteps
    ];
    
    if (existingRowIndex !== -1) {
      // Update existing record
      sheet.getRange(existingRowIndex, 1, 1, 15).setValues([rowData]);
    } else {
      // Append new record
      sheet.appendRow(rowData);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, action: existingRowIndex !== -1 ? 'update' : 'append' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
