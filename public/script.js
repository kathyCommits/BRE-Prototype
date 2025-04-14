async function loadRules() {
  const res = await fetch('/api/rules');
  const rules = await res.json();
  const tableBody = document.getElementById('rulesTable');
  tableBody.innerHTML = '';

  rules.forEach((rule, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
  <td>${index + 1}</td>
  <td><input type="text" id="param-${rule.ruleId}" value="${rule.ruleCheckpointParameter ?? ''}"></td>
  <td><input type="text" id="cat-${rule.ruleId}" value="${rule.ruleTemplateGroupCategory ?? ''}"></td>
  <td><input type="text" id="val-${rule.ruleId}" value="${rule.editableValue ?? ''}"></td>
  <td><input type="text" id="desc-${rule.ruleId}" value="${rule.ruleMetadata?.ruleDescription ?? ''}"></td>
  <td><button onclick="saveRule('${rule.ruleId}')">Save</button></td>
`;
    tableBody.appendChild(row);
  });
}

async function saveRule(id) {
  const newVal = document.getElementById(`val-${id}`).value;
  const newParam = document.getElementById(`param-${id}`).value;
  const newCategory = document.getElementById(`cat-${id}`).value;
  const newDescription = document.getElementById(`desc-${id}`).value;

  const res = await fetch(`/api/rules/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newValue: newVal, newParam, newCategory, newDescription })
  });

  alert(res.ok ? 'Rule updated!' : 'Error updating rule.');
}

loadRules();
