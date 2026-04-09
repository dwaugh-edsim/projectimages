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
  var sheet = getOrCreateSheet("Parties", ['Timestamp', 'Party Name', 'Leader', 'Color', 'PIN', 'Members', 'Slogan', 'Platforms', 'Approval']);
  sheet.appendRow([
    new Date(),
    data.name,
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
 * MULTI-TURN CHAT PROXY (AI Journalist v3 - Structured)
 */
function callAIJournalistChat(messages, partyContext) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('Z_AI_API_KEY');
  var endpoint = 'https://api.z.ai/api/coding/paas/v4';
  
  var systemPrompt = "You are a tough, skeptical political journalist in Nova Scotia. You are currently interviewing " + partyContext.name + " (" + partyContext.leader + "), whose slogan is '" + partyContext.slogan + "'.\n" +
                     "Your goal is to ask challenging questions about their platform. Be professional, age-appropriate (Grade 9), and call out vague promises or silly 'joke' answers.\n\n" +
                     "IMPORTANT: You MUST respond in valid JSON format only, with no other text, matching this structure:\n" +
                     "{\n" +
                     "  \"response\": \"Your witty, skeptical journalist question or comment here.\",\n" +
                     "  \"approvalDelta\": (a number between -15 and +10 based on the student's performance. Silly/vague answers = negative. Strong, realistic answers = positive.)\n" +
                     "}";
  
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
  
  try {
    var response = UrlFetchApp.fetch(endpoint, options);
    var resultText = response.getContentText();
    var resultObj = JSON.parse(resultText);
    
    // In case AI returns the wrapper, unwrap it
    if (resultObj.choices && resultObj.choices[0].message) {
      return { status: 'success', ...JSON.parse(resultObj.choices[0].message.content) };
    }
    
    return { status: 'success', ...resultObj };
  } catch (err) {
    return { status: 'error', message: 'Failed to parse AI score: ' + err.toString(), response: "The journalist is speechless. (Contact your teacher: AI JSON Error)" };
  }
}
