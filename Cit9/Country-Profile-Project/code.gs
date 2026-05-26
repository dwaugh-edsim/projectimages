// Google Apps Script backend for Country Profile Project sign-ups
// Deploy as Web App with "Anyone" access

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
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
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
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
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
    
    return ContentService.createTextOutput(JSON.stringify({ claims: claims }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ error: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function claimTopic(topicId, topicName, students) {
  // LockService prevents race conditions when 25+ students claim simultaneously
  const lock = LockService.getScriptLock();
  
  try {
    // Wait up to 10 seconds for the lock
    lock.waitLock(10000);
    
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    
    // Check if already claimed (inside the lock - atomic)
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == topicId && data[i][5] === 'active') {
        return ContentService.createTextOutput(JSON.stringify({ 
          success: false, 
          error: 'Topic already claimed' 
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Add new claim - only one request can reach here at a time
    sheet.appendRow([new Date(), topicId, topicName.split(' - ')[0], topicName.split(' - ')[1] || '', students, 'active']);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    // If we couldn't get the lock, someone else is claiming
    if (e.toString().indexOf('waitLock') !== -1) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        error: 'Server busy, please try again' 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ error: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    // Always release the lock
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
        return ContentService.createTextOutput(JSON.stringify({ success: true }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Claim not found' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ error: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
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
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ error: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
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
        return ContentService.createTextOutput(JSON.stringify({ open: data[i][1] === 'true' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ open: false }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ error: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
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
        return ContentService.createTextOutput(JSON.stringify({ success: true }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    sheet.appendRow(['signUpOpen', open ? 'true' : 'false']);
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ error: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
