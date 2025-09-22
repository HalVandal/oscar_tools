const tabTable = {
  echart:{url:true,
  enabled:true}
}


chrome.webNavigation.onCompleted.addListener(function(details) {
  console.log('web navigation detected!')
  chrome.storage.sync.get(['toggleClassicURL'], function(result) {
    if (!result.toggleClassicURL) return; // Do nothing if disabled
    const oldFragment = "kaiemr/";
    if (details.url.includes(oldFragment)) {   
        const urlObj = new URL(details.url);
        const baseUrl = urlObj.origin;
        const newUrl = baseUrl + '/oscar/index.jsp?login=use-classic'
        chrome.tabs.update(details.tabId, { url: newUrl });
    }
  });
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
              const exclusions = [];
              if (result.toggleEchartTabs) exclusions.push('forward.jsp');
              if (result.toggleAdminTabs) exclusions.push('administration');
              if (result.toggleSearchTabs) exclusions.push('search.jsp');
              // Add more exclusions as needed


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