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
    } else if (type === "authenticate") {
      return authenticateParty(data.name, data.pin);
    } else if (type === "chat") {
      var aiResponse = callAIJournalistChat(data.messages, data.partyContext);
      return handleResponse({ status: 'success', response: aiResponse });
    } else if (type === "interview") {
      var aiResponse = callAIJournalist(data.prompt);
      return handleResponse({ status: 'success', response: aiResponse });
    } else {
      saveParty(data);
    }
    
    return handleResponse({ status: 'success', message: type + ' saved successfully' });
  } catch (err) {
    return handleResponse({ status: 'error', message: err.toString() });
  }
}

function authenticateParty(name, pin) {
  var parties = fetchData("Parties");
  var party = parties.find(p => 
    p.partyname.toLowerCase().trim() === name.toLowerCase().trim() && 
    p.pin.toUpperCase().trim() === pin.toUpperCase().trim()
  );
  
  if (party) {
    return handleResponse({ status: 'success', party: party });
  } else {
    return handleResponse({ status: 'error', message: 'Invalid Party Name or PIN' });
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
 * MULTI-TURN CHAT PROXY (AI Journalist v2)
 */
function callAIJournalistChat(messages, partyContext) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('Z_AI_API_KEY');
  var endpoint = 'https://api.z.ai/api/coding/paas/v4';
  
  var systemPrompt = "You are a tough, skeptical political journalist in Nova Scotia. You are currently interviewing " + partyContext.name + " (" + partyContext.leader + "), whose slogan is '" + partyContext.slogan + "'.\n" +
                     "Your goal is to ask challenging questions about their platform. Be professional, age-appropriate (Grade 9), and call out vague promises. Respond in a concise broadcast style.";
  
  var fullMessages = [{ "role": "system", "content": systemPrompt }].concat(messages);
  
  var payload = {
    "model": "gemini-1.5-pro",
    "messages": fullMessages
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
