# Adam Smith Market Results Generator

This script automatically fetches student submissions from the Google Apps Script webhook and generates the `answerresults.html` file.

## How It Works

1. The script fetches data from the Google Sheets webhook URL (the same URL embedded in `debrief_assignment.html`)
2. It parses each student's responses (definitions and scenario matches)
3. It grades the submissions against the marking key
4. It generates a new `answerresults.html` with all results

## API Keys (Optional - For AI-Generated Comments)

**Basic version works without any API keys!** The script will use template comments if no API key is provided.

**To enable AI-generated personalized comments using Z.ai (GLM-4.5):**

1. **Get your Z.ai API key:**
   - Go to [Z.ai Console](https://platform.z.ai/)
   - Sign in or create an account
   - Navigate to API Keys section
   - Create a new API key

2. **Add to GitHub Secrets:**
   - Go to your repository on GitHub
   - Click "Settings" → "Secrets and variables" → "Actions"
   - Click "New repository secret"
   - Name: `Z_AI_API_KEY`
   - Value: Paste your Z.ai API key
   - Click "Add secret"

3. **That's it!** The next workflow run will use AI to generate personalized comments for each student.

### Basic Version (No API Key)

**Good news:** The script works great without any API keys!

- The Google Apps Script webhook URL is already public (it's embedded in the student assignment page)
- The webhook is designed to return data publicly
- GitHub Actions can access it without authentication
- Template comments will be used instead of AI-generated ones

## Setup Instructions

### Option 1: GitHub Actions (Automatic - Recommended)

1. **Enable GitHub Actions** for your repository:
   - Go to your repository on GitHub
   - Click "Settings" → "Actions" → "General"
   - Ensure "Allow all actions" is selected

2. **The workflow is already configured** in `.github/workflows/update-results.yml`
   - Runs every 30 minutes automatically
   - Can be manually triggered from the Actions tab

3. **Test it manually first**:
   - Go to the "Actions" tab in your GitHub repo
   - Click "Update Student Results" workflow
   - Click "Run workflow" → "Run workflow"
   - Check if it completes successfully

### Option 2: Run Locally (Manual)

```bash
cd projectimages/AdamSmithMarket/Debrief/scripts
npm install
npm run update
```

## Customization

### Change the Schedule

Edit `.github/workflows/update-results.yml`:

```yaml
on:
  schedule:
    # Current: Every 30 minutes
    - cron: '*/30 * * * *'
    
    # Examples:
    # Every hour: 0 * * * *
    # Every 6 hours: 0 */6 * * *
    # Daily at 3pm: 0 15 * * *
```

### Update the Webhook URL

If your Google Apps Script URL changes, update it in `update-results.js`:

```javascript
const WEBHOOK_URL = "YOUR_NEW_WEBHOOK_URL";
```

## Troubleshooting

### "No changes to commit"
This is normal if no new submissions have been made since the last run.

### Webhook returns empty data
- Check that the Google Apps Script is deployed and accessible
- Verify the webhook URL is correct
- Test the URL in a browser to see if it returns JSON

### Students not appearing
- Ensure students have submitted their work through the assignment form
- Check that the webhook is receiving the data correctly

## File Structure

```
Debrief/
├── .github/
│   └── workflows/
│       └── update-results.yml    # GitHub Actions workflow
├── scripts/
│   ├── update-results.js         # Main script
│   ├── package.json              # Node.js dependencies
│   └── README.md                 # This file
├── answerresults.html            # Generated output
├── debrief_assignment.html       # Student submission form
└── markingkey.md                 # Answer key
```
