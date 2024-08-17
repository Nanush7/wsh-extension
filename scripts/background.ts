// export {};

import Tab = chrome.tabs.Tab;
import { wcadocs, allowed_options } from "./common";

const BROWSER: allowed_options.OBrowser = "chrome";
const SITES: Array<string> = [
    "https://www.worldcubeassociation.org/",
    "https://forum.worldcubeassociation.org/",
    "https://mail.google.com/"
]
const VALID_URLS: Array<string> = SITES.map(url => url + '*');
const COMMANDS: Array<allowed_options.OCommand> = ["short-replace", "long-replace", "display-regulation", "stop-error", "enable", "disable"];
const REGULATIONS_JSON: string = "data/wca-regulations.json";
const DOCUMENTS_JSON: string = "data/wca-documents.json";
const DEFAULT_OPTIONS_JSON: string = "data/default-options.json";

async function sendToContentScript(command: allowed_options.OCommand, all: boolean = false): Promise<void> {
    if (COMMANDS.includes(command)) {
        let tabs: Tab[];
        let messages: Promise<void>[] = [];
        if (all) {
            tabs = await chrome.tabs.query({url: VALID_URLS});
        } else {
            tabs = await chrome.tabs.query({active: true, lastFocusedWindow: true, url: VALID_URLS});
        }
        for (let tab of tabs) {
            if (tab.id === undefined) continue;
            const promise: Promise<any> = chrome.tabs.sendMessage(tab.id, {command: command, url: tab.url});
            promise.catch((error) => {
                console.error("Could not send message to content script: " + error);
            });
            messages.push(promise);
        }
        await Promise.allSettled(messages);
    }
}

async function injectWSHEvent(tab_id: number) {
    // Inject the WSHReplaceEvent listener into the WCA page.
    try {
        if (BROWSER === "chrome") {
            await chrome.scripting.executeScript({
                target: {tabId: tab_id},
                world: "MAIN",
                files: ["scripts/purify.min.js", "scripts/wsh-event-injection.ts"]
            });
        } else {
            await chrome.scripting.executeScript({
                target: {tabId: tab_id},
                files: ["scripts/wsh-event-injection.ts"]
            });
        }
    } catch (e) {
        console.error("Could not inject WSHReplaceEvent: " + e);
        return false;
    }
    return true;
}

async function fetchDocuments(): Promise<void> {
    let regulations: Record<string, wcadocs.TRegulation>;
    let documents: Array<wcadocs.TDocument>;
    let regulations_version: string;

    try {
        let [regulationsResponse, documentsResponse] = await Promise.all([
            fetch(chrome.runtime.getURL(REGULATIONS_JSON)),
            fetch(chrome.runtime.getURL(DOCUMENTS_JSON))
        ]);

        let regulationsData = await regulationsResponse.json();
        regulations_version = regulationsData.shift().version;
        regulations = {};
        // Here we are generating a dictionary with the regulation id as the key.
        regulationsData.forEach((element: wcadocs.TRegulation) => {
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

function getOptionsFromStorage(options: allowed_options.OStoredValue[]): {[key: string]: any} | undefined {
    /* Returns undefined on exception. */
    try {
        return chrome.storage.local.get(options);
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
                let undefined_options: Record<string, any> = {};
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

chrome.commands.onCommand.addListener(async (command: allowed_options.OCommand) => {
    if (COMMANDS.includes(command)) await sendToContentScript(command);
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id || !sender.tab || !sender.tab.id) return;
    switch (message.command) {
        case "inject-wsh-event":
            let status = 1;
            if (await injectWSHEvent(sender.tab.id)) {
                status = 0;
            }
            if (BROWSER === "chrome") {
                sendResponse({status: status});
                break;
            }
            // else:
            return {status: status};
        case "get-internal-url":
            let url = undefined;
            if (message.params !== undefined) {
                url = chrome.runtime.getURL(message.params.path);
            }
            if (BROWSER === "chrome") {
                sendResponse({url: url});
                break;
            }
            // else:
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
