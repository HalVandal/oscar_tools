
const toggleTabs = document.getElementById('toggleTabs');
const tabExclusions = document.getElementById('tabExclusions');

function setTabExclusionsDisabled(disabled) {
  const inputs = tabExclusions.querySelectorAll('input')
  inputs.forEach(input => input.disabled = disabled)

}

// storageKey is the element id
function setupToggle(storageKey) {
  const toggle = document.getElementById(storageKey);
  chrome.storage.sync.get([storageKey], function(result) {
    toggle.checked = !!result[storageKey];
    if (storageKey === "toggleTabs") {
      setTabExclusionsDisabled(!toggle.checked);
    }
  });
  toggle.addEventListener('change', function() {
    chrome.storage.sync.set({ [storageKey]: toggle.checked });
 
  });
}

// Automatically setup all checkboxes
document.querySelectorAll('input[type="checkbox"]').forEach(function(checkbox) {
  setupToggle(checkbox.id);
});

// Listen to see if tab exclusions need to be enabled/disabled
toggleTabs.addEventListener('change', function() {
  const inputs = tabExclusions.querySelectorAll('input')
  inputs.forEach(input => input.disabled = !toggleTabs.checked)


});


// Setup dropdown for search mode
function setupDropdown(storageKey, selectElement) {
  // Load saved value
  chrome.storage.sync.get([storageKey], function(result) {
    if (result[storageKey]) {
      selectElement.value = result[storageKey];
    }
  });
  
  // Save when changed
  selectElement.addEventListener('change', function() {
    chrome.storage.sync.set({ [storageKey]: selectElement.value });
  });
}

// Setup the search mode dropdown
const searchModeSelect = document.querySelector('.searchModeOptions');
if (searchModeSelect) {
  setupDropdown('defaultSearchMode', searchModeSelect);
}

// Saved queries: dynamic list backed by `savedQueries_ids` + one `sq_<id>` item per query.
// One-time migration converts legacy query1..query5 keys. `legacy_N` ids make the
// migration idempotent across devices, so a re-run can't create duplicates.
function migrateLegacySavedQueries(callback) {
  chrome.storage.sync.get(['savedQueries_migrated'], function(flag) {
    if (flag.savedQueries_migrated) { callback(); return; }
    chrome.storage.sync.get(null, function(all) {
      const ids = Array.isArray(all.savedQueries_ids) ? all.savedQueries_ids.slice() : [];
      const writes = {};
      for (let i = 1; i <= 5; i++) {
        const name = all[`query${i}_name`] || '';
        const sql = all[`query${i}_text`] || '';
        if (!name && !sql) continue;
        const id = `legacy_${i}`;
        if (!ids.includes(id)) ids.push(id);
        writes[`sq_${id}`] = { name, sql, enabled: !!all[`query${i}`] };
      }
      writes.savedQueries_ids = ids;
      writes.savedQueries_migrated = true;
      chrome.storage.sync.set(writes, callback);
    });
  });
}

function buildSavedQueryRow(id, entry) {
  const row = document.createElement('div');
  row.dataset.id = id;
  row.style.cssText = 'display: flex; align-items: center; gap: 10px; margin: 8px 0; padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px;';

  const enabledLabel = document.createElement('label');
  enabledLabel.style.cssText = 'display: flex; align-items: center; gap: 4px; flex: 0 0 auto;';
  const enabledCheckbox = document.createElement('input');
  enabledCheckbox.type = 'checkbox';
  enabledCheckbox.checked = !!entry.enabled;
  enabledCheckbox.addEventListener('change', function() {
    updateSavedQueryField(id, 'enabled', enabledCheckbox.checked);
  });
  enabledLabel.appendChild(enabledCheckbox);
  enabledLabel.appendChild(document.createTextNode('Enable'));

  const nameLabel = document.createElement('label');
  nameLabel.style.cssText = 'display: flex; align-items: center; gap: 4px; flex: 0 0 auto;';
  nameLabel.appendChild(document.createTextNode('Button Text:'));
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = entry.name || '';
  nameInput.addEventListener('input', function() {
    updateSavedQueryField(id, 'name', nameInput.value);
  });
  nameLabel.appendChild(nameInput);

  const sqlLabel = document.createElement('label');
  sqlLabel.style.cssText = 'display: flex; align-items: center; gap: 4px; flex: 1 1 auto; min-width: 0;';
  sqlLabel.appendChild(document.createTextNode('SQL Text:'));
  const sqlText = document.createElement('textarea');
  sqlText.value = entry.sql || '';
  sqlText.rows = 2;
  sqlText.style.cssText = 'flex: 1 1 auto; min-width: 0; min-height: 44px; resize: vertical; font-family: monospace;';
  sqlText.addEventListener('input', function() {
    updateSavedQueryField(id, 'sql', sqlText.value);
  });
  sqlLabel.appendChild(sqlText);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'delete-query-btn';
  deleteBtn.style.flex = '0 0 auto';
  deleteBtn.addEventListener('click', function() {
    if (confirm('Delete this saved query?')) deleteSavedQuery(id);
  });

  row.appendChild(enabledLabel);
  row.appendChild(nameLabel);
  row.appendChild(sqlLabel);
  row.appendChild(deleteBtn);
  return row;
}

