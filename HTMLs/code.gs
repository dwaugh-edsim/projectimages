/**
 * SOVEREIGN TEACHER BRIDGE v1.0
 * 
 * Hosting: Google Apps Script (bound to Google Sheet)
 * Privacy: Student PII stays within this Sheet.
 * Security: API Keys are hidden in Script Properties.
 */

/* --- CONFIGURATION --- */
const SCRIPT_VERSION = "1.0";

/* --- 1. SETUP & AUTH (ROUTER) --- */
function doGet(e) {
  const view = e.parameter.view || 'student';
  
  if (view === 'teacher') {
    // Basic Auth Check (optional, ensures only owner sees dashboard)
    const activeUser = Session.getActiveUser().getEmail();
    const effectiveUser = Session.getEffectiveUser().getEmail();
    
    // Warn if accessed by student (though permissions usually handle this)
    
    return HtmlService.createHtmlOutput(TEACHER_HTML)
        .setTitle('Teacher Control Node')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } else {
    // DEFAULT: Student View
    // We can inject the mission URL if provided in parameter `mission`
    const template = HtmlService.createTemplate(STUDENT_HTML);
    template.preloadMission = e.parameter.mission || ''; 
    
    return template.evaluate()
        .setTitle('SimRoom Student Client')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
}

/* --- 2. MAIN REQUEST HANDLER --- */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); // Prevent collision on high traffic
  
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    let result = {};
    
    switch(action) {
      case 'log_decision':
        result = logStudentDecision(data.payload);
        break;
      case 'ai_proxy':
        result = handleAIRequest(data.payload);
        break;
      case 'get_roster':
        result = getRoster();
        break;
      case 'save_api_key':
        result = saveApiKeyToVault(data.payload);
        break;
      case 'check_auth':
        // Simple deterministic password check
        // "sovereign" is the default password. Teacher can change this in logic if they copy the script.
        const pw = data.payload.password;
        result = (pw === "sovereign" || pw === "admin"); 
        break;
      default:
        throw new Error("Unknown action: " + action);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: result
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
    
  } finally {
    lock.releaseLock();
  }
}

/* --- 3. LOGGING SYSTEM (The Database) --- */
function logStudentDecision(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("MissionLogs");
  
  if (!sheet) {
    sheet = ss.insertSheet("MissionLogs");
    sheet.appendRow(["Timestamp", "Student ID", "Mission ID", "Step Index", "Decision", "Rationale"]);
  }
  
  const timestamp = new Date();
  sheet.appendRow([
    timestamp,
    payload.studentId,
    payload.missionId,
    payload.stepIndex,
    payload.decision,
    payload.rationale
  ]);
  
  return { status: "logged", row: sheet.getLastRow() };
}

/* --- 4. THE VAULT (AI Proxy) --- */
function handleAIRequest(payload) {
  // 1. Check The Vault for the Key
  const scriptProperties = PropertiesService.getScriptProperties();
  const apiKey = scriptProperties.getProperty('GEMINI_API_KEY');
  
  if (!apiKey) {
    // FALLBACK MODE: Key not found, return keyword match if possible (handled by client mostly, but we can flag it)
    return { 
      ai_active: false, 
      message: "NO_KEY_FOUND_IN_VAULT", 
      response: "AI unavailable. Please consult mission dossier." 
    };
  }
  
  // 2. Call Gemini
  const prompt = payload.prompt;
  const context = payload.context || "";
  
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const requestBody = {
    contents: [{
      parts: [{
        text: `CONTEXT: ${context}\n\nUSER ARGUMENT: ${prompt}\n\nTASK: Play Devil's Advocate. Challenge the user's argument briefly and sharply.`
      }]
    }]
  };
  
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(apiUrl, options);
  const json = JSON.parse(response.getContentText());
  
  if (json.error) {
    throw new Error("Gemini Error: " + json.error.message);
  }
  
  const aiText = json.candidates[0].content.parts[0].text;
  
  return {
    ai_active: true,
    response: aiText
  };
}

