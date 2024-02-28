const EXTENSION_ID = "babeegohnjmbkcnheaikbpehoeelimen";
const WCA_MAIN_URL = "https://www.worldcubeassociation.org/";
const WCA_FORUM_URL = "https://forum.worldcubeassociation.org/";
const GMAIL_URL = "https://mail.google.com/";
const PERSON_RELATIVE_URL = "persons/";
const COMMANDS = ["short-replace", "long-replace", "stop-error"];
const REGULATION_REGEX = /\b(([1-9][0-9]?[a-z]([1-9][0-9]?[a-z]?)?)|([a-z][1-9][0-9]?([a-z]([1-9][0-9]?)?)?))\b\+*/i;
const PERSON_REGEX = /[1-9]\d{3}[a-z]{4}\d{2}/i

const consoleLog = console.log
console.log = function (message) {
    consoleLog("[WCA Staff Helper] " + message);
}

async function getDocuments() {
    // Get regulations from storage.
    if (regulations !== null && documents !== null) return true;
    try {
        const result = await chrome.storage.local.get(["regulations", "documents"]);
        if (result.regulations !== undefined && result.documents !== undefined) {
            regulations = await result.regulations;
            documents = await result.documents;
        } else {
            alert("Regulations and document data not found. Try restaring your browser.");
            stop_error = true;
            return false;
        }
    }
    catch (error) {
        alert("Could not get regulations and documents data from storage: " + error + ". Try restaring your browser.");
        stop_error = true;
        return false;
    }
    return true;
}

function getRegulationOrGuideline(text, mode) {
    let reg_num = text.match(REGULATION_REGEX);
    if (!reg_num || !regulations[reg_num[0]]) return [null, null];
    reg_num = reg_num[0];
    const type = text.includes("+") ? "Guideline" : "Regulation";
    const link_text = mode === "short-replace" ? regulations[reg_num].id : `${type} ${regulations[reg_num].id}`;
    const link_url = `${WCA_MAIN_URL}${regulations[reg_num].url.substring(1)}`;
    return [link_text, link_url];
}

function getPerson(text) {
    let person = text.match(PERSON_REGEX);
    if (!person) return [null, null];
    const link_text = person[0].toUpperCase();
    const link_url = `${WCA_MAIN_URL}${PERSON_RELATIVE_URL}${link_text}`;
    return [link_text, link_url];
}

function replaceInGmail(selected_text, selected_range, link_text, link_url) {
    // Get Gmail composition window.
    const mail_element = document.getElementsByClassName("editable")[0];
    // Check: Is the selected text in the compose element?
    if (!(mail_element && mail_element.contains(selected_text.anchorNode) && mail_element.contains(selected_text.focusNode))) {
        // TODO: Warn the user.
        console.log("Selected text is not in the gmail composition element.");
        return;
    }
    // We check that the range start and end are in the same div.
    if (selected_range.startContainer.parentElement.nodeName !== "DIV"
        || selected_range.startContainer.parentElement !== selected_range.endContainer.parentElement) {
        console.log("Cannot replace text in the selection.");
        return;
    }

    selected_range.deleteContents();
    const link = document.createElement("a");
    link.href = link_url;
    link.textContent = link_text;
    selected_range.insertNode(link);
}

function replace(mode, url) {
    // Get selected text.
    const selected_text = document.getSelection();
    if (selected_text.rangeCount === 0) {
        console.log("No text selected.");
        return;
    }

    const selected_range = selected_text.getRangeAt(0);
    const selected_string = selected_text.toString().trim().toLowerCase();
    let link_text;
    let link_url;
    for (let doc of documents) {
        if (selected_string.includes(doc.short_name.toLowerCase())) {
            if (mode === "short-replace") {
                link_text = doc.short_name;
            } else {
                link_text = doc.long_name;
            }
            link_url = doc.url;
            break;
        }
    }
    // Three nested ifs? Sorry, not sorry.
    if (!link_url) {
        [link_text, link_url] = getRegulationOrGuideline(selected_string, mode);
        if (!link_url) {
            [link_text, link_url] = getPerson(selected_string);
            if (!link_url) {
                window.alert("Selected text is not a valid document, regulation, guideline or WCA ID.");
                return;
            }
        }
    }

    if (url.startsWith(GMAIL_URL)) {
        replaceInGmail(selected_text, selected_range, link_text, link_url);
    } else if (url.startsWith(WCA_MAIN_URL) || url.startsWith(WCA_FORUM_URL)) {
        // replaceInWCA(mode);
    }
}

function getRegulationMessage() {
    let message = {};
    // Get selected text.
    const selected_text = document.getSelection();
    if (selected_text.rangeCount === 0) {
        message.status = 1;
    }

    const selected_string = selected_text.toString().trim().toLowerCase();
    reg_num = selected_string.match(REGULATION_REGEX);
    if (!reg_num || !regulations[reg_num[0]]) {
        message.status = 2;
    } else {
        const regulation = regulations[reg_num[0]];
        message.status = 0;
        message.regulation_id = regulation.id;
        message.regulation_url = `${WCA_MAIN_URL}${regulation.url.substring(1)}`;
        message.regulation_content = regulation.content_html;
        message.regulation_label = regulation.guideline_label;
    }
    return message;
}

let regulations = null;
let documents = null;
let stop_error = false;
let enabled;

chrome.runtime.onMessage.addListener(
    async function (message, sender, sendResponse) {
        // Check if the message came from the extension itself.
        if (sender.id !== EXTENSION_ID || stop_error) {
            return;
        }
        switch (message.command) {
            case "display-regulation":
                if (enabled) {
                    const documents_available = await getDocuments();
                    if (documents_available) sendResponse({message: getRegulationMessage()});
                }
                break;
            case "stop-error":
                stop_error = true;
                break;
            case "enable":
                enabled = true;
                break;
            case "disable":
                enabled = false;
                break;
            default:
                if (enabled && COMMANDS.includes(message.command)) {
                    const documents_available = await getDocuments();
                    if (documents_available) replace(message.command, message.url);
                }
                break;
        }
    }
);

// Check if the extension is enabled.
chrome.storage.local.get(["enabled"]).then((result) => {
    if (result !== undefined) {
        enabled = result.enabled;
    } else {
        enabled = true;
        chrome.storage.local.set({enabled: true});
    }
}).catch((error) => {
    console.error("Could not get enabled status from storage: " + error);
    // We leave it disabled just in case.
    enabled = false;
});