function updateSavedQueryField(id, field, value) {
  const key = `sq_${id}`;
  chrome.storage.sync.get([key], function(result) {
    const entry = result[key] || { name: '', sql: '', enabled: false };
    entry[field] = value;
    chrome.storage.sync.set({ [key]: entry }, function() {
      if (chrome.runtime.lastError) {
        alert('Could not save query (likely too large to sync). ' + chrome.runtime.lastError.message);
      }
    });
  });
}

function deleteSavedQuery(id) {
  chrome.storage.sync.get(['savedQueries_ids'], function(result) {
    const ids = (result.savedQueries_ids || []).filter(x => x !== id);
    chrome.storage.sync.set({ savedQueries_ids: ids }, function() {
      chrome.storage.sync.remove(`sq_${id}`, renderSavedQueriesList);
    });
  });
}

function addNewSavedQuery() {
  chrome.storage.sync.get(['savedQueries_ids'], function(result) {
    const ids = result.savedQueries_ids ? result.savedQueries_ids.slice() : [];
    const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    ids.push(id);
    chrome.storage.sync.set({
      savedQueries_ids: ids,
      [`sq_${id}`]: { name: '', sql: '', enabled: true }
    }, renderSavedQueriesList);
  });
}

function renderSavedQueriesList() {
  const container = document.getElementById('savedQueriesList');
  if (!container) return;
  chrome.storage.sync.get(['savedQueries_ids'], function(result) {
    const ids = result.savedQueries_ids || [];
    container.innerHTML = '';
    if (ids.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No saved queries yet. Click "+ Add Query" below to create one.';
      empty.style.cssText = 'padding: 10px; font-style: italic; color: #666;';
      container.appendChild(empty);
      return;
    }
    const keys = ids.map(id => `sq_${id}`);
    chrome.storage.sync.get(keys, function(entries) {
      ids.forEach(id => {
        const entry = entries[`sq_${id}`] || { name: '', sql: '', enabled: false };
        container.appendChild(buildSavedQueryRow(id, entry));
      });
    });
  });
}

migrateLegacySavedQueries(function() {
  renderSavedQueriesList();
  const addBtn = document.getElementById('addSavedQueryBtn');
  if (addBtn) addBtn.addEventListener('click', addNewSavedQuery);
});

// Dynamic tooltip functionality - works with multiple tooltip elements
function setupTooltips() {
  const tooltips = [
    {
      id: 'smartSearchTooltip',
      content: `
        <strong>Smart Search automatically detects what you're searching for</strong><br><br>
        &bull; <strong>Numbers (123456)</strong> &rarr; Demographic # Search<br>
        &bull; <strong>Names (John Doe)</strong> &rarr; Name Search<br>
        &bull; <strong>Phone (123-456-7890)</strong> &rarr; Phone Search<br>
        &bull; <strong>Date (1990-01-15)</strong> &rarr; DOB Search<br>
        &bull; <strong>10 digits (1234567890)</strong> &rarr; HIN Search<br><br>
        Just start typing and the search mode will switch automatically!
      `
    },
    {
      id: 'classicLoginTooltip',
      content: `
        <strong>Classic Login automatically redirects from new interface</strong><br><br>
        No more manual switching between interfaces!
      `
    },
    {
      id: 'quickLinksToolTip',
      content: `
        Adds a menu to the <strong>Administration</strong> link<br><br>
       Hover over or click the down arrow to expand the new menu!
      `
    },
    {
      id: 'savedQueriesToolTip',
      content: `
        Add buttons to the <strong>Query By Example</strong> page
       that automatically adds your query to the text area!
      `
    }
  ];

  tooltips.forEach(tooltipConfig => {
    const tooltipIcon = document.getElementById(tooltipConfig.id);
    if (!tooltipIcon) return;
    
    let tooltip = null;
    
    tooltipIcon.addEventListener('mouseenter', function(e) {
      // Create tooltip
      tooltip = document.createElement('div');
      tooltip.className = 'dynamic-tooltip';
      tooltip.innerHTML = tooltipConfig.content;
      
      // Position tooltip
      const rect = tooltipIcon.getBoundingClientRect();
      tooltip.style.left = (rect.right + 10) + 'px';
      tooltip.style.top = (rect.top - 10) + 'px';
      
      // Add to body and show
      document.body.appendChild(tooltip);
      setTimeout(() => tooltip.classList.add('show'), 10);
    });
    
    tooltipIcon.addEventListener('mouseleave', function() {
      if (tooltip) {
        tooltip.classList.remove('show');
        setTimeout(() => {
          if (tooltip && tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
          }
          tooltip = null;
        }, 300);
      }
    });
  });
}

// Initialize tooltips when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupTooltips);
} else {
  setupTooltips();
}


