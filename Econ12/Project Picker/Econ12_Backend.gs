/**
 * ECON 12 PROJECT PICKER BACKEND
 * Handles topic browsing, suggestions, and first-come-first-serve selection.
 */

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('project-picker')
    .setTitle('Econ 12 Project Picker')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var type = data.type;

    if (type === 'get_data') return handleResponse(getData());
    if (type === 'suggest_topic') return handleResponse(suggestTopic(data));
    if (type === 'claim_topic') return handleResponse(claimTopic(data));
    if (type === 'admin_action') return handleResponse(adminAction(data));

    return handleResponse({ status: 'error', message: 'Unknown request type' });
  } catch (err) {
    return handleResponse({ status: 'error', message: err.toString() });
  }
}

// ─── DATA FETCHING ──────────────────────────────────────────────────────────
function getData() {
  var topics = fetchData('Topics');
  var session = fetchSession();
  return { topics: topics, session: session };
}

function fetchSession() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Session') || ss.insertSheet('Session');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Key', 'Value']);
    sheet.appendRow(['phase', 'browse']); // browse | selection
    sheet.appendRow(['teacher_pin', '9999']);
  }
  var data = sheet.getDataRange().getValues();
  var kv = {};
  for (var i = 1; i < data.length; i++) {
    kv[data[i][0]] = data[i][1];
  }
  return kv;
}

// ─── STUDENT ACTIONS ────────────────────────────────────────────────────────
function suggestTopic(data) {
  var sheet = getOrCreateSheet('Suggestions', ['ID', 'Timestamp', 'StudentName', 'Title', 'Description', 'Status']);
  var id = Utilities.getUuid();
  sheet.appendRow([id, new Date(), data.studentName, data.title, data.description, 'pending']);
  return { status: 'success', message: 'Suggestion submitted! Mr. Waugh will review it.' };
}

function claimTopic(data) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { status: 'error', message: 'Server busy. Try again.' };

  try {
    var session = fetchSession();
    if (session.phase !== 'selection') return { status: 'error', message: 'Topic selection is not yet open.' };

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Topics');
    var values = sheet.getDataRange().getValues();
    var headers = values[0];
    var idIdx = headers.indexOf('ID');
    var statusIdx = headers.indexOf('Status');
    var ownerIdx = headers.indexOf('Owner');

    for (var i = 1; i < values.length; i++) {
      if (values[i][idIdx] == data.topicId) {
        if (values[i][statusIdx] === 'taken') {
          return { status: 'error', message: 'Topic already taken by ' + values[i][ownerIdx] };
        }
        // Claim it
        sheet.getRange(i + 1, statusIdx + 1).setValue('taken');
        sheet.getRange(i + 1, ownerIdx + 1).setValue(data.studentName);
        SpreadsheetApp.flush();
        return { status: 'success', message: 'Topic claimed successfully!' };
      }
    }
    return { status: 'error', message: 'Topic not found.' };
  } finally {
    lock.releaseLock();
  }
}

// ─── ADMIN ACTIONS ──────────────────────────────────────────────────────────
function adminAction(data) {
  var session = fetchSession();
  if (data.pin !== session.teacher_pin) return { status: 'error', message: 'Invalid Admin PIN.' };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (data.action === 'set_phase') {
    var sheet = ss.getSheetByName('Session');
    updateValue(sheet, 'phase', data.value);
    return { status: 'success', message: 'Phase updated to ' + data.value };
  }

  if (data.action === 'approve_suggestion') {
    // 1. Mark suggestion as approved
    var sSheet = ss.getSheetByName('Suggestions');
    var sData = sSheet.getDataRange().getValues();
    for (var i = 1; i < sData.length; i++) {
      if (sData[i][0] === data.suggestionId) {
        sSheet.getRange(i + 1, 6).setValue('approved');
        
        // 2. Add to Topics sheet
        var tSheet = getOrCreateSheet('Topics', ['ID', 'Title', 'Curriculum', 'Description', 'Examples', 'Status', 'Owner', 'Image']);
        tSheet.appendRow([Utilities.getUuid(), sData[i][3], 'Custom', sData[i][4], 'N/A', 'available', '', '']);
        return { status: 'success', message: 'Topic approved and added to menu.' };
      }
    }
  }

  if (data.action === 'delete_topic') {
    var tSheet = ss.getSheetByName('Topics');
    var tData = tSheet.getDataRange().getValues();
    for (var j = 1; j < tData.length; j++) {
      if (tData[j][0] == data.topicId) {
        tSheet.deleteRow(j + 1);
        return { status: 'success', message: 'Topic eliminated.' };
      }
    }
  }

  return { status: 'error', message: 'Unknown admin action.' };
}

