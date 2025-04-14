# brew-ui
Build a frontend for a basic BRE editor
***
# 🧠 Rule Editor – Dev Handoff (KT Summary)

## 🎯 Project Goal

Build a **UI for editing business rules** that are currently stored in a large JSON file (~4000 lines). The goal is to stop editing JSON manually and enable rule management via a clean, user-friendly interface.

---

## ✅ What’s Been Done So Far

### 1. React App Setup
- Created using `create-react-app`
- Node, npm, and Git set up locally
- Project pushed to GitHub: [https://github.com/sow451/brew-ui](https://github.com/sow451/brew-ui)

### 2. Folder Structure

src/ ├── App.js // Owns state & logic ├── components/ │ └── RuleTable.js // Renders rule table + edit modal ├── data/ │ └── breRules.js // Exports a sample rule for initial load (replace with actual)

### 3. Core Features
- `useState()` holds list of rules and editable state
- Table lists rules from `breRules.js`
- "Edit" button opens a modal with mapped form inputs
- `formData` handles temporary editing state
- `handleChange` and `handleNestedChange` update the form fields
- On “Save,” edited rule is updated in the state and re-rendered in the table

---

## 📦 Data Source

- Using a single sample rule in `breRules.js` for now
- Real JSON file `Eg policy.json` contains:
  - `policyDto` – metadata
  - `ruleUnitDtoList` – actual rule objects (~50)
- These rules will be loaded into state and rendered dynamically

---

## 🔁 JSON Management Strategy (V1)

✅ **Use frontend-only for now:**
- Load JSON into `useState`
- Allow editing in UI
- Provide a **“Download JSON”** button to export updated rule set

> 🟢 This is faster, requires no backend, and is great for internal workflows  
> 🟡 Backend save/versioning can be added later if needed

---
## Next Steps (To Be Built)
✅ Load all 50+ rules from ruleUnitDtoList

✅ Add delete, filter, and grouping (e.g., “Deviation Parameters”)

✅ Add JSON Download button

🛠 Add audit metadata form

📦 Export full ZIP (old + new + client request + changes + metadata)

📹 Add PostHog for replay

***

## 🔐 Audit Trail Requirements (To Be Built)

Before allowing users to download the updated JSON, collect the following mandatory inputs:

### Required Fields:
- Full name of person editing
- Official email ID
- Date of editing (auto-filled)
- Date of download (auto-filled at time of export)
- Description of changes requested (free text or auto-generated diff log)

### 📦 Downloadable ZIP Should Contain:
- `old-rules.json` – original file before edits
- `new-rules.json` – updated rule file
- `client-request.pdf` or `.xlsx` – uploaded file from client (if any)
- `diff-summary.xlsx` or `.pdf` – file showing all changes made (old vs new)
- `audit-metadata.json` or `.txt` – name, email, timestamps, etc.

> This ensures a traceable, compliant process for downstream teams or audits.

---

## 📹 PostHog for Session Replay (Optional but Recommended)

If a mistake is made and needs investigation, we want to be able to replay the user’s session.

### Why PostHog?
PostHog lets you capture:
- Full session replays
- Clicks, form entries, errors
- Timeline of user actions leading up to the mistake

### How to Install:

1. Sign up at [https://posthog.com](https://posthog.com) and create a project.
2. Copy your project’s **PostHog API key**.
3. Install the PostHog JS SDK:
   ```bash
   npm install posthog-js
4. Add this to your index.js:

import posthog from 'posthog-js';

posthog.init('YOUR_API_KEY_HERE', {
  api_host: 'https://app.posthog.com',
});
Optional: Add posthog.capture() calls for custom events like “rule edited”, “json downloaded”, etc. or set up some kind of auto-capture.

### How to use Ai to proceed further:
1. Use your AI assistant to:
 - Parse the full ruleUnitDtoList
 - Dynamically render/edit deeply nested fields (operandDefinition, etc.)
 - Build the audit form
 - Generate diffs between old and new JSON / Export .zip bundles using jszip, .xlsx using sheetjs, and PDF using jspdf




