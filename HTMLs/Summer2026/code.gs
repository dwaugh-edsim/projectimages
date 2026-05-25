/**
 * Google Apps Script Webhook Endpoint for Europe Trip 2026 Dashboard
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Click Extensions > Apps Script.
 * 3. Delete any default code and paste this entire script.
 * 4. Click Save (disk icon).
 * 5. Click Deploy > New deployment.
 * 6. Click the gear icon next to "Select type" and select "Web app".
 * 7. Set:
 *    - Description: "Trip Planner Webhook"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (crucial so the HTML page can hit it)
 * 8. Click Deploy, authorize permissions, and copy the "Web app URL".
 * 9. Paste that URL into the input field in your HTML trip dashboard.
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Auto-create headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp",
        "Status",
        "Booking Type",
        "City / Description",
        "Start Day (#)",
        "Nights",
        "Cost",
        "Currency",
        "Notes",
        "Booking Link",
        "Baggage Allowance"
      ]);
      
      // Apply premium formatting to headers to match dashboard style
      var headerRange = sheet.getRange(1, 1, 1, 11);
      headerRange.setBackground("#121524") // Card dark background
                 .setFontColor("#f3f5fa") // Accent white text
                 .setFontWeight("bold")
                 .setFontFamily("Arial");
      sheet.setFrozenRows(1);
    }
    
    // Append the reservation idea or committed booking data
    sheet.appendRow([
      new Date(),
      data.source || "Idea/Draft",
      data.type || "",
      data.city || "",
      data.startDay !== undefined ? data.startDay : "",
      data.nights !== undefined ? data.nights : "",
      data.cost || 0,
      data.currency || "CAD",
      data.notes || "",
      data.link || "",
      data.baggage || ""
    ]);
    
    // Auto-resize columns for readability
    sheet.autoResizeColumns(1, 11);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Idea added to Google Sheets!" }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

// Simple test endpoint for validation
function doGet(e) {
  return ContentService.createTextOutput("Webhook is active. Send a POST request from the Europe Trip Dashboard to write data.")
                       .setMimeType(ContentService.MimeType.TEXT);
}
