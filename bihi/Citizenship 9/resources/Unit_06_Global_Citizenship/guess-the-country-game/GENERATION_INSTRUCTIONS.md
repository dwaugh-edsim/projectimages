# Image Generation Instructions for Guess-the-Country Game

## Overview
This document provides step-by-step instructions for generating AI images for the guess-the-country game using the Image Forge tool and uploading them to R2 storage.

## Prerequisites
1. Access to [`image_forge.html`](../HTMLs/image_forge.html)
2. Google AI API key OR Google OAuth access
3. The [`prompts.csv`](prompts.csv) file with 20 country-specific prompts

## Step 1: Open Image Forge

1. Open [`image_forge.html`](../HTMLs/image_forge.html) in your web browser
2. The tool will initialize and display 20 prompt slots

## Step 2: Configure Google API Access

You have two options for accessing Google's Gemini 2.5 Flash model:

### Option A: Use API Key (Recommended)
1. In the header, ensure "Provider" is set to "GOOGLE"
2. Enter your Google AI Studio API key in the "API Key (Google)" field
3. Set "Model (Google)" to `gemini-2.0-flash-exp` (or the latest Flash model available)

### Option B: Use OAuth
1. Click "LOGIN WITH GOOGLE" button
2. Authorize the application
3. The button will turn green showing "GOOGLE LOGGED IN"

## Step 3: Load the Prompts

1. Copy the entire contents of [`prompts.csv`](prompts.csv)
2. Paste the CSV data into the "Batch Input" textarea at the top of the page
3. Click the "PARSE BATCH" button
4. You should see a toast message: "LOADED 20 PROMPTS"
5. Each slot will now contain a prompt for a different country

## Step 4: Generate All Images

1. Click the "GENERATE ALL" button in the header
2. The tool will sequentially generate images for all 20 prompts
3. Watch the debug console at the bottom for progress
4. Each slot will show:
   - "PROCESSING" status (yellow) during generation
   - "COMPLETE" status (green) when finished
   - A preview of the generated image

**Note:** Generation may take several minutes for all 20 images.

## Step 5: Review Generated Images

After generation completes:
1. Review each image by clicking on it to view full-size
2. If any image doesn't meet quality standards or has obvious AI artifacts:
   - Click the "RE-GEN" button for that specific slot
   - Or edit the prompt and regenerate

## Step 6: Upload All Images to R2

1. Click the "UPLOAD ALL TO R2" button in the header
2. Confirm the upload when prompted
3. The tool will:
   - Convert each image to JPG format (85% quality)
   - Upload to Cloudflare R2 storage
   - Copy the public URL to clipboard
4. Watch the debug console for progress

**Expected Output:**
- Each slot's R2 button will turn green with "✓ R2"
- Status will show truncated R2 URL
- Full URLs are available on hover
- A toast message will confirm completion

## Step 7: Save the URLs

After batch upload completes:
1. All 20 R2 URLs will be copied to your clipboard
2. Paste these URLs into a text file or spreadsheet for reference
3. Format should be:
   ```
   Slot 1: https://...
   Slot 2: https://...
   ...
   Slot 20: https://...
   ```

## Step 8: Create Game Data File

Create a JSON file with the game data:

```json
{
  "countries": [
    {
      "id": 1,
      "name": "Japan",
      "imageUrl": "https://[R2_URL_FOR_JAPAN]",
      "clues": [
        "The morning mist rises over terraced rice paddies...",
        "This nation has over 6,800 islands...",
        "Notice the distinctive wooden architecture with tiled roofs...",
        "Located in the Ring of Fire with frequent seismic activity...",
        "The capital city begins with 'T'..."
      ]
    },
    {
      "id": 2,
      "name": "Italy",
      "imageUrl": "https://[R2_URL_FOR_ITALY]",
      "clues": [
        "Golden afternoon light bathes narrow cobblestone streets...",
        "This boot-shaped peninsula has been the center of Western civilization...",
        "Notice the colorful buildings with wrought iron balconies...",
        "Mediterranean climate with hot, dry summers...",
        "The capital city was once the center of a vast empire..."
      ]
    }
    // ... continue for all 20 countries
  ]
}
```

## Troubleshooting

### Generation Fails
- **Error: "ALL GOOGLE TIERS EXHAUSTED"**: Check your API key or OAuth login
- **Error: "REFUSAL"**: The model refused the prompt - try rewording
- **Timeout**: Try generating in smaller batches (5-10 at a time)

### Upload Fails
- **Error: "R2 UPLOAD FAILED"**: Check your internet connection
- **Rate Limiting**: The tool includes 500ms delays between uploads
- **File Size**: Ensure images aren't excessively large

### Image Quality Issues
- **Distorted faces/hands**: Common AI artifact - regenerate
- **Gibberish text**: Expected - prompts specify "no readable text"
- **Unrealistic reflections**: Regenerate with adjusted prompt

## Tips for Better Results

1. **Batch Size**: If experiencing issues, generate in smaller batches
2. **Prompt Adjustment**: If images are too obvious, add "subtle" or "ambient" to prompts
3. **Lighting**: Different lighting conditions can change recognizability
4. **Review**: Always review images before uploading to R2

## Next Steps

After uploading all images:
1. Create the game HTML file using the generated URLs
2. Implement the clue system and scoring
3. Add the interactive guessing interface
4. Test with users to ensure appropriate difficulty

---

**File Locations:**
- Image Forge Tool: [`../HTMLs/image_forge.html`](../HTMLs/image_forge.html)
- Prompts File: [`prompts.csv`](prompts.csv)
- Game Concept: [`Game-idea.md`](Game-idea.md)
