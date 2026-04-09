/**
 * Citizenship 9: Political Spectrum & Election HQ Logic
 */

// --- STATE MANAGEMENT ---
let currentQuestionIndex = -1; // -1 means intro screen
let registeredParties = [];
let scriptURL = 'https://script.google.com/macros/s/AKfycbyjZESIp2PF_mZLbNrdbGANBRcWDbB1ic0m8rj2I9vAc3pLOUg1w5pEUontpUqE2er6/exec'; // Google Apps Script URL
let studentResponses = []; // Store student votes

// --- PRESENTER LOGIC ---

function initPresenter() {
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const revealBtn = document.getElementById('reveal-btn');
    const agreeBtn = document.getElementById('agree-btn');
    const disagreeBtn = document.getElementById('disagree-btn');

    if (nextBtn) nextBtn.addEventListener('click', () => navigate(1));
    if (prevBtn) prevBtn.addEventListener('click', () => navigate(-1));
    if (revealBtn) revealBtn.addEventListener('click', revealAlignment);
    if (agreeBtn) agreeBtn.addEventListener('click', () => handleVote(true));
    if (disagreeBtn) disagreeBtn.addEventListener('click', () => handleVote(false));
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
    if (revealContainer) revealContainer.classList.remove('show');
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
    studentResponses.push({
        questionIndex: currentQuestionIndex,
        questionText: q.text,
        alignment: q.alignment,
        agree: isAgree,
        disagree: !isAgree,
        timestamp: new Date().toLocaleString()
    });
    localStorage.setItem('citizenship_responses', JSON.stringify(studentResponses));
    showToast(isAgree ? "You AGREE" : "You DISAGREE");
    navigate(1);
}

// --- ELECTION HQ LOGIC ---

async function initHQ() {
    populatePlatformIssues();
    loadLocalData();
    
    // Fetch latest class data from the cloud
    showToast("Loading class data...");
    try {
        const response = await fetch(scriptURL);
        const data = await response.json();
        if (data && data.parties) {
            // Deduplicate: Keep only the LATEST entry for each unique party name (FUZZY)
            const parties = [];
            data.parties.forEach(p => {
                const name = (p.partyname || p.name || "Unknown").trim();
                const slogan = (p.slogan || "").trim();
                
                // Check if we already have a "similar" party
                const existingIndex = parties.findIndex(existing => {
                    const existingName = (existing.partyname || existing.name).trim();
                    const existingSlogan = (existing.slogan || "").trim();
                    
                    // Match if slogan is identical OR names are 85% similar
                    const isSameSlogan = slogan.length > 5 && slogan === existingSlogan;
                    const isSimilarName = name.toLowerCase().includes(existingName.toLowerCase()) || 
                                         existingName.toLowerCase().includes(name.toLowerCase());
                                         
                    return isSameSlogan || (isSimilarName && slogan === existingSlogan);
                });

                if (existingIndex > -1) {
                    parties[existingIndex] = p; // Overwrite with newer
                } else {
                    parties.push(p);
                }
            });
            registeredParties = parties;
        }
    } catch (err) {
        console.error("Cloud fetch failed, using local fallback", err);
    }
    
    renderParties();
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`${tabId}-tab`).style.display = 'block';
    const activeBtn = Array.from(document.querySelectorAll('.tab-btn'))
        .find(b => b.innerText.toLowerCase().includes(tabId) || 
                   (tabId === 'find-group' && b.innerText.toLowerCase().includes('team profile')));
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
        div.innerHTML = `<input type="checkbox" name="platform" value="${issue}" style="width: auto;">
                         <label style="margin-bottom: 0; font-size: 0.8rem;">${issue}</label>`;
        list.appendChild(div);
    });
}