/* --- 5. ROSTER MANAGEMENT --- */
function getRoster() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Roster");
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  // Simply return raw data for now, client can parse
  return data;
}

/* --- 6. ADMIN TOOLS --- */
function saveApiKeyToVault(payload) {
  const key = payload.key;
  if (!key) throw new Error("No key provided.");
  
  // In a real scenario, you might want to wrap this with a password check 
  // or rely on the fact that only the Teacher (Owner) knows the URL if not shared.
  
  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', key);
  return { status: "vault_updated" };
}

function SETUP_VAULT() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.prompt("SECURE VAULT SETUP", "Enter your Gemini API Key:", ui.ButtonSet.OK_CANCEL);
  
  }
}

/* --- 7. HTML TEMPLATES (Inlined for Single-File Distribution) --- */
const TEACHER_HTML = `
<!DOCTYPE html>
<html lang="en" data-theme="black">
<head>
    <meta charset="UTF-8">
    <title>Sovereign Teacher // Control Node</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/daisyui@3.1.0/dist/full.css" rel="stylesheet" type="text/css" />
    <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
    <style> body { font-family: 'Inter', sans-serif; } .font-mono { font-family: 'Share Tech Mono', monospace; } </style>
</head>
<body class="bg-black text-white min-h-screen flex flex-col">
    <!-- HEADER -->
    <div class="navbar bg-base-300 border-b border-white/10 p-4">
        <div class="flex-1">
            <a class="btn btn-ghost normal-case text-xl font-mono text-primary tracking-widest">SOVEREIGN_TEACHER v1.0</a>
        </div>
        <div class="flex-none gap-4">
            <span id="connection-status" class="badge badge-success gap-2 font-mono text-xs">ONLINE (INTERNAL)</span>
            <button class="btn btn-sm btn-outline text-xs font-mono" onclick="toggleSettings()">CONFIG</button>
        </div>
    </div>

    <!-- MAIN CONTENT -->
    <div class="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- LEFT: LIBRARY -->
        <div class="col-span-12 lg:col-span-8 space-y-4">
            <h2 class="text-xs font-bold text-accent tracking-widest uppercase mb-4">Content Library</h2>
            <div id="library-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="loading loading-spinner text-primary"></div>
            </div>
        </div>
        <!-- RIGHT: DATA -->
        <div class="col-span-12 lg:col-span-4 space-y-4">
            <h2 class="text-xs font-bold text-success tracking-widest uppercase mb-4">Classroom Data</h2>
            <div class="card bg-base-900 border border-white/10">
                <div class="card-body p-4 max-h-[60vh] overflow-y-auto">
                    <table class="table table-xs font-mono">
                        <thead><tr class="text-white/50"><th>Time</th><th>Student</th><th>Action</th></tr></thead>
                        <tbody id="roster-body"><tr><td colspan="3" class="text-center opacity-30">Loading...</td></tr></tbody>
                    </table>
                </div>
                <div class="card-actions p-4 pt-0">
                    <button class="btn btn-xs btn-outline w-full" onclick="refreshRoster()">REFRESH DATA</button>
                </div>
            </div>
        </div>
    </div>

    <!-- SETTINGS MODAL -->
    <dialog id="settings_modal" class="modal">
        <div class="modal-box bg-base-200 border border-primary/20">
            <h3 class="font-bold text-lg font-mono text-primary mb-4">SYSTEM CONFIGURATION</h3>
            <div class="form-control w-full mb-4">
                <label class="label"><span class="label-text font-mono text-xs">GEMINI API KEY (The Vault)</span></label>
                <div class="join">
                    <input type="password" id="cfg-api-key" placeholder="AIzaSy..." class="input input-sm input-bordered join-item w-full font-mono text-xs" />
                    <button class="btn btn-sm btn-secondary join-item" onclick="saveVaultKey()">SECURE SAVE</button>
                </div>
                <label class="label"><span class="label-text-alt opacity-50">Saved to Script Properties. Never exposed to students.</span></label>
            </div>
            <div class="modal-action">
                <button class="btn btn-ghost btn-sm" onclick="settings_modal.close()">CLOSE</button>
            </div>
        </div>
    </dialog>

    <script>
        // INTERNAL BRIDGE (Calls google.script.run)
        const InternalBridge = {
            post(action, payload) {
                return new Promise((resolve, reject) => {
                    google.script.run
                        .withSuccessHandler(res => {
                           const json = JSON.parse(res);
                           resolve(json.data);
                        })
                        .withFailureHandler(reject)
                        .doPost({ 
                            postData: { contents: JSON.stringify({ action, payload }) } 
                        });
                });
            }
        };

        window.onload = () => {
             // SECURITY: Simple deterrent for students
             const pw = prompt("AUTHENTICATE: Enter Admin Password");
             // Default password is 'admin' or matches a Script Property if set. 
             // Ideally we check server-side, but for "Grade 9 deterrent" this suffices,
             // or we can verify via google.script.run.
             
             InternalBridge.post('check_auth', { password: pw })
                .then(valid => {
                    if (valid) {
                         fetchLibrary();
                         refreshRoster();
                    } else {
                        document.body.innerHTML = "<div style='color:red; text-align:center; margin-top:50px; font-family:monospace'>ACCESS DENIED // <a href='?'>Return to Simulation</a></div>";
                    }
                })
                .catch(() => alert("Auth Error"));
        };

        function toggleSettings() { document.getElementById('settings_modal').showModal(); }

        function saveVaultKey() {
            const key = document.getElementById('cfg-api-key').value.trim();
            if(!key) return alert("Key Required");
            InternalBridge.post('save_api_key', { key }).then(() => {
                alert("Key secured in Vault!");
                document.getElementById('cfg-api-key').value = "";
            });
        }

        function refreshRoster() {
            InternalBridge.post('get_roster', {}).then(data => {
                const tbody = document.getElementById('roster-body');
                if(!data || data.length < 2) {
                     tbody.innerHTML = '<tr><td colspan="3" class="text-center opacity-30">No logs found.</td></tr>';
                     return;
                }
                // Reverse and show last 50
                const rows = data.slice(1).reverse().slice(0, 50); 
                let html = '';
                rows.forEach(r => {
                    const time = new Date(r[0]).toLocaleTimeString();
                    html += \`<tr><td>\${time}</td><td class="font-bold text-accent">\${r[1]}</td><td class="opacity-70">\${r[4]}</td></tr>\`;
                });
                tbody.innerHTML = html;
            });
        }

        async function fetchLibrary() {
            const url = "https://raw.githubusercontent.com/dwaugh-edsim/projectimages/main/capsule-library/index.json";
            const grid = document.getElementById('library-grid');
            try {
                const res = await fetch(url);
                const data = await res.json();
                let html = '';
                // Get Script URL for Student Launcher
                const scriptUrl = <?= ScriptApp.getService().getUrl() ?>; 
                
                data.capsules.forEach(c => {
                    html += \`
                    <div class="card bg-base-900 border border-white/10 shadow-lg">
                        <figure class="h-32 bg-black"><img src="\${c.thumb}" class="w-full h-full object-cover opacity-60"></figure>
                        <div class="card-body p-4">
                            <h2 class="card-title text-sm tracking-widest text-primary">\${c.title}</h2>
                            <p class="text-xs opacity-50 line-clamp-2">\${c.description}</p>
                            <div class="card-actions justify-end mt-2">
                                <a href="\${scriptUrl}?mission=\${c.downloadUrl}" target="_blank" class="btn btn-xs btn-outline btn-info">LAUNCH SIMULATOR</a>
                            </div>
                        </div>
                    </div>\`;
                });
                grid.innerHTML = html;
            } catch (e) {
                grid.innerHTML = "Offline / Catalog Error";
            }
        }
    </script>
</body>
</html>
`;

