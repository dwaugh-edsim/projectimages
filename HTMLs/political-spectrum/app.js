/**
 * Citizenship 9: Political Spectrum & Election HQ Logic
 */

// --- STATE MANAGEMENT ---
let currentQuestionIndex = -1; // -1 means intro screen
let registeredParties = [];
let studentResponses = []; // Store student votes
let chatHistory = []; // Multi-turn chat history for AI Journalist
let activeParty = null; // Current logged-in party context
let claimedRoles = []; // Roles pick by THIS current user
let syncInterval = null; 
let lastSyncData = null; // Store string of last fetched platform to avoid jitter

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

    if (revealContainer) revealContainer.classList.remove('show');
    const leftRev = document.getElementById('reveal-left');
    const rightRev = document.getElementById('reveal-right');
    if (leftRev) leftRev.classList.remove('active-reveal');
    if (rightRev) rightRev.classList.remove('active-reveal');

    if (agreeBtn) agreeBtn.style.display = 'none';
    if (disagreeBtn) disagreeBtn.style.display = 'none';

    if (card) {
        card.classList.remove('fade-in');
        void card.offsetWidth; 
        card.classList.add('fade-in');
    }

    if (currentQuestionIndex === -1) {
        if (statementText) statementText.innerText = "Ready to begin the Political Spectrum activity?";
        if (counter) counter.style.display = 'none';
        if (prevBtn) prevBtn.style.display = 'none';
        if (revealBtn) revealBtn.style.display = 'none';
        if (nextBtn) nextBtn.innerText = "Start Activity";
    } else if (currentQuestionIndex < politicalStatements.length) {
        const q = politicalStatements[currentQuestionIndex];
        if (statementText) statementText.innerText = q.text;
        if (counter) {
            counter.innerText = `Question ${currentQuestionIndex + 1} of ${politicalStatements.length}`;
            counter.style.display = 'block';
        }
        if (prevBtn) prevBtn.style.display = 'block';
        if (revealBtn) revealBtn.style.display = 'block';
        if (agreeBtn) agreeBtn.style.display = 'block';
        if (disagreeBtn) disagreeBtn.style.display = 'block';
        if (nextBtn) {
            nextBtn.style.display = 'block';
            nextBtn.innerText = currentQuestionIndex === politicalStatements.length - 1 ? "Finish Activity" : "Next Statement";
        }
    } else {
        if (statementText) statementText.innerText = "Activity Complete! Good luck building your parties.";
        if (counter) counter.style.display = 'none';
        if (prevBtn) prevBtn.style.display = 'block';
        if (revealBtn) revealBtn.style.display = 'none';
        if (agreeBtn) agreeBtn.style.display = 'none';
        if (disagreeBtn) disagreeBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
    }
}

function revealAlignment() {
    const revealContainer = document.getElementById('alignment-reveal');
    const q = politicalStatements[currentQuestionIndex];
    if (revealContainer) revealContainer.classList.add('show');
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
    console.log("HQ Init Sequence Started...");
    populatePlatformIssues();
    loadLocalData();
    checkSession(); 
    
    showToast("Syncing with HQ...");
    try {
        const response = await fetch(scriptURL);
        const data = await response.json();
        if (data && data.parties) {
            const parties = [];
            data.parties.forEach(p => {
                const name = (p.partyname || p.name || "Unknown").trim();
                const slogan = (p.slogan || "").trim();
                const existingIndex = parties.findIndex(existing => {
                    const exName = (existing.partyname || existing.name).trim();
                    const exSlogan = (existing.slogan || "").trim();
                    return (slogan.length > 5 && slogan === exSlogan) || 
                           (name.toLowerCase().includes(exName.toLowerCase()) && slogan === exSlogan);
                });
                if (existingIndex > -1) parties[existingIndex] = p;
                else parties.push(p);
            });
            registeredParties = parties;
        }
    } catch (err) {
        console.error("Cloud fetch failed", err);
    }
    renderParties();
}