async function submitToPress() {
    const platformText = document.getElementById('press-platform').value.trim();
    const container = document.getElementById('press-response-container');
    const responseText = document.getElementById('press-response-text');

    if (!platformText) {
        showToast("Please enter your platform ideas first.");
        return;
    }

    container.style.display = 'block';
    responseText.innerHTML = '<span class="pulse-text">Reporter is typing...</span>';
    
    try {
        const payload = {
            type: 'interview',
            prompt: `I am a student political party. Our platform is: ${platformText}. Challenge us with a tough question as a skeptical Nova Scotian journalist.`
        };

        const res = await fetch(scriptURL, { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });
        const result = await res.json();
        
        if (result.status === 'success') {
            responseText.innerText = result.response;
        } else {
            responseText.innerText = "The reporter is unavailable right now. Try again in a moment.";
        }
    } catch (err) {
        console.error("AI Interview failed:", err);
        responseText.innerText = "Connection lost to the Press Room. Check your internet.";
    }
}

function renderParties() {
    const grid = document.getElementById('party-grid');
    if (!grid) return;
    
    // FILTER: Hide "TEST" entries or parties with PINs starting with 'T'
    const displayParties = registeredParties.filter(p => {
        const nameMatch = (p.partyname || p.name || "").toUpperCase().startsWith("TEST");
        const pinMatch = (p.pin || "").toUpperCase().startsWith("T");
        return !nameMatch && !pinMatch;
    });

    if (displayParties.length === 0) {
        grid.innerHTML = `<div class="card" style="grid-column: 1 / -1; text-align: center; padding: 5rem;">
                            <p style="color: var(--text-muted);">No parties registered yet. Be the first!</p>
                          </div>`;
        return;
    }
    grid.innerHTML = '';
    displayParties.forEach(party => {
        const pName = party.partyname || party.name;
        const card = document.createElement('div');
        card.className = 'card party-card fade-in';
        card.innerHTML = `<div class="party-accent" style="background: ${party.color};"></div>
            <div class="party-content">
                <h3>${pName}</h3>
                <div class="party-meta">Led by ${party.leader}</div>
                <p style="font-style: italic; margin-bottom: 1rem;">"${party.slogan}"</p>
                <div class="tag-list">
                    ${party.platforms.split(', ').map(p => `<span class="tag">${p}</span>`).join('')}
                </div>
                <div style="margin-top: 1rem; font-size: 0.7rem; color: var(--text-muted);">Team: ${party.members}</div>
            </div>`;
        grid.appendChild(card);
    });
}

async function handlePartyRegistration(event) {
    event.preventDefault();
    const selectedPlatforms = Array.from(document.querySelectorAll('input[name="platform"]:checked'))
        .map(cb => cb.value);
    const partyData = {
        type: 'party',
        partyname: document.getElementById('party-name').value, // Fixed: Standardized to partyname
        leader: document.getElementById('party-leader').value,
        color: document.getElementById('party-color').value,
        pin: document.getElementById('party-pin').value.toUpperCase(),
        members: document.getElementById('party-members').value,
        slogan: document.getElementById('party-slogan').value,
        platforms: selectedPlatforms.join(', ')
    };
    showToast("Registering with Elections Halifax West...");
    try {
        if (scriptURL) {
            const res = await fetch(scriptURL, { method: 'POST', body: JSON.stringify(partyData) });
            const result = await res.json();
            if (result.status === 'success') showToast("Official Registration Successful!");
        }
    } catch (err) {
        console.error("Cloud registration failed:", err);
        showToast("Saved locally (Sync pending)");
    }
    registeredParties.push(partyData);
    saveLocalData();
    renderParties();
    document.getElementById('party-form').reset();
    setTimeout(() => switchTab('dashboard'), 1500);
}

// --- TEAM IDENTITY ---

