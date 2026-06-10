function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Econ 12 AI Review')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    
    if (action === "login") {
      const data = getStudentData(request.name, request.password);
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: data }))
        .setMimeType(ContentService.MimeType.JSON);
    } 
    else if (action === "chat") {
      const chatResponse = getAIResponse(request.chatHistory, request.name);
      return ContentService.createTextOutput(JSON.stringify({ success: true, response: chatResponse }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === "save") {
      saveStudentProgress(request.name, request.password, request.history, request.strengths, request.weaknesses, request.progress);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === "saveProgress") {
      saveQuizProgress(request.name, request.password, request.progress);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === "getProgress") {
      const progress = getQuizProgress(request.name, request.password);
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: progress }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === "saveGameScore") {
      saveGameScore(request.name, request.password, request.scoreData);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === "getGameScores") {
      const scores = getGameScores(request.name, request.password);
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: scores }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === "getLeaderboard") {
      const leaderboard = getGlobalLeaderboard();
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: leaderboard }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Unknown action" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getAIResponse(chatHistory, studentName) {
  const SCRIPT_PROP = PropertiesService.getScriptProperties();
  const API_KEY = SCRIPT_PROP.getProperty('OPENROUTER_KEY');
  const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  
  if (!API_KEY) {
    return "Error: API Key 'OPENROUTER_KEY' not found in Script Properties.";
  }

  const systemContent = `You are a sophisticated Economics Tutor for Grade 12 students. 
Your goal is to rigorously check their understanding of the provided study material.
You are currently tutoring: ${studentName}.

STUDY MATERIAL:
${getStudyMaterial()}

SCORING & DIALOG STRATEGY:
1. **Initial Inquiry**: Start with a welcoming message and ask a high-level conceptual question or present a scenario from the provided material.
2. **Conceptual Probing**: When a student answers, do NOT just say "correct" or "incorrect". 
   - If they are correct, ask a **follow-up question** that pushes them to apply the concept to a different or more complex scenario.
   - If they are partially correct, guide them towards the full answer with a "scaffolding" question.
   - If they are wrong, use a simpler example to help them discover the right concept themselves.
3. **No Verbatim**: Focus on their *logic* and *explanation*. Praise original thinking and clear examples.
4. **Performance Tracking**: Periodically summarize this student's current strengths and weaknesses in Economics. If they demonstrate mastery of a topic (e.g., Supply/Demand shifts), note it as a strength. If they struggle with a concept (e.g., Invisible Hand), note it as a weakness.
5. **Tone**: Be encouraging, professional, and slightly challenging.
6. **Formatting**: Use Markdown for clarity.`;

  const messages = [
    { role: "system", content: systemContent },
    ...chatHistory
  ];

  const payload = {
    model: "qwen/qwen3-235b-a22b-thinking-2507",
    messages: messages,
    temperature: 0.7
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + API_KEY,
      'HTTP-Referer': 'https://github.com/dwaugh-edsim/projectimages', // Optional: for OpenRouter rankings
      'X-Title': 'Econ12 AI Review'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(API_URL, options);
    const responseText = response.getContentText();
    let json;
    
    try {
      json = JSON.parse(responseText);
    } catch (e) {
      return "Error: Could not parse OpenRouter response. Status: " + response.getResponseCode() + ". Response: " + responseText.substring(0, 100);
    }
    
    if (json.choices && json.choices.length > 0) {
      return json.choices[0].message.content;
    } else {
      const errorMsg = json.error ? (json.error.message || JSON.stringify(json.error)) : "Malformed response from AI.";
      return "Error: " + errorMsg;
    }
  } catch (e) {
    return "Error: " + e.toString();
  }
}

function getStudentData(name, password) {
  const sheet = getStudentSheet();
  const data = sheet.getDataRange().getValues();
  
  // Skip header
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      if (String(data[i][1]).trim() === String(password).trim()) {
        return {
          name: data[i][0],
          strengths: data[i][2],
          weaknesses: data[i][3],
          history: data[i][4] ? JSON.parse(data[i][4]) : [],
          progress: data[i][6] ? JSON.parse(data[i][6]) : null
        };
      } else {
        throw new Error("Incorrect password for this name.");
      }
    }
  }
  
  // Create new student
  const newRow = [name, password, "", "", "[]", new Date(), "{}"];
  sheet.appendRow(newRow);
  return {
    name: name,
    strengths: "",
    weaknesses: "",
    history: [],
    progress: null
  };
}

