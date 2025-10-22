
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

  // Query By Example page
  if (details.url.includes("RptByExample.do")) {
    chrome.storage.sync.get(['query1','query1_name','query1_text','query2','query2_name','query2_text',
      'query3','query3_name','query3_text','query4','query4_name','query4_text','query4','query4_name','query4_text',
      'query5','query5_name','query5_text'
    ], function(result) {
    chrome.scripting.executeScript({
        target: { tabId: details.tabId, frameIds: [details.frameId] },
        args:[result],
        func: (customButtons) => {     
          //var queryFrame = document.getElementById('scrollNumber1');
          var queryFrame = document.getElementsByClassName('MainTableRightColumn')[0];  
          var queryText = document.getElementsByName('sql')[0];     


          function checkQueryPage() {
            if (!queryFrame) {
              setTimeout(checkQueryPage, 1000);
              return;
            }
            
            // Add style element for buttons and things
            const styleElement = document.createElement('style');
            styleElement.textContent = `
              .savedQueries {
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
              .savedQueries:active {
                transform: scale(0.95);
                background: linear-gradient(45deg, #357abd, #2968a3);
              }
              .headerColor {
                background: linear-gradient(135deg, #2c2c2c, #1a1a1a) !important;
                color: white !important;
                font-weight: bold !important;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.5) !important;
                border: 1px solid #ffffffff !important;
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
            
            const qLabel = document.createElement('div');
            qLabel.innerHTML = '<b><i>Saved Queries</i></b>'
            // Create custom buttons from the options

            // Create preset query buttons with query text stored as data attributes
            const query1Button = document.createElement('button');
            query1Button.textContent = 'Provider Hours';
            query1Button.className = 'savedQueries';
            query1Button.dataset.query = `SELECT CONCAT(p.last_name, ', ', p.first_name) AS Provider, p.specialty, ROUND(COUNT(DISTINCT CONCAT(appointment_date, HOUR(start_time)))/3, 2) AS Hours
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
   GROUP BY p.provider_no ) AS MonthlyHours;`;
            query1Button.onclick = insertQuery;

            const query2Button = document.createElement('button');
            query2Button.textContent = 'Recent Labs';
            query2Button.className = 'savedQueries';
            query2Button.dataset.query = `SELECT main_query.provider_no,
       main_query.Provider,
       main_query.type,
       main_query.latest_created,
       main_query.lab_no,
       palr.demographic_no
FROM (
    SELECT DISTINCT
           plr.provider_no,
           concat(p.first_name,' ',p.last_name) as 'Provider',
           htm.type,
           FIRST_VALUE(htm.created) OVER (PARTITION BY plr.provider_no, htm.type ORDER BY htm.created DESC) as latest_created,
           FIRST_VALUE(plr.lab_no) OVER (PARTITION BY plr.provider_no, htm.type ORDER BY htm.created DESC) as lab_no
    FROM hl7TextMessage htm
      LEFT JOIN providerLabRouting plr ON plr.lab_no = htm.lab_id and plr.lab_type = 'HL7'
      LEFT JOIN provider p on p.provider_no = plr.provider_no
    WHERE plr.provider_no IS NOT NULL
      AND htm.created >= DATE_SUB(NOW(), INTERVAL 60 DAY)
      AND htm.created <= NOW()
) main_query

LEFT JOIN patientLabRouting palr ON palr.lab_no = main_query.lab_no and palr.lab_type = 'HL7'

ORDER BY main_query.provider_no, main_query.latest_created desc, main_query.type;`;
            query2Button.onclick = insertQuery;

            // Generic insert function that reads query from button's data attribute
            function insertQuery(event) {
              const button = event ? event.target : this;
              const query = button.dataset.query;
              if (query && queryText) {
                queryText.innerHTML = query;
              }
            }

            queryFrame.appendChild(qLabel)
            queryFrame.appendChild(query1Button)
            queryFrame.appendChild(query2Button)

            if (customButtons.query1 && customButtons.query1_name && customButtons.query1_text) {
              const queryButton = document.createElement('button');
                queryButton.textContent = customButtons.query1_name; 
                queryButton.className = 'savedQueries';
                queryButton.dataset.query = customButtons.query1_text; 
                queryButton.onclick = insertQuery; 
                queryFrame.appendChild(queryButton)  
            }
            
            if (customButtons.query2 && customButtons.query2_name && customButtons.query2_text) {
              const queryButton = document.createElement('button');
                queryButton.textContent = customButtons.query2_name; 
                queryButton.className = 'savedQueries';
                queryButton.dataset.query = customButtons.query2_text; 
                queryButton.onclick = insertQuery; 
                queryFrame.appendChild(queryButton)  
            }
            if (customButtons.query3 && customButtons.query3_name && customButtons.query3_text) {
              const queryButton = document.createElement('button');
                queryButton.textContent = customButtons.query3_name;
                queryButton.className = 'savedQueries';
                queryButton.dataset.query = customButtons.query3_text;
                queryButton.onclick = insertQuery; 
                queryFrame.appendChild(queryButton)  
            }
            if (customButtons.query4 && customButtons.query4_name && customButtons.query4_text) {
              const queryButton = document.createElement('button');
                queryButton.textContent = customButtons.query4_name;
                queryButton.className = 'savedQueries';
                queryButton.dataset.query = customButtons.query4_text;
                queryButton.onclick = insertQuery; 
                queryFrame.appendChild(queryButton)  
            }
            if (customButtons.query5 && customButtons.query5_name && customButtons.query5_text) {
              const queryButton = document.createElement('button');
                queryButton.textContent = customButtons.query5_name;
                queryButton.className = 'savedQueries';
                queryButton.dataset.query = customButtons.query5_text;
                queryButton.onclick = insertQuery; 
                queryFrame.appendChild(queryButton)  
            }

          }

          checkQueryPage();

        }
    });
    });
  }

  // Smart Search for searching Security & Provider records
  if (details.url.includes("securitysearch") || details.url.includes("providersearch")) {
    if (details.url.includes("providersearch")) {
      chrome.scripting.executeScript({
        target: {tabId: details.tabId},
        func: () => {
          // Create the dropdown (select element)
          const resultsPerPage = document.createElement('select');
          const label = document.createElement('label');

          label.textContent = 'Results Per Page: ';
          label.style.marginLeft = '5px';
          label.style.fontSize = '10px';

          resultsPerPage.name = 'resultsPerPage';
          resultsPerPage.id = 'resultsPerPage';
          resultsPerPage.style.height = '18px'
          resultsPerPage.style.display = 'inline-block';
          resultsPerPage.style.fontSize = '12px';
          // Add options to the dropdown
          const options = [
            { value: '10', text: '10' },
            { value: '25', text: '25' },
            { value: '50', text: '50' },
            { value: '100', text: '100' },
            { value: '99999', text: 'All' }
          ];
          
          // Create and append each option
          options.forEach(optionData => {
            const option = document.createElement('option');
            option.value = optionData.value;
            option.textContent = optionData.text;
            resultsPerPage.appendChild(option);
          });
          
          // Set default selected value
          resultsPerPage.value = '25';

          // Find where to insert the dropdown - wait for page to load
          function addDropdown() {
            let targetElement = null;
            let limitElement = null;
            let isInIframe = false;
            
            // First try the main document (for standalone windows)
            targetElement = document.getElementsByName('keyword')[0];
            limitElement = document.getElementsByName('limit2')[0];
            
            // If not found in main document, try inside iframe
            if (!targetElement) {
              const iframe = document.querySelector('iframe#myFrame');
              if (iframe && iframe.contentDocument) {
                targetElement = iframe.contentDocument.getElementsByName('keyword')[0];
                limitElement = iframe.contentDocument.getElementsByName('limit2')[0];
                isInIframe = true;
              }
            }
                     
            if (targetElement) {
              
              // Insert the dropdown after the keyword input
              
              targetElement.parentNode.insertBefore(resultsPerPage, targetElement.nextSibling);
              targetElement.parentNode.insertBefore(label, targetElement.nextSibling);
              
              // Set initial value for limit element if found
              if (limitElement) {
                limitElement.value = '25';
              }
              
              // Add change event listener
              resultsPerPage.addEventListener('change', function() {
                console.log('Selected:', this.value);
                
                // Update the limit element value
                if (limitElement) {
                  limitElement.value = this.value;
                }
              });

            } else {

              
              // Try again after 1 second if element not found
              setTimeout(addDropdown, 1000);
            }
          }
          
          // Start trying to add the dropdown
          addDropdown();
        }
      });
    }
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

  // BC billing page
  if (details.url.includes('BC/billStatus.jsp')) {
    //Edit Invoices Loaded
    chrome.scripting.executeScript({
      target: { tabId: details.tabId, frameIds: [details.frameId] },
      func: () => { 
        const h3 = document.querySelector('h3')  
        console.log(h3)
        if (h3) {
          //Create a container and give it same class as others on the page
          const divContainer = document.createElement('div')
          divContainer.classList.add('row','well','hidden-print')
          divContainer.innerHTML = "Invoice Number: "

          //Create search bar to grab invoice number
          const searchBar = document.createElement('input')
          searchBar.type = 'text'
          searchBar.id = 'invoice_no'
          searchBar.style.width = '150px';
          searchBar.style.margin = '5px 0px 5px 10px';

          //Make a button and give it the same styles
          const searchButton = document.createElement('button')
          searchButton.textContent = 'Edit Invoice'
          searchButton.classList.add('btn' ,'btn-primary')
          searchButton.style.height = '30px';
          searchButton.style.width = '100px';            
          searchButton.style.margin = '5px 0px 5px 10px';
          
          searchButton.onclick = () => {
            const invoiceNo = document.getElementById('invoice_no').value;
            if (invoiceNo) {
              window.open(`/oscar/billing/CA/BC/adjustBill.jsp?billingmaster_no=${invoiceNo}`, '_blank');
            } else {
              alert('Please enter an invoice number');
            }
          }

          divContainer.appendChild(searchBar)
          divContainer.appendChild(searchButton)

          //Put it after the first h3 tag
          h3.insertAdjacentElement('afterend',divContainer)
        }

      }
    })    


  }

  // Administraion page and its sub-pages
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

                    // Inject styling for .btn-eform buttons (guard against duplicates)
                    // I'm not using this at the moment but left it here in case I wanted to change the style
                    // instead of "stealing" the CSS from the OSCAR page
                    if (!document.getElementById('btn-eform-styles')) {
                      const btnStyle = document.createElement('style');
                      btnStyle.id = 'btn-eform-styles';
                      btnStyle.textContent = `
                        .btn-eform {
                          font-family: nimbus-sans, sans-serif !important;
                          color: #222222 !important;
                          background-color: #e3e3e3 !important;
                          background-image:
                            linear-gradient(145deg, rgba(255,255,255,0.65), rgba(255,255,255,0) 52%),
                            linear-gradient(145deg, #ededed, #d9d9d9) !important;
                          border: 1px solid #cfcfcf !important;
                          border-radius: 6px !important;
                          padding: 5px 10px !important;
                          font-size: 13px !important;
                          font-weight: 600 !important;
                          cursor: pointer !important;
                          box-shadow: 0 3px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.7) !important;
                          transition: transform 120ms ease, background-color 120ms ease, box-shadow 150ms ease !important;
                          margin-right: 6px !important;
                          margin-top: 6px !important;
                        }
                        /* Icon support */
                        .btn-eform.icon {
                          background-repeat: no-repeat !important;
                          background-position: 8px 50% !important;
                          background-size: 14px 14px !important;
                          padding-left: 28px !important;
                        }
                        /* Wrench (Fix) */
                        .btn-eform.icon-fix { 
                          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='%23222222'%3E%3Cpath d='M14 2a6 6 0 0 0-4.2 10.2L3 19l2 2 6.8-6.8A6 6 0 1 0 14 2z'/%3E%3C/svg%3E");
                        }
                        /* Swap arrows */
                        .btn-eform.icon-swap { 
                          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'%3E%3Cpath d='M7 7h10l-3-3' fill='none' stroke='%23222222' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M17 17H7l3 3' fill='none' stroke='%23222222' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
                        }
                        /* Down arrow */
                        .btn-eform.icon-down {
                          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none'%3E%3Cline x1='12' y1='4' x2='12' y2='16' stroke='%23222222' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpolyline points='6 12 12 18 18 12' fill='none' stroke='%23222222' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
                        }
                        /* Fax (printer) */
                        .btn-eform.icon-fax { 
                          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='%23222222'%3E%3Crect x='4' y='8' width='16' height='10' rx='2'/%3E%3Crect x='7' y='3' width='10' height='5' rx='1'/%3E%3Crect x='8' y='12' width='8' height='2'/%3E%3C/svg%3E");
                        }
                        /* Star (default fax) */
                        .btn-eform.icon-defaultfax { 
                          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='%23222222'%3E%3Cpolygon points='12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9'/%3E%3C/svg%3E");
                        }
                        .btn-eform:hover {
                          transform: translateY(-0.5px) scale(1.003);
                          background-image:
                            linear-gradient(145deg, rgba(201, 201, 201, 0.75), rgba(255,255,255,0) 56%),
                            linear-gradient(145deg, #ccccccff, #bdbdbdff) !important;
                          box-shadow: 0 5px 12px rgba(0,0,0,0.16), 0 2px 4px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.75) !important;
                        }
                        .btn-eform:active {
                          transform: translateY(0) scale(0.985) !important;
                          background-image:
                            linear-gradient(145deg, rgba(201, 201, 201,0.45), rgba(255,255,255,0) 40%),
                            linear-gradient(145deg, #ccccccff, #bdbdbdff) !important;
                          box-shadow: 0 2px 6px rgba(0,0,0,0.16), inset 0 2px 6px rgba(0,0,0,0.15) !important;
                        }
                        /* Optional: focus style for accessibility */
                        .btn-eform:focus {
                          outline: 2px solid #bdbdbd !important;
                          outline-offset: 2px !important;
                        }
                      `;
                      document.head.appendChild(btnStyle);
                    }
                    // Create the buttons for the edit eForm page
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
                    fixPrintButton.id = 'fixPrint';
                    fixPrintButton.value = 'Fix Print';
                    fixPrintButton.className ='btn btn-primary'
                    fixPrintButton.onclick = fixPrint;

                    const swapClassic4ProButton = document.createElement('input');
                    swapClassic4ProButton.type = 'button';
                    swapClassic4ProButton.id = 'canvas4pro';
                    swapClassic4ProButton.value = 'Swap Classic 4 Pro';
                    swapClassic4ProButton.className ='btn btn-primary'
                    swapClassic4ProButton.onclick = swapClassicForPro;

                    const doctor2UserButton = document.createElement('input');
                    doctor2UserButton.type = 'button';
                    doctor2UserButton.id = 'dr2user';
                    doctor2UserButton.value = 'Doctor > Current_User';
                    doctor2UserButton.className ='btn btn-primary'
                    doctor2UserButton.onclick = doctor2User;

                    const User2DoctorButton = document.createElement('input');
                    User2DoctorButton.type = 'button';
                    User2DoctorButton.id = 'user2dr';
                    User2DoctorButton.value = 'Current_User > Doctor';
                    User2DoctorButton.className ='btn btn-primary'
                    User2DoctorButton.onclick = user2Doctor;

                    //Add the notification container
                    editFrame.insertBefore(document.createTextNode('\n'), editFrame.firstChild);
                    editFrame.insertBefore(notification, editFrame.firstChild);

                    header.appendChild(document.createTextNode('\n'));
                    header.appendChild(faxButton);

                    header.appendChild(document.createTextNode('\n'));
                    header.appendChild(defaultFaxButton);

                    header.appendChild(document.createTextNode('\n'));
                    header.appendChild(fixPrintButton);

                    header.appendChild(document.createTextNode('\n'));
                    header.appendChild(swapClassic4ProButton);

                    header.appendChild(document.createTextNode('\n'));
                    header.appendChild(doctor2UserButton);

                    header.appendChild(document.createTextNode('\n'));
                    header.appendChild(User2DoctorButton);
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
                    }

                    function addDefaultFaxing() {
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
                      
                      // If function exists, remove it first <-- rework this as it could delete other functions
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
                    }

                    function doctor2User() {
                      htmlDoc = parser.parseFromString(textHTML.value, 'text/html');
                      body = htmlDoc.getElementsByTagName('body')[0];
                      
                      var dbtags = htmlDoc.querySelectorAll('[oscardb]');
                      var foundTag
                      notification.innerHTML = '';
                      notification.style.cssText = 'background: rgba(74, 197, 58, 0.5); color: black; width: fit-content; padding: 10px; border-radius: 4px; margin: 10px 0; display: none;'

                      dbtags.forEach(element => {
                        var dbtag = element.getAttribute('oscardb')

                        if (dbtag) {
                          // Replace 'doctor' with 'current_user' in oscardb attributes
                          if (dbtag === 'doctor') {
                            foundTag = true
                            element.setAttribute('oscardb', 'current_user');
                            console.log('Changed doctor to current_user');
                          } else if (dbtag === 'doctor_ohip_no') {
                            foundTag = true
                            element.setAttribute('oscardb', 'current_user_ohip_no');
                          } else if (dbtag === 'doctor_cpsid') {
                            foundTag = true
                            element.setAttribute('oscardb', 'current_user_cpsid'); 
                          }
                        }
                      })
                      
                      // Update the textarea with modified HTML
                      textHTML.value = htmlDoc.documentElement.outerHTML;

                      // Show notification
                      if (foundTag) {
                      notification.innerHTML = '✅ Replaced doctor with current_user';
                      notification.style.display = 'block';
                      } else {
                        notification.style.cssText = 'background: rgba(255, 193, 7, 0.15); color: #856404; border: 2px solid rgba(255, 193, 7, 0.4); width: fit-content; padding: 12px; border-radius: 6px; margin: 10px 0; display: none; font-weight: 500;'
                        notification.innerHTML = '⚠️ No doctor tags found!'
                        notification.style.display = 'block';
                        
                      }
                    

                    }
 
                    function user2Doctor() {
                      htmlDoc = parser.parseFromString(textHTML.value, 'text/html');
                      body = htmlDoc.getElementsByTagName('body')[0];
                      
                      var dbtags = htmlDoc.querySelectorAll('[oscardb]');
                      var foundTag
                      notification.innerHTML = '';
                      notification.style.cssText = 'background: rgba(74, 197, 58, 0.5); color: black; width: fit-content; padding: 10px; border-radius: 4px; margin: 10px 0; display: none;'

                      dbtags.forEach(element => {
                        var dbtag = element.getAttribute('oscardb')

                        if (dbtag) {
                          // Replace 'doctor' with 'current_user' in oscardb attributes
                          if (dbtag === 'current_user') {
                            foundTag = true
                            element.setAttribute('oscardb', 'doctor');
                            console.log('Changed current_user to doctor');
                          } else if (dbtag === 'current_user_ohip_no') {
                            foundTag = true
                            element.setAttribute('oscardb', 'doctor_ohip_no');
                          } else if (dbtag === 'current_user_cpsid') {
                            foundTag = true
                            element.setAttribute('oscardb', 'doctor_cpsid'); 
                          }
                        }
                      })
                      
                      // Update the textarea with modified HTML
                      textHTML.value = htmlDoc.documentElement.outerHTML;

                      // Show notification
                      if (foundTag) {
                      notification.innerHTML = '✅ Replaced current_user with doctor';
                      notification.style.display = 'block';
                      } else {
                        notification.style.cssText = 'background: rgba(255, 193, 7, 0.15); color: #856404; border: 2px solid rgba(255, 193, 7, 0.4); width: fit-content; padding: 12px; border-radius: 6px; margin: 10px 0; display: none; font-weight: 500;'
                        notification.innerHTML = '⚠️ No current_user tags found!'
                        notification.style.display = 'block';
                        
                      }
                    

                    }

                    function swapClassicForPro() {
                    
                      htmlDoc = parser.parseFromString(textHTML.value, 'text/html');
                      head = htmlDoc.getElementsByTagName('head')[0];
                      form = htmlDoc.getElementsByTagName('form')[0];
                      body = htmlDoc.getElementsByTagName('body')[0];

                      notification.innerHTML = '';
                      notification.style.cssText = 'background: rgba(74, 197, 58, 0.5); color: black; width: fit-content; padding: 10px; border-radius: 4px; margin: 10px 0; display: none;'
                      
                      //Loop through script tags to find canvas signature code
                      var scriptTags = head.querySelectorAll('script')
                      var scriptFound
                        scriptTags.forEach(script => {
                          //Once we find it, use regex to scrape style values
                          if (script.src.includes('signatureControl.jsp')) {script.remove()};
                          if (script.innerHTML.includes('signatureControl.initialize')) {                     
                            // Extract values
                            scriptFound = true
                            const regex = /(height|width|top|left):\s*(\d+)/g;
                            const values = {};
                            let match;
                            
                            while ((match = regex.exec(script.innerHTML)) !== null) {
                              values[match[1]] = parseInt(match[2]);
                            }
                            
                            console.log('Extracted values:', values.height);

                              //Make the Pro Signature elements
                              var proSigElement = document.createElement('div');
                              proSigElement.id = `CanvasProSignature_314159`;
                              proSigElement.style.top = values.top + "px"
                              proSigElement.style.left = values.left + "px"
                              proSigElement.style.position = "absolute"
                              proSigElement.classList.add("noborder");

                              var proSigElement_img = document.createElement('img');
                              proSigElement_img.id = "signature";
                              proSigElement_img.src = "BNK.png";
                              proSigElement_img.style.zIndex ="10";
                              proSigElement_img.style.width = values.width + "px";
                              proSigElement_img.style.height = values.height + "px";
                                                            
                              proSigElement.appendChild(document.createTextNode('\n'));
                              proSigElement.appendChild(proSigElement_img);

                              // Make hidden element for getting current user id
                              hidden_input = document.createElement('input');
                              hidden_input.id = "current_user_id";
                              hidden_input.name = "current_user_id";
                              hidden_input.setAttribute("oscardb","current_user_id");
                              hidden_input.type = "hidden";

                              form.append(document.createTextNode('\n'));
                              form.append(proSigElement)

                              form.append(document.createTextNode('\n'));
                              form.append(hidden_input)

                              // Remove the classic script stuff
                              var sigDisplayElement = htmlDoc.getElementById('signatureDisplay');
                              var sigValueElement = htmlDoc.getElementById('signatureValue');

                              script.remove();
                              if (sigDisplayElement) {sigDisplayElement.remove()};
                              if (sigValueElement) {sigValueElement.remove()};

                              // Check the onload functions for SignForm();
                              var onloadFunctions = body.getAttribute('onload');
                              // Add the function if it doesn't exist
                                if (!onloadFunctions.includes('SignForm')) {
                                onloadFunctions += 'SignForm();'; 
                                body.setAttribute('onload', onloadFunctions);
                                        // Build the script element
                                var scriptElement = document.createElement('script');
                                scriptElement.type = 'text/javascript';

                                //The formatting for this (extra lines, not indented) is on purpose
                                const scriptText = `
    function SignForm() {
    var provNum = $('#current_user_id').val();
    var signatureElements = Array.from(document.querySelectorAll('[id*=signature]'));
    for (var i = 0; i < signatureElements.length; i++){
        signatureElements[i].src = "../eform/displayImage.do?imagefile=consult_sig_"+provNum+".png";
        signatureElements[i].alt= provNum;
    }
    }
    `; 

                                // Create a text node to help preserve formatting
                                var textNode = document.createTextNode(scriptText);
                                scriptElement.appendChild(textNode);
                                head.appendChild(document.createTextNode('\n'));
                                head.appendChild(scriptElement);

                              };
                              
                            // Add all the changes back into the HTML text area
                              textHTML.value = htmlDoc.documentElement.outerHTML;

                              notification.style.cssText = 'background: rgba(74, 197, 58, 0.5); color: black; width: fit-content; padding: 10px; border-radius: 4px; margin: 10px 0; display: none;'
                              notification.innerHTML = notification.innerHTML =' ✅ Classic Signature was swapped for Pro Signature.'
                              notification.style.display = 'block';
                          } else if (!scriptFound) {
                            // Show notification
                            notification.style.cssText = 'background: rgba(255, 193, 7, 0.15); color: #856404; border: 2px solid rgba(255, 193, 7, 0.4); width: fit-content; padding: 12px; border-radius: 6px; margin: 10px 0; display: none; font-weight: 500;'
                            notification.innerHTML = '⚠️ No Classic Signature Found!'
                            notification.style.display = 'block';
                          }                        
                        });                 
                    };                   

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
 
  // Schedule page
  if (details.url.includes('providercontrol.jsp') || details.url.includes('appointmentprovideradminday.jsp')) {

    //Logic for Quick Link menu
    // Inject script into the page to access the DOM and add quick links
    chrome.storage.sync.get(['toggleQuickLinks','quickMenu_mcedt','quickMenu_billingcorrections',
      'quickMenu_editInvoice','quickMenu_qbe','quickMenu_rbt','quickMenu_faxOutbox','quickMenu_reload'], function (result) {
      if (result.toggleQuickLinks) {
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        args: [result],
        func: (toggles) => {
            // Inject dropdown CSS once
          if (!document.getElementById('quicklinks-styles')) {
            const st = document.createElement('style');
            st.id = 'quicklinks-styles';
            st.textContent = `
              .quicklinks{position:relative;display:inline-block;margin-left:-5px;}
              .quicklinks .quicklinks-trigger{cursor:pointer;user-select:none;text-decoration:none;color: #fffefeff;font-family:nimbus-sans,sans-serif;font-size:14px;}
              .quicklinks .quicklinks-trigger:focus{outline:2px solid #bdbdbd;outline-offset:2px;border-radius:2px}
              .quicklinks .quicklinks-menu{position:absolute;top:calc(100%);left:-5px;display:none;min-width:220px;padding:6px;background:#fff;border:1px solid #ddd;border-radius:6px;box-shadow:0 8px 20px rgba(0,0,0,.15);z-index:9999}
              .quicklinks:hover .quicklinks-menu{display:block}
              .quicklinks.open .quicklinks-menu{display:block}
              .quicklinks .quicklinks-section{padding:6px 8px;font-weight:600;color:#444;font-family:nimbus-sans,sans-serif;font-size:12px}
              .quicklinks .quicklinks-item{display:block;padding:6px 8px;margin:2px 0;border-radius:4px;color:#222;text-decoration:none;font-family:nimbus-sans,sans-serif;font-size:13px;position:relative;cursor:pointer;}
              .quicklinks .quicklinks-item:hover{background:#f2f2f2}
              .quicklinks .quicklinks-divider{height:1px;background:#eee;margin:6px 0}
              .quicklinks .quicklinks-item.has-submenu::after{content:'▶';position:absolute;right:8px;color:#888;font-size:10px;}
              .quicklinks .quicklinks-submenu{position:absolute;top:-6px;left:calc(100% - 10px);display:none;min-width:200px;padding:6px;background:#fff;border:1px solid #ddd;border-radius:6px;box-shadow:0 8px 20px rgba(0,0,0,.15);z-index:10000;}
              .quicklinks .quicklinks-item.has-submenu:hover .quicklinks-submenu{display:block;}
              .quicklinks .quicklinks-item.has-submenu::before{content:'';position:absolute;top:-6px;right:-10px;width:14px;height:calc(100% + 12px);background:transparent;z-index:9998;}
              .quicklinks .quicklinks-submenu .quicklinks-item{margin:1px 0;font-size:12px;}
            `;
            document.head.appendChild(st);
          }

          var adminElement = document.getElementById('admin2');
          if (!adminElement || document.getElementById('quicklinks')) return;

          // Wrapper + trigger
          const admin_wrap = document.createElement('span');
          admin_wrap.className = 'quicklinks';
          admin_wrap.id = 'quicklinks';

          const admin_arrow = document.createElement('a');
          admin_arrow.className = 'quicklinks-trigger';
          admin_arrow.href = '#';
          admin_arrow.title = 'Admin Quick Links';
          admin_arrow.setAttribute('aria-expanded', 'false');
          admin_arrow.textContent = '▿';

          // Menu with example links
          const menu = document.createElement('div');
          menu.className = 'quicklinks-menu';
                    menu.innerHTML = `
          <a class="quicklinks-item" href="/oscar/admin/providersearchrecordshtm.jsp" target="_blank" rel="noopener">Search Provider</a>
          <a class="quicklinks-item" href="/oscar/admin/securitysearchrecordshtm.jsp" target="_blank" rel="noopener">Search Username</a>
            <div class="quicklinks-divider"></div>
          `;

          if (toggles.quickMenu_mcedt) {
          menu.innerHTML = menu.innerHTML + 
          `<a class="quicklinks-item" href="/oscar/mcedt/kaimcedt.do" target="_blank" rel="noopener">MCEDT Mailbox (ON)</a>`;
          };

          if (toggles.quickMenu_billingcorrections) {
          menu.innerHTML = menu.innerHTML + 
          `<a class="quicklinks-item" href="/oscar/billing/CA/ON/billingCorrection.jsp?admin&billing_no=" target="_blank" rel="noopener">Billing Correction (ON)</a>`;
          };

          if (toggles.quickMenu_editInvoice) {
          menu.innerHTML = menu.innerHTML + 
          `<a class="quicklinks-item" href="/oscar/billing/CA/BC/billStatus.jsp" target="_blank" rel="noopener">Edit Invoices (BC)</a>`;
          };

          if (toggles.quickMenu_qbe) {
          menu.innerHTML = menu.innerHTML + 
          `<a class="quicklinks-item" href="/oscar/oscarReport/RptByExample.do" target="_blank" rel="noopener">Query by Example</a>`;
          };

          if (toggles.quickMenu_rbt) {
          menu.innerHTML = menu.innerHTML + 
          `<a class="quicklinks-item" href="/oscar/oscarReport/reportByTemplate/homePage.jsp" target="_blank" rel="noopener">Report by Template</a>`;
          };

          if (toggles.quickMenu_faxOutbox) {
          menu.innerHTML = menu.innerHTML + 
          `<a class="quicklinks-item" href="/kaiemr/#/fax/outbox" target="_blank" rel="noopener">Fax Outbox</a>`;
          };

          if (toggles.quickMenu_reload) {
          menu.innerHTML = menu.innerHTML + 
          `<div class="quicklinks-divider"></div><a class="quicklinks-item" href="/oscar/admin/reloadConfigurations.jsp" target="_blank" rel="noopener">Reload Configurations</a>`;
          };

          admin_wrap.appendChild(admin_arrow);
          admin_wrap.appendChild(menu);
          adminElement.appendChild(admin_wrap);
          // Click toggle + close on outside/Escape
          function closeMenu(){
            admin_wrap.classList.remove('open');
            admin_arrow.setAttribute('aria-expanded','false');
          }
          admin_arrow.addEventListener('click',(e)=>{
            e.preventDefault();
            const isOpen = admin_wrap.classList.toggle('open');
            admin_arrow.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
          });
          document.addEventListener('click',(e)=>{ if(!admin_wrap.contains(e.target)) closeMenu(); });
          document.addEventListener('keydown',(e)=>{ if(e.key==='Escape') closeMenu(); });
        }
      });
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
      if (result.toggleMeasurements) exclusions.push('/oscarMeasurements');
      if (result.toggleDiseaseRegistry) exclusions.push('/oscarDxResearch');
      if (result.togglePreventions) exclusions.push('/oscarPrevention');
  });
}

// Listen for storage changes and update exclusions when tab settings change
chrome.storage.onChanged.addListener(function(changes, namespace) {
  // Check if any tab exclusion settings changed
  const tabExclusionKeys = [
    'toggleEchartTabs', 'toggleAdminTabs', 'toggleSearchTabs', 
    'toggleInboxTabs', 'toggleEformTabs', 'toggleTicklerTabs',
    'toggleDocumentTabs', 'toggleHRMTabs', 'toggleLabsTabs',
    'toggleAttachmentManager','toggleMeasurements','toggleDiseaseRegistry',
    'togglePreventions'
  ];
  
  const hasTabExclusionChange = tabExclusionKeys.some(key => changes[key]);
  
  if (hasTabExclusionChange) {
    updateTabExclusionTable();
  }
});

updateTabExclusionTable();

