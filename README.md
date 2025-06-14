# 💡 BRE Prototype

This is a prototype for a lightweight front-end tool to create, view, and manage business rules visually using JSON logic. It features rule creation via a UI, inline rendering of JSON-based rule structures, and support for importing existing rule files.

---

## 🚀 Features

- Add/edit/delete rules via buttons on the UI  
- Auto-generates unique rule IDs  
- Displays rules in tabular format  
- Reads from and writes to a structured JSON format
- proto-Validation Layer for selected threshold rules
- Google OAuth
- Upload Proof of Request for changes to the Rules
- View table for changes made
- Supports importing existing `breRules.json` files  
- Built with Vanilla JS, HTML, CSS, and Node.js

---

## 📁 Folder Structure

BRE-Prototype/
├── data/  
│   └── breRules.json           # Sample rule data (importable)  
├── public/  
│   ├── index.html              # Main entry point  
│   ├── script.js               # JS logic for rule interaction  
│   └── static/  
│       └── js/  
│           └── main.js         # Simulated rendering of the BRE UI  
├── server.js                   # Optional Node.js server  
├── package.json                # Project metadata and dependencies  
├── package-lock.json  
└── README.md

---

## 🧑‍💻 Setup Instructions

> ⚠️ Prerequisite: Ensure [Node.js](https://nodejs.org) is installed on your machine.

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/BREEditor.git
cd BRE-Prototype
```

# 2. Install Dependencies
```
npm install
```
# 3. Start the App (Choose one of the two options below)
Option A: Open the app directly from your browser
```
# Navigate to the file manually:
# BRE-Prototype/public/index.html
# And double-click it to launch in your browser
```
Option B: Run it using the built-in Node.js server
```
node server.js
# Then open http://localhost:3000 in your browser
```

# Importing Rules
You can upload an existing breRules.json file (like the one in data/) through the UI to load saved rule sets.

## To Do ✏️

- Validation Layer
- Conditions and Dependencies (If-then conditions --> If age>65, then salary>65000)
- Add file upload UI to import breRules.json
- Export rules as downloadable JSON
- Validation and error highlighting for invalid rules
- Rule grouping, filtering, and search
- Improved UI styling with Tailwind or Bootstrap

