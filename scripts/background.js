const WCA_MAIN_URL = "https://www.worldcubeassociation.org/";
const WCA_FORUM_URL = "https://forum.worldcubeassociation.org/";
const GMAIL_URL = "https://mail.google.com/";
const VALID_URLS = [WCA_MAIN_URL, WCA_FORUM_URL, GMAIL_URL].map(url => url + '*');
const COMMANDS = ["keep-replace", "long-replace"];


function sendToContentScript(command) {
    if (COMMANDS.includes(command)) {
        (async () => {
            const [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true, url: VALID_URLS});
            if (tab !== undefined && tab.length !== 0) {
                await chrome.tabs.sendMessage(tab.id, {replace_mode: command, url: tab.url})
                .catch((error) => {
                    console.error("Could not send message to content script: " + error);
                });
            }
        })();
    }
}

chrome.commands.onCommand.addListener((command) => {
    sendToContentScript(command);
});

let regulations = null;

fetch(chrome.runtime.getURL("data/wca-regulations.json"))
.then(response => response.json())
.then(data => {
    regulations = data;
    return true;
})
.catch(error => {
    console.error("Could not get regulations data: " + error);
    return false;
});

// TODO: Inyectar content script luego de activar la extensión.
