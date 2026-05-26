// Google Apps Script backend for Country Profile Project sign-ups
// Deploy as Web App: Execute as "Me", Who has access "Anyone"

const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';
const SHEET_NAME = 'Claims';

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getClaims') {
    return getClaims();
  }
  
  if (action === 'getSignUpStatus') {
    return getSignUpStatus();
  }
  
  return jsonResponse({ error: 'Invalid action' });
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  
  if (action === 'claimTopic') {
    return claimTopic(data.topicId, data.topicName, data.students);
  }
  
  if (action === 'removeClaim') {
    return removeClaim(data.topicId);
  }
  
  if (action === 'clearAllClaims') {
    return clearAllClaims();
  }
  
  if (action === 'setSignUpStatus') {
    return setSignUpStatus(data.open);
  }
  
  return jsonResponse({ error: 'Invalid action' });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Timestamp', 'Topic ID', 'Country', 'Issue', 'Students', 'Status']);
  }
  return sheet;
}

function getStatusSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('Settings');
  if (!sheet) {
    sheet = ss.insertSheet('Settings');
    sheet.appendRow(['Key', 'Value']);
    sheet.appendRow(['signUpOpen', 'false']);
  }
  return sheet;
}

function getClaims() {
  try {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    const claims = {};
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const topicId = row[1];
      const students = row[4];
      const status = row[5];
      
      if (status === 'active' && topicId) {
        claims[topicId] = students;
      }
    }
    
    return jsonResponse({ claims: claims });
  } catch (e) {
    return jsonResponse({ error: e.toString() });
  }
}

function claimTopic(topicId, topicName, students) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(10000);
    
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == topicId && data[i][5] === 'active') {
        return jsonResponse({ success: false, error: 'Topic already claimed' });
      }
    }
    
    sheet.appendRow([new Date(), topicId, topicName.split(' - ')[0], topicName.split(' - ')[1] || '', students, 'active']);
    
    return jsonResponse({ success: true });
  } catch (e) {
    if (e.toString().indexOf('waitLock') !== -1) {
      return jsonResponse({ success: false, error: 'Server busy, please try again' });
    }
    return jsonResponse({ error: e.toString() });
  } finally {
    lock.releaseLock();
  }
}

function removeClaim(topicId) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(10000);
    
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == topicId && data[i][5] === 'active') {
        sheet.getRange(i + 1, 6).setValue('removed');
        return jsonResponse({ success: true });
      }
    }
    
    return jsonResponse({ success: false, error: 'Claim not found' });
  } catch (e) {
    return jsonResponse({ error: e.toString() });
  } finally {
    lock.releaseLock();
  }
}

function clearAllClaims() {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(10000);
    
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][5] === 'active') {
        sheet.getRange(i + 1, 6).setValue('cleared');
      }
    }
    
    return jsonResponse({ success: true });
  } catch (e) {
    return jsonResponse({ error: e.toString() });
  } finally {
    lock.releaseLock();
  }
}

function getSignUpStatus() {
  try {
    const sheet = getStatusSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'signUpOpen') {
        return jsonResponse({ open: data[i][1] === 'true' });
      }
    }
    
    return jsonResponse({ open: false });
  } catch (e) {
    return jsonResponse({ error: e.toString() });
  }
}

function setSignUpStatus(open) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(10000);
    
    const sheet = getStatusSheet();
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'signUpOpen') {
        sheet.getRange(i + 1, 2).setValue(open ? 'true' : 'false');
        return jsonResponse({ success: true });
      }
    }
    
    sheet.appendRow(['signUpOpen', open ? 'true' : 'false']);
    return jsonResponse({ success: true });
  } catch (e) {
    return jsonResponse({ error: e.toString() });
  } finally {
    lock.releaseLock();
  }
}
