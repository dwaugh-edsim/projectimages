/**
 * Economics 12 - Operation Hormuz 
 * Google Apps Script Webhook
 * 
 * 1. Create a new Google Sheet
 * 2. Extensions -> Apps Script
 * 3. Paste this code
 * 4. Deploy -> New Deployment -> Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the Web App URL and paste it into app.js
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
      'Timestamp', 
      'Advisor Name(s)', 
      'Predictions (1.2.4)', 
      'Policy Advice (1.2.4)', 
      'Graph Image Link',
      'Assessed Outcomes (1.1.8, 1.2.4, 2.2.5, 2.3.2)'
    ]);
    sheet.getRange("A1:F1").setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(3, 300); // Make text cols wider
    sheet.setColumnWidth(4, 300);
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    
    const name = payload.name || 'Unknown';
    const predictions = payload.predictions || '';
    const policy = payload.policy || '';
    const base64Image = payload.imageData; // The canvas data URL
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    
    // Save image to Drive to get a URL (Optional but recommended for clean sheets)
    let imageUrl = "No Image Provided";
    if (base64Image) {
      // data:image/png;base64,...
      const base64Data = base64Image.split(',')[1];
      const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), "image/png", `${name}_Graph.png`);
      
      // Save to the same folder as the spreadsheet
      const fileId = SpreadsheetApp.getActive().getId();
      const folder = DriveApp.getFileById(fileId).getParents().next();
      
      // Look for or create an 'Images' subfolder
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
    
    // Append to sheet
    sheet.appendRow([
      new Date(),
      name,
      predictions,
      policy,
      imageUrl,
      '' // Blank for grading
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ 'status': 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ 'status': 'error', 'message': error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle preflight CORS requests
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON);
}
