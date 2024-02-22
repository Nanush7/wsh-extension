const status_text = document.getElementById('status-text');
const config_btn = document.getElementById('config-btn');
const config_div = document.getElementById('config-container');

function displayConfig() {
  if (config_div.style.display === 'none') {
    config_div.style.display = 'block';
  } else {
    config_div.style.display = 'none';
  }
}

function changeStatus(tabInfo) {
  chrome.tabs.get(tabInfo.tabId, function(tab) {
    if (tab.url.includes("https://mail.google.com")) {
      status_text.innerHTML = "Gmail";
    } else if (tab.url.includes("https://www.worldcubeassociation.org")) {
      status_text.innerHTML = "WCA";
    } else {
      status_text.innerHTML = "Idling";
    }
  });
}

config_btn.onclick = displayConfig;
document.addEventListener(function(tabId, changeInfo, tab) {
  if (changeInfo.url) {
    changeStatus({ tabId: tabId });
  }
});

/*
// Get references to the checkboxes
const checkbox1 = document.getElementById('checkbox1');
const checkbox2 = document.getElementById('checkbox2');
const checkbox3 = document.getElementById('checkbox3');

// Add event handlers for the checkboxes
checkbox1.addEventListener('change', function() {
  // Handle checkbox1 change event
  if (checkbox1.checked) {
    // Checkbox1 is checked
    console.log('Checkbox 1 is checked');
  } else {
    // Checkbox1 is unchecked
    console.log('Checkbox 1 is unchecked');
  }
});

checkbox2.addEventListener('change', function() {
  // Handle checkbox2 change event
  if (checkbox2.checked) {
    // Checkbox2 is checked
    console.log('Checkbox 2 is checked');
  } else {
    // Checkbox2 is unchecked
    console.log('Checkbox 2 is unchecked');
  }
});

checkbox3.addEventListener('change', function() {
  // Handle checkbox3 change event
  if (checkbox3.checked) {
    // Checkbox3 is checked
    console.log('Checkbox 3 is checked');
  } else {
    // Checkbox3 is unchecked
    console.log('Checkbox 3 is unchecked');
  }
});
*/