// ─── UTILS ──────────────────────────────────────────────────────────────────
function fetchData(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var items = [];
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

function updateValue(sheet, key, value) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function handleResponse(response) {
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * INITIALIZATION SCRIPT: Run this once to populate the Topics sheet.
 */
function initTopics() {
  var topics = [
    {id: '1', title: 'Economic Hostage? Trump & the 51st State', curr: 'SCO 4.1', desc: 'Imagine a world where the U.S. treats Canada like a suburb. Align or starve.', ex: 'The Tariff Wall: A 25% tax on everything. * Energy Surrender: Canada as the U.S. gas station.', img: 'topic_1_trump_51st_state'},
    {id: '2', title: 'The Ring of Fire: A Green Gamble', curr: 'SCO 4.3', desc: 'Trillions in lithium buried in the North. To get it, we tear up the wilderness.', ex: 'Ethics at a Premium: Paying 30% more for "not Chinese" nickel. * The Infrastructure War: A $2B road to nowhere.', img: 'topic_2_critical_minerals'},
    {id: '3', title: 'Silicon Labor: The Post-Work Life', curr: 'SCO 5.3', desc: 'What happens when a robot does your job better and for free? The death of the 9-to-5 is here.', ex: 'The AI Dividend: A "Robot Tax" paying everyone a basic income. * The Meaning Crisis: Life without a "job" to give you status.', img: 'topic_3_post_work_ai'},
    {id: '4', title: 'The Housing Trap: Locked Out', curr: 'SCO 5.1', desc: 'The Canadian Dream is a ghost story. Rents are so high you might never move out.', ex: 'The Rent-Pocalypse: $2,800 for a basement in Halifax. * Institutional Landlords: Billionaires buying entire subdivisions.', img: 'topic_4_housing_crisis'},
    {id: '5', title: 'The Trade Wall: Internal Sabotage', curr: 'SCO 4.1', desc: 'It’s harder to sell beer to New Brunswick than to the USA. Provincial bickering costs us billions.', ex: 'The Certification Friction: A nurse forced to retrain just to move provinces. * The Alcohol Embargo: Sting operations at provincial borders.', img: 'topic_6_trade_barriers'},
    {id: '6', title: 'The Immigration Pivot: Slamming the Brakes', curr: 'SCO 4.5', desc: 'Canada shut the door to save housing. Now, the farms are rotting and the nursing homes are empty.', ex: 'The Farm Crisis: $50M in fruit rotting in the Okanagan. * The Wage Spike: $25/hour burgers because no one is left to hire.', img: 'topic_9_immigration_labor'},
    {id: '7', title: 'The EV Tariff War: Made in Canada?', curr: 'SCO 4.1', desc: 'China built a $15k EV. We taxed it 100% to save our $60k gas-guzzlers.', ex: 'The BYD Shutdown: Banning cheap cars to save expensive ones. * The Legacy Tax: Paying an extra $30k for an EV just to keep a factory open.', img: 'topic_10_chinese_evs'},
    {id: '8', title: 'End of the Sale: Algorithmic Pricing', curr: 'SCO 5.3', desc: 'Price tags are now digital screens that change while you walk by. Welcome to the war for your wallet.', ex: 'The Uber Model for Bread: Prices spiking at 5:00 PM. * Personalized Pricing: Seeing higher prices if the app thinks you’re wealthy.', img: 'topic_11_algorithmic_pricing'},
    {id: '9', title: 'The Boomer Inheritance: Luck of the Draw', curr: 'SCO 5.1', desc: 'Trillions are moving from Boomers to their kids. If your parents own a house, you’re set. If not, you’re stuck.', ex: 'The Down Payment Gift: Buying a condo with "free" money from parents. * The Inheritance Tax Debate: Taking 20% to build schools for everyone.', img: 'topic_15_wealth_transfer'},
    {id: '10', title: 'The 4-Day Work Week: Rest or Risk?', curr: 'SCO 5.3', desc: '32 hours of work for 40 hours of pay. Happy workers or a lazy economy?', ex: 'The Microsoft Trial: A 40% jump in productivity from resting more. * The Global Gap: Losing contracts because the team was offline on Friday.', img: ''},
    {id: '11', title: 'Arctic Shortcut: Ice-Cold Gold Mine', curr: 'SCO 4.1', desc: 'The ice is gone, and the Northwest Passage is open. It’s the new Suez Canal. Welcome to the cold-war for the North.', ex: 'The Deep-Water Port: Spending $5B to build a base in the high Arctic. * The Russian Standoff: Icebreakers ignoring Canadian orders.', img: ''},
    {id: '12', title: 'UBI 2.0: Don’t Give Cash, Give WiFi', curr: 'SCO 5.1', desc: 'Instead of monthly checks, what if everything essential was free? Free internet, free buses, free housing.', ex: 'The Digital Floor: A rural town booming because of free gigabit internet. * The Transit Revolution: Zero fares leading to zero traffic.', img: ''},
    {id: '13', title: 'The RTO War: Saving the City', curr: 'SCO 5.1', desc: 'Your boss says "office," you say "home." If offices stay empty, the cities die.', ex: 'The Mandatory Tuesday: Ordering workers back to save a ghost town. * The Commuter Rebellion: Workers quitting to join remote-only firms.', img: ''},
    {id: '14', title: 'The Free Ride: No Fares, No Problems?', curr: 'SCO 5.1', desc: 'Why isn’t the bus free? Some cities did it, but now they’re broke.', ex: 'The Luxembourg Model: Free transit for everyone paid by corporations. * Service vs. Price: Buses so dirty that everyone still drives a car.', img: ''},
    {id: '15', title: 'The Green Divide: NS Wind vs. US Coal', curr: 'SCO 5.2', desc: 'Nova Scotia is building offshore wind, but the U.S. just went back to coal.', ex: 'The Atlantic Loop: A $10B power line we can’t afford. * Industrial Flight: Factories moving to Maine for cheaper, dirtier power.', img: ''}
  ];

  var sheet = getOrCreateSheet('Topics', ['ID', 'Title', 'Curriculum', 'Description', 'Examples', 'Status', 'Owner', 'Image']);
  sheet.clear();
  sheet.appendRow(['ID', 'Title', 'Curriculum', 'Description', 'Examples', 'Status', 'Owner', 'Image']);
  topics.forEach(function(t) {
    sheet.appendRow([t.id, t.title, t.curr, t.desc, t.ex, 'available', '', t.img]);
  });
}
