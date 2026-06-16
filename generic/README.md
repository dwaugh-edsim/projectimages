# Generic Simulation & Telemetry Framework

This generic, subject-agnostic framework provides a premium starting point for creating live-syncing student assignments with matching teacher telemetry dashboards.

## Folder Contents
* `code.gs`: Google Apps Script backend template (deployed to Google Sheets).
* `student_assignment.html`: The student handout submission portal (includes autosaving and cloud sync).
* `dashboard.html`: The teacher-facing telemetry dashboard.

---

## Step-by-Step Setup Guide

### 1. Set Up the Google Spreadsheet
1. Create a new Google Spreadsheet.
2. Rename the default sheet tab from `Sheet1` to **`Submissions`** (exactly case-sensitive).
3. Leave the sheet blank; the script will initialize the headers automatically on the first save.

### 2. Deploy the Apps Script Web App
1. Inside the Google Spreadsheet, click **Extensions** > **Apps Script**.
2. Erase any default code in the editor and paste the contents of `code.gs`.
3. Save the project (click the floppy disk icon).
4. Click **Deploy** (top right) > **New deployment**.
5. Click the gear icon next to "Select type" and select **Web app**.
6. Set the configuration details:
   * **Description**: `Inquiry Telemetry Webhook`
   * **Execute as**: `Me (your-google-account)`
   * **Who has access**: `Anyone`
7. Click **Deploy**. Authorize permissions when prompted.
8. Copy the **Web App URL** provided at the end of deployment.

### 3. Connect the HTML Files
1. Open `student_assignment.html` and go to the script section near line 720:
   * Find `const API_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";` and paste your copied URL inside the quotes.
2. Open `dashboard.html` and go to the script section near line 655:
   * Find `const API_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";` and paste your copied URL inside the quotes.

---

## Customizing for New Assignments

### 1. Roster Customization
Student names and passcodes are base64-encoded to secure them against student inspection of the HTML file source code. 

To create your roster keys:
1. Open your browser console (F12) or any JS editor.
2. Run `btoa("Student Name (CODE)")` (e.g. `btoa("John Doe (JD99)")` outputs `IkpvaG4gRG9lIChKRDk5KSI=`).
3. Replace the `STUDENTS` array in both `student_assignment.html` and `dashboard.html` with your encoded keys:
   ```javascript
   const STUDENTS = [
     {"B": "Block A", "S": "IkpvaG4gRG9lIChKRDk5KSI="},
     ...
   ];
   ```

### 2. Customizing Questions
To add, edit, or remove questions:
1. **HTML Layout**: Edit the `<textarea>` elements in `student_assignment.html`. Make sure each textarea has a unique ID (e.g., `id="ans-q1-discovery"`).
2. **Dashboard HUD**: Update the `QUESTIONS` object in `dashboard.html` so the dashboard matches your textareas:
   ```javascript
   const QUESTIONS = {
       keys: [
           "ans-q1-discovery",
           "ans-q2-inquest",
           "ans-q3-synthesis"
       ],
       names: {
           "ans-q1-discovery": "Q1: Discovery",
           "ans-q2-inquest": "Q2: Inquest",
           "ans-q3-synthesis": "Q3: Synthesis"
       }
   };
   ```

### 3. Setting the Project/Simulation Name
Change `const SIMULATION_NAME` in both HTML files to a clean, URL-safe slug identifying the assignment (e.g. `economics-credit-card` or `history-treaty-circle`). Avoid special characters like em-dashes (`—`) to prevent character encoding errors.