async function loginToHQ() {
    const name = document.getElementById('login-party-name').value.trim();
    const pin = document.getElementById('login-party-pin').value.trim().toUpperCase();
    const errorEl = document.getElementById('login-error');

    if (!name || !pin) {
        showToast("Enter Name & PIN");
        return;
    }

    showToast("Verifying Credentials...");
    try {
        const res = await fetch(scriptURL, {
            method: 'POST',
            body: JSON.stringify({ type: 'authenticate', name, pin })
        });
        const result = await res.json();

        if (result.status === 'success') {
            activeParty = result.party;
            document.getElementById('login-overlay').classList.remove('active');
            document.getElementById('role-selection-overlay').classList.add('active');
        } else {
            errorEl.style.display = 'block';
            errorEl.innerText = result.message;
        }
    } catch (err) {
        console.error("Login Failed:", err);
        showToast("Server Connection Error");
    }
}

function setSessionState(party) {
    activeParty = party;
    sessionStorage.setItem('active_party', JSON.stringify(party));
    sessionStorage.setItem('claimed_roles', JSON.stringify(claimedRoles));
    document.getElementById('login-overlay').classList.remove('active');
    document.getElementById('role-selection-overlay').classList.remove('active');
    
    // SUSPENSE: We track approval but hide the bar
    updateApprovalUI(party.approval || 50);
    initWarRoom();

    if (party.platforms && party.platforms.length > 20) {
        unlockMediaTab();
    }
    
    // Start Background Sync
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(syncTeamProgress, 20000); // Every 20 seconds
    syncTeamProgress(); // Initial sync
}

function confirmRoles() {
    claimedRoles = [];
    if (document.getElementById('claim-comms').checked) claimedRoles.push('role-comms');
    if (document.getElementById('claim-strategy').checked) claimedRoles.push('role-strategy');
    if (document.getElementById('claim-finance').checked) claimedRoles.push('role-finance');

    if (claimedRoles.length === 0) {
        showToast("Select at least one role!");
        return;
    }
    
    setSessionState(activeParty);
    showToast("Roles Confirmed. Entering War Room...");
    switchTab('conference');
}

function checkSession() {
    const saved = sessionStorage.getItem('active_party');
    const savedRoles = sessionStorage.getItem('claimed_roles');
    if (saved) {
        activeParty = JSON.parse(saved);
        if (savedRoles) claimedRoles = JSON.parse(savedRoles);

        const overlay = document.getElementById('login-overlay');
        if (overlay) overlay.classList.remove('active');
        
        const roleOverlay = document.getElementById('role-selection-overlay');
        if (roleOverlay) roleOverlay.classList.remove('active');

        initWarRoom(); 
        if (activeParty.platforms && activeParty.platforms.length > 20) {
            unlockMediaTab();
        }
        
        // Resume sync
        if (syncInterval) clearInterval(syncInterval);
        syncInterval = setInterval(syncTeamProgress, 20000);
        syncTeamProgress();
    }
}

// WAR ROOM LOGIC
function initWarRoom() {
    const fields = ['role-comms', 'role-policy', 'role-finance'];
    
    // Update IDs because policy was mapped to strategy in the overlay but policy in HTML
    const roleMap = {
        'role-comms': 'role-comms',
        'role-strategy': 'role-policy',
        'role-finance': 'role-finance'
    };

    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // Only enable fields that this user has claimed
            const isClaimed = claimedRoles.some(roleId => roleMap[roleId] === id);
            
            if (!isClaimed) {
                el.disabled = true;
                el.style.opacity = "0.6";
                el.style.background = "rgba(0,0,0,0.1)";
                el.placeholder = "Reading teammate's live progress...";
            } else {
                el.disabled = false;
                el.style.opacity = "1";
                el.style.background = "var(--card-bg)";
            }

            el.addEventListener('keyup', () => {
                updateReadinessBar();
            });
        }
    });
    
    // Populate with existing data if available
    if (activeParty.platforms) {
        parseAndDistributePlatform(activeParty.platforms);
        const lockBtn = document.getElementById('lock-in-btn');
        if (lockBtn) lockBtn.innerText = "📢 Update Strategy & Re-Sync";
    }
}

