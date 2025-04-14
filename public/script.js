async function loadRules(filterCategory = '') {
  const res = await fetch('/api/rules');
  const rules = await res.json();
  const tableBody = document.getElementById('rulesTable');
  tableBody.innerHTML = '';

  const categories = new Set();

  rules.forEach((rule, index) => {
    const cat = rule.ruleTemplateGroupCategory ?? '';
    categories.add(cat);

    if (!filterCategory || cat === filterCategory) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td><input type="text" id="param-${rule.ruleId}" value="${rule.ruleCheckpointParameter ?? ''}"></td>
        <td><input type="text" id="cat-${rule.ruleId}" value="${cat}"></td>
        <td><input type="text" id="val-${rule.ruleId}" value="${rule.editableValue ?? rule.ruleConfig?.value ?? ''}"></td>
        <td><input type="text" id="desc-${rule.ruleId}" value="${rule.ruleMetadata?.ruleDescription ?? ''}"></td>
        <td>
          <button onclick="saveRule('${rule.ruleId}')">Save</button>
          <button onclick="deleteRule('${rule.ruleId}')" style="margin-left: 5px; background-color: #dc3545;">Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    }
  });

  // Populate dropdown
  const filterSelect = document.getElementById('categoryFilter');
  if (filterSelect && filterSelect.options.length === 1) {
    [...categories].sort().forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      filterSelect.appendChild(opt);
    });
  }
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

function filterRulesByCategory() {
  const selected = document.getElementById('categoryFilter').value;
  loadRules(selected);
}

loadRules();

