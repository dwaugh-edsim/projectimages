# **Sunrise Wharf Simulation: Updated Implementation Plan**

**Date:** June 2, 2026  
**Objective:** Introduce narrative responsiveness via "Character Memory" (Direction 2\) and a "Newspaper Retrospective" (Direction 5\) into sunrise\_wharf.html while ensuring structural robustness based on targeted peer review fixes (handling fragile string replacement and explicit operational track mappings).

## ---

**1\. Structural Anchor Updates (Robust State Injection)**

To avoid fragile literal string replacements that break when lesson text is edited, explicit HTML comment anchors must be added directly into the MISSION\_DATA tabs inside sunrise\_wharf.html.

### **Modification A: Slide 3 (Bubs's Claim) Intel Tab Anchor**

Locate Slide 3 (Index 2\) in the MISSION\_DATA array, find its tabs.intel.body property, and place the dynamic anchor right under the header formatting:  
`<div style='font-style: normal; font-size: 0.7rem; font-weight: 600; color: #f59e0b; margin-bottom: 10px; letter-spacing: 0.5px;'>PERSONAL JOURNAL: BUBS</div>`  
`<!-- BUBS_JOURNAL_DYNAMIC_INSERT -->`

## ---

**2\. Core Simulation State & Tracking Logic**

Add the tracking profile calculation function to the script layout. Note that the logic inversion on Slide 4 is verified as conceptually accurate: Option B represents the Elder-Led track, and Option A represents the standardized Municipal/Bylaw track.  
`let studentSession = {`   
    `name: '',`   
    `block: '',`   
    `studentPin: '',`  
    `judgments: {},`   
    `rationales: {}`   
`};`

`/**`  
 `* Categorizes the student's operational methodology based on structural choice history.`  
 `* NOTE: Slide 4 logic is intentionally inverted: Option B is the Treaty path; Option A is the Bylaw path.`  
 `*/`  
`function getSessionPathProfile() {`  
    `const ch2 = studentSession.judgments[1]; // Slide 2: Jordan's Claim`  
    `const ch3 = studentSession.judgments[2]; // Slide 3: Bubs's Claim`  
    `const ch4 = studentSession.judgments[3]; // Slide 4: Role of Elders`  
    `const ch5 = studentSession.judgments[4]; // Slide 5: Living Treaty`  
      
    `let treatyLean = 0;`  
    `let bylawLean = 0;`  
      
    `if (ch2 === 'OPTION_A') treatyLean++; else if (ch2 === 'OPTION_B') bylawLean++;`  
    `if (ch3 === 'OPTION_A') treatyLean++; else if (ch3 === 'OPTION_B') bylawLean++;`  
    `if (ch4 === 'OPTION_B') treatyLean++; else if (ch4 === 'OPTION_A') bylawLean++;`  
    `if (ch5 === 'OPTION_A') treatyLean++; else if (ch5 === 'OPTION_B') bylawLean++;`  
      
    `if (treatyLean >= 3) return 'TREATY_DOMINANT';`  
    `if (bylawLean >= 3) return 'BYLAW_DOMINANT';`  
    `return 'BALANCED_COMPROMISE';`  
`}`

## ---

**3\. Interception Engine: Character Memory Injection**

Update the core switchTab(t) block to cleanly insert emotional variants before markdown processing takes place, leveraging the new stable HTML comment anchor.

