# Econ 12 Project Picker Setup Guide

This project consists of two main parts:
1.  **Google Apps Script (`Econ12_Backend.gs`)**: The engine that handles the data.
2.  **HTML Interface (`project-picker.html`)**: The user-facing dashboard.

## Setup Instructions

### 1. Create the Google Sheet
1.  Create a new Google Sheet named **Econ 12 Projects**.
2.  Open the **Extensions > Apps Script** menu.
3.  Delete any existing code and paste the content of `Econ12_Backend.gs`.
4.  Run the `initTopics` function once. This will create the `Topics`, `Suggestions`, and `Session` sheets with the 22 default topics.

### 2. Deploy the Web App
1.  In the Apps Script editor, click **Deploy > New Deployment**.
2.  Select **Web App**.
3.  Set "Execute as" to **Me**.
4.  Set "Who has access" to **Anyone**.
5.  Click **Deploy** and copy the **Web App URL**.

### 3. Configure the HTML
1.  Open `project-picker.html`.
2.  Find the line `const WEB_APP_URL = 'YOUR_APPS_SCRIPT_URL_HERE';`.
3.  Replace the placeholder with your copied Web App URL.
4.  Open the HTML file in any browser to view the picker.

## Teacher Features

- **Phase Control**: Triple-click the invisible 20x20px square in the top-left corner of the screen to open the Admin Panel (PIN: `9999`).
- **Topic Deletion**: In "Phase 1: Browse", you can delete any topic directly from the card.
- **Suggestion Approval**: New student suggestions will appear in the Admin Panel for approval.
- **First-Come-First-Serve**: Once you switch to "Phase 2: Selection", students can claim topics. The system uses a script lock to prevent two students from claiming the same topic at the same millisecond.

## Images
The system is configured to look for images in your project directory. To use the AI-generated images:
1.  Upload the `.png` files to a web-accessible location or your local project folder.
2.  Update the `Image` column in the Google Sheet with the direct link to each image.
