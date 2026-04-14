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
      return handleResponse(aiResponse); // Now returns { status, response, approvalDelta }
    } else if (type === "update_approval") {
      return updateApprovalRating(data.name, data.delta);
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
  var userQuery = name.toLowerCase().trim();
  var pinQuery = pin.toUpperCase().trim();
  var parties = fetchData("Parties");
  
  // CRITICAL: Use filter + last match, NOT .find() (which returns the oldest row).
  // saveParty appends new rows, so the latest submission is always at the end.
  var matches = parties.filter(function(p) {
    var matchName = (p.partyname || "").toLowerCase().includes(userQuery);
    var matchLeader = (p.leader || "").toLowerCase().includes(userQuery);
    var matchMembers = (p.members || "").toLowerCase().includes(userQuery);
    var matchPin = (p.pin || "").toUpperCase().trim() === pinQuery;
    
    return (matchName || matchLeader || matchMembers) && matchPin;
  });
  
  if (matches.length > 0) {
    var party = matches[matches.length - 1]; // Always return the MOST RECENT row
    return handleResponse({ status: 'success', party: party });
  } else {
    return handleResponse({ status: 'error', message: 'Invalid Username or PIN' });
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
  var sheet = getOrCreateSheet("Parties", ['Timestamp', 'Party Name', 'Leader', 'Color', 'PIN', 'Members', 'Slogan', 'Platforms', 'Approval']);
  sheet.appendRow([
    new Date(),
    data.partyname || data.name,
    data.leader,
    data.color,
    data.pin,
    data.members,
    data.slogan,
    data.platforms,
    50 // Default approval rating
  ]);
}

function updateApprovalRating(name, delta) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Parties");
  if (!sheet) return handleResponse({ status: 'error', message: 'Parties sheet not found' });
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var nameIdx = headers.indexOf('Party Name');
  var approvalIdx = headers.indexOf('Approval');
  
  if (nameIdx === -1 || approvalIdx === -1) return handleResponse({ status: 'error', message: 'Columns not found' });
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][nameIdx].toString().toLowerCase() === name.toLowerCase()) {
      var currentVal = parseFloat(data[i][approvalIdx]) || 50;
      var newVal = Math.max(0, Math.min(100, currentVal + delta));
      sheet.getRange(i + 1, approvalIdx + 1).setValue(newVal);
      return handleResponse({ status: 'success', newVal: newVal });
    }
  }
  return handleResponse({ status: 'error', message: 'Party not found' });
}

/**
 * MULTI-TURN CHAT ORCHESTRATOR (v4 - Dual Engine)
 */
function callAIJournalistChat(messages, partyContext) {
  var openRouterKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_KEY');
  
  var systemPrompt = "You are a tough, skeptical political journalist in Nova Scotia. You are currently interviewing " + partyContext.name + " (" + partyContext.leader + "), whose slogan is '" + partyContext.slogan + "'.\n" +
                     "Your goal is to ask challenging questions about their platform. Be professional, age-appropriate (Grade 9), and call out vague promises or silly 'joke' answers.\n\n" +
                     "IMPORTANT: You MUST respond in valid JSON format only, with no other text, matching this structure:\n" +
                     "{\n" +
                     "  \"response\": \"Your witty, skeptical journalist question or comment here.\",\n" +
                     "  \"approvalDelta\": (a number between -15 and +10 based on the performance. Silly/vague = negative. Strong/realistic = positive.)\n" +
                     "}";

  var result = null;

  // 1. TRY OPENROUTER (Primary)
  if (openRouterKey) {
    try {
      result = callOpenRouter(messages, systemPrompt, openRouterKey);
    } catch (err) {
      console.error("OpenRouter Primary Failed, falling back to Zai:", err);
    }
  }

  // 2. FALLBACK TO ZAI (Secondary)
  if (!result || result.status !== 'success') {
    try {
      result = callZai(messages, systemPrompt);
    } catch (err) {
      return { status: 'error', message: 'All AI engines failed: ' + err.toString(), response: "The newsroom is experiencing technical difficulties. (Zai Fallback Error)" };
    }
  }

  return result;
}

function callOpenRouter(messages, systemPrompt, apiKey) {
  var endpoint = 'https://openrouter.ai/api/v1/chat/completions';
  var fullMessages = [{ "role": "system", "content": systemPrompt }].concat(messages);
  
  var payload = {
    "model": "minimax/minimax-m2.5",
    "messages": fullMessages,
    "response_format": { "type": "json_object" }
  };
  
  var options = {
    "method": "post",
    "contentType": "application/json",
    "headers": { 
      "Authorization": "Bearer " + apiKey,
      "HTTP-Referer": "https://halifax-west-sim.edu", // Required by some OpenRouter models
      "X-Title": "Halifax West Election Sim"
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  var response = UrlFetchApp.fetch(endpoint, options);
  return parseAIResponse(response.getContentText());
}

function callZai(messages, systemPrompt) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('Z_AI_API_KEY');
  var endpoint = 'https://api.z.ai/api/coding/paas/v4';
  var fullMessages = [{ "role": "system", "content": systemPrompt }].concat(messages);
  
  var payload = {
    "model": "gemini-1.5-pro",
    "messages": fullMessages,
    "response_format": { "type": "json_object" }
  };
  
  var options = {
    "method": "post",
    "contentType": "application/json",
    "headers": { "Authorization": "Bearer " + apiKey },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  var response = UrlFetchApp.fetch(endpoint, options);
  return parseAIResponse(response.getContentText());
}

function parseAIResponse(responseText) {
  try {
    var raw = JSON.parse(responseText);
    var content = "";
    
    // Handle different API response structures (OpenRouter vs Zai)
    if (raw.choices && raw.choices[0].message) {
      content = raw.choices[0].message.content;
    } else if (raw.content) {
      content = raw.content;
    } else {
      content = responseText;
    }

    // EXTRA CLEANING: Remove markdown triple backticks if present
    var cleanJSON = content.replace(/```json/g, '').replace(/```/g, '').trim();
    var finalObj = JSON.parse(cleanJSON);
    
    return { status: 'success', ...finalObj };
  } catch (err) {
    return { status: 'error', message: 'JSON Parse Error: ' + err.toString() };
  }
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
