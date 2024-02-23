// Main buttons.
const status_text = document.getElementById('status-text');
const config_btn = document.getElementById('config-btn');
const config_div = document.getElementById('config-container');
const wca_url = "https://www.worldcubeassociation.org/";
const gmail_url = "https://mail.google.com/";

// Config options.
const options = {
  enabled: document.getElementById('conf-enabled'),
  display_detected: document.getElementById('conf-display-detected')
};

function displayConfig() {
  if (config_div.style.display === 'none') {
    config_div.style.display = 'block';
    chrome.storage.local.set({display_config: true});
  } else {
    config_div.style.display = 'none';
    chrome.storage.local.set({display_config: false});
  }
}

function changeStatus() {
  chrome.tabs.query({ 
    active: true,
    currentWindow: true,
    url: [wca_url + '*', gmail_url + '*']
  })
  .then((tabs) => {
    if (tabs.length === 0) {
      status_text.innerHTML = "Idling";
      return;
    }
    if (tabs[0].url.includes(gmail_url)) {
      status_text.innerHTML = "Gmail";
    } else if (tabs[0].url.includes(wca_url)) {
      status_text.innerHTML = "WCA";
    }
  })
  .catch((error) => {
    status_text.innerHTML = "Error";
    console.log(error);
  });
}

// Popup setup.
changeStatus();
config_btn.onclick = displayConfig;

chrome.storage.local.get(['display_config']).then((result) => {
  if (result !== undefined && result.display_config) {
    config_div.style.display = 'block';
  }
});

// Add event handlers for the checkboxes.
for (let [key, value] of Object.entries(options)) {
  if (value === undefined) {
    console.log("Could not find the option: " + key);
  } else {
    // Set saved status for the option.
    chrome.storage.local.get([key]).then((result) => {
      console.log(key);
      console.log(result[key]);
      if (result[key] !== undefined) {
        value.checked = result[key];
      }
    });
  }

  // Add event listener to the checkbox.
  value.addEventListener('change', function() {
    chrome.storage.local.set({[key]: value.checked})
    .then(() => {
      console.log("Option saved.");
    })
    .catch(() => {
      console.log("Could not save the option.");
      value.checked = !value.checked;
    });
  });
}