async function submitGroupSurvey() {
    const orientation = document.querySelector('input[name="political-orientation"]:checked')?.value;
    const priorityIssue = document.getElementById('priority-issue').value;
    const studentName = document.getElementById('student-name').value.trim();
    const studentPin = document.getElementById('student-pin').value.trim().toUpperCase();

    if (!orientation || !priorityIssue || !studentName || !studentPin) {
        showToast("Please complete all fields.");
        return;
    }
    if (studentPin.length !== 5) {
        showToast("PIN must be 5 characters.");
        return;
    }

    const studentProfile = { type: 'profile', name: studentName, pin: studentPin, orientation, priorityIssue };
    showToast("Syncing profile to cloud...");
    try {
        if (scriptURL) {
            const res = await fetch(scriptURL, { method: 'POST', body: JSON.stringify(studentProfile) });
            const result = await res.json();
            if (result.status === 'success') showToast("Profile synced to class sheet!");
        }
    } catch (err) {
        console.error("Cloud sync failed:", err);
    }
    const saved = JSON.parse(localStorage.getItem('citizenship_surveys') || '[]');
    const idx = saved.findIndex(s => s.name.toLowerCase() === studentName.toLowerCase());
    if (idx >= 0) saved[idx] = studentProfile; else saved.push(studentProfile);
    localStorage.setItem('citizenship_surveys', JSON.stringify(saved));
}

async function analyzeTeamIdentity() {
    const n1 = document.getElementById('member-1-name').value.trim();
    const n2 = document.getElementById('member-2-name').value.trim();
    const n3 = document.getElementById('member-3-name').value.trim();
    const names = [n1, n2, n3].filter(n => n !== "");
    if (names.length < 1) { showToast("Enter at least one name."); return; }

    showToast("Fetching class data...");
    let allProfiles = [];
    try {
        if (scriptURL) {
            const res = await fetch(scriptURL);
            const data = await res.json();
            allProfiles = data.profiles || [];
        }
    } catch (err) {
        allProfiles = JSON.parse(localStorage.getItem('citizenship_surveys') || '[]');
    }

    const found = names.map(n => allProfiles.find(p => p.name.toLowerCase() === n.toLowerCase())).filter(p => p);
    if (found.length < names.length) {
        showToast("Some profiles missing. Save Step 1 first.");
        return;
    }

    const orientations = found.map(m => m.orientation);
    const left = orientations.filter(o => o === 'left').length;
    const right = orientations.filter(o => o === 'right').length;
    const center = orientations.filter(o => o === 'center').length;

    let lean = "", color = "var(--text-main)";
    if (left > right && left > center) { lean = "Solid Left"; color = "var(--left-color)"; }
    else if (right > left && right > center) { lean = "Solid Right"; color = "var(--right-color)"; }
    else if (left > 0 && right > 0) { lean = "Politically Diverse"; color = "orange"; }
    else if (center > 0) { lean = "Moderate / Center"; color = "#fbbf24"; }
    else lean = "Balanced / Mixed";

    const issues = [...new Set(found.map(m => m.priorityissue || m.priorityIssue))];
    document.getElementById('matches-list').innerHTML = `
        <div class="card" style="border: 2px solid var(--accent); background: rgba(255,255,255,0.05);">
            <h3 style="text-align: center; margin-bottom: 1.5rem;">Team Identity Analysis</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                <div style="text-align: center; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 12px;">
                    <div style="font-size: 0.7rem; color: var(--text-muted);">Group Lean</div>
                    <div style="font-size: 1.3rem; font-weight: 800; color: ${color};">${lean}</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 12px;">
                    <div style="font-size: 0.7rem; color: var(--text-muted);">Team Size</div>
                    <div style="font-size: 1.3rem; font-weight: 800;">${found.length}</div>
                </div>
            </div>
            <div style="margin-top: 1.5rem;">
                <h4>Shared Priorities:</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
                    ${issues.map(i => `<span class="tag" style="background: var(--right-color);">${i}</span>`).join('')}
                </div>
            </div>
        </div>`;
    document.getElementById('find-group-results').style.display = 'block';
    showToast("Analysis complete!");
}

function resetGroupSurvey() {
    document.getElementById('find-group-survey').reset();
    document.getElementById('find-group-results').style.display = 'none';
}

// --- UTILS ---

function showToast(m) {
    const t = document.getElementById('toast');
    t.innerText = m;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function saveLocalData() {
    localStorage.setItem('citizenship_parties', JSON.stringify(registeredParties));
}

function loadLocalData() {
    const saved = localStorage.getItem('citizenship_parties');
    if (saved) registeredParties = JSON.parse(saved);
}