function saveStudentProgress(name, password, history, strengths, weaknesses, progress) {
  const sheet = getStudentSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name && String(data[i][1]).trim() === String(password).trim()) {
      sheet.getRange(i + 1, 3).setValue(strengths);
      sheet.getRange(i + 1, 4).setValue(weaknesses);
      sheet.getRange(i + 1, 5).setValue(JSON.stringify(history));
      sheet.getRange(i + 1, 6).setValue(new Date());
      if (progress) {
        sheet.getRange(i + 1, 7).setValue(JSON.stringify(progress));
      }
      return { success: true };
    }
  }
}

function saveQuizProgress(name, password, progress) {
  const sheet = getStudentSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name && String(data[i][1]).trim() === String(password).trim()) {
      sheet.getRange(i + 1, 7).setValue(JSON.stringify(progress));
      sheet.getRange(i + 1, 6).setValue(new Date());
      return { success: true };
    }
  }
}

function getQuizProgress(name, password) {
  const sheet = getStudentSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name && String(data[i][1]).trim() === String(password).trim()) {
      return data[i][6] ? JSON.parse(data[i][6]) : null;
    }
  }
  return null;
}

function getStudentSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('StudentData');
  if (!sheet) {
    sheet = ss.insertSheet('StudentData');
    sheet.appendRow(['Name', 'Password', 'Strengths', 'Weaknesses', 'ChatHistory', 'LastActive', 'Progress', 'Notes', 'GameScores']);
    sheet.setFrozenRows(1);
    sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#f3f4f6");
  }
  return sheet;
}

function saveGameScore(name, password, scoreData) {
  const sheet = getStudentSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name && String(data[i][1]).trim() === String(password).trim()) {
      const existingScores = data[i][8] ? JSON.parse(data[i][8]) : [];
      existingScores.push({
        score: scoreData.score,
        correct: scoreData.correct,
        total: scoreData.total,
        pct: scoreData.pct,
        bestStreak: scoreData.bestStreak,
        mode: scoreData.mode,
        date: new Date().toISOString()
      });
      sheet.getRange(i + 1, 9).setValue(JSON.stringify(existingScores));
      sheet.getRange(i + 1, 6).setValue(new Date());
      return { success: true };
    }
  }
}

function getGameScores(name, password) {
  const sheet = getStudentSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name && String(data[i][1]).trim() === String(password).trim()) {
      return data[i][8] ? JSON.parse(data[i][8]) : [];
    }
  }
  return [];
}

