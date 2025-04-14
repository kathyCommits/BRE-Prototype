
Flow: 

 - Add JSON in the breRules file

 - Store array of rules in React state

 - Render them in a table. Each rule is shown as a row.

 - Click "Edit" ➝ copy that rule into formData. Update formData live as user types. Edit a rule. Edit button saves the index of the rule you want to edit.

 - Click "Save" ➝ update that rule in the main rules array

 - Re-render the table with updated data.


How is it happening:

 - Data Layer: breRules.js
   - Storing rule data here — this is a mini “database” for now. Can define 1 rule or 100 rules. Can become an upload, a Google Sheet fetch, or a backend API call.

- Presentation Layer: RuleTable.js
  - This is the UI component that renders the table, displays rule data, shows the edit modal and maps correct fields from the JSON to form inputs

 - Logic + State Layer: App.js
    - This is the brain of your app — the “glue”:


Folder Structure: 
src/
├── App.js                 ← Top-level manager (calls breRules)
├── components/
│   └── RuleTable.js       ← Renders table + modal
├── data/
│   └── breRules.js        ← Your sample rule(s)



