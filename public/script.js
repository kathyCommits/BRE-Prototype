// === GLOBAL FUNCTIONS ===

async function loadRules(filterCategory = '') {
  let rules;

  // ✅ Load from localStorage if available

  if (!rules) {
    const res = await fetch('/api/rules');
    rules = await res.json();
  }

  const tableBody = document.getElementById('rulesTable');
  tableBody.innerHTML = '';

  const categories = new Set();

  console.log("🧠 Loaded rules:", rules);
  console.log("🚀 Type of rules:", typeof rules, "Length:", rules.length);

  rules.forEach((rule, index) => {
    const cat = rule.ruleTemplateGroupCategory || rule.category || '';
    categories.add(cat);

    if (!filterCategory || cat === filterCategory) {
      console.log(`🧱 Rendering row ${index} → ruleId:`, rule.ruleId);

      let value = '';

      if (
        rule?.ruleConfig?.value !== undefined &&
        typeof rule.ruleConfig.value !== 'object' &&
        !String(rule.ruleConfig.value).includes("L")
      ) {
        value = rule.ruleConfig.value;      
      } else {
     const fallbackOp = rule.operand?.operandDefinition?.find(op =>
    op.operandType === "CONSTANT" &&
    typeof op.value === "string" &&
    !op.value.includes("L") &&
    !op.value.includes("deviationRuleV2")
  );

  // ✅ Only assign if fallbackOp and value are valid
  if (fallbackOp && typeof fallbackOp.value === "string") {
    value = fallbackOp.value;
  } else {
    value = ''; // ⛑️ Graceful fallback if nothing found
  }
}

      
      
            
          console.log(`✅ Rule ${index}: param=${rule.ruleCheckpointParameter}, val=${value}`);

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
    if (filterSelect) {
    filterSelect.innerHTML = '<option value="">All</option>';
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

  window.__breRules = []; // clear memory
  await loadRules(); // 👈 refresh visible table row values
}

    alert('Rule updated!');
    await saveProofSnapshot();

  } catch (err) {
    alert(`Error updating rule: ${err.message}`);
  }
}

// Utility function to save current JSON snapshot after proof upload

async function saveProofSnapshot() {
  const filename = localStorage.getItem('proofFilename');
  if (!filename) {
    console.warn("🛑 No proof filename set. Cannot save snapshot.");
    return;
  }

  try {
    const response = await fetch('/api/proof/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ filename, rules: window.__breRules }),
    });
    const result = await response.json();
    console.log("📸 Snapshot saved:", result.message);
  } catch (err) {
    console.error("❌ Error saving snapshot:", err);
  }
}

// Call this function after a rule is saved, deleted, or added
// Example:
// await submitValidatedRule(...);
saveProofSnapshot();

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

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: 'Not logged in' });
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
    await saveProofSnapshot();
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
    await saveProofSnapshot();
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
    try{
    row.innerHTML = `
      <td>New</td>
      <td><input type="text" id="param-${newId}" value="${param}"></td>
      <td><input type="text" id="cat-${newId}" value="manual"></td>
      <td><input type="text" id="val-${newId}" value="${value}"></td>
      <td><input type="text" id="desc-${newId}" value="${description}"></td>
      <td><button onclick="submitNewRule('${newId}')">Save</button></td>
    `;
    tableBody.prepend(row);
    } catch (err) {
      console.error(`❌ Error rendering rule ${index}`, rule, err);
    }

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

