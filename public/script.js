
// === GLOBAL FUNCTIONS ===

async function loadRules(filterCategory = '') {
  let rules;

  // ✅ Load from localStorage if available
  const stored = localStorage.getItem("breRules");
  if (stored) {
    try {
      rules = JSON.parse(stored);
    } catch (e) {
      console.warn("Failed to parse breRules from localStorage, falling back to API.", e);
    }
  }

  if (!rules) {
    const res = await fetch('/api/rules');
    rules = await res.json();
  }

  const tableBody = document.getElementById('rulesTable');
  tableBody.innerHTML = '';

  const categories = new Set();

  rules.forEach((rule, index) => {
    const cat = rule.ruleTemplateGroupCategory || rule.category || '';
    categories.add(cat);

    if (!filterCategory || cat === filterCategory) {
      const value =
  typeof rule?.ruleConfig?.value === "string" && !rule?.ruleConfig?.value.includes("L")
    ? rule.ruleConfig.value
    : rule.operand?.operandDefinition?.find?.(op =>
        op.operandType === "CONSTANT" && !op.value?.includes("L") && !op.value?.includes("deviationRuleV2")
      )?.value || '';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td><input type="text" id="param-${rule.ruleId}" value="${rule.ruleCheckpointParameter || rule.parameter || ''}"></td>
        <td><input type="text" id="cat-${rule.ruleId}" value="${cat}"></td>
        <td><input type="text" id="val-${rule.ruleId}" value="${value}"></td>
        <td><input type="text" id="desc-${rule.ruleId}" value="${rule.ruleMetadata?.ruleDescription || rule.ruleDescription || ''}"></td>
        <td>
          <button onclick="saveRule('${rule.ruleId}')">Save</button>
          <button onclick="deleteRule('${rule.ruleId}')" style="margin-left: 5px; background-color: #dc3545;">Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    }
  });

  // ✅ Also update dropdowns and memory
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

  window.__breRules = rules;

  if (filterDropdown && categoryList) {
    categoryList.innerHTML = '';
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

    const rule = window.__breRules.find(r => r.ruleId === id);
if (rule) {
  rule.ruleCheckpointParameter = newParam;
  rule.ruleTemplateGroupCategory = newCategory;

  if (rule.ruleConfig) {
    rule.ruleConfig.value = newVal;
  } else {
    rule.value = newVal;
  }

  if (!rule.ruleMetadata) rule.ruleMetadata = {};
  rule.ruleMetadata.ruleDescription = newDescription;

  loadRulesFromMemory(); // 👈 refresh visible table row values
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

    window.__breRules = window.__breRules || [];
    window.__breRules.push(rule);

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

checkAuth();

// === Other helper functions like deleteRule, filterRulesByCategory ===

function downloadRules(latest = true) {
  const rules = window.__breRules || [];

  const jsonStr = JSON.stringify(rules, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;

  if (latest) {
    a.download = "breRules.json";
  } else {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.download = `breRules_${timestamp}.json`;
  }

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function uploadRules(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      console.log("Parsed JSON:", parsed);

      let rules = null;

      if (Array.isArray(parsed)) {
        rules = parsed;
      } else if (Array.isArray(parsed.rules)) {
        rules = parsed.rules;
      } else if (Array.isArray(parsed.data)) {
        rules = parsed.data;
      } else if (Array.isArray(parsed.breRules)) {
        rules = parsed.breRules;
      } else if (parsed?.metadata?.rules && Array.isArray(parsed.metadata.rules)) {
        rules = parsed.metadata.rules;
      } else if (Array.isArray(parsed.ruleUnitDtoList)) {
        rules = parsed.ruleUnitDtoList; // ✅ this is what your file actually contains
      }

      if (!rules) {
        throw new Error("Could not find a rules array in uploaded file.");
      }

      window.__breRules = rules;
      localStorage.setItem("breRules", JSON.stringify(rules));
      alert("Rules imported successfully!");


      // ✅ Safely load rules after DOM is ready
      setTimeout(() => {
        const table = document.getElementById("rulesTable"); // ✅ matches your DOM
        
        if (table) {
      loadRulesFromMemory(); // calls window.__breRules and populates table
        } else {
        alert("DOM not ready. Retrying load...");
        setTimeout(() => loadRulesFromMemory(), 100); // retry after short delay
        }
      }, 50);

    } catch (err) {
      alert("Error uploading rules: " + err.message);
    }
  };

  reader.readAsText(file);
}

// === Renders the rule table using the in-memory breRules array ===
// This is used after uploading a JSON file from the frontend,
// bypassing the backend API and directly displaying the imported rules.

function loadRulesFromMemory() {
  const ruleTable = document.getElementById("rulesTable");
  if (!ruleTable) {
    alert("Error: Could not find table body in DOM.");
    return;
  }
  ruleTable.innerHTML = ""; // Clear current content

  const rules = window.__breRules || [];
  rules.forEach((rule, index) => {
    const id = rule.ruleId || index;

    const param = rule.ruleCheckpointParameter || "";
    const category = rule.ruleTemplateGroupCategory || "";
    const description = rule.ruleMetadata?.ruleDescription || "";

    // ✅ ONLY use ruleConfig.value
    const value =
  typeof rule?.ruleConfig?.value === "string" && !rule?.ruleConfig?.value.includes("L")
    ? rule.ruleConfig.value
    : rule.operand?.operandDefinition?.find?.(op =>
        op.operandType === "CONSTANT" && !op.value?.includes("L") && !op.value?.includes("deviationRuleV2")
      )?.value || '';

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td><input type="text" id="param-${id}" value="${param}"/></td>
      <td><input type="text" id="cat-${id}" value="${category}"/></td>
      <td><input type="text" id="val-${id}" value="${value}"/></td>
      <td><input type="text" id="desc-${id}" value="${description}"/></td>
      <td>
        <button onclick="saveRule('${id}')">Save</button>
        <button onclick="deleteRule('${id}')">Delete</button>
      </td>
    `;
    ruleTable.appendChild(row);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const stored = localStorage.getItem("breRules");
  if (stored) {
    try {
      window.__breRules = JSON.parse(stored);
      loadRulesFromMemory();  // use stored data
    } catch (e) {
      console.warn("Error loading rules from localStorage on reload:", e);
    }
  } else {
    console.warn("No stored rules found. Upload a JSON to get started.");
  }
});

async function checkAuth() {
  document.getElementById('authStatus').innerHTML = '🔄 Checking login...';

  try {
    const res = await fetch('/auth/user', {
      credentials: 'include',
    });

    if (!res.ok) {
      console.warn('🔁 /auth/user failed, forcing fallback UI');
      throw new Error('No session found');
    }

    const user = await res.json();
    console.log('📦 Raw user response:', user);

    if (user && user.name && user.email) {
      document.getElementById('authStatus').innerHTML = `
        ✅ Logged in as <b>${user.name}</b> (${user.email})
        <a href="/auth/logout">Logout</a>
      `;
    } else {
      document.getElementById('authStatus').innerHTML = `
        ⚠️ Session error. Please log out and try again.
        <a href="/auth/logout">Logout</a>
      `;
    }

  } catch (err) {
    console.error('🚨 Auth error:', err);
    document.getElementById('authStatus').innerHTML = `
      ❌ Not logged in<br>
      <a href="/auth/google" id="loginLink">Login with Google</a>
    `;
  }
}

loadRulesFromMemory();
