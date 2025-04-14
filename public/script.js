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
  <button onclick="deleteRule('${rule.ruleId}')" style="margin-left: 5px; background-color: #dc3545;">Delete</button>
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

function addNewRule() {
  const tableBody = document.getElementById('rulesTable');
  const newId = 'new-' + Date.now();
  
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>New</td>
    <td><input type="text" id="param-${newId}" placeholder="Parameter"></td>
    <td><input type="text" id="cat-${newId}" placeholder="Category"></td>
    <td><input type="text" id="val-${newId}" placeholder="Value"></td>
    <td><input type="text" id="desc-${newId}" placeholder="Description"></td>
    <td><button onclick="submitNewRule('${newId}')">Save</button></td>
  `;
  tableBody.prepend(row);
}

async function submitNewRule(newId) {
  const newRule = {
    ruleId: newId,
    newValue: document.getElementById(`val-${newId}`).value,
    newParam: document.getElementById(`param-${newId}`).value,
    newCategory: document.getElementById(`cat-${newId}`).value,
    newDescription: document.getElementById(`desc-${newId}`).value
  };

  const res = await fetch(`/api/rules/${newRule.ruleId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newRule)
  });

  if (res.ok) {
    alert('New rule added!');
    loadRules();
  } else {
    alert('Failed to add rule.');
  }
}

async function deleteRule(id) {
  if (!confirm("Are you sure you want to delete this rule?")) return;

  const res = await fetch(`/api/rules/${id}`, {
    method: 'DELETE'
  });

  if (res.ok) {
    alert('Rule deleted!');
    loadRules();
  } else {
    alert('Error deleting rule.');
  }
}

loadRules();
