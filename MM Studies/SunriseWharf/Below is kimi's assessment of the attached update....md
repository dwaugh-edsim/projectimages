The following implementation instructions are optimized for Antigravity's workflow. This document captures Kimi’s latest critique of sunrise\_wharf\_2.html and details the exact programmatic fixes required to move the application to a production-hardened, pedagogically flawless state.

# **📋 Implementation Instructions for Antigravity**

**Target File:** sunrise\_wharf\_2.html  
**Focus:** Bug fixes, code hardening, design system alignment, and tonal calibration.

## **1\. CSS Stylesheet Maintenance & Refactoring**

### **Fix A: Clean up Dead Code & Style the Unit 01 Historical Banner**

The .constitutional-disclaimer class was previously added but never assigned. We will use it to clean up the messy inline styles on the Unit 01 Historical Note banner inside the MISSION\_DATA object, while also removing an inline style hack from the Retrospective Nav Link.

* **Task:** Locate the \<style\> block and add the new .nav-retrospective-title class.  
* **Code Update:**

CSS  
/\* Clean styling class for dynamic nav link insertion \*/  
.nav-retrospective-title {  
    color: var(--accent);  
    font-weight: bold;  
}

* **Task:** Navigate into the MISSION\_DATA array at the bottom of the file. Locate the slides\[0\].overview string. Swap out the heavy inline-styled wrapper div for the clean .constitutional-disclaimer class.  
* **Data Object Update:**

JavaScript  
// Locate slides\[0\].overview and modify the open tag:  
"overview": "\<div class='constitutional-disclaimer'\>\\n\<strong style='color: var(--accent); display: block; font-size: 0.95rem; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;'\>⚠️ HISTORICAL NOTE\</strong\>\\n\<strong\>Sunrise Harbour is fictional. But everything in this section absolutely happened.\</strong\>\\n\</div\>\\n\\nThis unit examines..."

## **2\. Hardening Javascript Logic Against State Faults**

### **Fix B: Catch Undefined State in Chapter 4 Journal Injection**

If a student navigates to Chapter 4's Intel feed without completing Chapter 3, studentSession.judgments\[2\] returns undefined. The code must handle this gracefully instead of leaving a broken user interface.

* **Task:** Inside switchTab(t), find the block matching currentSlideIndex \=== 3 && t \=== 'intel'. Update the conditional logic to incorporate a fallback string layout.  
* **Code Update:**

