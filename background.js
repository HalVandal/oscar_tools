
/*
 * Copyright (c) 2025 Steve
 * This work is licensed under a Creative Commons Attribution 4.0 International License.
 * See LICENSE file or https://creativecommons.org/licenses/by/4.0/
 */

var exclusions = [];

chrome.webNavigation.onCompleted.addListener(function(details) {
  //console.log(details.url)
  var lastNine = details.url.slice(-9)
  if (lastNine == "kaiemr/#/") { 
    chrome.storage.sync.get(['toggleClassicURL'], function(result) {
      if (!result.toggleClassicURL) return; // Do nothing if disabled
          const urlObj = new URL(details.url);
          const baseUrl = urlObj.origin;
          const newUrl = baseUrl + '/oscar/index.jsp?login=use-classic'
          chrome.tabs.update(details.tabId, { url: newUrl });

    });
  }

  // Logic for Demographic Search page 
  if (details.url.includes("search.jsp") || details.url.includes("demographiccontrol.jsp")) {
    chrome.storage.sync.get(['toggleSmartSearch', 'toggleDefaultSearch', 'defaultSearchMode'], function (result) {
      if (result.toggleDefaultSearch) {
        const defaultMode = result.toggleDefaultSearch && result.defaultSearchMode ? result.defaultSearchMode : 'search_name';

    chrome.scripting.executeScript({
            target: { tabId: details.tabId },
            args: [defaultMode], // Pass the mode as an argument
            func: (searchMode) => {
              const searchModeSelect = document.getElementsByName('search_mode')[0];

              // Set default search mode
              if (searchModeSelect) {
                searchModeSelect.value = searchMode;
              }
            }
            });
          }

      if (result.toggleSmartSearch) {
      
      // Inject script into the page to access the DOM and add smart search
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        func: () => {
          const searchModeSelect = document.getElementsByName('search_mode')[0];
          const searchBar = document.getElementById('keyword') || document.querySelector('input[name="keyword"]') || document.querySelector('input[type="text"]');
          const userSearch = document.getElementsByName('search_username')[0];
          
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
               if (/\d/.test(firstChar) && fifthChar=="-") {
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
  // Smart Search for searching Security & Provider records
  if (details.url.includes("RptByExample.do")) {
    chrome.scripting.executeScript({
        target: { tabId: details.tabId, frameIds: [details.frameId] },
        func: () => {     
          //var queryFrame = document.getElementById('scrollNumber1');
          var queryFrame = document.getElementsByClassName('MainTableRightColumn')[0];  
          var queryText = document.getElementsByName('sql')[0];     


          function checkQueryPage() {
            if (!queryText) {
              setTimeout(checkQueryPage, 1000);
              return;
            }
            
            // Add style element for buttons and things
            const styleElement = document.createElement('style');
            styleElement.textContent = `
              .quickQueries {
                margin: 0px 5px 5px 0px;
                border: 2px solid #4a90e2;
                background: linear-gradient(45deg, #4a90e2, #357abd);
                color: white;
                padding: 5px 5px;
                border-radius: 5px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.1s ease;
              }
              .quickQueries:active {
                transform: scale(0.95);
                background: linear-gradient(45deg, #357abd, #2968a3);
              }
              .headerColor {
                background: linear-gradient(135deg, #2c2c2c, #1a1a1a) !important;
                color: white !important;
                font-weight: bold !important;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.5) !important;
                border: 1px solid #444 !important;
              }
              .rowColor1 {
                background: #ffffff !important;
                color: #333 !important;
                border: 1px solid #ddd !important;
              }
              .rowColor1:hover {
                background: #f8f9fa !important;
              }
              .rowColor2 {
                background: #f5f5f5 !important;
                color: #333 !important;
                border: 1px solid #ddd !important;
              }
              .rowColor2:hover {
                background: #e9ecef !important;
              }
              table {
                border-collapse: collapse !important;
                border-spacing: 0 !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
              }
            `;
            document.head.appendChild(styleElement);
            
            const query1Button = document.createElement('button');
            const query2Button = document.createElement('button');
            const qqLabel = document.createElement('div');
            qqLabel.innerHTML = '<b><i>Quick Queries</i></b>'
            
            query1Button.textContent = 'Provider Hours'
            query1Button.className = 'quickQueries'
            query1Button.onclick = () => insertQuery('provider_hours');

            query2Button.textContent = 'Recent Labs'
            query2Button.className = 'quickQueries'
            query2Button.onclick = () => insertQuery('recent_labs');

            function insertQuery(id) {
              if (id == 'recent_labs') {
                queryText.innerHTML = 
`SELECT plr.provider_no,concat(p.first_name,' ',p.last_name) as 'Provider', htm.type, MAX(htm.created) as latest_created
FROM hl7TextMessage htm
  LEFT JOIN providerLabRouting plr ON plr.lab_no = htm.lab_id
  LEFT JOIN provider p on p.provider_no = plr.provider_no
WHERE plr.provider_no IS NOT NULL
  AND htm.created >= DATE_SUB(NOW(), INTERVAL 60 DAY)
  AND htm.created <= NOW()
GROUP BY plr.provider_no, htm.type
ORDER BY plr.provider_no,htm.created desc, htm.type;`
              } else if (id == 'provider_hours') {
                queryText.innerHTML = 
`SELECT CONCAT(p.last_name, ', ', p.first_name) AS Provider, p.specialty, ROUND(COUNT(DISTINCT CONCAT(appointment_date, HOUR(start_time)))/3, 2) AS Hours
FROM appointment a
LEFT JOIN provider p ON a.provider_no = p.provider_no
WHERE demographic_no > 0 AND a.provider_no LIKE '%'
   AND appointment_date >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 90 DAY), '%Y-%m-%d')
   AND appointment_date <= DATE_FORMAT(NOW(), '%Y-%m-%d')
GROUP BY p.provider_no, p.last_name, p.first_name, p.specialty UNION ALL
SELECT CONCAT(COUNT( CASE WHEN Hours >= 64 THEN 1 END), " Full Time" ), CONCAT(COUNT( CASE WHEN Hours BETWEEN 32 AND 63.99 THEN 1 END ), " Part Time"), CONCAT(ROUND(COUNT( CASE WHEN Hours < 32 THEN 1 END ),0), " Casual")
FROM ( SELECT p.provider_no, ROUND(COUNT(DISTINCT CONCAT(appointment_date, HOUR(start_time))), 2) AS Hours
   FROM appointment a
   LEFT JOIN provider p ON a.provider_no = p.provider_no
   WHERE demographic_no > 0 AND a.provider_no LIKE '%'
       AND appointment_date >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 30 DAY), '%Y-%m-%d') -- Adjusted to the last 30 days for monthly calculation
       AND appointment_date <= DATE_FORMAT(NOW(), '%Y-%m-%d')
   GROUP BY p.provider_no ) AS MonthlyHours;`
              }
              
            }

            queryFrame.appendChild(qqLabel)
            queryFrame.appendChild(query1Button)
            queryFrame.appendChild(query2Button)


          }

          checkQueryPage();

        }
    });
  }
  // Smart Search for searching Security & Provider records
  if (details.url.includes("securitysearch") || details.url.includes("providersearch")) {

    chrome.storage.sync.get(['toggleSmartSearch'], function (result) {
      if (result.toggleSmartSearch) {

        chrome.scripting.executeScript({
          target: { tabId: details.tabId },
          func: () => {
            // The form is inside an iframe, so we need to access it
            const iframe = document.querySelector('iframe#myFrame');
            var searchBar = null;
            var radioBoxes = null;
            
            if (iframe && iframe.contentDocument) {
              // Access elements inside the iframe
              searchBar = iframe.contentDocument.querySelector('input[name="keyword"]');
              radioBoxes = iframe.contentDocument.querySelectorAll('input[type="radio"]');
                // Now we grab the radio boxes we want to modify
              var name_radio = null;
              var username_radio = null;
              var provierno_radio = null;
              for (const radio of radioBoxes) {
                if (radio.value === 'search_providerno'){provierno_radio = radio}
                if (radio.value === 'search_name'){name_radio = radio;}
                if (radio.value === 'search_username'){username_radio = radio;}
              }
              
              if (searchBar){
                // Remove any existing listeners to avoid duplicates
                searchBar.removeEventListener('input', window.smartSearchHandler);
                // Create the smart search handler
                window.smartSearchHandler = function(event) {
                  const inputValue = event.target.value.trim();
                  
                  if (inputValue.length > 0) {
                    const firstChar = inputValue.charAt(0);
                    // If first character is a number, switch to provider number search
                    if (/\d/.test(firstChar)) {
                      if (provierno_radio) {provierno_radio.checked = true}
                    }
                    // If first character is a letter, switch to lastname search
                    else if (/[a-zA-Z]/.test(firstChar)) {
                      if (username_radio) {
                        username_radio.checked = true

                      } else if (name_radio){
                        name_radio.checked = true
                      }
                    }
                  }
                }
                 // Add the event listener
            searchBar.addEventListener('input', window.smartSearchHandler);
              }
            } else {
              console.log('Iframe not found or not accessible');
              }
            }
        });    
      }
    });
  }

   if (details.url.includes('administration')) {

      //Admin Menu Loaded, listen on all links for clicks
      chrome.scripting.executeScript({
        target: { tabId: details.tabId, frameIds: [details.frameId] },
        func: () => {     

          function addListenersToAllLinks() {
            // Find ALL links on the page
            const allLinks = document.querySelectorAll('a[href]');
            
            // Add click listeners to ALL links
            allLinks.forEach((link, index) => {
              // Skip if this link already has our listener
              if (link.hasAttribute('data-listener-added')) {
                return;
              }
              
              // Mark as processed
              link.setAttribute('data-listener-added', 'true');
              
              // Add click listener
              link.addEventListener('click', function(event) {             
                // Check if it's an eForm-related link
                //console.log(`Link Clicked: ${this.href}`)
                
                // Skip efmimagemanager.jsp - don't add listeners for this page
                if (this.href.includes('efmimagemanager.jsp')) {
                  return;
                } else if (this.href.includes('efmformmanager.jsp')) {

                } else if (this.href.includes('efmformmanageredit.jsp')) {

                  // Confirm the edit page has loaded, loop until it is
                  function getElements() {
                  const textHTML = document.getElementsByName('formHtml')[0];
                  const header = document.getElementById('editHtmlHeader');
                  if (!header) {
                    setTimeout(getElements, 1000);
                    return;
                  }
                  // Ok edit page is loaded, add the cool features/buttons
                  const notification = document.createElement('div');
                  const editFrame = document.getElementById('editform');
                  notification.id = 'notification';
                  notification.innerHTML = '';
                  
                  const faxButton = document.createElement('input');
                  faxButton.type = 'button';
                  faxButton.id = 'addFaxing';
                  faxButton.value = 'Add Faxing';
                  faxButton.className ='btn btn-primary'
                  faxButton.onclick = addFaxing;  

                  const defaultFaxButton = document.createElement('input');
                  defaultFaxButton.type = 'button';
                  defaultFaxButton.id = 'addDefaultFaxing';
                  defaultFaxButton.value = 'Add Default Fax';
                  defaultFaxButton.className ='btn btn-primary'
                  defaultFaxButton.onclick = addDefaultFaxing;

                  const fixPrintButton = document.createElement('input');
                  fixPrintButton.type = 'button';
                  fixPrintButton.id = 'addFaxing';
                  fixPrintButton.value = 'Fix Print';
                  fixPrintButton.className ='btn btn-primary'
                  fixPrintButton.onclick = fixPrint;


                  editFrame.insertBefore(document.createTextNode('\n'), editFrame.firstChild);
                  editFrame.insertBefore(notification, editFrame.firstChild);

                  header.appendChild(document.createTextNode('\n'));
                  header.appendChild(faxButton);

                  header.appendChild(document.createTextNode('\n'));
                  header.appendChild(defaultFaxButton);

                  header.appendChild(document.createTextNode('\n'));
                  header.appendChild(fixPrintButton);

                    // Parse the HTML string from the textarea
                    const parser = new DOMParser();
                    var htmlDoc //= parser.parseFromString(textHTML.value, 'text/html');
                    var head //= htmlDoc.getElementsByTagName('head')[0];
                    function addJquery() {
                        var existsJquery = head.innerHTML.includes('jquery')
                        if (!existsJquery) {
                            var jqueryScript = document.createElement('script');
                            jqueryScript.type = 'text/javascript';
                            jqueryScript.src = 'https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js';
                            head.insertBefore(document.createTextNode('\n'), head.firstChild);
                            head.insertBefore(jqueryScript, head.firstChild);
                            notification.innerHTML = notification.innerHTML+'✅ jQuery Added.'
                        } 
                    }

                    function addFaxing() {
                    
                      htmlDoc = parser.parseFromString(textHTML.value, 'text/html');
                      head = htmlDoc.getElementsByTagName('head')[0];
                      notification.innerHTML = '';
                      notification.style.cssText = 'background: rgba(74, 197, 58, 0.5); color: black; width: fit-content; padding: 10px; border-radius: 4px; margin: 10px 0; display: none;'

                      addJquery()
                      // Check if faxControl is already on the page
                      var existsFax = head.innerHTML.includes('eforms/faxControl.js')
                      if (!existsFax) {
                      var fcScript = document.createElement('script')  
                      fcScript.type = 'text/javascript'
                      fcScript.src = "${oscar_javascript_path}eforms/faxControl.js"
                      head.append(document.createTextNode('\n'));
                      head.append(fcScript)
                      notification.innerHTML = notification.innerHTML+' ✅ Fax Control Added.'
                      }

                      // Lets also add the PDF buttons. Good for debugging fax issues.
                      var pcScript = document.createElement('script')
                      var existsPrint = head.innerHTML.includes('eforms/printControl.js')

                      if (!existsPrint) {
                      pcScript.type = 'text/javascript'
                      pcScript.src = "${oscar_javascript_path}eforms/printControl.js"
                      head.appendChild(document.createTextNode('\n'));
                      head.appendChild(pcScript)
                      notification.innerHTML = notification.innerHTML+' ✅ Print Control Added.'
                      }

                      // Add all the changes back into the HTML text area
                      textHTML.value = htmlDoc.documentElement.outerHTML;
                      
                      // Show notification
                      if (notification.innerHTML == '') {
                        notification.style.cssText = 'background: rgba(255, 193, 7, 0.15); color: #856404; border: 2px solid rgba(255, 193, 7, 0.4); width: fit-content; padding: 12px; border-radius: 6px; margin: 10px 0; display: none; font-weight: 500;'
                        notification.innerHTML = '⚠️ jQuery and Fax Control already exist!'
                      }
                      notification.style.display = 'block';
                      setTimeout(() => {
                        notification.style.display = 'none';
                      }, 5000); // Hide after 5 seconds
                    }

                    function addDefaultFaxing(){
                      // Prompt user for fax number
                      const faxNumber = prompt("Enter default fax number:", "");
                      if (!faxNumber) {
                        return; // User cancelled or entered empty value
                      }
                      
                      htmlDoc = parser.parseFromString(textHTML.value, 'text/html');
                      head = htmlDoc.getElementsByTagName('head')[0];
                      notification.innerHTML = '';
                      notification.style.cssText = 'background: rgba(74, 197, 58, 0.5); color: black; width: fit-content; padding: 10px; border-radius: 4px; margin: 10px 0; display: none;'

                      const bodyElement = htmlDoc.body;
                      var onloadFunctions = bodyElement.getAttribute('onload') || '';
                      var functionExists = head.innerHTML.includes('function setFaxNo()');
                      
                      // If function exists, remove it first
                      if (functionExists) {
                        // Remove existing script tags containing setFaxNo function
                        const scriptTags = head.querySelectorAll('script');
                        scriptTags.forEach(script => {
                          if (script.textContent && script.textContent.includes('function setFaxNo()')) {
                            script.remove();
                          }
                        });
                        
                        // Remove setFaxNo() from onload if it exists
                        if (onloadFunctions.includes('setFaxNo()')) {
                          onloadFunctions = onloadFunctions.replace(/;?\s*setFaxNo\(\);?/g, '');
                          onloadFunctions = onloadFunctions.replace(/^;+|;+$/g, ''); // Clean up leading/trailing semicolons
                        }
                      }
                      
                      // Add function to body onload
                      if (onloadFunctions && !onloadFunctions.includes('setFaxNo()')) {
                        onloadFunctions += '; setFaxNo();';
                      } else if (!onloadFunctions) {
                        onloadFunctions = 'setFaxNo();';
                      }
                      bodyElement.setAttribute('onload', onloadFunctions);
                      
                      // Build the script element
                      const scriptElement = htmlDoc.createElement('script');
                      scriptElement.type = 'text/javascript';
                      scriptElement.textContent = `
function setFaxNo(){
	setTimeout('document.getElementById("otherFaxInput").value="${faxNumber}"',1000);
	setTimeout('AddOtherFax()',1500);
}`;
                      head.appendChild(htmlDoc.createTextNode('\n'));
                      head.appendChild(scriptElement);
                      
                      if (functionExists) {
                        notification.innerHTML = `✅ Default Fax Updated (${faxNumber})`;
                      } else {
                        notification.innerHTML = `✅ Default Fax Added (${faxNumber})`;
                      }

                      // Update the textarea with modified HTML
                      textHTML.value = htmlDoc.documentElement.outerHTML;
                      
                      // Show notification
                      notification.style.display = 'block';
                      setTimeout(() => {
                        notification.style.display = 'none';
                      }, 3000);
                    }

                  function fixPrint() {
                    htmlDoc = parser.parseFromString(textHTML.value, 'text/html');
                    head = htmlDoc.getElementsByTagName('head')[0];
                    notification.innerHTML = '';
                    notification.style.cssText = 'background: rgba(74, 197, 58, 0.5); color: black; width: fit-content; padding: 10px; border-radius: 4px; margin: 10px 0; display: none;'

                    // Check if print styles already exist
                    var existsPrintStyles = head.innerHTML.includes('@page { margin: 0;}')
                    if (!existsPrintStyles) {
 //The weird indenting here is on purpose, because all the spacing translates to the page               
var fixLayoutElement = htmlDoc.createElement('style');
fixLayoutElement.type = 'text/css';
fixLayoutElement.textContent = `
  @page { margin: 0;}
  body {
    margin:0;
    padding:0;
  }
`;
                      head.insertBefore(document.createTextNode('\n'), head.firstChild);
                      head.insertBefore(fixLayoutElement, head.firstChild);

                      notification.innerHTML = '✅ Print fix applied!';
                    } else {
                      notification.innerHTML = '⚠️ Print fix already exist';
                      notification.style.cssText = 'background: rgba(255, 193, 7, 0.15); color: #856404; border: 2px solid rgba(255, 193, 7, 0.4); width: fit-content; padding: 12px; border-radius: 6px; margin: 10px 0; display: none; font-weight: 500;'
                    }

                    // Update the textarea with modified HTML
                    textHTML.value = htmlDoc.documentElement.outerHTML;
                    
                    // Show notification
                    notification.style.display = 'block';
                    setTimeout(() => {
                      notification.style.display = 'none';
                    }, 3000);
                  }

                  }

                                  
                  setTimeout(getElements,1000)

                }
                
                // After any link click, wait a moment then re-scan for new links
                setTimeout(() => {
                 // console.log('Re-scanning for new links after navigation...');
                  addListenersToAllLinks();
                }, 1000);
              });
            });
          }
          
          // Set up MutationObserver to watch for new links being added to the DOM
          const observer = new MutationObserver(function(mutations) {
            // Skip if we're on efmimagemanager.jsp page
            if (window.location.href.includes('efmimagemanager.jsp')) {
              return;
            }
            
            let hasNewLinks = false;
            
            mutations.forEach(function(mutation) {
              if (mutation.type === 'childList') {
                // Check if any new links were added
                const newLinks = document.querySelectorAll('a[href]:not([data-listener-added])');
                if (newLinks.length > 0) {
                  hasNewLinks = true;
                }
              }
            });
            
            // If new links were detected, add listeners
            if (hasNewLinks) {
              //console.log('New links detected in DOM, adding listeners...');
              addListenersToAllLinks();
            }
          });
          
          // Start observing the entire document for changes
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
          
          // Initial scan for existing links
          addListenersToAllLinks();
          
          //console.log('Universal link monitoring active');
        }
      });
    

  }


}, {
  url: [{ hostSuffix: "oscar.com" }]
});


chrome.windows.onCreated.addListener(function(newWindow) {
  chrome.storage.sync.get(null, function(result) {
    if (!result.toggleTabs) return; // Do nothing if disabled
    if (newWindow.type === "popup") {
      chrome.tabs.query({windowId: newWindow.id}, function(tabs) {
        tabs.forEach(function(tab) {
          chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, updatedTab) {
            if (tabId === tab.id && updatedTab.url && updatedTab.url.includes('kai-oscar')) {             
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


function updateTabExclusionTable() {
  chrome.storage.sync.get(null, function(result) {
    // Collect all exclusions that are enabled (checked)
    exclusions = [];
      if (result.toggleEchartTabs) exclusions.push('forward.jsp');
      if (result.toggleAdminTabs) exclusions.push('administration');
      if (result.toggleSearchTabs) exclusions.push('search.jsp');
      if (result.toggleInboxTabs) exclusions.push('inbox');
      if (result.toggleEformTabs) exclusions.push('/eform');
      if (result.toggleTicklerTabs) exclusions.push('/tickler');
      if (result.toggleDocumentTabs) exclusions.push('/document');
      if (result.toggleHRMTabs) exclusions.push('/hrm');
      if (result.toggleLabsTabs) exclusions.push('/lab');
      if (result.toggleAttachmentManager) exclusions.push('/attachment-manager');
  });
}

// Listen for storage changes and update exclusions when tab settings change
chrome.storage.onChanged.addListener(function(changes, namespace) {
  // Check if any tab exclusion settings changed
  const tabExclusionKeys = [
    'toggleEchartTabs', 'toggleAdminTabs', 'toggleSearchTabs', 
    'toggleInboxTabs', 'toggleEformTabs', 'toggleTicklerTabs',
    'toggleDocumentTabs', 'toggleHRMTabs', 'toggleLabsTabs',
    'toggleAttachmentManager'
  ];
  
  const hasTabExclusionChange = tabExclusionKeys.some(key => changes[key]);
  
  if (hasTabExclusionChange) {
    updateTabExclusionTable();
  }
});

updateTabExclusionTable();

