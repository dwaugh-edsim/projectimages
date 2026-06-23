/**
 * ECON 12 PROJECT PICKER BACKEND (STANDALONE VERSION)
 */

const SPREADSHEET_ID = '1fYmwcTeEdqZ7BfH0nAqErmWGuFA168_odlyS4z3vU9w';

function getSS() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

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

// --- DATA FETCHING ---
function getData() {
  var topics = fetchData('Topics');
  var session = fetchSession();
  return { topics: topics, session: session };
}

function fetchSession() {
  var ss = getSS();
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

// --- STUDENT ACTIONS ---
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

    var fullName = (data.firstName + " " + data.lastName).trim();
    if (!fullName || data.firstName.length < 2 || data.lastName.length < 2) {
      return { status: 'error', message: 'Please provide both First and Last names.' };
    }

    var ss = getSS();
    var sheet = ss.getSheetByName('Topics');
    var values = sheet.getDataRange().getValues();
    var headers = values[0];
    var idIdx = headers.indexOf('ID');
    var statusIdx = headers.indexOf('Status');
    var ownerIdx = headers.indexOf('Owner');
    var titleIdx = headers.indexOf('Title');

    // Check if student already has a topic
    for (var j = 1; j < values.length; j++) {
      if (values[j][ownerIdx] && values[j][ownerIdx].toString().toLowerCase() === fullName.toLowerCase()) {
        return { status: 'error', message: 'ACCESS DENIED: You have already claimed "' + values[j][titleIdx] + '". One topic per student.' };
      }
    }

    for (var i = 1; i < values.length; i++) {
      if (values[i][idIdx] == data.topicId) {
        if (values[i][statusIdx] === 'taken') {
          return { status: 'error', message: 'Topic already taken by ' + values[i][ownerIdx] };
        }
        // Claim it
        sheet.getRange(i + 1, statusIdx + 1).setValue('taken');
        sheet.getRange(i + 1, ownerIdx + 1).setValue(fullName);
        SpreadsheetApp.flush();
        return { status: 'success', message: 'Topic claimed successfully! Good luck, ' + data.firstName + '.' };
      }
    }
    return { status: 'error', message: 'Topic not found.' };
  } finally {
    lock.releaseLock();
  }
}