function updateReadinessBar() {
    const commsEl = document.getElementById('role-comms');
    const policyEl = document.getElementById('role-policy');
    const financeEl = document.getElementById('role-finance');
    if (!commsEl || !policyEl || !financeEl) return;
    const c = commsEl.value.length;
    const p = policyEl.value.length;
    const f = financeEl.value.length;
    let progress = ((Math.min(c, 20) + Math.min(p, 30) + Math.min(f, 20)) / 70) * 100;
    const bar = document.getElementById('readiness-bar');
    if (bar) bar.style.width = progress + '%';
}

function parseAndDistributePlatform(text) {
    if (!text || text === lastSyncData) return;
    lastSyncData = text;

    const commsPart = text.split('POLICY:')[0].replace('COMMS:', '').trim();
    const policyPart = (text.split('POLICY:')[1] || "").split('FINANCE:')[0].trim();
    const financePart = (text.split('FINANCE:')[1] || "").trim();

    const roleMap = {
        'role-comms': 'role-comms',
        'role-strategy': 'role-policy',
        'role-finance': 'role-finance'
    };

    if (!claimedRoles.some(r => r === 'role-comms')) document.getElementById('role-comms').value = commsPart;
    if (!claimedRoles.some(r => r === 'role-strategy')) document.getElementById('role-policy').value = policyPart;
    if (!claimedRoles.some(r => r === 'role-finance')) document.getElementById('role-finance').value = financePart;
    
    updateReadinessBar();
}

async function syncTeamProgress() {
    if (!activeParty) return;
    
    const indicator = document.getElementById('sync-indicator');
    if (indicator) indicator.style.opacity = "1";
    
    try {
        // Fetch latest party data from server
        const response = await fetch(scriptURL);
        const data = await response.json();
        const serverParty = data.parties.find(p => (p.partyname || '').toLowerCase() === activeParty.partyname.toLowerCase());
        
        if (serverParty && serverParty.platforms) {
            parseAndDistributePlatform(serverParty.platforms);
        }

        // AUTO-SAVE our own role data to the server if we've typed something
        if (claimedRoles.length > 0) {
            const commsEl = document.getElementById('role-comms');
            const policyEl = document.getElementById('role-policy');
            const financeEl = document.getElementById('role-finance');
            if (!commsEl || !policyEl || !financeEl) return;
            const fullPlatform = `COMMS: ${commsEl.value.trim()}\nPOLICY: ${policyEl.value.trim()}\nFINANCE: ${financeEl.value.trim()}`;
            
            await fetch(scriptURL, {
                method: 'POST',
                body: JSON.stringify({
                    type: 'sync_platform',
                    name: activeParty.partyname,
                    platforms: fullPlatform
                })
            });
        }
    } catch (err) {
        console.warn("Sync failed, trying again later...");
    }
    
    setTimeout(() => {
        if (indicator) indicator.style.opacity = "0.5";
    }, 2000);
}

