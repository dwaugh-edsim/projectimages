function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const studentId = e.parameter.studentId;
  const missionTitle = e.parameter.missionTitle;
  const action = e.parameter.action;
  
  // List saved patterns for M14
  if (action === 'listPatterns' && studentId) {
    const patterns = [];
    for (let i = 1; i < data.length; i++) {
      const row = {};
      headers.forEach((h, idx) => { row[h] = data[i][idx]; });
      if (row.studentId === studentId && row.action === 'savePattern') {
        patterns.push({
          name: row.patternName || 'Untitled',
          gridData: JSON.parse(row.gridData || '[]'),
          gridSize: parseInt(row.gridSize) || 8,
          date: row.timestamp
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ patterns: patterns })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Get mission data for a student
  if (studentId && missionTitle) {
    for (let i = 1; i < data.length; i++) {
      const row = {};
      headers.forEach((h, idx) => { row[h] = data[i][idx]; });
      if (row.studentId === studentId && row.missionTitle === missionTitle) {
        return ContentService.createTextOutput(JSON.stringify({
          content: row.reflection || '',
          gridData: row.gridData || '',
          drawingData: row.drawingData || '',
          placedSteps: row.placedSteps || '',
          gridSize: row.gridSize || ''
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({})).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'No studentId or missionTitle provided' })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  
  const headers = ['studentId', 'studentName', 'missionTitle', 'action', 'patternName', 'reflection', 'gridData', 'drawingData', 'placedSteps', 'gridSize', 'completedCount', 'completedList', 'timestamp'];
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  
  const rowData = headers.map(h => data[h] || '');
  
  if (data.action === 'savePattern') {
    sheet.appendRow(rowData);
    return ContentService.createTextOutput(JSON.stringify({ status: 'saved' })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const existingData = sheet.getDataRange().getValues();
  let found = false;
  
  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i][0] === data.studentId && existingData[i][2] === data.missionTitle) {
      const row = sheet.getRange(i + 1, 1, 1, headers.length);
      row.setValues([rowData]);
      found = true;
      break;
    }
  }
  
  if (!found) {
    sheet.appendRow(rowData);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'synced' })).setMimeType(ContentService.MimeType.JSON);
}
