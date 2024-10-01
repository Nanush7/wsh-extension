// --- URLs --- //
const SITES = {
    wca_main: "https://www.worldcubeassociation.org/",
    wca_forum: "https://forum.worldcubeassociation.org/",
    gmail: "https://mail.google.com/"
}
// @ts-ignore
const VALID_URLS = Object.values(SITES).map(url => url + '*');

// --- DOM elements --- //
const status_text = document.getElementById('status-text') as HTMLParagraphElement;
const regulations_version_p = document.getElementById('regulations-version') as HTMLParagraphElement;
const info_btn = document.getElementById('info-btn') as HTMLButtonElement;
const config_btn = document.getElementById('config-btn') as HTMLButtonElement;
const config_div = document.getElementById('config-container') as HTMLDivElement;
const options = {
    "enabled": document.getElementById('conf-enabled') as HTMLInputElement,
    "catch-links": document.getElementById('conf-catch-links') as HTMLInputElement,
    "justify-box-text":  document.getElementById('conf-justify-box-text') as HTMLInputElement,
    "box-font-size": document.getElementById('conf-box-font-size') as HTMLInputElement,
    "box-timeout": document.getElementById('conf-box-timeout') as HTMLInputElement
};

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
        if (tabs.length === 0 || tabs[0].url === undefined) {
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
                    input_elem.value = String(new_value);
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

popupSetup();