async function commitPlatform() {
    // Final Sync to avoid clobbering
    await syncTeamProgress();
    
    const comms = document.getElementById('role-comms').value.trim();
    const policy = document.getElementById('role-policy').value.trim();
    const finance = document.getElementById('role-finance').value.trim();

    if (comms.length < 15 || policy.length < 20 || finance.length < 15) {
        showToast("Strategy incomplete. All roles must finish their deliverables!");
        return;
    }

    const fullPlatform = `COMMS: ${comms}\nPOLICY: ${policy}\nFINANCE: ${finance}`;
    activeParty.platforms = fullPlatform;
    
    showToast("Launching Campaign...");
    const partyData = {
        type: 'party',
        partyname: activeParty.partyname,
        leader: activeParty.leader,
        color: activeParty.color,
        pin: activeParty.pin,
        members: activeParty.members,
        slogan: activeParty.slogan,
        platforms: fullPlatform
    };

    try {
        await fetch(scriptURL, { method: 'POST', body: JSON.stringify(partyData) });
        sessionStorage.setItem('active_party', JSON.stringify(activeParty));
        
        const lockBtn = document.getElementById('lock-in-btn');
        if (lockBtn) lockBtn.innerText = "📢 Update Strategy & Re-Sync";
        
        showToast("Campaign Updated!");
        unlockMediaTab();
        switchTab('press-room');
        
        // AUTOMATIC OPENING (Only on first launch ideally, but harmless to re-send)
        setTimeout(() => {
            submitToPress(`STRATEGY UPDATE BROADCAST:\n${fullPlatform}`);
        }, 800);
        
    } catch (err) {
        console.error("Platform commit failed:", err);
    }
}

function unlockMediaTab() {
    const btn = document.getElementById('press-scrutiny-btn');
    if (btn) {
        btn.classList.remove('disabled');
        btn.title = "Media Scrutiny Active";
    }
}

function updateApprovalUI(score) {
    const bar = document.getElementById('approval-bar');
    const pct = document.getElementById('approval-pct');
    if (bar && pct) {
        const value = Math.round(score);
        bar.style.width = value + '%';
        pct.innerText = value + '%';
    }
}

function bypassToRegister() {
    document.getElementById('login-overlay').classList.remove('active');
    switchTab('register');
}

function switchTab(tabId) {
    const btn = document.querySelector(`button[onclick=\"switchTab('${tabId}')\"]`);
    if (btn && btn.classList.contains('disabled')) {
        showToast("Finish the War Room strategist phase first.");
        return;
    }
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const target = document.getElementById(`${tabId}-tab`);
    if (target) target.style.display = 'block';
    if (btn) btn.classList.add('active');

    // RESTART SYNC if entering War Room
    if (tabId === 'conference') {
        if (syncInterval) clearInterval(syncInterval);
        syncInterval = setInterval(syncTeamProgress, 20000);
        syncTeamProgress();
    }
}

function populatePlatformIssues() {
    const list = document.getElementById('platform-issues-list');
    if (!list) return;
    list.innerHTML = '';
    platformIssues.forEach(issue => {
        const div = document.createElement('div');
        div.style.cssText = 'display: flex; gap: 0.5rem; align-items: center;';
        div.innerHTML = `<input type="checkbox" name="platform" value="${issue}" style=\"width: auto;\">
                         <label style=\"margin-bottom: 0; font-size: 0.8rem;\">${issue}</label>`;
        list.appendChild(div);
    });
}

