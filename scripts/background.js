const SITES = {
    wca_main: "https://www.worldcubeassociation.org/",
    wca_forum: "https://forum.worldcubeassociation.org/",
    gmail: "https://mail.google.com/"
}
const VALID_URLS = Object.values(SITES).map(url => url + '*');
const COMMANDS = ["short-replace", "long-replace", "stop-error", "enable", "disable"];
const REGULATIONS_JSON = "data/wca-regulations.json";
const DOCUMENTS_JSON = "data/wca-documents.json";
const DEFAULT_OPTIONS_JSON = "data/default-options.json";


function sendToContentScript(command, all=false) {
    if (COMMANDS.includes(command)) {
        return (async () => {
            let tabs;
            if (all) tabs = await chrome.tabs.query({url: VALID_URLS});
            else tabs = await chrome.tabs.query({active: true, lastFocusedWindow: true, url: VALID_URLS});
            for (let tab of tabs) {
                await chrome.tabs.sendMessage(tab.id, {command: command, url: tab.url})
                .catch((error) => {
                    console.error("Could not send message to content script: " + error);
                });
            }
        })();
    }
}

function injectWSHEvent(tab_id) {
    // Inject the WSHReplaceEvent listener into the WCA page.
    chrome.scripting.executeScript({target: {tabId: tab_id}, files: ["scripts/wsh-event-injection.js"]})
    .catch((error) => {
        console.error("Could not inject WSHReplaceEvent: " + error);
        return false;
    });
    return true;
}

async function fetchDocuments() {
    let regulations;
    let regulations_version;
    let documents;

    try {
        let [regulationsResponse, documentsResponse] = await Promise.all([
            fetch(chrome.runtime.getURL(REGULATIONS_JSON)),
            fetch(chrome.runtime.getURL(DOCUMENTS_JSON))
        ]);

        let regulationsData = await regulationsResponse.json();
        regulations_version = regulationsData.shift().version;
        regulations = {};
        regulationsData.forEach(element => {
            regulations[element.id.toLowerCase()] = element;
        });

        documents = await documentsResponse.json();
    } catch (error) {
        console.error("Could not get data: " + error);
        await sendToContentScript("stop-error", true);
        return;
    }

    try {
        await chrome.storage.local.set({
            regulations: regulations,
            regulations_version: regulations_version,
            documents: documents
        });
    } catch (error) {
        console.error("Could not save data to storage: " + error);
        await sendToContentScript("stop-error", true);
    }
}

async function getOptionsFromStorage(options) {
    /* Returns undefined on exception. */
    try {
        return await chrome.storage.local.get(options);
    }
    catch (error) {
        console.error(`Could not read option/s [${options}] from storage. ${error}`);
    }
    return undefined;
}

// --- Set listeners up --- //

chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "chrome_update") return;

    fetch(chrome.runtime.getURL(DEFAULT_OPTIONS_JSON))
    .then(response => response.json())
    .then(json_options => {
        const json_option_keys = Object.keys(json_options);
        chrome.storage.local.get(json_option_keys)
            .then((stored_options) => {
                let undefined_options = {};
                for (let jok of json_option_keys) {
                    if (stored_options[jok] === undefined) {
                        undefined_options[jok] = json_options[jok];
                    }
                }
                if (Object.keys(undefined_options).length > 0) {
                    chrome.storage.local.set(undefined_options);
                }
            });
    })
    .catch(error => {
        console.error("Could not fetch default options: " + error);
        sendToContentScript("stop-error", true);
    });

    await fetchDocuments();
});

chrome.runtime.onStartup.addListener(async () => {
    const result = getOptionsFromStorage(["regulations", "documents"]);
    if (result === undefined || result.regulations === undefined || result.documents === undefined) {
        await fetchDocuments();
    }
});

chrome.commands.onCommand.addListener(async (command) => {
    if (COMMANDS.includes(command)) await sendToContentScript(command);
});

chrome.runtime.onMessage.addListener(async (message, sender) => {
    if (sender.id !== chrome.runtime.id) return;
    switch (message.command) {
        case "inject-wsh-event":
            let status;
            if (injectWSHEvent(sender.tab.id)) {
                status = 0;
            } else {
                status = 1;
            }
            return {status: status};
        case "get-internal-url":
            let url = undefined;
            if (message.params !== undefined) url = chrome.runtime.getURL(message.params.path);
            return {url: url};
        default:
            // Ignore.
            break;
    }
});

chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === "local") {
        if (changes.enabled !== undefined) {
            const command = changes.enabled.newValue ? "enable" : "disable";
            await sendToContentScript(command, true);
        }
    }
});
