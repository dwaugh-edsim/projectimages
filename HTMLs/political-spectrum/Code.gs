/**
 * CITIZENSHIP 9: ELECTION HQ BACKEND
 * 
 * Instructions:
 * 1. Create a new Google Spreadsheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Replace the Code.gs content with this code.
 * 4. In Apps Script, go to Project Settings > Script Properties.
 * 5. Add a property called 'Z_AI_API_KEY' with your actual key.
 * 6. Deploy as a Web App (Execute as: Me, Who has access: Anyone).
 * 7. Copy the Web App URL and paste it into the 'scriptURL' variable in your app.js file.
 */

function doGet(e) {
  return handleResponse(fetchParties());
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    // Add to spreadsheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[0];
    
    // Create headers if empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Party Name', 'Leader', 'Color', 'PIN', 'Members', 'Slogan', 'Platforms']);
    }
    
    sheet.appendRow([
      new Date(),
      data.name,
      data.leader,
      data.color,
      data.pin,
      data.members,
      data.slogan,
      data.platforms
    ]);
    
    return handleResponse({ status: 'success', message: 'Party registered successfully' });
  } catch (err) {
    return handleResponse({ status: 'error', message: err.toString() });
  }
}

function fetchParties() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return [];
  
  var parties = [];
  var headers = data[0];
  
  for (var i = 1; i < data.length; i++) {
    var party = {};
    for (var j = 0; j < headers.length; j++) {
      party[headers[j].toLowerCase().replace(' ', '')] = data[i][j];
    }
    parties.push(party);
  }
  
  return parties;
}

function handleResponse(response) {
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * PROXY FOR LLM (For Tomorrow's Task)
 */
function callAIJournalist(prompt) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('Z_AI_API_KEY');
  var endpoint = 'https://api.z.ai/api/coding/paas/v4/';
  
  var payload = {
    "model": "gemini-1.5-pro",
    "messages": [
      {
        "role": "system", 
        "content": "You are a tough, skeptical political journalist in Nova Scotia. You ask challenging questions to student political parties about their platforms. Be professional and age-appropriate."
      },
      { "role": "user", "content": prompt }
    ]
  };
  
  var options = {
    "method": "post",
    "contentType": "application/json",
    "headers": { "Authorization": "Bearer " + apiKey },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  var response = UrlFetchApp.fetch(endpoint, options);
  return response.getContentText();
}