async function submitToPress(manualMsg) {
    const inputEl = document.getElementById('press-chat-input');
    const sendBtn = document.getElementById('send-btn');
    const message = manualMsg || inputEl.value.trim();
    
    if (!message || (sendBtn && sendBtn.disabled)) return;

    // UI Throttling: Disable everything
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.style.opacity = "0.5";
        sendBtn.innerText = "WAIT...";
    }
    inputEl.disabled = true;

    // Auto-broadcast shows as system note, not student bubble
    if (manualMsg) {
        appendMessage('system', '📡 Your campaign platform has been broadcast to the press.');
    } else {
        appendMessage('student', message);
        inputEl.value = '';
    }
    
    chatHistory.push({ role: 'user', content: message });

    // Show Typing Indicator
    const typingId = "journalist-typing-" + Date.now();
    appendMessage('journalist', "📰 <i style='opacity:0.6'>Journalist is drafting a follow-up...</i>", typingId);

    try {
        const res = await fetch(scriptURL, { 
            method: 'POST', 
            body: JSON.stringify({
                type: 'chat',
                messages: chatHistory,
                partyContext: { name: activeParty.partyname, leader: activeParty.leader, slogan: activeParty.slogan }
            }) 
        });
        
        if (!res.ok) throw new Error("Server overloaded (404/500)");

        const result = await res.json();
        let isFinished = false;
        
        // Remove typing indicator
        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();

        if (result.status === 'success') {
            appendMessage('journalist', result.response);
            chatHistory.push({ role: 'assistant', content: result.response });
            
            // Consolidated approval update (no second fetch needed!)
            if (result.newApproval !== undefined) {
                activeParty.approval = result.newApproval;
                sessionStorage.setItem('active_party', JSON.stringify(activeParty));
                updateApprovalUI(activeParty.approval);
                if (activeParty.approval < 20) handleCampaignCrisis();
            }

            if (result.isComplete) {
                isFinished = true;
                setTimeout(() => {
                    appendMessage('system', "🎙️ PRESS SCRUM CONCLUDED: The journalists have filed their stories. Well done!");
                    if (inputEl) { inputEl.disabled = true; inputEl.placeholder = "Interview Complete. Wait for teacher instructions."; }
                    if (sendBtn) { sendBtn.disabled = true; sendBtn.innerText = "DONE"; sendBtn.style.opacity = "0.5"; }
                }, 1500);
            }
        } else {
            appendMessage('system', "⚠️ The journalist is busy. Please try again in a moment.");
        }
    } catch (err) { 
        console.error(err);
        const typingEl = document.getElementById(typingId);
        if (typingEl) typingEl.remove();
        appendMessage('system', "⚠️ Connection lost. The newsroom is currently congested. (404/Timeout)");
    } finally {
        // Cooldown before re-enabling
        setTimeout(() => {
            if (typeof isFinished !== 'undefined' && isFinished) return; // Don't re-enable if done
            
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.style.opacity = "1";
                sendBtn.innerText = "SEND";
            }
            inputEl.disabled = false;
            inputEl.focus();
        }, 3000); // 3-second mandatory cooldown
    }
}

