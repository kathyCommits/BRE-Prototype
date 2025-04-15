const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());

// Serve frontend build from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Load rules from file
const dataPath = path.join(__dirname, 'data/breRules.json');

app.get('/api/rules', (req, res) => {
  const json = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const rules = json.ruleUnitDtoList.map(rule => {
    let editableValue = null;

    if (rule.ruleConfig && rule.ruleConfig.value !== undefined) {
      editableValue = rule.ruleConfig.value;
    } else if (
      rule.operand?.operandDefinition?.[1]?.value !== undefined
    ) {
      editableValue = rule.operand.operandDefinition[1].value;
    }

    return {
      ruleId: rule.ruleId,
      ruleCheckpointParameter: rule.ruleCheckpointParameter,
      ruleTemplateGroupCategory: rule.ruleTemplateGroupCategory,
      ruleType: rule.ruleType,
      editableValue: editableValue,
      ruleMetadata: rule.ruleMetadata || { ruleDescription: '' }
    };
  });

  res.json(rules);
});


app.post('/api/rules/:id', (req, res) => {
  const { id } = req.params;
  const { newValue, newParam, newCategory, newDescription } = req.body;
  const json = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  let rule = json.ruleUnitDtoList.find(r => r.ruleId === id);

const isNewRule = !rule;
if (isNewRule) {
  rule = {
    ruleId: id,
    ruleCheckpointParameter: newParam || '',
    ruleTemplateGroupCategory: newCategory || '',
    ruleMetadata: { ruleDescription: newDescription || '' },
    ruleConfig: { value: newValue || '' }
  };
  json.ruleUnitDtoList.push(rule);
}

  // Write to ruleConfig.value if it exists, otherwise operandDefinition[1].value (only for old rules)
  if (!isNewRule) {
    //ruleConfig.value is already set in Creation block
    if (rule.ruleConfig && 'value' in rule.ruleConfig) {
      rule.ruleConfig.value = newValue;
    } else if (rule.operand?.operandDefinition?.[1]) {
      rule.operand.operandDefinition[1].value = newValue;
    } else {
      // Fallback: initialize ruleConfig if missing
      rule.ruleConfig = { value: newValue };
    }    
  }  

  // Update other editable fields if provided
if (newParam !== undefined) rule.ruleCheckpointParameter = newParam;
if (newCategory !== undefined) rule.ruleTemplateGroupCategory = newCategory;
if (newDescription !== undefined) {
  if (!rule.ruleMetadata) rule.ruleMetadata = {};
  rule.ruleMetadata.ruleDescription = newDescription;
}

  fs.writeFileSync(dataPath, JSON.stringify(json, null, 2));
  res.sendStatus(200);
});

app.delete('/api/rules/:id', (req, res) => {
  const { id } = req.params;
  const json = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const index = json.ruleUnitDtoList.findIndex(r => r.ruleId === id);
  if (index === -1) return res.status(404).send('Rule not found');

  json.ruleUnitDtoList.splice(index, 1);
  fs.writeFileSync(dataPath, JSON.stringify(json, null, 2));
  res.sendStatus(200);
});

// Fallback route to serve index.html for any unknown route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));