if (!localStorage.getItem("proofFilename")) {
  const addBtn = document.querySelector("button[onclick='addNewRule()']");
  if (addBtn) addBtn.disabled = true;
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

async function isUserLoggedIn() {
  try {
    const res = await fetch('/auth/user', { credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.email;
  } catch {
    return false;
  }
}

function uploadRules(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
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
      //localStorage.setItem("breRules", JSON.stringify(rules)); ❌
      await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rules }),
      });
      
      alert("Rules imported successfully!");

      // ✅ Safely load rules after DOM is ready
      setTimeout(() => {
        const table = document.getElementById("rulesTable"); // ✅ matches your DOM
        
        if (table) {
      loadRules();
        } else {
        alert("DOM not ready. Retrying load...");
        setTimeout(() => loadRules(), 100); // retry after short delay
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

document.addEventListener("DOMContentLoaded", () => {
  
  const proofUploaded = localStorage.getItem("proofFilename");

  if (proofUploaded) {
    loadRules(); // ✅ Always fetch from backend
  } else {
    console.warn("❌ Rules table blocked — no proof uploaded");
  }  

  const editableInputs = document.querySelectorAll('#rulesTable input, #rulesTable select, #rulesTable button');
  if (!proofUploaded) {
  editableInputs.forEach(input => input.disabled = true);
  }

  document.getElementById('uploadProofButton').addEventListener('click', async () => {
    try {
      const res = await fetch('/auth/user', {
        credentials: 'include'
      });
  
      if (!res.ok) {
        throw new Error("Not logged in");
      }
  
      const fileInput = document.getElementById('proofFileInput');
      fileInput.click();
  
      fileInput.onchange = async () => {
        const file = fileInput.files[0];
        if (!file) return;
  
        const formData = new FormData();
        formData.append('proofFile', file);
  
        const resultBox = document.getElementById('uploadResult');
        resultBox.textContent = 'Uploading...';
  
        try {
          const res = await fetch('/api/proof', {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });
  
          const result = await res.json();
  
          localStorage.setItem('proofFilename', result.metadata.filename);
  
          resultBox.innerHTML = `
          ✅ File uploaded successfully<br>
          Filename: ${result.metadata.filename}<br>
          Uploaded by: ${result.metadata.uploadedBy}<br>
          <button id="downloadSnapshotBtn">📥 Download Snapshot JSON</button>
          `;

          document.getElementById('downloadSnapshotBtn').addEventListener('click', () => {
          const filename = localStorage.getItem('proofFilename');
          if (!filename) return;
          // Open the latest snapshot (optional)
          const a = document.createElement('a');
          a.href = `/download/proof/${filename}.json`;
          a.download = `${filename}.json`;
          a.click();

          });

        } catch (err) {
          resultBox.innerHTML = '❌ Upload failed: ' + err.message;
        }
      };
    } catch (err) {
      alert("❌ You must be logged in to upload a proof document.");
    }
  });   

  const historyBtn = document.getElementById('toggleHistory');
  const historySection = document.getElementById('uploadHistorySection');
  const historyTable = document.getElementById('uploadHistoryTable');

  if (historyBtn && historySection && historyTable) {
  historyBtn.addEventListener('click', async () => {
    const currentlyVisible = historySection.style.display === 'block';
    historySection.style.display = currentlyVisible ? 'none' : 'block';
    historyBtn.textContent = currentlyVisible ? '📜 View Upload History' : '🙈 Hide Upload History';

    if (!currentlyVisible) {
      try {
        const res = await fetch('/api/proof/metadata', { credentials: 'include' });
        const data = await res.json();

        historyTable.innerHTML = ''; // Clear previous entries

        data.reverse().forEach(entry => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${entry.filename}</td>
            <td>${entry.uploadedBy}</td>
            <td>${entry.email}</td>
            <td>${new Date(entry.timestamp).toLocaleString()}</td>
            <td><a href="/download/proof/${entry.filename}">Download</a></td>
          `;
          historyTable.appendChild(row);
        });

      } catch (err) {
        historyTable.innerHTML = `<tr><td colspan="5">⚠️ Failed to load history</td></tr>`;
        console.error('Error loading proof metadata:', err);
      }
    }
  });
}
});

async function checkAuth() {
  const authStatus = document.getElementById('authStatus');
  let user = null;

  try {
    const res = await fetch('/auth/user', {
      credentials: 'include',
    });

    if (!res.ok) {
      console.warn('🔁 /auth/user failed, forcing fallback UI');
      throw new Error('No session found');
    }

    user = await res.json();
    console.log('📦 Raw user response:', user);

    const filename = localStorage.getItem('proofFilename');

    if (user?.name && user?.email) {
      authStatus.innerHTML = `
        ✅ Logged in as <b>${user.name}</b> (${user.email})
        <a href="/auth/logout">Logout</a>
      `;

      const uploadSection = document.getElementById('uploadSection');
      if (uploadSection) uploadSection.style.display = 'block';

      if (!filename) {
        console.warn("🟡 No proof uploaded yet");
      }
    } else {
      throw new Error("User data incomplete");
    }

  } catch (err) {
    console.error('🚨 Auth error:', err);
    if (authStatus) {
      authStatus.innerHTML = `
        ❌ Not logged in<br>
        <a href="/auth/google" id="loginLink">Login with Google</a>
      `;
    }
  }

  if (!user?.name || !user?.email) {
    localStorage.removeItem('proofFilename');
  }
}


async function handleJsonUploadClick() {
  const proofUploaded = localStorage.getItem('proofFilename');
  const loggedIn = await isUserLoggedIn();

  if (!loggedIn) {
    alert("❌ You must be logged in to upload rules.");
    return;
  }

  if (!proofUploaded) {
    alert("⚠️ Please upload a proof document before uploading JSON rules.");
    return;
  }

  // Now safely proceed
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = uploadRules;
  input.click();
}

