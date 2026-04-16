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
      if (aiResponse.status === 'success' && aiResponse.approvalDelta) {
        var approvalResult = updateApprovalRating(data.partyContext.name, aiResponse.approvalDelta);
        if (approvalResult.status === 'success') {
          aiResponse.newApproval = approvalResult.newVal;
        }
      }
      return handleResponse(aiResponse);
    } else if (type === "update_approval") {
      return updateApprovalRating(data.name, data.delta);
    } else if (type === "interview") {
      var aiResponse = callAIJournalist(data.prompt);
      return handleResponse({ status: 'success', response: aiResponse });
    } else if (type === "sync_platform") {
      return syncPlatformData(data.name, data.platforms);
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

function syncPlatformData(name, platformText) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Parties");
  if (!sheet) return handleResponse({ status: 'error', message: 'Sheet not found' });
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var nameIdx = headers.indexOf('Party Name');
  var platformIdx = headers.indexOf('Platforms');
  
  if (nameIdx === -1 || platformIdx === -1) return handleResponse({ status: 'error', message: 'Columns missing' });
  
  // Find the LAST row for this party (latest submission)
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][nameIdx].toString().toLowerCase() === name.toLowerCase()) {
      sheet.getRange(i + 1, platformIdx + 1).setValue(platformText);
      return handleResponse({ status: 'success', message: 'Sync complete' });
    }
  }
  
  // If no entry exists, we fallback to saving a new one
  return handleResponse({ status: 'error', message: 'Party profile not found' });
}

/**
 * MULTI-TURN CHAT ORCHESTRATOR (v4 - Dual Engine)
 */
function callAIJournalistChat(messages, partyContext) {
  var openRouterKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_KEY');
  
  var systemPrompt = "You are a curious student journalist for the Halifax West High newspaper. You are interviewing a new student political party: " + partyContext.name + " (led by " + partyContext.leader + "), slogan: '" + partyContext.slogan + "'.\n" +
                     "Your Goal: Be encouraging and curious! Ask questions that let students explain THEIR ideas and values. Don't attack them with high-level budget math or complex economic theory—they are Grade 9s! If their math is blurry, focus on the 'why' and the 'who it helps.'\n\n" +
                     "Style Guide:\n" +
                     "- Use friendly, conversational language (avoid 'regressive taxation', 'weighted value models', etc).\n" +
                     "- If they say something confusing, ask for a simple example: 'Could you tell us how that would look for a regular student?'\n" +
                     "- Reward passion and unique ideas. Only call out things that are obvious jokes (like 'Free Pizza for breakfast every day').\n\n";

  var isFinalTurn = messages.length >= 7;
  
  if (isFinalTurn) {
    systemPrompt += "CRITICAL INSTRUCTION: This is the final turn of the interview! You MUST wrap up the interview, thank them for their time, and give a brief concluding encouraging remark on their platform in the 'response' field. You must set the 'isComplete' field in the JSON to true.\n\n";
  }

  systemPrompt += "IMPORTANT: You MUST respond in valid JSON format only:\n" +
                  "{\n" +
                  "  \"response\": \"Your friendly, curious student reporter question or concluding remarks here.\",\n" +
                  "  \"approvalDelta\": (a number -10 to +10. Positive if they care about the community/fairness. Negative only for joke/disrespectful answers.),\n" +
                  "  \"isComplete\": " + (isFinalTurn ? "true" : "false (or simply omit this field)") + "\n" +
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
    "model": "xiaomi/mimo-v2-flash",
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
