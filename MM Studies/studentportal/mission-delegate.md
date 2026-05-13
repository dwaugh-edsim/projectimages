# Delegate Briefing: MKS-11 Student Portal
**To:** Roo Code (Assistant)  
**From:** Antigravity  
**Project:** Success Portal for Student "Draeden"  
**Context:** Mi'kmaw Studies 11 (Nova Scotia Curriculum)

## 🎯 Your Objective
Create high-impact, visual assignment pages for **Missions 05 through 12**. These pages must be placed in `projectimages/MM Studies/studentportal/missions/m5.html` (and so on).

## 🎨 The Aesthetic (Decision Desk)
*   **Theme**: Dark Mode, Glassmorphism.
*   **Colors**: Vibrant accents (Primary varies by mission).
*   **Typography**: 'Inter' for body, 'Outfit' for headers.
*   **Layout**: A single centered `.briefing-card`.

## 🛰️ The Backend (Code.gs)
The portal uses a Google Apps Script webhook.
*   **Webhook URL**: `https://script.google.com/macros/s/AKfycbxg2PJjjedeu_wvSjxxII0aEqusA9-kvXF9or9RhKc_bwsyqC4ZGnV-6DA0Xng6xLOMiQ/exec`
*   **POST**: Sends `studentId`, `missionTitle`, `reflection`, `timestamp`.
*   **GET**: Receives `studentId` and `missionTitle`, returns `{ "content": "..." }`.

## ⚙️ The Required Logic (Logic Checklist)
Every mission page **MUST** include:
1.  **Cloud Retrieval on Load**: Check the Cloud for previous work.
2.  **Local Persistence**: Save to `localStorage` immediately on input.
3.  **Debounced Autosave**: Wait 2 seconds after typing stops, then POST to the webhook.
4.  **Live Sync Indicator**: A dot that pulses when saving and turns green when successful.

## 📝 Mission Outlines to Build
| ID | Title | Primary Color | Goal |
|----|-------|---------------|------|
| **M5** | Storyboard of Life | `#8b5cf6` (Purple) | Draw 6 stages of the Creation Story using symbols. |
| **M6** | The Secret Path | `#3b82f6` (Blue) | Map Chanie Wenjack’s journey (weather, tracks, shelter). |
| **M7** | TRC Report Card | `#10b981` (Green) | Rank the 10 most important Calls to Action. |
| **M8** | Medal of Friendship | `#f59e0b` (Gold) | Design a modern Treaty Medal. |
| **M9** | Ipperwash Ticker | `#ef4444` (Red) | Create 3 headlines for the Ipperwash news. |
| **M10** | The Justice Circle | `#06b6d4` (Cyan) | Map out a Healing/Sentencing Circle. |
| **M11** | Myth vs. Truth | `#ec4899` (Pink) | Compare Pocahontas film to the real Sarah. |
| **M12** | 2050 Vision | `#6366f1` (Indigo) | Visualize the community in the year 2050. |

## 🛠️ Boilerplate (Copy/Paste this Logic)
Use the script structure found in `missions/m4.html` as your master template. It has the best implementation of the Fetch/Retrieve logic.

---
**Good luck, Roo. Make it premium.** 🚀⚖️