JavaScript  
if (currentSlideIndex \=== 3 && t \=== 'intel') {  
    const ch3Choice \= studentSession.judgments\[2\];  
    let journalInsert \= "";  
    if (ch3Choice \=== 'OPTION\_A') {  
        journalInsert \= \`\\n\\n\<p style="color:\#f59e0b; font-style:italic;"\>"The joint panel meeting we had last Thursday was heavy, but we actually sat in the same room and hammered out a single starting window together. It felt weird. It felt right. At least my dad isn't talking about organizing the blockades at the gate anymore."\</p\>\`;  
    } else if (ch3Choice \=== 'OPTION\_B') {  
        journalInsert \= \`\\n\\n\<p style="color:\#cbd5e1; font-style:italic;"\>"Jordan's crew is already out on the water dropping pots while our entire fleet is stuck tied to the cleat waiting for the commercial calendar to flip. The guys down at the union hall are furious. I didn't even know where to look when I saw Jordan at hockey practice yesterday."\</p\>\`;  
    } else {  
        // Hardening fix: Handle empty or broken state selection gracefully  
        journalInsert \= \`\\n\\n\<p style="color:\#64748b; font-style:italic;"\>\[Journal entry offline — timeline choice in Chapter 3 pending structural commit\]\</p\>\`;  
    }  
    rawBodyText \= rawBodyText \+ journalInsert;  
}

## **3\. Defensive Image Rendering & Typography Corrections**

### **Fix C: Retrospective Image Fallback Strategy**

NEWSPAPER\_VARIANTS introduces three asset paths (chapter6\_treaty.png, etc.). If an asset is missing locally, the simulation's capstone layout will display a broken image link.

* **Task:** Navigate to renderRetrospectiveNewspaper(). Find where target.innerHTML maps out the text strings. Inject an explicit runtime fallback handler onto the graphic element.  
* **Code Update:**

JavaScript  
// Locate the graphic wrapper inside target.innerHTML string interpolation:  
\<div class\="news-image-box"\>  
    \<img src\="${article.image}" onerror\="this.onerror=null; this.src='images/chapter6.png';"\>  
    \<div class\="caption"\>${article.caption}\</div\>  
\</div\>

### **Fix D: Copy-Editing Typo in MEDIATION\_DELAY**

* **Task:** Find the NEWSPAPER\_VARIANTS.MEDIATION\_DELAY.body property inside the static data definitions. Clean up the missing punctuation to preserve editorial polish.  
* **Text Correction:** Change "they didn't buy us time they bought us chaos" to "they didn't buy us time—they bought us chaos".

## **4\. DOM Concern Resolution: Class Separation on Dynamic Navigation**

### **Fix E: Refactor Dynamic Nav Rail Inline Styles**

* **Task:** Locate appendRetrospectiveNavLink(). Strip out the hardcoded inline color mapping assignments and apply the newly declared utility class.  
* **Code Update:**

JavaScript  
function appendRetrospectiveNavLink() {  
    if (document.getElementById('nav-retrospective')) return;  
    const rail \= document.getElementById('nav-rail');  
    const retroItem \= document.createElement('div');  
    retroItem.className \= 'nav-item';  
    retroItem.id \= 'nav-retrospective';  
    // Clean refactor: Class updates handle style architecture mapping  
    retroItem.innerHTML \= '\<div class="nav-ch"\>CONCLUSION\</div\>\<div class="nav-title class nav-retrospective-title"\>Retrospective Recoup\</div\>';  
    retroItem.onclick \= () \=\> {  
        document.querySelectorAll('.nav-item').forEach(el \=\> el.classList.remove('active'));  
        retroItem.classList.add('active');  
        document.getElementById('mission-briefing').style.display \= 'none';  
        document.getElementById('slide-viewer').style.display \= 'none';  
        document.getElementById('hud-container').classList.add('briefing-mode');  
        document.getElementById('retrospective-panel').style.display \= 'block';  
    };  
    rail.appendChild(retroItem);  
}

## **5\. Pedagogical Calibration: The Mediation Narrative Balance**

### **Fix F: Re-framing the Mediation Delay Outcome**

As Kimi observed, the current MEDIATION\_DELAY narrative can border on a structural chastisement of the student for choosing an otherwise legitimate administrative path. To preserve our teaching objective (evaluating the high friction of jurisdictional gridlock), we modify the text to ground the outcome in the failure of **this specific, delayed mediation process**, rather than declaring all consensus delays inherently broken.

* **Task:** Update the copy for NEWSPAPER\_VARIANTS.MEDIATION\_DELAY.body.  
* **Copy Update:**

JavaScript  
    body: \`\<p\>One year after the Sunrise Harbour Authority chose to defer immediate localized adjustments in favor of an outside federal mediator, the docks remain locked in administrative stagnation. Because formal arbitration failed to account for regional launch parameters and arrived weeks after the critical spring launch window, localized groups took tracking into their own hands, causing deep operational confusion and severe community friction.\</p\>  
           \<p\>"When the Authority was forced to wait on a third-party mandate with unaligned timelines, it didn't buy us a shared path—it bought us chaos," stated a local union organizer. The region remains a clear example of how external policy interventions can trigger severe unintended stalemates on the water if they fail to align with local requirements.\</p\>\`

### **Verification Checklist for Testing:**

1. Try running through the sim completely blind without answering Chapter 3—ensure Slide 4 Intel reveals the new placeholder text rather than breaking layout.  
2. Intentionally hit Chapter 6's **Seek Mediation** pathway. Ensure the retrospective cleanly tracks to the specific imagery, applies the punctuated em-dash string correction, and loads the contextualized pedagogical update.  
3. Click backward into Chapter 2 from the endgame retrospective screen. Confirm that the dynamic link labeled **Retrospective Recoup** is generated and clickable in the nav column, providing clean back-and-forth movement.