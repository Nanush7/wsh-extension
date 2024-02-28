const WCA_MAIN_URL = "https://www.worldcubeassociation.org/";
const WCA_FORUM_URL = "https://forum.worldcubeassociation.org/";
const GMAIL_URL = "https://mail.google.com/";
const VALID_URLS = [WCA_MAIN_URL, WCA_FORUM_URL, GMAIL_URL].map(url => url + '*');
const COMMANDS = ["short-replace", "long-replace", "stop-error"];
const REGULATIONS_JSON = "data/wca-regulations.json";
const DOCUMENTS_JSON = "data/wca-documents.json";
const DEFAULT_OPTIONS_JSON = "data/default-options.json";


function sendToContentScript(command) {
    if (COMMANDS.includes(command)) {
        (async () => {
            const [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true, url: VALID_URLS});
            if (tab !== undefined) {
                await chrome.tabs.sendMessage(tab.id, {command: command, url: tab.url})
                .catch((error) => {
                    console.error("Could not send message to content script: " + error);
                });
            }
        })();
    }
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
        sendMessage("stop-error");
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
        sendMessage("stop-error");
    }
}

chrome.commands.onCommand.addListener((command) => {
    sendToContentScript(command);
});

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "chrome_update") return;

    fetch(chrome.runtime.getURL(DEFAULT_OPTIONS_JSON))
    .then(response => response.json())
    .then(options => {
        chrome.storage.local.get(Object.keys(options), (result) => {
            let undefined_options = {};
            for (let option of Object.keys(options)) {
                if (result[option] === undefined) {
                    undefined_options[option] = options[option];
                }
            }
            if (Object.keys(undefined_options).length > 0) {
                chrome.storage.local.set(undefined_options);
            }
        });
    })
    .catch(error => {
        console.error("Could not fetch default options: " + error);
        sendMessage("stop-error");
    });

    fetchDocuments();
});

chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get(["regulations", "documents"])
    .then((result) => {
        if (result.regulations === undefined || result.documents === undefined) {
            fetchDocuments();
        }
    })
    .catch(() => {
        fetchDocuments();
    });
});

// TODO: Inyectar content script después de activar la extensión.
/*
// background.js
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: {tabId: tab.id},
    files: ['content.js']
  });
});
*/
