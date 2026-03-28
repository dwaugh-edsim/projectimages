const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycby_pTyiIRIzIG2I66N3r3h8wPvXu6yrC4iLwL7lzDnLjuCAFaZBH_H-6Yfaw4Ytvk_tWg/exec";
const Z_AI_API_KEY = process.env.Z_AI_API_KEY; // From GitHub Secrets
const Z_AI_API_URL = "https://api.z.ai/api/coding/paas/v4";
const OUTPUT_DIR = path.join(__dirname, '..');

// Correct match text for each term (from marking key)
const CORRECT_MATCHES = {
    "Barter": "Trading a power bank directly for a box of tissues without using any money",
    "Double Coincidence of Wants": "Failing to trade because you have cards but the other person needs tissues, and neither of you wants what the other has",
    "Medium of Exchange": "Using gold coins to buy an apple instead of having to find a specific trade partner who wants your spare staples",
    "Scarcity": "The fundamental problem that there wasn't enough bread printed for everyone in the room to finish their mission cards",
    "Shortage": "The situation after the 'drought' where the sudden removal of wheat meant many students couldn't find any, despite having the money",
    "Inflation": "A general rise in prices across the room because Prof Smith injected more cash into the system",
    "Deflation": "Prices for bookmarks dropping because Prof Smith only had 29 gold coins and couldn't afford to pay the original price",
    "Liquidity": "Prof Smith randomly dropping extra dollar bills onto students' desks to increase the amount of cash available for trading",
    "Monopoly": "The 'Dead' students in the graveyard being the only ones left with wheat and charging whatever they wanted because there was no competition",
    "Specialization": "One student focusing only on cutting paper while another focused only on taping to increase their total output of bookmarks",
    "Division of Labor": "Breaking the bookmark-making process into a 'factory line' where each person performed one specific task",
    "Incentives": "Students forming 'corporations' because they realized they could earn more gold coins by working together than as individuals",
    "Rational Self-Interest": "Students focusing solely on completing their own mission cards to 'survive,' regardless of how it impacted the rest of the market",
    "The Invisible Hand": "Prices for bread and wheat adjusting naturally based on student demand after the drought, without Prof Smith setting a price",
    "Competition": "The 'Artisan' student producing a single high-quality bookmark while the 'Corporation' next to him produced ten faster, forcing everyone to consider price vs. quality"
};

const TERMS = Object.keys(CORRECT_MATCHES);

// Marking key definitions (key concepts for each term)
const DEFINITION_KEY = {
    "Barter": "Direct exchange of goods/services without using money; trading one thing for another",
    "Double Coincidence of Wants": "Both parties in a trade must have what the other wants; mutual desire for each other's goods",
    "Medium of Exchange": "Something widely accepted in trade (like money/coins); eliminates need for direct barter",
    "Scarcity": "The fundamental economic problem: limited resources vs. unlimited wants; not enough for everyone",
    "Shortage": "Temporary unavailability of a product at current prices; can't find something even with money",
    "Inflation": "General rise in prices across the market; often caused by more money in circulation",
    "Deflation": "General fall in prices; decrease in price level due to less money or demand",
    "Liquidity": "Availability of cash/money in the market; how easy it is to convert assets to spendable money",
    "Monopoly": "Single seller controls the market; no competition allows setting any price",
    "Specialization": "Focusing on one specific task or product; becoming expert at one thing",
    "Division of Labor": "Breaking production into separate tasks; each person does one specific job",
    "Incentives": "Motivations or rewards that encourage certain behaviors; reasons to act",
    "Rational Self-Interest": "Acting to maximize one's own benefit; focusing on personal gain",
    "The Invisible Hand": "Market forces that guide prices naturally without central control; spontaneous order",
    "Competition": "Rivalry between sellers; multiple producers create choices and pressure on prices/quality"
};

// Fetch data from webhook (handles Google Apps Script redirects)
function fetchData() {
    return new Promise((resolve, reject) => {
        fetchWithRedirects(WEBHOOK_URL, 0)
            .then(resolve)
            .catch(reject);
    });
}

