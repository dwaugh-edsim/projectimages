# TeacherMode Final UI Refinements

Restore missing UI controls and navigation aids to ensure a seamless "Forge" experience.

## Proposed Changes

### [Component] TeacherMode UI

#### [MODIFY] [teachermode.html](file:///c:/antigravity/simroom/Github%20Repos/projectimages/HTMLs/teachermode.html)

- **Add "Authorize Next Phase" button** to the input panel.
- **Update `addForgeChat`** to optionally include a "NEXT PHASE" button in AI responses.
- **Ensure `advancePhase`** correctly handles UI updates and provides feedback.
- **Add "Generate All" and "Save All"** buttons to the Assets screen if not already present or fully functional.

## Verification Plan

### Manual Verification
1.  Open `teachermode.html`.
2.  Navigate to the Forge tab.
3.  Check if the "Authorize Next Phase" button is visible and works.
4.  Confirm that AI responses in the Narrative phase include a "NEXT PHASE" button.
5.  Verify that clicking "NEXT PHASE" advances the pipeline correctly.
6.  Test the "Reset" button to ensure session clearing works.