## **`function switchTab(t) {`**     **`currentTab = t;`**     **`const s = MISSION_DATA.slides[currentSlideIndex];`**     **`document.querySelectorAll('.tab-link').forEach(el => el.classList.remove('active'));`**     **``document.getElementById(`tab-${t}`).classList.add('active');``**      **`const footnotes = document.getElementById('footnote-list');`**     **`footnotes.innerHTML = '';`**      **`// --- CHARACTER MEMORY INJECTION ENGINE ---`**     **`let rawBodyText = "";`**     **`if (t !== 'overview' && s.tabs[t]) {`**         **`rawBodyText = s.tabs[t].body;`**                  **`// Contextual Interception: Slide 3 (Bubs's Claim) primary tab reacts to Chapter 2 choice`**         **`if (currentSlideIndex === 2 && t === 'primary') {`**             **`const ch2Choice = studentSession.judgments[1];`**             **`if (ch2Choice === 'OPTION_A') {`**                 **`rawBodyText = "<div style='background: rgba(56, 189, 248, 0.04); border: 1px solid rgba(56, 189, 248, 0.2); border-left: 4px solid var(--accent); padding: 12px 16px; margin-bottom: 20px; font-size: 0.85rem; line-height: 1.5; color: #cbd5e1;'><strong>📋 HARBOUR AUTHORITY LOG MEMORY:</strong> Jordan looks visibly less tense at the wharf gate today. <em>'The Authority is actually listening,'</em> he mentions quietly. <em>'First time in my life I've seen the town management put our Treaty rights before local bylaws.'</em></div>\n\n" + rawBodyText;`**             **`} else if (ch2Choice === 'OPTION_B') {`**                 **`rawBodyText = "<div style='background: rgba(239, 68, 68, 0.04); border: 1px solid rgba(239, 68, 68, 0.2); border-left: 4px solid #ef4444; padding: 12px 16px; margin-bottom: 20px; font-size: 0.85rem; line-height: 1.5; color: #cbd5e1;'><strong>⚠️ HARBOUR AUTHORITY LOG MEMORY:</strong> Jordan's arms are crossed tightly as your truck idles by the slip. <em>'The Authority is using that old standard rulebook talk again,'</em> he tells a deckhand. <em>'My grandfather heard that exact same legal phrasing right before they cut his traps.'</em></div>\n\n" + rawBodyText;`**             **`}`**         **`}`**          **`// Contextual Interception: Slide 4 (Role of Elders) private journal log tab reacts to Chapter 3 timeline choice`**         **`if (currentSlideIndex === 3 && t === 'intel') {`**             **`const ch3Choice = studentSession.judgments[2];`**             **`let journalInsert = "";`**             **`if (ch3Choice === 'OPTION_A') {`**                 **`journalInsert = "\"The joint panel meeting we had last Thursday was brutal, but we actually sat in the same room and hammered out a single starting window together. It felt weird. It felt right. At least my dad isn't talking about loading up the blockades anymore...\"\n\n";`**             **`} else if (ch3Choice === 'OPTION_B') {`**                 **`journalInsert = "\"Jordan's crew is already out on the water dropping lines while our entire fleet is stuck at the dock waiting for the commercial calendar to flip. The guys down at the union hall are furious. I didn't even know where to look when I saw Jordan at hockey practice yesterday...\"\n\n";`**             **`}`**             **`rawBodyText = rawBodyText.replace("<!-- BUBS_JOURNAL_DYNAMIC_INSERT -->", journalInsert);`**         **`}`**     **`}`**     **`// ------------------------------------------`**      **`const mdToHtml = (text) => {`**         **`let html = text`**             **`.replace(/## (.*)/g, '`**

`$1`

## **`')`**             **`.replace(/\*\*(.*?)\*\*/g, '$1')`**             **`.replace(/\*(.*?)\*/g, '$1')`**             **``.replace(/\\[cite: (\\d+)\\]/g, (match, id) => `[${id}]`)``**             **`.replace(/\n/g, '<br>');`**                  **`html = html`**             **`.replace(/<(div|ul|ol|li|table|thead|tbody|tr|h2|h3|h4|p)([^>]*)><br>/g, '<$1$2>')`**             **`.replace(/<\\/(div|ul|ol|li|table|thead|tbody|tr|h2|h3|h4|p)><br>/g, '</$1>');`**         **`return html;`**     **`};`**      **`if (t === 'overview') {`**         **`` document.getElementById('body-content').innerHTML = ` ``**

`CHAPTER OVERVIEW`