function fetchWithRedirects(url, redirectCount) {
    return new Promise((resolve, reject) => {
        if (redirectCount > 5) {
            reject(new Error('Too many redirects'));
            return;
        }

        https.get(url, (res) => {
            if (res.statusCode === 302 || res.statusCode === 301) {
                // Follow redirect
                fetchWithRedirects(res.headers.location, redirectCount + 1).then(resolve).catch(reject);
                return;
            }

            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                // Debug: log first 200 chars of response
                console.log('Webhook response (first 200 chars):', data.substring(0, 200));
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('Failed to parse JSON: ' + e.message + '. Response starts with: ' + data.substring(0, 50)));
                }
            });
        }).on('error', reject);
    });
}

// Parse student submissions from webhook data
function parseSubmissions(data) {
    const students = {};

    if (Array.isArray(data)) {
        data.forEach(submission => {
            const name = submission.studentName || submission.name;
            if (!name) return;

            if (!students[name]) {
                students[name] = {
                    name: name,
                    pin: submission.pin || submission.PIN || '',
                    timestamp: submission.timestamp || submission.submittedAt || '',
                    responses: {}
                };
            }

            TERMS.forEach(term => {
                const defKey = `${term}_definition`;
                const matchKey = `${term}_match`;

                students[name].responses[term] = {
                    definition: submission[defKey] || submission[`definition_${term.toLowerCase().replace(/\s+/g, '_')}`] || '',
                    match: submission[matchKey] || submission[`match_${term.toLowerCase().replace(/\s+/g, '_')}`] || ''
                };
            });
        });
    }

    return students;
}

// Grade a student's submission
function gradeSubmission(student) {
    const results = [];
    let correctCount = 0;
    const todo = [];

    TERMS.forEach(term => {
        const response = student.responses[term] || {};
        const studentMatch = (response.match || '').trim();
        const studentDef = (response.definition || '').trim();
        const correctMatch = CORRECT_MATCHES[term];

        const isCorrect = studentMatch && studentMatch.toLowerCase() === correctMatch.toLowerCase();
        if (isCorrect) correctCount++;

        results.push({
            term: term,
            correct: isCorrect,
            studentMatch: studentMatch || '(No match provided)',
            studentDef: studentDef
        });

        if (!studentMatch) {
            todo.push(`Complete scenario match for ${term}`);
        }
        if (!studentDef) {
            todo.push(`Provide definition for ${term}`);
        }
    });

    return {
        results,
        matches: correctCount,
        totalMatches: TERMS.length,
        status: correctCount === TERMS.length && todo.length === 0 ? 'complete' : 'incomplete',
        todo
    };
}

// Call Z.ai API to generate AI assessment
async function generateAIAssessment(student, graded) {
    if (!Z_AI_API_KEY) {
        console.log('No Z_AI_API_KEY found, using template comments');
        return generateTemplateAssessment(student, graded);
    }

    const prompt = `You are grading a student's economics assignment about the Adam Smith Market simulation.

STUDENT NAME: ${student.name}
SCORE: ${graded.matches}/${TERMS.length} correct scenario matches

STUDENT'S RESPONSES:
${TERMS.map(term => {
        const r = graded.results.find(x => x.term === term);
        return `
${term}:
  Definition: "${r.studentDef || '(none)'}"
  Match: "${r.studentMatch}"
  Correct: ${r.correct ? 'Yes' : 'No'}
`;
    }).join('')}

TASK: Write a brief, encouraging assessment comment (2-3 sentences) that:
1. Acknowledges what they did well
2. Notes specific areas for improvement if any are incorrect or missing
3. Uses a supportive, teacher-friendly tone

Do NOT mention specific term names. Keep it conversational and helpful.

Assessment comment:`;

    try {
        const response = await callZAI(prompt);
        return response.trim();
    } catch (error) {
        console.error('AI assessment failed:', error.message);
        return generateTemplateAssessment(student, graded);
    }
}

