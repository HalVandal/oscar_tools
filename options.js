
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

