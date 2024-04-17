const VERSION = "1.1.0";

// --- URLs --- //
const SITES = {
    wca_main: "https://www.worldcubeassociation.org/",
    wca_forum: "https://forum.worldcubeassociation.org/",
    gmail: "https://mail.google.com/"
}
const VALID_URLS = Object.values(SITES).map(url => url + '*');

// --- Allowed commands --- //
const COMMANDS = ["display-regulation"];

// --- DOM elements --- //
const main_div = document.getElementById('main-container');
const status_text = document.getElementById('status-text');
const extension_version_p = document.getElementById('extension-version');
const regulations_version_p = document.getElementById('regulations-version');
const info_btn = document.getElementById('info-btn');
const config_btn = document.getElementById('config-btn');
const config_div = document.getElementById('config-container');
const regulations_div = document.getElementById('regulations-container');
const regulations_text = document.getElementById('regulations-text');
const options = {
    "enabled": document.getElementById('conf-enabled'),
    "catch-links": document.getElementById('conf-catch-links'),
    "justify-box-text":  document.getElementById('conf-justify-box-text'),
    "box-font-size": document.getElementById('conf-box-font-size'),
    "box-timeout": document.getElementById('conf-box-timeout')
};

// --- Utils --- //

function sendToContentScript(command) {
    if (COMMANDS.includes(command)) {
        return (async () => {
            const [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true, url: VALID_URLS});
            if (tab !== undefined) {
                return await chrome.tabs.sendMessage(tab.id, {command: command, url: tab.url})
                .catch((error) => {
                    if (error.message !== undefined && error.message.includes("Receiving end does not exist")) {
                        console.warn("Content script not found, try reloading the page.");
                    } else {
                        console.error("Could not send message to content script: " + error);
                    }
                });
            }
        })();
    }
}

// --- Popup setup --- //

function displayConfig() {
    if (config_div.style.display === 'none') {
        config_div.style.display = 'block';
        chrome.storage.local.set({ display_config: true });
    } else {
        config_div.style.display = 'none';
        chrome.storage.local.set({ display_config: false });
    }
}

function setPopupInfo() {
    chrome.tabs.query({
        active: true,
        currentWindow: true,
        url: VALID_URLS
    })
    .then((tabs) => {
        if (tabs.length === 0) {
            status_text.textContent = "Unknown site";
            return;
        }
        const url = tabs[0].url;
        if (url.includes(SITES.gmail)) {
            status_text.textContent = "Gmail";
        } else if (url.includes(SITES.wca_main) || url.includes(SITES.wca_forum)) {
            status_text.textContent = "WCA";
        }
    })
    .catch((error) => {
        status_text.textContent = "Error";
        console.error("Could not read tab URL: " + error);
    });

    // Set information about versions.
    extension_version_p.textContent = VERSION;
    chrome.storage.local.get(["regulations_version"]).then((result) => {
        if (result !== undefined && result.regulations_version !== undefined) {
            const v = result.regulations_version.split("#");
            regulations_version_p.textContent = `${v[0]} (${v[1]})`;
        }
    });
}

function popupSetup() {
    setPopupInfo();
    config_btn.onclick = displayConfig;

    chrome.storage.local.get(["display_config"]).then((result) => {
        if (result !== undefined && result.display_config) {
            config_div.style.display = 'block';
        }
    });

    // Add event listener to the info button.
    info_btn.addEventListener("click", function () {
        chrome.tabs.create({ url: "../html/info.html" });
    });

    // Add event handlers for the options inputs.
    for (let [key, input_elem] of Object.entries(options)) {
        // TODO: Improve.
        if (input_elem === undefined) {
            console.error("Could not find the option element: " + key);
        } else {
            // Set saved status for the option.
            chrome.storage.local.get([key]).then((stored_options) => {
                if (stored_options[key] !== undefined) {
                    switch (input_elem.type) {
                        case "checkbox":
                            input_elem.checked = stored_options[key];
                            break;
                        case "number":
                            input_elem.value = stored_options[key];
                            break;
                    }
                }
            });
        }

        input_elem.addEventListener("change", function () {
            let new_value = null;
            switch (input_elem.type) {
                case "checkbox":
                    new_value = input_elem.checked;
                    break;
                case "number":
                    const min = parseInt(input_elem.min);
                    const max = parseInt(input_elem.max);
                    const v = parseInt(input_elem.value);
                    if (!isNaN(min) && v < min) {
                        new_value = min;
                    } else if (!isNaN(max) && v > max) {
                        new_value = max;
                    } else {
                        new_value = v;
                    }
                    input_elem.value = new_value;
                    break;
                default:
                    console.error("Unknown option type: " + typeof input_elem.value);
                    return;
            }
            if (new_value !== null) {
                chrome.storage.local.set({[key]: new_value})
                    .catch(() => {
                        console.error("Could not save the option: " + key);
                    });
            } else {
                console.log("Invalid value for option: " + key);
            }
        });
    }
}

// --- Display regulation --- //
function displayRegulation(data) {
    // Hide the main and config divs and show the regulation div.
    main_div.style.display = 'none';
    config_div.style.display = 'none';
    regulations_div.style.display = 'block';

    const guideline_label = data.regulation_label === undefined ? "" : `<b>${data.regulation_label}</b>`;
    const unsafe_HTML = `<a href="${data.regulation_url}">${data.regulation_id}</a>) ${guideline_label} ${data.regulation_content}`;
    regulations_text.innerHTML = DOMPurify.sanitize(unsafe_HTML, {ALLOWED_TAGS: ['a', 'b']});
    // Add target="_blank" to all links.
    // Also add rel="noreferrer" for security reasons.
    regulations_text.querySelectorAll('a').forEach(link => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noreferrer');
    });
}

// --- Run the setup --- //

sendToContentScript("display-regulation").then((response) => {
    if (response !== undefined && response.message.status === 0) {
        displayRegulation(response.message);
    }
});

popupSetup();