function getStudyMaterial() {
  return `1. Core Economic Themes and Concepts
Market Mechanics: Supply and Demand
The interaction between supply and demand is the primary force determining prices in a market economy.
The Law of Demand: Consumers generally purchase more of a good when its price decreases and less when it increases. For a "want" to be classified as economic demand, three conditions must be met: 
- the consumer must want the product, 
- be able to afford it, 
- and be willing to pay the price.

The Law of Supply: Producers are willing to offer more of a good as its price rises, driven by the profit incentive. Higher prices represent a greater opportunity for profit, encouraging increased production.

Market Equilibrium: This is the point where the supply and demand curves intersect. At equilibrium, the quantity demanded equals the quantity supplied, resulting in a stable market price.

Determinants of Shift: Factors other than price can cause the entire supply or demand curves to shift.

Demand Determinants (Demand Shift): Changes in consumer income, tastes and preferences, population size, and the pricing of substitute or complementary goods.

Supply Determinants (Supply Shift): Changes in the cost of production (raw materials), advancements in technology, government actions (taxes or subsidies), and the level of competition.

Productivity and Adam Smith’s Principles
Adam Smith, the founder of modern economics, argued that increasing productivity is the only way to improve a nation's standard of living.
Methods of Growth: Smith identified three ways to boost living standards: increasing the workforce, borrowing resources for imports, or investing in new plants, equipment, worker education, and research.

Division of Labour: This involves breaking a complex production process into specialized tasks. Smith’s pin factory example demonstrated that 10 specialized workers could produce 48,000 pins a day, whereas one person working alone could barely produce 20.

The Invisible Hand: Smith proposed that when individuals act in their own self-interest, they unintentionally benefit society by creating jobs and balancing supply and demand.

The Stock Market: Investment and Risk
The stock market is a mechanism for companies to raise capital by selling ownership shares (equity) to the public.
Trading Environments: Stocks are traded on exchanges. The Toronto Stock Exchange (TSX) and New York Stock Exchange (NYSE) are examples.

Shareholder Returns: Investors earn money through dividends (a direct share of profits) or appreciation (selling shares at a higher price than the purchase price).

Market Sentiment: Markets are often categorized as Bull Markets (optimism, growth, rising prices) or Bear Markets (pessimism, recession threats, falling prices).

2. Alphabetical Glossary of Terms
Appreciation: When a stock increases in value over the original purchase price.
Bear Market: A market condition characterized by falling stock prices (typically a drop of 20% or more), a looming recession, and investor pessimism.
Blue Chip Stock: Stock in a large, well-established, and reliable company (e.g., Apple, Coca-Cola).
Bull Market: A market condition where the economy is growing, GDP is rising, and stock prices are increasing.
Capitalism: An economic system based on private ownership of the means of production and individual economic freedom where owners make decisions about production and pricing.
Common Stock: A type of security representing ownership in a corporation, a claim on profits, and typically providing one vote per share.
Communism: A system developed by Karl Marx where no private ownership is allowed; instead, property is shared and the government exercises control to ensure total economic equality
Complementary Goods: Products used together (e.g., printers and ink); a decrease in demand for one usually leads to a decrease for the other.
Compounding: The process of earning interest on previously earned interest or dividends; often referred to as "earning money on your money."
Cost of Production: The total expenses incurred by a business to produce a good; a primary determinant of supply.
Demand: The quantity of a good or service consumers are willing and able to buy at a specific price.
Demand Curve/Schedule: A graph (curve) or table (schedule) showing the relationship between the price of a product and the quantity demanded.
Diminishing Marginal Utility: The principle that the satisfaction gained from a product decreases with each additional unit consumed.
Diversification: The strategy of spreading investments across various companies or industries to reduce risk ("not putting all your eggs in one basket").
Dividend: A portion of a company's profit paid directly to shareholders.
Division of Labour: A production method where tasks are specialized and divided among different workers to increase productivity.
Equilibrium: The stable point where the quantity demanded by consumers exactly matches the quantity supplied by producers.
Free Rider Problem: A situation where individuals benefit from public goods without paying for them, leading to under-provision by the private sector.
Index Fund: A fund designed to track the performance of a specific basket of stocks, such as the S&P 500 or the TSX Composite.
Inflation: The general rise of prices over time, which reduces the purchasing power of money.
Invisible Hand: Adam Smith's concept that individual self-interest naturally guides the market toward efficient outcomes for society.
IPO: Initial Public Offering; the first time a private company sells shares to the general public.
Laissez-faire: A "leave it alone" approach to economics, suggesting that markets function best without government interference.
Law of Demand: The principle that consumers will buy more of a good at lower prices and less at higher prices.
Law of Supply: The principle that producers will offer more of a good at higher prices and less at lower prices.
Marginal Utility: The amount of satisfaction or enjoyment received from consuming one additional unit of a good.
Multiplier Effect: The phenomenon where an initial injection of government spending leads to a larger overall increase in national income.
Profit: The financial gain made by a company; it serves as the primary incentive for producers to supply goods.
Public Goods: Services or resources available to everyone that are difficult to restrict (e.g., clean air, national defense).
Share / Stock: A unit of ownership in a company representing a claim on assets and earnings.
Socialism: An economic ideology that calls for the major means of production to be put in the hands of the people or the government to narrow the gap between rich and poor while still allowing some private property
Subsidy: Government financial assistance provided to a business to lower production costs and increase supply.
Substitute Good: A product that can be used in place of another; if the price of one rises, demand for its substitute typically increases.
Supply: The quantity of a product or service that producers are willing and able to sell at a given price.
Volatility: The degree to which a stock price fluctuates rapidly up and down.
Yield: The return on an investment, usually expressed as a annual percentage (e.g., dividend amount divided by stock price).

3. Sample questions
The Assembly Line Challenge: Imagine a factory where one worker tries to build a computer from start to finish by themselves. 
a. Using Adam Smith’s pin factory example, explain how the division of labour could increase this factory's productivity 
b. What three specific types of investment should the factory owner make to ensure long-term growth?

The Video Game Shortage: A new game console is released, but a factory fire significantly reduces the number of units available. At the same time, the console becomes a viral sensation. 
a. Describe how these events affect the supply and demand curves.

Going Public: A successful private bakery wants to expand nationwide and needs millions of dollars. Explain the process of an Initial Public Offering (IPO) and how it helps a company raise capital. 
What are the two primary ways a new shareholder might profit from owning stock in this bakery?

The Morning Coffee Shift: Suppose the price of coffee beans triples due to a bad harvest, and at the same time, a new study says tea makes you live longer. 
a. Explain how the demand for tea will change. 
b. How does this differ from the relationship between complementary goods, like coffee and cream?

The Invisible Hand at Work: An entrepreneur opens a new pizza shop in a competitive neighborhood. 
a. Explain Adam Smith’s concept of the "invisible hand" and how the shop owner’s self-interest unintentionally benefits the community 
b. Contrast this with a situation where the government sets all the prices and rules, known as the opposite of laissez-faire.

The Small Business Dilemma: A country is debating whether to adopt socialism or communism. If the country chooses socialism, what would happen to a citizen’s right to own a small personal garden or a home, compared to if they chose communism?

4. Additional Practice Scenarios
- Scenario: A car manufacturer replaces its manual welding team with advanced robotic arms.
  - Question: Using Adam Smith’s principles of productivity, explain how this capital investment affects the "standard of living" for the nation.
  - Question: What specific type of investment is "robotic arms" considered, and what should the owner do for the displaced workers to ensure long-term growth?

- Scenario: The government offers a $5,000 rebate (subsidy) for electric cars, while the price of lithium (used in batteries) drops.
  - Question: Describe the simultaneous shifts in the supply and demand curves for electric vehicles.
  - Question: How does this affect the demand for traditional gasoline-powered cars (substitute goods)?

- Scenario: A luxury brand releases only 500 pairs of a new sneaker. Millions of people want them.
  - Question: Explain why the "market price" on resale sites often ends up 10x higher than the original retail price using the concept of equilibrium.
  - Question: Define the three conditions of "economic demand" that must be met for a teenager to be part of the demand for these sneakers.

- Scenario: Multiple small craft breweries open in a city, each trying to make the best-tasting beer at the lowest price to attract customers.
  - Question: How does the brewers' self-interest (their desire for profit) unintentionally benefit the local beer lovers?
  - Question: If the government stepped in and told every brewery exactly what ingredients to use and what to charge, which economic concept would this be the opposite of?

- Scenario: A community is deciding how to manage its farmland.
  - Question: If they choose a Communist system, what happens to the individual farmer’s ability to decide what to plant on "their" land?
  - Question: Contrarily, if they choose a Socialist system, would a farmer still be able to own a small personal greenhouse for their own family?`;
}

function getGlobalLeaderboard() {
  const sheet = getStudentSheet();
  const data = sheet.getDataRange().getValues();
  const allScores = [];
  
  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const name = data[i][0];
    const scoresJson = data[i][8];
    if (scoresJson) {
      try {
        const scores = JSON.parse(scoresJson);
        scores.forEach(s => {
          allScores.push({
            name: name,
            score: s.score,
            correct: s.correct,
            total: s.total,
            pct: s.pct,
            mode: s.mode,
            date: s.date
          });
        });
      } catch (e) {
        // Skip malformed rows
      }
    }
  }
  
  // Sort descending by score, then percentage accuracy
  allScores.sort((a, b) => b.score - a.score || b.pct - a.pct);
  
  // Return top 10 scores
  return allScores.slice(0, 10);
}
