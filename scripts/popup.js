const WCA_MAIN_URL = "https://www.worldcubeassociation.org/";
const WCA_FORUM_URL = "https://forum.worldcubeassociation.org/";
const GMAIL_URL = "https://mail.google.com/";
const VALID_URLS = [WCA_MAIN_URL, WCA_FORUM_URL, GMAIL_URL].map(url => url + '*');

const status_text = document.getElementById('status-text');
const info_btn = document.getElementById('info-btn');
const config_btn = document.getElementById('config-btn');
const config_div = document.getElementById('config-container');

const options = {
  enabled: document.getElementById('conf-enabled'),
  display_detected: document.getElementById('conf-display-detected')
};

// --- Popup setup --- //

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
    url: VALID_URLS
  })
  .then((tabs) => {
    if (tabs.length === 0) {
      status_text.innerHTML = "Unknown site";
      return;
    }
    const url = tabs[0].url;
    if (url.includes(GMAIL_URL)) {
      status_text.innerHTML = "Gmail";
    } else if (url.includes(WCA_MAIN_URL) || url.includes(WCA_FORUM_URL)) {
      status_text.innerHTML = "WCA";
    }
  })
  .catch((error) => {
    status_text.innerHTML = "Error";
    console.error("Could not read tab URL: " + error);
  });
}

function popupSetup() {
  changeStatus();
  config_btn.onclick = displayConfig;

  chrome.storage.local.get(['display_config']).then((result) => {
    if (result !== undefined && result.display_config) {
      config_div.style.display = 'block';
    }
  });

  // Add event listener to the info button.
  info_btn.addEventListener('click', function() {
    chrome.tabs.create({ url: "../html/info.html" });
  });

  // Add event handlers for the checkboxes.
  for (let [key, value] of Object.entries(options)) {
    if (value === undefined) {
      console.error("Could not find the option: " + key);
    } else {
      // Set saved status for the option.
      chrome.storage.local.get([key]).then((result) => {
        if (result[key] !== undefined) {
          value.checked = result[key];
        }
      });
    }

    // Add event listener to the checkbox.
    value.addEventListener('change', function() {
      chrome.storage.local.set({[key]: value.checked})
      .catch(() => {
        console.error("Could not save the option: " + key);
        value.checked = !value.checked;
      });
    });
  }
}

// --- Run the setup --- //
popupSetup();
