document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('addRule').addEventListener('click', addRule);
document.getElementById('resetStats').addEventListener('click', resetStats);

function restoreOptions() {
  chrome.storage.local.get(['rules', 'stats'], (result) => {
    const rules = result.rules || [];
    const stats = result.stats || { total: 0, byUser: {} };
    
    renderRules(rules);
    renderStats(stats);
  });
}

function addRule() {
  const usernameInput = document.getElementById('username');
  const keywordsInput = document.getElementById('keywords');
  
  const username = usernameInput.value.trim();
  const keywordsStr = keywordsInput.value.trim();
  
  if (!username) {
    alert('Username is required');
    return;
  }

  const keywords = keywordsStr ? keywordsStr.split(',').map(k => k.trim()).filter(k => k) : [];

  chrome.storage.local.get(['rules'], (result) => {
    const rules = result.rules || [];
    
    // Check if rule for user already exists, if so, update it? Or just append?
    // Let's prevent duplicates for simplicity for now, or just append.
    // Better to update if exists.
    const existingIndex = rules.findIndex(r => r.username === username);
    
    if (existingIndex > -1) {
        if (!confirm(`Rule for ${username} already exists. Overwrite?`)) {
            return;
        }
        rules[existingIndex] = { username, keywords };
    } else {
        rules.push({ username, keywords });
    }
    
    chrome.storage.local.set({ rules: rules }, () => {
      renderRules(rules);
      usernameInput.value = '';
      keywordsInput.value = '';
    });
  });
}

function deleteRule(username) {
  chrome.storage.local.get(['rules'], (result) => {
    const rules = result.rules || [];
    const newRules = rules.filter(r => r.username !== username);
    chrome.storage.local.set({ rules: newRules }, () => {
      renderRules(newRules);
    });
  });
}

function renderRules(rules) {
  const tbody = document.querySelector('#rulesTable tbody');
  tbody.innerHTML = '';
  
  rules.forEach(rule => {
    const tr = document.createElement('tr');
    
    const tdUser = document.createElement('td');
    tdUser.textContent = rule.username;
    tr.appendChild(tdUser);
    
    const tdKeywords = document.createElement('td');
    tdKeywords.textContent = rule.keywords.length > 0 ? rule.keywords.join(', ') : '(All comments)';
    tr.appendChild(tdKeywords);
    
    const tdAction = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'delete-btn';
    deleteBtn.onclick = () => deleteRule(rule.username);
    tdAction.appendChild(deleteBtn);
    tr.appendChild(tdAction);
    
    tbody.appendChild(tr);
  });
}

function renderStats(stats) {
  document.getElementById('totalDownvotes').textContent = stats.total || 0;
  
  const tbody = document.querySelector('#statsTable tbody');
  tbody.innerHTML = '';
  
  const byUser = stats.byUser || {};
  Object.keys(byUser).forEach(user => {
    const tr = document.createElement('tr');
    
    const tdUser = document.createElement('td');
    tdUser.textContent = user;
    tr.appendChild(tdUser);
    
    const tdCount = document.createElement('td');
    tdCount.textContent = byUser[user];
    tr.appendChild(tdCount);
    
    tbody.appendChild(tr);
  });
}

function resetStats() {
    if(confirm('Are you sure you want to reset all statistics?')) {
        chrome.storage.local.set({ stats: { total: 0, byUser: {} } }, () => {
            renderStats({ total: 0, byUser: {} });
        });
    }
}