// --- ADMIN ACTIONS ---
function adminAction(data) {
  var session = fetchSession();
  if (data.pin !== session.teacher_pin) return { status: 'error', message: 'Invalid Admin PIN.' };

  var ss = getSS();
  
  if (data.action === 'set_phase') {
    var sheet = ss.getSheetByName('Session');
    updateValue(sheet, 'phase', data.value);
    return { status: 'success', message: 'Phase updated to ' + data.value };
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

// --- UTILS ---
function fetchData(sheetName) {
  var ss = getSS();
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
  var ss = getSS();
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
    {id: '1', title: 'Trade War or Takeover? Canada\'s U.S. Dilemma', curr: 'SCO 4.1', desc: 'What do you do when your biggest buyer starts calling the shots—on your jobs, your prices, your future? We\'re talking about a total loss of economic sovereignty.', ex: '25% Tariff Shock: Who actually pays that tax? * Energy Dependence: If Canada\'s just the U.S. gas station, who\'s driving?', img: 'images/topic_1.png'},
    {id: '2', title: 'AI vs. Your Career: Innovation or Job Killer?', curr: 'SCO 5.3', desc: 'AI can do your homework, your art, maybe even your future job. Cool tool—or quiet takeover? Savior or doom?', ex: 'Automation Wave: Which jobs might vanish? * The Data Center Boom: Why AI is bringing coal plants back online.', img: 'images/topic_2.png'},
    {id: '3', title: 'The Housing Crisis: Why Renting Feels Permanent', curr: 'SCO 5.1', desc: 'You were told: work hard, save up, get your place. Then you saw the rent. Now "moving out" feels like a fairy tale.', ex: 'Halifax\'s Rent Surge: What $2,800/month actually costs your dreams. * Corporate Takeover: Billionaires buying whole neighbourhoods.', img: 'images/topic_3.png'},
    {id: '4', title: 'Canada\'s Secret Trade War: Province vs. Province', curr: 'SCO 4.1', desc: 'Try selling your product, moving for work, or even buying beer across borders. Suddenly, Canada feels… fractured.', ex: 'Credential Chaos: Why your nursing license works here—but not 20 minutes away. * Border Barriers: The hidden cost of internal trade rules.', img: 'images/topic_4.png'},
    {id: '5', title: 'The Immigration Tightrope: Growth vs. Infrastructure', curr: 'SCO 4.5', desc: 'Canada hit pause on immigration to ease the housing crunch. But now the strawberries are rotting and the care homes are short-staffed.', ex: 'Labour Shortages: Why farms are struggling. * The Growth Paradox: Can an economy grow without growing its population?', img: 'images/topic_5.png'},
    {id: '6', title: 'EV Tariffs: Protecting Jobs or Punishing Buyers?', curr: 'SCO 4.1', desc: 'You see a $15K electric car online. Then you learn it\'s banned in Canada. Are we protecting workers—or just making clean tech a luxury?', ex: 'The Tariff Wall: How blocking cheap imports changes what you can afford. * Factory Bailouts: The real price of keeping old-school plants alive.', img: 'images/topic_6.png'},
    {id: '7', title: 'Dynamic Pricing: Is the Counter Watching You?', curr: 'SCO 5.3', desc: 'The price on the screen just changed. Did it go up because you looked interested? Welcome to pricing that knows you better than you know yourself.', ex: 'Surge Pricing in Retail: Why your groceries cost more at 5 PM. * Personalized Tags: When apps charge you more based on your data.', img: 'images/topic_7.png'},
    {id: '8', title: 'The Great Wealth Transfer: Born Rich or Just Lucky?', curr: 'SCO 5.1', desc: 'What if your financial future depends less on your grades—and more on whether your grandparents owned a house?', ex: 'The Down Payment Advantage: How family help is reshaping who gets to buy. * Inheritance Tax Debate: Should wealth passed down fund schools?', img: 'images/topic_8.png'},
    {id: '9', title: 'The 4-Day Workweek: Productivity Hack or Risk?', curr: 'SCO 5.3', desc: 'Imagine getting paid for 40 hours but working 32. Sounds amazing. But what if your boss says "no" because competitors won\'t?', ex: 'The Productivity Boost: Why output went up during trials. * The Global Lag: Could working less mean losing contracts to teams that never log off?', img: 'images/topic_9.jpg'},
    {id: '10', title: 'Arctic Shortcut: Shipping Route or Crisis?', curr: 'SCO 4.1', desc: 'The ice is melting. A new shortcut opens. But if Canada doesn\'t control it, will someone else profit from our changing North?', ex: 'The Northwest Passage: Could this become Canada\'s "Suez Canal"? * Sovereignty Stakes: What it really costs to defend Canada\'s claim.', img: 'images/topic_10.jpg'},
    {id: '11', title: 'Universal Basic Services: Cash or Infrastructure?', curr: 'SCO 5.1', desc: 'Instead of a monthly check, what if your internet, bus ride, and basics were just… free? Would that change your life more than cash?', ex: 'The Digital Floor: How free broadband transformed a rural town. * Fare-Free Transit: What happens when bus fares drop to zero.', img: 'images/topic_11.jpg'},
    {id: '12', title: 'Return-to-Office: Saving Cities or Fighting the Future?', curr: 'SCO 5.1', desc: 'Your boss says "come back." You say "but why?" If downtowns stay empty, who loses? Is your commute a "tax" you pay to save the downtown sandwich shop?', ex: 'The Downtown Crunch: How remote work hits small businesses. * The Flexibility Fight: Why companies are losing talent to remote-first rivals.', img: 'images/topic_12.jpg'},
    {id: '13', title: 'Fare-Free Transit: Public Good or Budget Trap?', curr: 'SCO 5.1', desc: 'What if the bus was free? But what if "free" means it comes once an hour… and breaks down? Is free worth it if it doesn\'t work?', ex: 'The Luxembourg Experiment: How tax-funded transit changed movement. * The Funding Gap: When fare revenue disappears, where does the money come from?', img: 'images/topic_13.jpg'},
    {id: '14', title: 'The Green Energy Cost: Leader or Priced Out?', curr: 'SCO 5.2', desc: 'Nova Scotia is betting on wind. The U.S. is doubling down on coal. Can we afford to lead if everyone else cuts corners?', ex: 'The Atlantic Loop: A $10B clean grid vs. your hydro bill. * Industrial Flight: Moving factories to cross-border locations with cheaper power.', img: 'images/topic_14.jpg'},
    {id: '15', title: 'Degree Inflation: Is University Still Worth It?', curr: 'SCO 5.1', desc: 'You\'re told: go to university, get ahead. Then you see a welder making $100K—and a grad with $50K debt. Did the rules change?', ex: 'The Trades Premium: Why skilled workers are out-earning degree-holders. * The ROI Reality: Student debt vs. AI-replaced entry-level roles.', img: 'images/topic_15.jpg'},
    {id: '16', title: 'Right to Repair: Good for Planet, Bad for GDP?', curr: 'SCO 5.2', desc: 'New laws blowing up "Planned Obsolescence." This is great for the planet, but it’s a nightmare for economic growth (GDP).', ex: 'The Repair Boom: How community fix-it hubs cut waste. * The GDP Trade-off: Can an economy thrive on "enough" instead of "more"?', img: 'images/topic_16.jpg'},
    {id: '17', title: 'The Attention Economy: Is Viral a Real Career?', curr: 'SCO 5.1', desc: '1% of creators make 99% of the money. We’re moving away from making things and toward making noise. Is this sustainable or a pyramid scheme?', ex: 'The Influencer Tax: CRA demanding taxes on "free" gifts. * Human vs. AI Creator: Virtual models taking brand deals from real people.', img: 'images/topic_17.jpg'},
    {id: '18', title: 'The Side Hustle Trap: Freedom or Burnout?', curr: 'SCO 5.1', desc: 'When does "extra cash" become a second full-time job—with no benefits? Is flexibility worth the financial insecurity?', ex: 'The Gig Math: After gas and fees, what\'s your actual hourly wage? * The Benefits Gap: No sick days, no pension, no EI.', img: 'images/topic_18.png'}
  ];

  var ss = getSS();
  var sheet = getOrCreateSheet('Topics', ['ID', 'Title', 'Curriculum', 'Description', 'Examples', 'Status', 'Owner', 'Image']);
  sheet.clear();
  sheet.appendRow(['ID', 'Title', 'Curriculum', 'Description', 'Examples', 'Status', 'Owner', 'Image']);
  topics.forEach(function(t) {
    sheet.appendRow([t.id, t.title, t.curr, t.desc, t.ex, 'available', '', t.img]);
  });
}