// Call Z.ai API
function callZAI(prompt) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            model: "glm-4.5",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful, encouraging economics teacher grading student assignments. Keep feedback brief, specific, and supportive."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 200,
            temperature: 0.7
        });

        const options = {
            hostname: "api.z.ai",
            port: 443,
            path: "/api/coding/paas/v4/chat/completions",
            method: "POST",
            headers: {
                "Authorization": `Bearer ${Z_AI_API_KEY}`,
                "Content-Type": "application/json",
                "Content-Length": postData.length
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.choices && parsed.choices[0] && parsed.choices[0].message) {
                        resolve(parsed.choices[0].message.content);
                    } else {
                        reject(new Error('Invalid API response: ' + data));
                    }
                } catch (e) {
                    reject(new Error('Failed to parse API response: ' + e.message));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Fallback template assessment (no AI)
function generateTemplateAssessment(student, graded) {
    const defCount = graded.results.filter(r => r.studentDef && r.studentDef.trim() !== '').length;

    if (graded.matches === TERMS.length) {
        return `Perfect score! All ${TERMS.length} scenario matches correct. All ${defCount} definitions demonstrate accurate understanding of economic concepts.`;
    }

    if (graded.matches >= TERMS.length - 2) {
        const incorrect = graded.results.filter(r => !r.correct).map(r => r.term).join(', ');
        return `Great work with ${graded.matches}/${TERMS.length} correct! Review: ${incorrect}. ${defCount} definitions provided showing good understanding.`;
    }

    if (graded.matches >= TERMS.length / 2) {
        return `${graded.matches}/${TERMS.length} correct. ${defCount} definitions provided. Review the incorrect matches and complete any missing definitions.`;
    }

    if (defCount === 0) {
        return `${graded.matches}/${TERMS.length} matches completed. No definitions provided yet - please complete all 15 definitions.`;
    }

    return `${graded.matches}/${TERMS.length} correct, ${defCount} definitions provided. Keep working on completing the assignment.`;
}

// Generate HTML file
function generateHTML(studentsData, aiAssessments) {
    const students = [];
    const studentDefinitions = {};
    const studentMatchText = {};

    Object.values(studentsData).forEach((student, index) => {
        const graded = gradeSubmission(student);
        const aiComment = aiAssessments[student.name] || generateTemplateAssessment(student, graded);

        let pin = student.pin;
        if (!pin) {
            pin = Math.random().toString(36).substring(2, 8).toUpperCase();
        }

        students.push({
            name: student.name,
            pin: pin,
            status: graded.status,
            matches: graded.matches,
            totalMatches: graded.totalMatches,
            results: graded.results.map(r => ({ term: r.term, correct: r.correct })),
            definitions: graded.results.filter(r => r.studentDef).length === TERMS.length ? 'Complete' : `${graded.results.filter(r => r.studentDef).length} of ${TERMS.length} provided`,
            definitionQuality: aiComment,
            todo: graded.todo
        });

        studentDefinitions[student.name] = {};
        studentMatchText[student.name] = {};
        TERMS.forEach(term => {
            studentDefinitions[student.name][term] = student.responses[term]?.definition || '';
            studentMatchText[student.name][term] = graded.results.find(r => r.term === term)?.studentMatch || '';
        });
    });

    let html = generateHTMLTemplate();

    const studentsJson = JSON.stringify(students, null, 4);
    const definitionsJson = JSON.stringify(studentDefinitions, null, 4);
    const matchesJson = JSON.stringify(studentMatchText, null, 4);
    const correctMatchesJson = JSON.stringify(CORRECT_MATCHES, null, 4);

    html = html.replace(
        /\/\/ STUDENTS_DATA_PLACEHOLDER[\s\S]*?\/\/ END_STUDENTS_DATA/,
        `// STUDENTS_DATA_PLACEHOLDER\nconst students = ${studentsJson};\n        // END_STUDENTS_DATA`
    );

    html = html.replace(
        /\/\/ DEFINITIONS_PLACEHOLDER[\s\S]*?\/\/ END_DEFINITIONS/,
        `// DEFINITIONS_PLACEHOLDER\nconst studentDefinitions = ${definitionsJson};\n        // END_DEFINITIONS`
    );

    html = html.replace(
        /\/\/ MATCHES_PLACEHOLDER[\s\S]*?\/\/ END_MATCHES/,
        `// MATCHES_PLACEHOLDER\nconst studentMatchText = ${matchesJson};\n        // END_MATCHES`
    );

    html = html.replace(
        /\/\/ CORRECT_MATCHES_PLACEHOLDER[\s\S]*?\/\/ END_CORRECT_MATCHES/,
        `// CORRECT_MATCHES_PLACEHOLDER\nconst correctMatches = ${correctMatchesJson};\n        // END_CORRECT_MATCHES`
    );

    return html;
}

function generateHTMLTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Adam Smith Market - Your Results</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&display=swap" rel="stylesheet">
    <style>
        :root { --bg: #05080a; --panel: rgba(255, 255, 255, 0.05); --panel-border: rgba(255, 255, 255, 0.1); --accent: #00d2ff; --secondary: #ff8c00; --success: #00ff88; --error: #ff4757; --text: #ffffff; --text-dim: rgba(255, 255, 255, 0.6); --card-bg: rgba(15, 20, 30, 0.7); }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: 'Outfit', sans-serif; min-height: 100vh; padding: 40px 20px; }
        .container { max-width: 900px; margin: 0 auto; }
        header { text-align: center; margin-bottom: 60px; }
        .tag { background: linear-gradient(90deg, var(--accent), var(--success)); color: black; padding: 6px 18px; font-weight: 800; text-transform: uppercase; border-radius: 50px; font-size: 0.75rem; display: inline-block; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0, 210, 255, 0.3); }
        h1 { font-size: 3.5rem; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -2px; background: linear-gradient(180deg, #fff 0%, #aaa 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        p.subtitle { font-size: 1.1rem; color: var(--text-dim); margin-top: 15px; }
        .student-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; margin-bottom: 40px; }
        .student-card { background: var(--card-bg); border: 1px solid var(--panel-border); border-radius: 12px; padding: 20px; cursor: pointer; transition: 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); text-align: center; }
        .student-card:hover { border-color: var(--accent); transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0, 210, 255, 0.2); }
        .student-card .name { font-weight: 700; font-size: 1.1rem; color: var(--accent); }
        .student-card .status { font-size: 0.75rem; color: var(--text-dim); margin-top: 8px; }
        .student-card.complete .status { color: var(--success); }
        .student-card.incomplete .status { color: var(--secondary); }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(10px); display: none; justify-content: center; align-items: center; z-index: 1000; }
        .modal-overlay.active { display: flex; }
        .modal { background: var(--card-bg); border: 1px solid var(--panel-border); border-radius: 20px; padding: 40px; max-width: 900px; width: 90%; max-height: 80vh; overflow-y: auto; position: relative; }
        .modal-close { position: absolute; top: 15px; right: 15px; background: none; border: none; color: var(--text-dim); font-size: 1.5rem; cursor: pointer; transition: 0.3s; }
        .modal-close:hover { color: var(--error); }
        .pin-section { text-align: center; padding: 40px 20px; }
        .pin-section h3 { color: var(--accent); margin-bottom: 20px; }
        .pin-input { background: rgba(0, 0, 0, 0.4); border: 1px solid var(--panel-border); color: white; padding: 15px 25px; border-radius: 12px; font-family: 'Outfit'; font-size: 1.2rem; text-align: center; letter-spacing: 5px; width: 200px; margin-bottom: 20px; transition: 0.3s; }
        .pin-input:focus { border-color: var(--accent); outline: none; box-shadow: 0 0 20px rgba(0, 210, 255, 0.3); }
        .pin-btn { background: linear-gradient(135deg, var(--accent) 0%, #0099cc 100%); color: black; border: none; padding: 12px 30px; font-size: 1rem; font-weight: 700; border-radius: 12px; cursor: pointer; transition: 0.3s; }
        .pin-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0, 210, 255, 0.4); }
        .error-msg { color: var(--error); font-size: 0.9rem; margin-top: 15px; display: none; }
        .results-section { display: none; }
        .results-section.active { display: block; }
        .results-header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid var(--panel-border); }
        .results-header h2 { color: var(--accent); margin: 0 0 10px 0; }
        .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; }
        .status-badge.complete { background: rgba(0, 255, 136, 0.2); color: var(--success); }
        .status-badge.incomplete { background: rgba(255, 140, 0, 0.2); color: var(--secondary); }
        .score-display { font-size: 3rem; font-weight: 900; color: var(--success); margin: 20px 0; }
        .score-label { font-size: 0.9rem; color: var(--text-dim); text-transform: uppercase; }
        .results-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .results-table th { text-align: left; padding: 12px; color: var(--text-dim); font-size: 0.75rem; text-transform: uppercase; border-bottom: 1px solid var(--panel-border); }
        .results-table td { padding: 15px 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); vertical-align: top; }
        .term-name { color: var(--accent); font-weight: 700; }
        .match-correct { color: var(--success); }
        .match-incorrect { color: var(--error); }
        .definition-preview { font-size: 0.85rem; color: var(--text-dim); max-width: 400px; }
        .def-good { color: var(--success); }
        .def-deficient { color: var(--error); }
        .def-missing { color: var(--text-dim); font-style: italic; }
        .def-comment { font-size: 0.8rem; color: var(--text-dim); max-width: 200px; }
        .todo-section { margin-top: 30px; padding: 20px; background: rgba(255, 140, 0, 0.1); border-radius: 12px; border-left: 3px solid var(--secondary); }
        .todo-section h4 { color: var(--secondary); margin: 0 0 15px 0; }
        .todo-section ul { margin: 0; padding-left: 20px; color: var(--text-dim); }
        .todo-section li { margin-bottom: 8px; }
        @media (max-width: 600px) { h1 { font-size: 2rem; } .student-grid { grid-template-columns: 1fr; } .modal { padding: 20px; } }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="tag">Adam Smith Market Project</div>
            <h1>Your Results</h1>
            <p class="subtitle">Click your name and enter your PIN to view your submission results</p>
        </header>
        <div class="student-grid" id="student-grid"></div>
    </div>
    <div class="modal-overlay" id="modal-overlay" onclick="closeModal(event)">
        <div class="modal" onclick="event.stopPropagation()">
            <button class="modal-close" onclick="closeModal()">×</button>
            <div class="pin-section" id="pin-section">
                <h3 id="modal-student-name">Student Name</h3>
                <p style="color: var(--text-dim); margin-bottom: 20px;">Enter your PIN to view your results</p>
                <input type="password" class="pin-input" id="pin-input" placeholder="PIN" maxlength="20">
                <br>
                <button class="pin-btn" onclick="verifyPin()">View Results</button>
                <p class="error-msg" id="error-msg">Incorrect PIN. Please try again.</p>
            </div>
            <div class="results-section" id="results-section">
                <div class="results-header">
                    <h2 id="result-student-name">Student Name</h2>
                    <span class="status-badge" id="result-status">Complete</span>
                    <div class="score-display" id="result-score">--/15</div>
                    <div class="score-label">Market Moment Matches</div>
                </div>
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Term</th>
                            <th>Match</th>
                            <th>Your Match</th>
                            <th>Your Definition</th>
                            <th>Comment</th>
                        </tr>
                    </thead>
                    <tbody id="results-body"></tbody>
                </table>
                <div class="todo-section" id="todo-section" style="display: none;">
                    <h4>📋 What You Need to Complete</h4>
                    <ul id="todo-list"></ul>
                </div>
                <div style="margin-top: 30px; text-align: center;">
                    <p style="color: var(--text-dim); font-size: 0.85rem;">Questions? See Mr Waugh during class.</p>
                </div>
            </div>
        </div>
    </div>
    <script>
        // STUDENTS_DATA_PLACEHOLDER
        // END_STUDENTS_DATA

        // DEFINITIONS_PLACEHOLDER
        // END_DEFINITIONS

        // MATCHES_PLACEHOLDER
        // END_MATCHES

        // CORRECT_MATCHES_PLACEHOLDER
        // END_CORRECT_MATCHES

        let currentStudent = null;

        function init() {
            const grid = document.getElementById('student-grid');
            students.sort((a, b) => a.name.localeCompare(b.name));
            students.forEach(student => {
                const card = document.createElement('div');
                card.className = \`student-card \${student.status}\`;
                card.onclick = () => openModal(student);
                card.innerHTML = \`<div class="name">\${student.name}</div><div class="status">\${student.status === 'complete' ? '✓ Complete' : '⚠ In Progress'}</div>\`;
                grid.appendChild(card);
            });
        }

        function openModal(student) {
            currentStudent = student;
            document.getElementById('modal-student-name').textContent = student.name;
            document.getElementById('pin-input').value = '';
            document.getElementById('error-msg').style.display = 'none';
            document.getElementById('pin-section').style.display = 'block';
            document.getElementById('results-section').classList.remove('active');
            document.getElementById('modal-overlay').classList.add('active');
            document.getElementById('pin-input').focus();
        }

        function closeModal(event) {
            if (!event || event.target === document.getElementById('modal-overlay')) {
                document.getElementById('modal-overlay').classList.remove('active');
                currentStudent = null;
            }
        }

        function verifyPin() {
            const enteredPin = document.getElementById('pin-input').value;
            if (enteredPin === currentStudent.pin) { showResults(); } else {
                document.getElementById('error-msg').style.display = 'block';
                document.getElementById('pin-input').value = '';
                document.getElementById('pin-input').focus();
            }
        }

        document.getElementById('pin-input').addEventListener('keypress', function (e) { if (e.key === 'Enter') verifyPin(); });

        function showResults() {
            document.getElementById('pin-section').style.display = 'none';
            document.getElementById('results-section').classList.add('active');
            const student = currentStudent;
            document.getElementById('result-student-name').textContent = student.name;
            const statusBadge = document.getElementById('result-status');
            statusBadge.textContent = student.status === 'complete' ? '✓ Complete' : '⚠ In Progress';
            statusBadge.className = \`status-badge \${student.status}\`;
            document.getElementById('result-score').textContent = \`\${student.matches}/\${student.totalMatches}\`;
            const defs = studentDefinitions[student.name] || {};
            const matches = studentMatchText[student.name] || {};
            const tbody = document.getElementById('results-body');
            tbody.innerHTML = '';
            student.results.forEach(result => {
                const tr = document.createElement('tr');
                const studentDef = defs[result.term] || '';
                const studentMatch = matches[result.term] || '(No match provided)';
                const correctMatch = correctMatches[result.term];
                let defClass = 'def-missing';
                let defDisplay = '<em>(No definition provided)</em>';
                let comment = '';
                if (studentDef && studentDef.trim() !== '') { defClass = 'def-good'; defDisplay = studentDef; comment = '✓ Accurate definition'; }
                else if (student.todo.some(t => t.includes('definition') || t.includes('Definition'))) { comment = 'Needs definition'; }
                if (studentDef === 'liquidity is how') { defClass = 'def-deficient'; comment = '⚠ Incomplete definition'; }
                let matchDisplay = result.correct ? \`<span class="match-correct">✓ Correct match</span>\` : \`<span class="match-incorrect">✗ Incorrect match</span>\`;
                let matchTextDisplay = !studentMatch || studentMatch === '(No match provided)' ? '<em style="color: var(--text-dim);">(No match provided)</em>' : (result.correct ? \`<span style="color: var(--success);">\${studentMatch}</span>\` : \`<span style="color: var(--success);">\${correctMatch}</span>, not <span style="color: var(--error);">\${studentMatch}</span>\`);
                tr.innerHTML = \`<td><span class="term-name">\${result.term}</span></td><td>\${matchDisplay}</td><td class="definition-preview" style="font-size: 0.8rem; max-width: 350px;">\${matchTextDisplay}</td><td class="definition-preview \${defClass}">\${defDisplay}</td><td class="def-comment">\${comment}</td>\`;
                tbody.appendChild(tr);
            });
            if (student.definitionQuality) {
                const defQualityRow = document.createElement('tr');
                defQualityRow.innerHTML = \`<td colspan="5" style="padding-top: 20px; border-top: 2px solid var(--panel-border);"><strong style="color: var(--accent);">Definition Assessment:</strong><span style="color: var(--text-dim); margin-left: 10px;">\${student.definitionQuality}</span></td>\`;
                tbody.appendChild(defQualityRow);
            }
            const todoSection = document.getElementById('todo-section');
            const todoList = document.getElementById('todo-list');
            if (student.todo.length > 0) { todoSection.style.display = 'block'; todoList.innerHTML = ''; student.todo.forEach(item => { const li = document.createElement('li'); li.textContent = item; todoList.appendChild(li); }); } else { todoSection.style.display = 'none'; }
        }

        init();
    </script>
</body>
</html>`;
}

// Main execution
async function main() {
    console.log('Fetching student submissions from webhook...');

    try {
        const data = await fetchData();
        console.log('Data fetched successfully');

        const students = parseSubmissions(data);
        console.log(`Parsed ${Object.keys(students).length} student submissions`);

        // Generate AI assessments for each student
        const aiAssessments = {};
        for (const [name, student] of Object.entries(students)) {
            console.log(`Generating AI assessment for ${name}...`);
            const graded = gradeSubmission(student);
            aiAssessments[name] = await generateAIAssessment(student, graded);
        }

        const html = generateHTML(students, aiAssessments);

        const outputPath = path.join(OUTPUT_DIR, 'answerresults.html');
        fs.writeFileSync(outputPath, html, 'utf8');

        // Also save parsed submissions as stuwork3-28 for reference
        const stuWorkPath = path.join(OUTPUT_DIR, 'stuwork3-28');
        fs.writeFileSync(stuWorkPath, JSON.stringify(students, null, 2), 'utf8');

        console.log(`Successfully generated ${outputPath}`);
        console.log(`Total students processed: ${Object.keys(students).length}`);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
