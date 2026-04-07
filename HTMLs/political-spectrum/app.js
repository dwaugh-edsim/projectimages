/**
 * Citizenship 9: Political Spectrum & Election HQ Logic
 */

// --- STATE MANAGEMENT ---
let currentQuestionIndex = -1; // -1 means intro screen
let registeredParties = [];
let scriptURL = 'https://script.google.com/macros/s/AKfycbyjZESIp2PF_mZLbNrdbGANBRcWDbB1ic0m8rj2I9vAc3pLOUg1w5pEUontpUqE2er6/exec'; // Google Apps Script URL
let studentResponses = []; // Store student votes: {questionIndex, agree, disagree}

// --- PRESENTER LOGIC ---

function initPresenter() {
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const revealBtn = document.getElementById('reveal-btn');
    const counter = document.getElementById('counter');
    const agreeBtn = document.getElementById('agree-btn');
    const disagreeBtn = document.getElementById('disagree-btn');

    nextBtn.addEventListener('click', () => navigate(1));
    prevBtn.addEventListener('click', () => navigate(-1));
    revealBtn.addEventListener('click', revealAlignment);

    agreeBtn.addEventListener('click', () => handleVote(true));
    disagreeBtn.addEventListener('click', () => handleVote(false));
}

function navigate(direction) {
    currentQuestionIndex += direction;

    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const revealBtn = document.getElementById('reveal-btn');
    const agreeBtn = document.getElementById('agree-btn');
    const disagreeBtn = document.getElementById('disagree-btn');
    const counter = document.getElementById('counter');
    const statementText = document.getElementById('statement-text');
    const revealContainer = document.getElementById('alignment-reveal');
    const card = document.getElementById('statement-card');

    // Reset UI
    revealContainer.classList.remove('show');
    document.getElementById('reveal-left').classList.remove('active-reveal');
    document.getElementById('reveal-right').classList.remove('active-reveal');

    // Reset vote buttons
    agreeBtn.style.display = 'none';
    disagreeBtn.style.display = 'none';

    // Animation trigger
    card.classList.remove('fade-in');
    void card.offsetWidth; // Trigger reflow
    card.classList.add('fade-in');

    if (currentQuestionIndex === -1) {
        statementText.innerText = "Ready to begin the Political Spectrum activity?";
        counter.style.display = 'none';
        prevBtn.style.display = 'none';
        revealBtn.style.display = 'none';
        nextBtn.innerText = "Start Activity";
    } else if (currentQuestionIndex < politicalStatements.length) {
        const q = politicalStatements[currentQuestionIndex];
        statementText.innerText = q.text;
        counter.innerText = `Question ${currentQuestionIndex + 1} of ${politicalStatements.length}`;
        counter.style.display = 'block';
        prevBtn.style.display = 'block';
        revealBtn.style.display = 'block';
        agreeBtn.style.display = 'block';
        disagreeBtn.style.display = 'block';
        nextBtn.innerText = "Next Statement";

        if (currentQuestionIndex === politicalStatements.length - 1) {
            nextBtn.innerText = "Finish Activity";
        }
    } else {
        // Finish screen
        statementText.innerText = "Activity Complete! Good luck building your parties.";
        counter.style.display = 'none';
        prevBtn.style.display = 'block';
        revealBtn.style.display = 'none';
        agreeBtn.style.display = 'none';
        disagreeBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    }
}

function revealAlignment() {
    const revealContainer = document.getElementById('alignment-reveal');
    const q = politicalStatements[currentQuestionIndex];

    revealContainer.classList.add('show');

    if (q.alignment === "Left") {
        document.getElementById('reveal-left').classList.add('active-reveal');
    } else {
        document.getElementById('reveal-right').classList.add('active-reveal');
    }
}

function handleVote(isAgree) {
    const q = politicalStatements[currentQuestionIndex];

    // Store the response
    studentResponses.push({
        questionIndex: currentQuestionIndex,
        questionText: q.text,
        alignment: q.alignment,
        agree: isAgree,
        disagree: !isAgree,
        timestamp: new Date().toLocaleString()
    });

    // Save to localStorage
    localStorage.setItem('citizenship_responses', JSON.stringify(studentResponses));

    // Show feedback
    const feedback = isAgree ? "You AGREE with this position" : "You DISAGREE with this position";
    showToast(feedback);

    // Move to next question
    navigate(1);
}

// --- ELECTION HQ LOGIC ---

function initHQ() {
    populatePlatformIssues();
    loadLocalData();
    renderParties();
}

function switchTab(tabId) {
    // Hide all contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });

    // Remove active class from buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected
    document.getElementById(`${tabId}-tab`).style.display = 'block';

    // Set active button
    const activeBtn = Array.from(document.querySelectorAll('.tab-btn'))
        .find(btn => btn.innerText.toLowerCase().includes(tabId));
    if (activeBtn) activeBtn.classList.add('active');
}

function populatePlatformIssues() {
    const list = document.getElementById('platform-issues-list');
    if (!list) return;

    platformIssues.forEach(issue => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.gap = '0.5rem';
        div.style.alignItems = 'center';
        div.innerHTML = `
            <input type="checkbox" name="platform" value="${issue}" style="width: auto;">
            <label style="margin-bottom: 0; font-size: 0.8rem;">${issue}</label>
        `;
        list.appendChild(div);
    });
}

