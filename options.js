
const toggleTabs = document.getElementById('toggleTabs');
const tabExclusions = document.getElementById('tabExclusions');

function setTabExclusionsDisabled(disabled) {
  const inputs = tabExclusions.querySelectorAll('input')
  inputs.forEach(input => input.disabled = disabled)
  updateTabExclusionTable();
}

// Update the visual state of the tab exclusion table
function updateTabExclusionTable() {
  const isTabsEnabled = toggleTabs.checked;
  
  if (isTabsEnabled) {
    tabExclusions.classList.remove('disabled');
  } else {
    tabExclusions.classList.add('disabled');
  }
  
  // Update individual checkbox states
  const inputs = tabExclusions.querySelectorAll('input');
  inputs.forEach(input => {
    input.disabled = !isTabsEnabled;
  });
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
  updateTabExclusionTable();
});

// Listen for changes to individual tab exclusion checkboxes
tabExclusions.addEventListener('change', function() {
  updateTabExclusionTable();
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