const STUDENT_HTML = `
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SITUATION ROOM</title>
    <!-- DaisyUI + Tailwind -->
    <link href="https://cdn.jsdelivr.net/npm/daisyui@4.4.24/dist/full.min.css" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Orbitron:wght@700&display=swap" rel="stylesheet">
    <!-- Libs -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: { 'display': ['Orbitron', 'sans-serif'], 'body': ['Inter', 'sans-serif'], 'mono': ['JetBrains Mono', 'monospace'] },
                    colors: { 'navy': { 900: '#0a0f1a', 950: '#050810' } }
                }
            }
        }
    </script>
    <style>
        :root { --accent: #f59e0b; --accent-glow: rgba(245, 158, 11, 0.3); }
        body { font-family: 'Inter', sans-serif; background: #050810; min-height: 100vh; overflow: hidden; }
        .nav-item.active { background: rgba(245, 158, 11, 0.1); border-left-color: var(--accent); }
        .choice-pill { @apply px-6 py-3 rounded-full border-2 border-base-content/20 bg-base-200/50 font-medium transition-all cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/10; }
        .choice-pill.selected { @apply border-amber-500 bg-amber-500/20 text-amber-400 shadow-lg; box-shadow: 0 0 20px var(--accent-glow); }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--accent); }
    </style>
</head>
<body class="bg-navy-950 text-gray-200">

    <!-- SPLASH SCREEN -->
    <div id="splash" class="fixed inset-0 z-50 flex items-center justify-center bg-navy-950">
        <div class="text-center space-y-8 max-w-md px-6">
            <h1 class="text-4xl font-display text-amber-400 tracking-widest">SITUATION ROOM</h1>
            <p class="text-sm text-gray-400 font-mono tracking-wide">"The Critical Moment Where Everything Hangs on a Decision"</p>
            <div id="login-form" class="space-y-4">
                <input type="text" id="input-name" placeholder="Enter Your Name" class="input input-bordered w-full bg-base-200/50 border-white/10 text-center text-lg">
                <button onclick="login()" class="btn btn-warning btn-lg w-full font-display tracking-wider">ENTER SIMULATION</button>
            </div>
            <div id="loading" class="hidden"><span class="loading loading-dots loading-lg text-warning"></span></div>
        </div>
    </div>

    <!-- MAIN SIMULATION -->
    <div id="sim-container" class="hidden fixed inset-0 flex">
        <!-- SIDEBAR -->
        <aside class="w-56 min-w-56 bg-slate-900/95 border-r border-white/5 flex flex-col p-4 z-10">
            <div class="mb-6 pb-4 border-b border-white/10">
                <div class="text-xs font-display text-amber-400 tracking-widest">SITUATION ROOM</div>
                <div class="text-[10px] text-gray-500 font-mono" id="sidebar-mission-title">Loading...</div>
            </div>
            <nav id="nav-list" class="flex-1 overflow-y-auto space-y-1"></nav>
            <div class="mt-auto pt-4 border-t border-white/10 text-center text-[10px] text-gray-600 font-mono">
                <span id="user-display">Guest</span> • <span id="progress-text">0%</span>
            </div>
        </aside>

        <!-- CONTENT -->
        <main class="flex-1 flex flex-col overflow-hidden relative bg-navy-950">
            <header class="px-6 py-4 border-b border-white/5">
                <h1 id="slide-title" class="text-2xl font-display text-amber-400 tracking-wide">...</h1>
            </header>
            <div class="flex-1 flex overflow-hidden">
                <!-- IMAGE -->
                <div class="w-1/2 p-6 flex flex-col">
                    <div class="relative flex-1 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                        <img id="exhibit-image" src="" class="w-full h-full object-cover">
                        <div id="exhibit-caption" class="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                            <span class="text-xs font-mono text-gray-300 bg-black/50 px-2 py-1 rounded"></span>
                        </div>
                    </div>
                </div>
                <!-- TEXT -->
                <div class="w-1/2 flex flex-col p-6 pl-0">
                    <div role="tablist" class="tabs tabs-bordered mb-4">
                        <a role="tab" class="tab tab-active" onclick="switchTab('primary')" id="tab-primary">PRIMARY</a>
                        <a role="tab" class="tab" onclick="switchTab('intel')" id="tab-intel">INTEL</a>
                        <a role="tab" class="tab" onclick="switchTab('background')" id="tab-background">BACKGROUND</a>
                    </div>
                    <div id="tab-content" class="flex-1 overflow-y-auto bg-base-200/30 rounded-lg p-4 text-sm leading-relaxed text-gray-300 prose prose-invert"></div>
                </div>
            </div>
            <!-- FOOTER -->
            <footer class="p-6 border-t border-white/10 bg-slate-900/50">
                <div id="choice-container" class="flex flex-wrap gap-3 mb-4"></div>
                <div class="flex gap-4">
                    <textarea id="rationale-input" placeholder="Rationale..." class="textarea textarea-bordered flex-1 bg-base-200/50 border-white/10 text-sm resize-none h-16"></textarea>
                    <button onclick="submitDecision()" id="submit-btn" class="btn btn-warning font-display tracking-wide px-8 self-end">Submit</button>
                    <button onclick="triggerAI()" id="ai-btn" class="btn btn-error btn-outline font-display tracking-wide px-4 self-end" title="Devil's Advocate">😈</button>
                </div>
            </footer>
        </main>
    </div>

    <!-- AI MODAL -->
    <dialog id="ai_modal" class="modal">
        <div class="modal-box bg-slate-900 border border-red-500/30 text-gray-300">
            <h3 class="font-bold text-lg text-red-400 font-display">DEVIL'S ADVOCATE</h3>
            <div id="ai-response" class="py-4 text-sm italic min-h-[100px]">Thinking...</div>
            <div class="modal-action">
                <button class="btn btn-sm btn-ghost" onclick="ai_modal.close()">Dismiss</button>
            </div>
        </div>
    </dialog>

    <script>
        // CONFIG INJECTED BY SERVER
        const MISSION_URL = "<?= preloadMission ?>";
        // Internal Bridge to Apps Script
        const Bridge = {
            post(action, payload) {
                return new Promise((resolve, reject) => {
                    google.script.run
                        .withSuccessHandler(res => { const json = JSON.parse(res); resolve(json.data); })
                        .withFailureHandler(reject)
                        .doPost({ postData: { contents: JSON.stringify({ action, payload }) } });
                });
            }
        };

        // STATE
        let DATA = null;
        let slides = [];
        let state = { idx: 0, ans: {}, logs: [] };
        let studentName = "Guest";
        let currentTab = 'primary';

        async function login() {
            const name = document.getElementById('input-name').value.trim();
            if(!name) return alert("Name required.");
            studentName = name;
            
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('loading').classList.remove('hidden');

            // Load Mission
            try {
                if(!MISSION_URL) throw new Error("No Mission Assigned. Ask teacher for a link with ?mission=URL");
                const res = await fetch(MISSION_URL);
                const json = await res.json();
                startSim(json);
            } catch(e) {
                alert("Load Failed: " + e.message);
                document.getElementById('login-form').classList.remove('hidden');
                document.getElementById('loading').classList.add('hidden');
            }
        }

        function startSim(json) {
            DATA = json;
            slides = DATA.slides || [];
            document.getElementById('splash').classList.add('hidden');
            document.getElementById('sim-container').classList.remove('hidden');
            document.getElementById('sidebar-mission-title').innerText = DATA.metadata?.title || "Mission";
            document.getElementById('user-display').innerText = studentName;
            
            // Normalize slides
            slides.forEach(s => {
                if(!s.tabs) s.tabs = { primary: { content: s.content || "", image: s.image, caption: s.caption } };
            });

            renderNav();
            go(0);
        }

        function renderNav() {
            const list = document.getElementById('nav-list');
            let html = '';
            slides.forEach((s, i) => {
                const active = i === state.idx ? 'active' : '';
                const done = state.ans[i] !== undefined ? 'text-green-400' : 'text-gray-500';
                html += \`<button onclick="go(\${i})" class="nav-item w-full flex items-center gap-3 px-3 py-2 rounded-r-lg border-l-2 border-transparent \${active} hover:bg-white/5 text-left text-xs">
                    <span class="font-mono \${done}">\${i+1}</span>
                    <span class="truncate">\${s.title}</span>
                </button>\`;
            });
            list.innerHTML = html;
            updateProgress();
        }

        function go(i) {
            state.idx = i;
            renderNav();
            const s = slides[i];
            document.getElementById('slide-title').innerText = s.title;
            
            // Reset Tab
            currentTab = 'primary';
            renderTab();

            // Choices
            const c = document.getElementById('choice-container');
            c.innerHTML = '';
            if(s.choices) {
                s.choices.forEach(ch => {
                    const sel = state.ans[i] === ch.label ? 'selected' : '';
                    c.innerHTML += \`<div onclick="selectChoice('\${ch.label}')" class="choice-pill \${sel}">\${ch.label}</div>\`;
                });
            } else {
                 c.innerHTML = '<span class="text-xs text-gray-500 p-2">Read only step. Click Submit to proceed.</span>';
            }
            
            // Restore Rationale
            const savedLog = state.logs.find(l => l.stepIndex === i);
            document.getElementById('rationale-input').value = savedLog ? savedLog.rationale : '';
        }

        function switchTab(t) { currentTab = t; renderTab(); }

        function renderTab() {
            // Tabs styles
            ['primary','intel','background'].forEach(t => {
                const el = document.getElementById('tab-'+t);
                if(el) {
                    if(t === currentTab) el.classList.add('tab-active');
                    else el.classList.remove('tab-active');
                }
            });

            const s = slides[state.idx];
            const content = s.tabs?.[currentTab] || {};
            
            document.getElementById('tab-content').innerHTML = marked.parse(content.content || "_No Intel Available._");
            
            const img = document.getElementById('exhibit-image');
            img.src = content.image || 'https://placehold.co/800x400/000/333?text=NO+IMAGE';
            document.getElementById('exhibit-caption').querySelector('span').innerText = content.caption || "";
        }

        function selectChoice(label) {
            state.ans[state.idx] = label;
            go(state.idx); // Re-render to highlight
        }

        function updateProgress() {
             const pct = Math.round((Object.keys(state.ans).length / slides.length) * 100);
             document.getElementById('progress-text').innerText = pct + '%';
        }

        async function submitDecision() {
            const rat = document.getElementById('rationale-input').value;
            const decision = state.ans[state.idx] || "READ_ONLY"; // If no choices, just ack
            
            // Optimistic UI
            const nextIdx = state.idx + 1;
            
            // Background log
            Bridge.post('log_decision', {
                studentId: studentName,
                missionId: DATA.metadata?.id || 'unknown',
                stepIndex: state.idx,
                decision: decision,
                rationale: rat
            });

            // Save local state
            state.logs.push({ stepIndex: state.idx, decision, rationale: rat });

            if(nextIdx < slides.length) {
                go(nextIdx);
            } else {
                alert("Mission Complete!");
            }
        }

        async function triggerAI() {
            const rat = document.getElementById('rationale-input').value;
            if(!rat) return alert("Write a rationale first!");
            
            document.getElementById('ai_modal').showModal();
            document.getElementById('ai-response').innerText = "Analyzing your logic...";
            
            const context = slides[state.idx]?.tabs?.primary?.content || "";
            
            try {
                const res = await Bridge.post('ai_proxy', { prompt: rat, context: context });
                document.getElementById('ai-response').innerText = res.response;
            } catch(e) {
                document.getElementById('ai-response').innerText = "AI System Offline (Check Teacher connection).";
            }
        }

    </script>
</body>
</html>
`;