function handlePartyRegistration(event) {
    event.preventDefault();

    // Collect platforms
    const selectedPlatforms = Array.from(document.querySelectorAll('input[name="platform"]:checked'))
        .map(cb => cb.value);

    const partyData = {
        name: document.getElementById('party-name').value,
        leader: document.getElementById('party-leader').value,
        color: document.getElementById('party-color').value,
        pin: document.getElementById('party-pin').value,
        members: document.getElementById('party-members').value,
        slogan: document.getElementById('party-slogan').value,
        platforms: selectedPlatforms.join(', '),
        timestamp: new Date().toLocaleString()
    };

    // Store locally as fallback
    registeredParties.push(partyData);
    saveLocalData();

    // Attempt GAS Push (if set up)
    if (scriptURL) {
        // Here we would push to Google Apps Script
        console.log("Pushing to GAS...", partyData);
    }

    showToast("Official Registration Successful!");
    renderParties();

    document.getElementById('party-form').reset();
    setTimeout(() => switchTab('dashboard'), 1500);
}

function renderParties() {
    const grid = document.getElementById('party-grid');
    if (!grid) return;

    if (registeredParties.length === 0) {
        grid.innerHTML = `
            <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 5rem;">
                <p style="color: var(--text-muted);">No parties registered yet. Be the first!</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = ''; // Clear

    registeredParties.forEach(party => {
        const card = document.createElement('div');
        card.className = 'card party-card fade-in';
        card.innerHTML = `
            <div class="party-accent" style="background: ${party.color};"></div>
            <div class="party-content">
                <h3>${party.name}</h3>
                <div class="party-meta">Led by ${party.leader}</div>
                <p style="font-style: italic; margin-bottom: 1rem;">"${party.slogan}"</p>
                <div class="tag-list">
                    ${party.platforms.split(', ').map(p => `<span class="tag">${p}</span>`).join('')}
                </div>
                <div style="margin-top: 1rem; font-size: 0.7rem; color: var(--text-muted);">
                    Team: ${party.members}
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- UTILITIES ---

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function saveLocalData() {
    localStorage.setItem('citizenship_parties', JSON.stringify(registeredParties));
}

function loadLocalData() {
    const saved = localStorage.getItem('citizenship_parties');
    if (saved) {
        registeredParties = JSON.parse(saved);
    }
}

// --- GROUP FORMATION LOGIC ---

function submitGroupSurvey() {
    const orientation = document.querySelector('input[name="political-orientation"]:checked')?.value;
    const priorityIssue = document.getElementById('priority-issue').value;
    const partyTypes = Array.from(document.querySelectorAll('input[name="party-type"]:checked')).map(cb => cb.value);
    const groupSize = document.getElementById('group-size').value;
    const studentName = document.getElementById('student-name').value.trim();

    if (!orientation || !priorityIssue || !studentName) {
        showToast("Please complete all required fields (orientation, issue, and name).");
        return;
    }

    // Create a mock student profile
    const studentProfile = {
        name: studentName,
        orientation: orientation,
        priorityIssue: priorityIssue,
        partyTypes: partyTypes,
        groupSize: groupSize,
        timestamp: new Date().toLocaleString()
    };

    // Save to local storage
    const savedSurveys = JSON.parse(localStorage.getItem('citizenship_surveys') || '[]');
    savedSurveys.push(studentProfile);
    localStorage.setItem('citizenship_surveys', JSON.stringify(savedSurveys));

    // Show results
    showGroupMatches(studentProfile);

    showToast("Survey submitted! Finding matches...");
}

function showGroupMatches(currentProfile) {
    const resultsDiv = document.getElementById('find-group-results');
    const matchesList = document.getElementById('matches-list');

    if (!resultsDiv || !matchesList) return;

    // Get all saved surveys
    const savedSurveys = JSON.parse(localStorage.getItem('citizenship_surveys') || '[]');

    // Filter out current student and find matches
    const otherSurveys = savedSurveys.filter(s => s.name !== currentProfile.name);

    // Find matches based on orientation and priority issue
    const matches = otherSurveys.filter(survey => {
        const orientationMatch = survey.orientation === currentProfile.orientation;
        const issueMatch = survey.priorityIssue === currentProfile.priorityIssue;
        return orientationMatch || issueMatch;
    });

    if (matches.length === 0) {
        matchesList.innerHTML = `
            <div class="card" style="text-align: center; padding: 2rem;">
                <p style="color: var(--text-muted);">No exact matches found yet. Keep exploring the spectrum activity to find students with similar views!</p>
                <p style="margin-top: 1rem; font-size: 0.9rem;">Tip: Ask classmates who moved to the same side during the spectrum activity.</p>
            </div>
        `;
    } else {
        matchesList.innerHTML = matches.map(match => `
            <div class="card" style="padding: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${match.name}</strong>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">
                            ${match.orientation === 'left' ? 'Left' : match.orientation === 'right' ? 'Right' : 'Center'} orientation
                        </div>
                    </div>
                    <span style="background: var(--accent); color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem;">
                        Match
                    </span>
                </div>
                <div style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-muted);">
                    Priority Issue: ${match.priorityIssue}
                </div>
            </div>
        `).join('');
    }

    resultsDiv.style.display = 'block';
}

function resetGroupSurvey() {
    document.getElementById('find-group-survey').reset();
    document.getElementById('find-group-results').style.display = 'none';
}

// Add to initHQ
function initHQ() {
    populatePlatformIssues();
    loadLocalData();
    renderParties();
}