function handleCampaignCrisis() {
    showToast("🚨 CAMPAIGN IN CRISIS: Redesigning Platform...");
    chatHistory = [];
    if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
    document.getElementById('press-chat-window').innerHTML = `<div class=\"journalist-msg\" style=\"border-left: 4px solid #ef4444;\">Your party has lost all public trust. The media has dropped your campaign. Go back to the War Room and re-draft a platform that Nova Scotians can believe in.</div>`;
    const mediaBtn = document.getElementById('press-scrutiny-btn');
    if (mediaBtn) mediaBtn.classList.add('disabled');
    // Clear the War Room fields so they must re-draft
    ['role-comms', 'role-policy', 'role-finance'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const bar = document.getElementById('readiness-bar');
    if (bar) bar.style.width = '0%';
    switchTab('conference');
}

function appendMessage(role, text, id) {
    const win = document.getElementById('press-chat-window');
    if (!win) return;
    const msg = document.createElement('div');
    if (id) msg.id = id;
    
    if (role === 'system') {
        msg.style.cssText = 'text-align: center; font-size: 0.75rem; color: var(--text-muted); padding: 0.5rem; font-style: italic;';
        msg.innerText = text;
    } else if (role === 'journalist') {
        msg.className = 'journalist-msg';
        msg.innerHTML = `<div style=\"font-size: 0.7rem; color: #ef4444; font-weight: 800; margin-bottom: 0.5rem;\">LIVE: INDEPENDENT NEWSROOM</div><div>${text}</div>`;
    } else {
        msg.className = 'student-msg';
        msg.innerText = text;
    }
    win.appendChild(msg);
    win.scrollTop = win.scrollHeight;
}

function renderParties() {
    const grid = document.getElementById('party-grid');
    if (!grid) return;
    const displayParties = registeredParties.filter(p => !(p.pin || '').toUpperCase().startsWith('T'));
    if (displayParties.length === 0) {
        grid.innerHTML = `<p style=\"grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem;\">No parties yet.</p>`;
        return;
    }
    grid.innerHTML = displayParties.map(p => `
        <div class=\"card party-card fade-in\">
            <div class=\"party-accent\" style=\"background: ${p.color};\"></div>
            <div class=\"party-content\">
                <h3>${p.partyname}</h3>
                <p>Led by ${p.leader}</p>
                <div class=\"tag-list\">${(p.platforms || "").split(', ').map(tag => `<span class=\"tag\">${tag}</span>`).join('')}</div>
            </div>
        </div>
    `).join('');
}

async function handlePartyRegistration(event) {
    event.preventDefault();
    const selected = Array.from(document.querySelectorAll('input[name="platform"]:checked')).map(cb => cb.value);
    const partyData = {
        type: 'party',
        partyname: document.getElementById('party-name').value,
        leader: document.getElementById('party-leader').value,
        color: document.getElementById('party-color').value,
        pin: document.getElementById('party-pin').value.toUpperCase(),
        members: document.getElementById('party-members').value,
        slogan: document.getElementById('party-slogan').value,
        platforms: selected.join(', ')
    };
    showToast("Registering Party...");
    try {
        await fetch(scriptURL, { method: 'POST', body: JSON.stringify(partyData) });
        showToast("Registered Successfully!");
        registeredParties.push(partyData);
        renderParties();
        document.getElementById('party-form').reset();
        setTimeout(() => switchTab('dashboard'), 1500);
    } catch (err) { console.error(err); }
}

async function submitGroupSurvey() {
    const orientation = document.querySelector('input[name="political-orientation"]:checked')?.value;
    const priorityIssue = document.getElementById('priority-issue').value;
    const name = document.getElementById('student-name').value.trim();
    const pin = document.getElementById('student-pin').value.trim().toUpperCase();
    if (!orientation || !priorityIssue || !name || pin.length !== 5) {
        showToast("Finish survey correctly.");
        return;
    }
    showToast("Syncing Profile...");
    try {
        await fetch(scriptURL, { method: 'POST', body: JSON.stringify({ type: 'profile', name, pin, orientation, priorityIssue }) });
        showToast("Profile Synced!");
    } catch (err) { console.error(err); }
}

async function analyzeTeamIdentity() {
    const names = [1,2,3].map(i => document.getElementById(`member-${i}-name`).value.trim()).filter(n => n !== "");
    if (names.length < 1) return;
    try {
        const res = await fetch(scriptURL);
        const data = await res.json();
        const found = names.map(n => data.profiles.find(p => p.name.toLowerCase() === n.toLowerCase())).filter(p => p);
        if (found.length < names.length) { showToast("Profiles missing."); return; }
        const orientations = found.map(m => m.orientation);
        const left = orientations.filter(o => o === 'left').length;
        const right = orientations.filter(o => o === 'right').length;
        let lean = (left > right) ? "Solid Left" : (right > left ? "Solid Right" : "Mixed");
        let color = (left > right) ? "var(--left-color)" : (right > left ? "var(--right-color)" : "orange");
        document.getElementById('matches-list').innerHTML = `<div class=\"card\"><h4>Team Lean: <span style=\"color:${color}\">${lean}</span></h4></div>`;
        document.getElementById('find-group-results').style.display = 'block';
    } catch (err) { console.error(err); }
}

function resetGroupSurvey() {
    const survey = document.getElementById('find-group-survey');
    if (survey) {
        survey.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.type === 'radio') el.checked = false;
            else el.value = '';
        });
    }
    const results = document.getElementById('find-group-results');
    if (results) results.style.display = 'none';
}

// Enter-key sends message in press room
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        const input = document.getElementById('press-chat-input');
        if (input && document.activeElement === input) {
            e.preventDefault();
            submitToPress();
        }
    }
});

function showToast(m) {
    const t = document.getElementById('toast');
    if (t) {
        t.innerText = m;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    }
}

function loadLocalData() {}
function saveLocalData() {}
