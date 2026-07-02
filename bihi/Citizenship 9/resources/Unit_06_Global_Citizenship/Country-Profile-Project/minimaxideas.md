# MiniMax Ideas for Country Profile Project - Citizenship 9

## Current State
The project has been significantly improved with scaffolding:
- Dashboard with 4 tabs: Instructions, Country Topics, Project Guide, Self-Assessment & Tools
- Research Process Guide (separate HTML file)
- Tuvalu example slideshow with visuals
- 36 country topics with research questions, themes, concepts, people, groups, events
- Interactive rubric checklist and citation generator tools
- Clickable topic cards that open detailed research guidance modals

## What's Working Well
1. **Topic modal system** - Students can click any available topic to see research guidance (themes, people, groups, events)
2. **Scaffolded example (Tuvalu)** - Clear 6-slide structure with real content
3. **Checkpoint system** - 4 milestones with visual progress
4. **Citation helper tools** - Interactive rubric and APA format reference
5. **Available topics section** - Students who missed selection day can see what's unclaimed

## Potential Improvements

### 1. ~~Student Progress Tracking~~ (Not viable - shared chromebooks)
localStorage, cookies, and any client-side persistence won't work because students use different chromebooks each period. Progress tracking would need a Google Sheet backend or similar cloud solution.

### 2. Real-time Topic Claims
**Problem:** Currently topics are hardcoded as claimed in the JavaScript - no persistence
- signup.html has Google Apps Script backend with real syncing
- country_profile_dashboard.html is the simpler static version

**Options:**
- Keep the simple dashboard but accept teacher manually updates claimedTopics
- Switch to signup.html's approach with Google Apps Script backend
- Add a Google Form for topic claims that populates a sheet the teacher monitors

### 3. ~~Local Storage Progress~~ (Not viable - shared chromebooks)
Students on shared chromebooks means localStorage is wiped between users.
Alternative ideas below.

### 4. Topic Search/Filter
**Status:** IMPLEMENTED
- Text input filters topics by country, issue, research questions, themes, and concepts
- Shows count of matching/available topics
- Works on the Country Topics tab

### 5. File Organization
**Current state:** Multiple files (dashboard, research guide, Tuvalu example, images)
- Consider if all resources should be in one folder for easy distribution
- The tuvalu-images-1 folder is referenced relatively but Tuvalu-Slides-Example.html needs the path adjusted

### 6. Mobile Responsiveness
**Current state:** Some elements may not display well on phones
- Topic grid could become single-column on small screens
- Modal full-screen on mobile instead of centered overlay

### 7. Content Updates
**Discrepancy found:** SPEC, signup.html, and country_profile_dashboard.html all have slightly different topic lists
- Could standardize the list and update SPEC to reflect actual implementation

## Quick Implementation Ideas (1-2 hours each)

1. **~~Topic search/filter~~** ✅ DONE - Text input filters topic cards by country, issue, themes, concepts
2. **Random topic picker** - Button for teacher to randomly assign remaining topics
3. **Visual countdown to due dates** - If teacher provides dates, show "X days until checkpoint 2"
4. **Print-friendly topic list** - A clean printable page students can take notes on during research

## Chromebook-Friendly Alternatives to LocalStorage

Since students use shared chromebooks, no client-side persistence is possible. Here are alternatives:

1. **Google Sheet as backend** - Similar to signup.html's Apps Script approach. Topics/claims stored in a Google Sheet that the dashboard reads on load. Requires deploying a Google Apps Script web app.

2. **Teacher-managed updates** - Keep the simple static dashboard. Teacher manually edits the `claimedTopics` object in the HTML when students claim topics. Low-tech but reliable.

3. **Google Form for claims** - Students submit a Google Form with their names and chosen topic ID. Teacher reviews and updates the dashboard periodically.

4. **Print-and-fill approach** - Provide a printable PDF handout where students write their checkpoint progress by hand. Teacher collects and reviews. Simplest option, no tech needed.

5. **Google Classroom integration** - Teacher posts checkpoint assignments in Google Classroom. Students submit work there. No dashboard changes needed.

## Lower Priority / Future Considerations

1. **Export functionality** - Students could export their research notes as a document
2. **Peer review system** - Partner with another pair to review drafts
3. **Voice recording practice** - Let students record practice presentations
4. **Differentiation** - Offer "challenge" extensions for advanced students (e.g., add 7th slide with deeper analysis)

## Technical Notes

- Dashboard currently at ~1876 lines, may need refactoring if more features added
- The topics array has detailed data for each country (questions, themes, concepts, people, groups, events)
- CSS uses CSS variables consistently, good for theming
- Modal system works but may need escape key handling verification
- Tuvalu-Slides-Example.html references `tuvalu-images-1/` relative path - ensure it works when deployed

## Files in Project
```
Country-Profile-Project/
├── country_profile_dashboard.html   (main student dashboard)
├── signup.html                       (signup version with backend)
├── Research-Process-Guide.html      (research methodology)
├── Tuvalu-Slides-Example.html       (visual slideshow example)
├── Tuvalu-info.txt                   (research content)
├── tuvalu-images-1/                  (image assets)
└── SPEC                             (project specification)
```