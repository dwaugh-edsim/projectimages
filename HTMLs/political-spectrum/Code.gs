/**
 * CITIZENSHIP 9: ELECTION HQ BACKEND (Multi-Sheet Version v2)
 */

function doGet(e) {
  return handleResponse({
    parties: fetchData("Parties"),
    profiles: fetchData("Profiles")
  });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var type = data.type || "party"; 
    
    if (type === "profile") {
      saveProfile(data);
    } else {
      saveParty(data);
    }
    
    return handleResponse({ status: 'success', message: type + ' saved successfully' });
  } catch (err) {
    return handleResponse({ status: 'error', message: err.toString() });
  }
}

function saveProfile(data) {
  // We use Name and PIN for security/updates
  var sheet = getOrCreateSheet("Profiles", ['Timestamp', 'Name', 'PIN', 'Orientation', 'Priority Issue']);
  sheet.appendRow([
    new Date(),
    data.name,
    data.pin,
    data.orientation,
    data.priorityIssue
  ]);
}

function saveParty(data) {
  var sheet = getOrCreateSheet("Parties", ['Timestamp', 'Party Name', 'Leader', 'Color', 'PIN', 'Members', 'Slogan', 'Platforms']);
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
}

function fetchData(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var items = [];
  var headers = data[0];
  
  for (var i = 1; i < data.length; i++) {
    var item = {};
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j].toLowerCase().replace(/\s+/g, '');
      item[key] = data[i][j];
    }
    items.push(item);
  }
  return items;
}

function getOrCreateSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function handleResponse(response) {
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}


/**
 * PROXY FOR LLM (AI Journalist Feature)
 */
function callAIJournalist(prompt) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('Z_AI_API_KEY');
  var endpoint = 'https://api.z.ai/api/coding/paas/v4';
  
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
