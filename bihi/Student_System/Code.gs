/**
 * Bicentennial Junior High School — Student Webhook Backend (V2 Persistence)
 * Mr. Waugh (Room 8)
 * 
 * Supports:
 * - Multi-class sections (e.g. 801, 802, 803, 804, 901, 902, 903)
 * - 3-Letter PIN + First Name verification
 * - Full cross-device state persistence (loads previously submitted data on login)
 * - Intake, Health Audit, and "WHERE" Profile storage
 */

function getSheetForClass(ss, className) {
  const cleanName = String(className || 'General').trim();
  let sheet = ss.getSheetByName(cleanName);
  if (!sheet) {
    sheet = ss.insertSheet(cleanName);
    sheet.appendRow([
      'PIN',                     // A
      'Student Name',           // B
      'Section',                // C
      'GNSPES Email',           // D
      'Pronouns',               // E
      'Task / Stage',           // F
      'Submission Data (JSON)', // G
      'Formatted Summary',      // H
      'Last Updated'            // I
    ]);
    sheet.getRange("A1:I1").setFontWeight("bold").setBackground('#f1f5f9');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(2, 160);
    sheet.setColumnWidth(4, 180);
    sheet.setColumnWidth(7, 280);
    sheet.setColumnWidth(8, 320);
  }
  return sheet;
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action; 
    const pin = String(payload.pin || '').trim().toUpperCase();
    const className = String(payload.className || 'General').trim();
    
    if (!pin) throw new Error("3-Letter PIN is required.");

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getSheetForClass(ss, className);
    
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) { // Skip header
      if (String(data[i][0]).trim().toUpperCase() === pin) {
        rowIndex = i + 1; // 1-indexed for Sheets
        break;
      }
    }

    // --- ACTION: LOGIN (Cross-Device Persistence) ---
    if (action === 'login') {
      const name = (payload.name || '').trim();
      
      if (rowIndex !== -1) {
        // PIN exists in sheet! Retrieve full saved state
        const savedName = data[rowIndex-1][1];
        const savedEmail = data[rowIndex-1][3];
        const savedPronouns = data[rowIndex-1][4];
        const savedTask = data[rowIndex-1][5];
        let savedDataJSON = {};
        try {
          savedDataJSON = JSON.parse(data[rowIndex-1][6] || '{}');
        } catch (err) {
          savedDataJSON = {};
        }
        
        return successJSON({
          isNew: false,
          name: savedName || name,
          email: savedEmail || '',
          pronouns: savedPronouns || '',
          task: savedTask || '',
          savedData: savedDataJSON,
          className: className
        });
      } else {
        // New PIN. Create starter record.
        sheet.appendRow([
          pin,
          name,
          className,
          '', '', // email, pronouns
          'Active / Logged In',
          '{}',
          'Initial Login',
          new Date()
        ]);
        return successJSON({
          isNew: true,
          name: name,
          email: '',
          pronouns: '',
          task: 'Active / Logged In',
          savedData: {},
          className: className
        });
      }
    }
    
    // --- ACTION: SUBMIT / SAVE PROFILE & ASSIGNMENT ---
    else if (action === 'submit_profile' || action === 'submit_assignment' || action === 'submit_diagnostic') {
      const taskName = payload.taskName || 'Intake & Diagnostic Profile';
      const studentName = (payload.name || '').trim();
      const email = (payload.email || '').trim();
      const pronouns = (payload.pronouns || '').trim();
      const rawData = JSON.stringify(payload.data || {});
      const summary = payload.summary || '';
      
      if (rowIndex !== -1) {
        // Update existing row
        if (studentName) sheet.getRange(rowIndex, 2).setValue(studentName);
        if (email) sheet.getRange(rowIndex, 4).setValue(email);
        if (pronouns) sheet.getRange(rowIndex, 5).setValue(pronouns);
        sheet.getRange(rowIndex, 6).setValue(taskName);
        sheet.getRange(rowIndex, 7).setValue(rawData);
        sheet.getRange(rowIndex, 8).setValue(summary);
        sheet.getRange(rowIndex, 9).setValue(new Date());
      } else {
        // Append new row
        sheet.appendRow([
          pin,
          studentName,
          className,
          email,
          pronouns,
          taskName,
          rawData,
          summary,
          new Date()
        ]);
      }
      
      return successJSON({ 
        status: 'submitted_successfully',
        task: taskName,
        timestamp: new Date()
      });
    }
    
    else {
      throw new Error("Unknown action: " + action);
    }
      
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ 'status': 'error', 'message': error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function successJSON(data) {
  data.status = 'success';
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON);
}
