
// === GLOBAL FUNCTIONS ===

async function loadRules(filterCategory = '') {
  const res = await fetch('/api/rules');
  const rules = await res.json();
  const tableBody = document.getElementById('rulesTable');
  tableBody.innerHTML = '';

  const categories = new Set();

  rules.forEach((rule, index) => {
    const cat = rule.ruleTemplateGroupCategory || rule.category || '';
    categories.add(cat);

    if (!filterCategory || cat === filterCategory) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td><input type="text" id="param-${rule.ruleId}" value="${rule.ruleCheckpointParameter || rule.parameter || ''}"></td>
        <td><input type="text" id="cat-${rule.ruleId}" value="${cat}"></td>
        <td><input type="text" id="val-${rule.ruleId}" value="${rule.editableValue || rule.value || rule.ruleConfig?.value || ''}"></td>
        <td><input type="text" id="desc-${rule.ruleId}" value="${rule.ruleMetadata?.ruleDescription || rule.ruleDescription || ''}"></td>
        <td>
          <button onclick="saveRule('${rule.ruleId}')">Save</button>
          <button onclick="deleteRule('${rule.ruleId}')" style="margin-left: 5px; background-color: #dc3545;">Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    }
  });

  const filterSelect = document.getElementById('categoryFilter');
  if (filterSelect && filterSelect.options.length === 1) {
    [...categories].sort().forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      filterSelect.appendChild(opt);
    });
  }

  const filterDropdown = document.getElementById("categoryFilter");
const categoryList = document.getElementById("categories");

if (filterDropdown && categoryList) {
  categoryList.innerHTML = ''; // clear previous
  [...filterDropdown.options].forEach(opt => {
    if (opt.value && opt.value !== 'All') {
      const option = document.createElement("option");
      option.value = opt.value;
      categoryList.appendChild(option);
    }
  });
}
}

async function saveRule(id) {
  const valEl = document.getElementById(`val-${id}`);
  const paramEl = document.getElementById(`param-${id}`);
  const catEl = document.getElementById(`cat-${id}`);
  const descEl = document.getElementById(`desc-${id}`);

  if (!valEl || !paramEl || !catEl || !descEl) {
    alert('Some fields are missing from the DOM. Try using "All" in the filter.');
    return;
  }

  const newVal = valEl.value;
  const newParam = paramEl.value;
  const newCategory = catEl.value;
  const newDescription = descEl.value;

  try {
    const res = await fetch(`/api/rules/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newValue: newVal, newParam, newCategory, newDescription })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    alert('Rule updated!');
  } catch (err) {
    alert(`Error updating rule: ${err.message}`);
  }
}

function addNewRule() {
  const tableBody = document.getElementById('rulesTable');
  const newId = 'new-' + Math.random().toString(36).substr(2, 9);
  
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
  return submitValidatedRule(newId);
}

function validateRule(rule) {
  const val = parseFloat(rule.value);
  const validation = rule.validation;

  if (!validation || validation.type !== "threshold") return true;

  const operator = validation.operator;
  const target = validation.value;

  if (operator === ">=" && val < target) {
    alert(`${rule.parameter} must be greater than or equal to ${target}`);
    return false;
  }

  if (operator === "<=" && val > target) {
    alert(`${rule.parameter} must be less than or equal to ${target}`);
    return false;
  }

  return true;
}

async function submitValidatedRule(newId) {
  const param = document.getElementById(`param-${newId}`).value;
  const value = document.getElementById(`val-${newId}`).value;
  const category = document.getElementById(`cat-${newId}`).value;
  const description = document.getElementById(`desc-${newId}`).value;

  const rule = window.__pendingValidationRules?.[newId];
if (!rule) {
  alert("No rule found to validate");
  return;
}
delete window.__pendingValidationRules[newId]; // cleanup

  if (!validateRule(rule)) return;

  const res = await fetch(`/api/rules/${newId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      newValue: rule.value,
      newParam: rule.parameter,
      newCategory: rule.ruleTemplateGroupCategory,
      newDescription: rule.ruleDescription,
      validation: rule.validation
    })
  });

  if (res.ok) {
    alert('Validated rule added!');
    loadRules();
  } else {
    alert('Failed to add validated rule.');
  }
}

async function deleteRule(id) {
  if (!confirm("Are you sure you want to delete this rule?")) return;

  const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' });

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

// === DOM INITIALIZATION ===
document.addEventListener("DOMContentLoaded", function () {
  
  
  const thresholdSaveBtn = document.getElementById("saveBtn");
  if (thresholdSaveBtn) {
  thresholdSaveBtn.addEventListener("click", function () {
    const param = document.getElementById("parameter").value;
    const value = document.getElementById("value").value;
    const description = document.getElementById("description").value;
    const threshold = parseFloat(document.getElementById("threshold").value);
    const operator = document.getElementById("operator").value;
    const category = document.getElementById("category").value.trim().replace(/\b\w/g, c => c.toUpperCase());


    // Reuse addNewRule to insert a new row
    const newId = 'new-' + Math.random().toString(36).substr(2, 9);
    const tableBody = document.getElementById('rulesTable');
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>New</td>
      <td><input type="text" id="param-${newId}" value="${param}"></td>
      <td><input type="text" id="cat-${newId}" value="manual"></td>
      <td><input type="text" id="val-${newId}" value="${value}"></td>
      <td><input type="text" id="desc-${newId}" value="${description}"></td>
      <td><button onclick="submitNewRule('${newId}')">Save</button></td>
    `;
    tableBody.prepend(row);

    const rule = {
      ruleId: newId,
      parameter: param,
      value: value,
      ruleTemplateGroupCategory: category,
      ruleDescription: description,
      validation: {
        type: "threshold",
        operator: operator,
        value: threshold,
        parameter: param
      }
    };

    // Attach the validation rule inline to be read later in submitValidatedRule
    window.__pendingValidationRules = window.__pendingValidationRules || {};
    window.__pendingValidationRules[newId] = rule;

    // Call existing save logic
    submitNewRule(newId);
  });
}

    const categoryInput = document.getElementById("category");
    const categoryList = document.getElementById("categories");
    const filterDropdown = document.getElementById("categoryFilter");

  if (categoryInput && categoryList && filterDropdown) {
  [...filterDropdown.options].forEach(opt => {
    if (opt.value) {
      const newOpt = document.createElement("option");
      newOpt.value = opt.value;
      categoryList.appendChild(newOpt);
    }
  });
}

});

loadRules();
