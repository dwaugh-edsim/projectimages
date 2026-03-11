/**
 * Economics 12 - Operation Hormuz (V2)
 * Google Apps Script Webhook
 * 
 * Supports PIN-based login, state persistence, and final submission.
 */

const SHEET_NAME = 'Submissions';

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  // Set headers if empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'PIN',                // A
      'Advisor Name(s)',    // B
      'Current Stage',      // C
      'Predictions',        // D
      'Policy Advice',      // E
      'Graph Image Link',   // F
      'Last Updated'        // G
    ]);
    sheet.getRange("A1:G1").setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(4, 300); // Predictions
    sheet.setColumnWidth(5, 300); // Policy Action
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action; 
    const pin = String(payload.pin).trim();
    
    if (!pin) throw new Error("PIN is required.");

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
        setup();
        sheet = ss.getSheetByName(SHEET_NAME);
    }
    
    // Find the row for this PIN
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) { // Skip header
      if (String(data[i][0]).trim() === pin) {
        rowIndex = i + 1; // 1-indexed for Sheets
        break;
      }
    }

    // --- ACTION: LOGIN ---
    if (action === 'login') {
      const name = payload.name || 'Unknown';
      
      if (rowIndex !== -1) {
        // PIN exists. Return their saved state.
        const savedName = data[rowIndex-1][1];
        const savedStage = data[rowIndex-1][2];
        return successJSON({
          isNew: false,
          name: savedName,
          stage: savedStage || 'practice'
        });
      } else {
        // New PIN. Create row.
        sheet.appendRow([
          pin,
          name,
          'practice', // Initial stage
          '', '', '', // Empty submission fields
          new Date()
        ]);
        return successJSON({
          isNew: true,
          name: name,
          stage: 'practice'
        });
      }
    }
    
    // --- ACTION: SAVE STATE ---
    // Update the 'Current Stage' column (e.g., they finished practice)
    else if (action === 'save_state') {
      if (rowIndex === -1) throw new Error("PIN not found.");
      const newStage = payload.stage;
      
      sheet.getRange(rowIndex, 3).setValue(newStage); // Col C
      sheet.getRange(rowIndex, 7).setValue(new Date()); // Col G
      
      return successJSON({ status: 'saved' });
    }
    
    // --- ACTION: FINAL SUBMIT ---
    // Upload image and save text predictions
    else if (action === 'submit_final') {
      if (rowIndex === -1) throw new Error("PIN not found.");
      
      const predictions = payload.predictions || '';
      const policy = payload.policy || '';
      const base64Image = payload.imageData; 
      
      let imageUrl = "No Image Provided";
      if (base64Image) {
        const base64Data = base64Image.split(',')[1];
        const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), "image/png", `${pin}_Graph.png`);
        
        const fileId = SpreadsheetApp.getActive().getId();
        const folder = DriveApp.getFileById(fileId).getParents().next();
        
        // Find or create 'Hormuz_Graphs' folder
        let imageFolder;
        const folders = folder.getFoldersByName("Hormuz_Graphs");
        if (folders.hasNext()) {
          imageFolder = folders.next();
        } else {
          imageFolder = folder.createFolder("Hormuz_Graphs");
        }
        
        const file = imageFolder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        imageUrl = file.getUrl();
      }
      
      // Update the row
      sheet.getRange(rowIndex, 3).setValue('completed'); // Col C
      sheet.getRange(rowIndex, 4).setValue(predictions); // Col D
      sheet.getRange(rowIndex, 5).setValue(policy);      // Col E
      sheet.getRange(rowIndex, 6).setValue(imageUrl);    // Col F
      sheet.getRange(rowIndex, 7).setValue(new Date());  // Col G
      
      return successJSON({ status: 'submitted_successfully' });
    }
    
    else {
      throw new Error("Unknown action.");
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

// Handle preflight CORS requests
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON);
}