`${mdToHtml(s.overview)}`  
`` `; ``  
        `document.getElementById('exhibit-img').src = s.tabs.primary.image;`  
        ``document.getElementById('exhibit-credit').innerText = `CH 0${currentSlideIndex + 1} PREVIEW`;``  
    `} else {`  
        `document.getElementById('body-content').innerHTML = mdToHtml(rawBodyText);`  
        `document.getElementById('exhibit-img').src = s.tabs[t].image;`  
        ``document.getElementById('exhibit-credit').innerText = `VISUAL RECORD: ${s.tabs[t].credit}`;``

        `const cites = [...rawBodyText.matchAll(/\\\\[cite: (\\\\d+)\\\\]/g)].map(m => m[1]);`  
        `const uniqueCites = [...new Set(cites)];`  
        `uniqueCites.forEach(id => {`  
            `const src = BIBLIOGRAPHY[id];`  
            `if (src) {`  
                `const li = document.createElement('div');`  
                `li.className = 'footnote-item';`  
                ``li.innerHTML = `[${id}] ${src.author} (${src.year}). <em>${src.title}.</em> <a href="${src.url}" target="_blank" rel="noopener noreferrer">${src.url}</a>`;``  
                `footnotes.appendChild(li);`  
            `}`  
        `});`  
    `}`  
`}`

## ---

**4\. End Game Newspaper Generation Engine**

Ensures that when Slide 6 is finalized, the active accord clauses are programmatically embedded directly within a dedicated timeline bookend article.  
`function renderRetrospectiveNewspaper() {`  
    `const profile = getSessionPathProfile();`  
    `const target = document.getElementById('retro-article-target');`  
    `const panel = document.getElementById('retrospective-panel');`  
      
    `const targetDate = new Date();`  
    `targetDate.setFullYear(targetDate.getFullYear() + 1);`  
    `const dateFormatted = targetDate.toLocaleDateString('en-US', {`  
        `weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'`  
    `}).toUpperCase();`

    `const s1 = document.getElementById('accord-s1').value.trim();`  
    `const s2 = document.getElementById('accord-s2').value.trim();`  
    `const s3 = document.getElementById('accord-s3').value.trim();`

    `let headline = "";`  
    `let articleContent = "";`

    `if (profile === 'TREATY_DOMINANT') {`  
        `headline = "SUNRISE WHARF ACCORD MARKS ONE YEAR: RECONCILIATION MODEL HOLDS STRONG THROUGH FIRST SEASONS";`  
        `` articleContent = ` ``  
            `<p>One year after the highly contested implementation of the 2026 Sunrise Harbour Wharf Accord, the regional maritime sector reports historic stability, with zero administrative infractions registered over the combined fishing windows. By organizing the physical logistics of the docks around constitutional Treaty primacy first, the authority has set an infrastructural blueprint that is drawing deep attention across the Atlantic provinces.</p>`  
            `<p>"We still argue over line space and mechanics," noted <strong>Jordan</strong>, speaking from his family's slip. "But we are arguing across an administrative table now, not across a blockaded wharf gate. Having our inherent rights verified before we even step onto the concrete changed everything for our crew."</p>`  
        `` `; ``  
    `} else if (profile === 'BYLAW_DOMINANT') {`  
        `headline = "REGULATORY ACCORD FACES JURISDICTIONAL CHALLENGE: SUPREME COURT INQUIRY PENDING AT SUNRISE HARBOUR";`  
        `` articleContent = ` ``  
            `<p>Twelve months following the enactment of the centralized rules framework at Sunrise Harbour, the wharf finds itself returning to the spotlight of legal scrutiny. While local municipal authorities boast that uniform, bylaw-first operations have ensured total mechanical alignment, legal representatives for the First Nation have officially filed a non-compliance claim against the administration, citing violations of the Honour of the Crown.</p>`  
            `<p>Local commercial fishers like <strong>Bubs</strong> have voiced relief over uniform enforcement standards but remain uneasy about long-term stability. "The dock operations feel safe day-to-day, but the atmosphere is quiet. We're waiting to see if the legal system is going to pull this entire system apart by winter," he added.</p>`  
        `` `; ``  
    `} else {`  
        `headline = "SUNRISE HARBOUR REPORT CARD: 'GRUDGING RESPECT' STABILIZES THE DOCK AFTER EXPERIMENTAL YEAR";`  
        `` articleContent = ` ``  
            `<p>One year into the compromise framework brokered under the 2026 Wharf Accord, Sunrise Harbour serves as a living laboratory for cautious co-management. Moving away from total state enforcement and pure unilateral declarations, the local panel has maintained an operational peace characterized by mutual compromise and a delicate, day-to-day coordination of resources.</p>`  
            `<p>"We aren't best friends out here," remarked <strong>Bubs</strong> while unloading his morning catch alongside Jordan's crew. "But we aren't cutting each other's lines either. We share the space because we know our families have to live together in the same town."</p>`  
        `` `; ``  
    `}`

    `` target.innerHTML = \` ``  
        `<div class="news-header">`  
            `<div class="news-masthead">The Sunrise Chronicle</div>`  
            `<div class="news-meta">`  
                `<span>\${dateFormatted}</span>`  
                `<span>VOL. CXXXIV NO. 104</span>`  
              
          
        `<div class="news-headline">\${headline}</div>`  
        `<div class="news-body">`  
            `<div class="news-image-box">`  
                `<img src="images/chapter6.png" style="width:100%; filter: grayscale(1) contrast(1.2);">`  
                `<div class="caption">RETROSPECTIVE RECORD: Dock infrastructure operations functioning under the verified 2026 protocol framework.</div>`  
              
            `\${articleContent}`  
            `<div class="quote-box" style="border-left: 4px solid #0f172a; padding: 15px; margin: 20px 0; background: rgba(0,0,0,0.03); font-style: italic;">`  
                `<strong>THE RECORDED SYSTEM PROTOCOL (COMPILED IN ACCORD):</strong><br><br>`  
                `"\${s1}"<br><br>`  
                `"\${s2}"<br><br>`  
                `"\${s3}"`  
              
          
    ``\`;``

    `panel.style.display = "block";`  
`}`  
