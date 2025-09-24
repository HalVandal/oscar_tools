

chrome.webNavigation.onCompleted.addListener(function(details) {
  if (details.url.includes("kaiemr/") && !details.url.includes("inbox")) {   // If more exceptions arise like inbox, I may need to re-work this logic
    chrome.storage.sync.get(['toggleClassicURL'], function(result) {
      if (!result.toggleClassicURL) return; // Do nothing if disabled
          const urlObj = new URL(details.url);
          const baseUrl = urlObj.origin;
          const newUrl = baseUrl + '/oscar/index.jsp?login=use-classic'
          chrome.tabs.update(details.tabId, { url: newUrl });

    });
  }
  //Lets see if they're going to the search page
  if (details.url.includes("search.jsp")) {
    chrome.storage.sync.get(['toggleSmartSearch', 'toggleDefaultSearch', 'defaultSearchMode'], function (result) {
      if (result.toggleDefaultSearch) {
        const defaultMode = result.toggleDefaultSearch && result.defaultSearchMode ? result.defaultSearchMode : 'search_name';

    chrome.scripting.executeScript({
            target: { tabId: details.tabId },
            args: [defaultMode], // Pass the mode as an argument
            func: (searchMode) => {
              const searchModeSelect = document.getElementsByName('search_mode')[0];
              const searchBar = document.getElementById('keyword') || document.querySelector('input[name="keyword"]') || document.querySelector('input[type="text"]');
              
              // Set default search mode
              if (searchModeSelect) {
                searchModeSelect.value = searchMode;
              }
            }
            });
          }

      if (result.toggleSmartSearch) {
      
      // Get the default search mode from options
      const defaultMode = result.toggleDefaultSearch && result.defaultSearchMode ? result.defaultSearchMode : 'search_name';
      
      // Inject script into the page to access the DOM and add smart search
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        func: () => {
          const searchModeSelect = document.getElementsByName('search_mode')[0];
          const searchBar = document.getElementById('keyword') || document.querySelector('input[name="keyword"]') || document.querySelector('input[type="text"]');
          
          
          // Add smart search functionality
          if (searchBar && searchModeSelect) {
            // Remove any existing listeners to avoid duplicates
            searchBar.removeEventListener('input', window.smartSearchHandler);
            
            // Create the smart search handler
            window.smartSearchHandler = function(event) {
              const inputValue = event.target.value.trim();
              
              if (inputValue.length > 0) {
                const firstChar = inputValue.charAt(0);
                const fourthChar = inputValue.charAt(3);
                const fifthChar = inputValue.charAt(4);
                
                // If first character is a number, switch to demographic number search
                if (/\d/.test(firstChar)) {
                  if (searchModeSelect.value !== 'search_demographic_no') {
                    searchModeSelect.value = 'search_demographic_no';
                    // Trigger change event if the form needs it
                    searchModeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }
                // If first character is a letter, switch to name search
                else if (/[a-zA-Z]/.test(firstChar)) {
                  if (searchModeSelect.value !== 'search_name') {
                    searchModeSelect.value = 'search_name';
                    // Trigger change event if the form needs it
                    searchModeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }
               if (/\d/.test(firstChar) && fifthChar=="-") { ""
                  if (searchModeSelect.value !== 'search_dob') {
                    searchModeSelect.value = 'search_dob';
                    // Trigger change event if the form needs it
                    searchModeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }
                // If 1st character is a number but the 4th is dash or space
               if (fifthChar !=="-" && ((/\d/.test(firstChar) && (fourthChar=="-" || /\s/.test(fourthChar))))) {
                  if (searchModeSelect.value !== 'search_phone') {
                    searchModeSelect.value = 'search_phone';
                    // Trigger change event if the form needs it
                    searchModeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }    
               if ((fifthChar !=="-" && fourthChar !=="-" && !/\s/.test(fourthChar)) && (/\d/.test(firstChar) && inputValue.length == 10)) {
                  if (searchModeSelect.value !== 'search_hin') {
                    console.log('Smart Search: Switching to HIN search');
                    searchModeSelect.value = 'search_hin';
                    // Trigger change event if the form needs it
                    searchModeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }  
              }
            };
            
            // Add the event listener
            searchBar.addEventListener('input', window.smartSearchHandler);
            
            console.log('Smart Search: Event listener added to search bar');
          } else {
            console.log('Smart Search: Could not find search bar or search mode select');
          }
        }
      });
    }
    });
  }
}, {
  url: [{ hostSuffix: "kai-oscar.com" }]
});


chrome.windows.onCreated.addListener(function(newWindow) {
  chrome.storage.sync.get(null, function(result) {
    if (!result.toggleTabs) return; // Do nothing if disabled
    if (newWindow.type === "popup") {
      chrome.tabs.query({windowId: newWindow.id}, function(tabs) {
        tabs.forEach(function(tab) {
          chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, updatedTab) {
            if (tabId === tab.id && updatedTab.url && updatedTab.url.includes('kai-oscar')) {
              // Collect all exclusions that are enabled (checked)
              console.log(updatedTab.url)
              const exclusions = [];
                if (result.toggleEchartTabs) exclusions.push('forward.jsp');
                if (result.toggleAdminTabs) exclusions.push('administration');
                if (result.toggleSearchTabs) exclusions.push('search.jsp');
                if (result.toggleInboxTabs) exclusions.push('inbox');
                if (result.toggleEformTabs) exclusions.push('/eform');
                if (result.toggleTicklerTabs) exclusions.push('/tickler');
                if (result.toggleDocumentTabs) exclusions.push('/document');
                if (result.toggleHRMTabs) exclusions.push('/hrm');
                if (result.toggleLabsTabs) exclusions.push('/lab');             
              // If any exclusion matches, skip opening the tab
              let excluded = false;
              for (let i = 0; i < exclusions.length; i++) {
                if (updatedTab.url.includes(exclusions[i])) {
                  excluded = true;
                  break;
                }
              }
              if (excluded) {
                chrome.tabs.onUpdated.removeListener(listener);
                return;
              }
              // Otherwise, open the tab in the last focused window and close popup
              chrome.tabs.onUpdated.removeListener(listener);
              chrome.windows.getLastFocused({populate: true}, function(lastFocusedWindow) {
                chrome.tabs.create({windowId: lastFocusedWindow.id, url: updatedTab.url});
                chrome.windows.remove(newWindow.id);
              });
            }
          });
        });
      });
    }
  });
});