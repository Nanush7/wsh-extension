const WCA_MAIN_URL = "https://www.worldcubeassociation.org/";
const WCA_FORUM_URL = "https://forum.worldcubeassociation.org/";
const GMAIL_URL = "https://mail.google.com/";
const PERSON_RELATIVE_URL = "persons/";
const INCIDENT_LOG_RELATIVE_URL = "incidents/";
const COMMANDS = ["short-replace", "long-replace", "stop-error"];
const REGULATION_REGEX = /\b(([1-9][0-9]?[a-z]([1-9][0-9]?[a-z]?)?)|([a-z][1-9][0-9]?([a-z]([1-9][0-9]?)?)?))\b\+{0,10}/i;
const PERSON_REGEX = /\b[1-9]\d{3}[a-z]{4}\d{2}\b/i
const INCIDENT_LOG_REGEX = /\bil#[1-9]\d{0,5}\b/i

const consoleLog = console.log
console.log = function (message) {
    consoleLog("[WCA Staff Helper] " + message);
}

async function fetchDocuments() {
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

// --- Link generation functions --- //

function getWCADocument(text, mode) {
    for (let doc of documents) {
        if (text === doc.short_name.toLowerCase()) {
            let link_text;
            if (mode === "short-replace") {
                link_text = doc.short_name;
            } else {
                link_text = doc.long_name;
            }
            return [link_text, doc.url];
        }
    }
    return [null, null];
}

function getRegulationOrGuideline(text, mode) {
    let reg_num = text.match(REGULATION_REGEX);
    if (!reg_num || text.length !== reg_num[0].length || !regulations[reg_num[0]]) return [null, null];
    reg_num = reg_num[0];
    const type = text.includes("+") ? "Guideline" : "Regulation";
    const link_text = mode === "short-replace" ? regulations[reg_num].id : `${type} ${regulations[reg_num].id}`;
    const link_url = `${WCA_MAIN_URL}${regulations[reg_num].url.substring(1)}`;
    return [link_text, link_url];
}

function getPerson(text) {
    let person = text.match(PERSON_REGEX);
    if (!person || text.length !== person[0].length) return [null, null];
    const link_text = person[0].toUpperCase();
    const link_url = `${WCA_MAIN_URL}${PERSON_RELATIVE_URL}${link_text}`;
    return [link_text, link_url];
}

function getIncidentLog(text, mode) {
    let incident_log = text.match(INCIDENT_LOG_REGEX);
    if (!incident_log || text.length !== incident_log[0].length) return [null, null];
    incident_log = incident_log[0].split("#")[1];
    const link_text = mode === "short-replace" ? `#${incident_log}` : `Incident Log #${incident_log}`;
    const link_url = `${WCA_MAIN_URL}${INCIDENT_LOG_RELATIVE_URL}${incident_log}`;
    return [link_text, link_url];
}

// --- Site-specific replacement functions --- //

function replaceInGmail(selected_range, link_text, link_url) {
    // Get Gmail composition windows.
    const editable_elements = document.getElementsByClassName("editable");
    // Check: Is the selected text in a compose element?
    let selection_has_editable_parent = false;
    for (let i = 0; i < editable_elements.length; i++) {
        if (editable_elements[i].contains(selected_range.startContainer) && editable_elements[i].contains(selected_range.endContainer)) {
            selection_has_editable_parent = true;
            break;
        }
    }
    if (!selection_has_editable_parent) {
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
    link.rel = "noreferrer";
    selected_range.insertNode(link);
}

function replaceInWCAWebsite(link_text, link_url) {
    // Not sanitizing the data because it's not HTML.
    const event = new CustomEvent("WSHReplaceEvent", {detail: {text: `[${link_text}](${link_url})`}});
    document.dispatchEvent(event);
}

function replaceInWCAForum(link_text, link_url) {
    // TODO: Sanitize?
    const editor_element = document.querySelector(".d-editor-input");
    if (!editor_element) {
        console.log("Could not find the editor element.");
        return;
    }
    const selection_indexes = [editor_element.selectionStart, editor_element.selectionEnd];
    editor_element.setRangeText(`[${link_text}](${link_url})`, selection_indexes[0], selection_indexes[1], "end");
    const event = new Event("input", {bubbles: true, cancelable: true});
    editor_element.dispatchEvent(event);
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

    for (func of [getWCADocument, getRegulationOrGuideline, getPerson, getIncidentLog]) {
        [link_text, link_url] = func(selected_string, mode);
        if (link_url) break;
    }
    if (!link_url) {
        window.alert("Selected text is not a valid document, regulation, guideline, WCA ID or Incident Log.");
        return;
    }

    if (url.startsWith(GMAIL_URL)) {
        replaceInGmail(selected_range, link_text, link_url);
    } else if (url.startsWith(WCA_MAIN_URL)) {
        replaceInWCAWebsite(link_text, link_url);
    } else if (url.startsWith(WCA_FORUM_URL)) {
        replaceInWCAForum(link_text, link_url);
    }
}

// --- Regulation display functions --- //

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

// --- Setup and message handling --- //

let regulations = null;
let documents = null;
let stop_error = false;
let setup_done = false;
let enabled;

chrome.runtime.onMessage.addListener(
    async function (message, sender, sendResponse) {
        // Check if the message came from the extension itself.
        if (sender.id !== chrome.runtime.id || stop_error) {
            return;
        }
        switch (message.command) {
            case "display-regulation":
                if (enabled) {
                    const documents_available = await fetchDocuments();
                    if (documents_available) sendResponse({message: getRegulationMessage()});
                }
                break;
            case "stop-error":
                stop_error = true;
                break;
            case "enable":
                enabled = true;
                if (!setup_done && window.location.href.startsWith(WCA_MAIN_URL)) {
                    await setUpWCAMain();
                    setup_done = true;
                }
                break;
            case "disable":
                enabled = false;
                break;
            default:
                if (enabled && COMMANDS.includes(message.command)) {
                    const documents_available = await fetchDocuments();
                    if (documents_available) replace(message.command, message.url);
                }
                break;
        }
    }
);

async function setUpWCAMain() {
    if (document.getElementsByClassName("EasyMDEContainer").length === 0) return;
    const response = await chrome.runtime.sendMessage({command: "inject-wsh-event"});
    if (response && response.status !== 0) {
        console.error("Could not inject WSHReplaceEvent");
        stop_error = true;
    }
}

async function setUp() {
    // Check if the extension is enabled.
    await chrome.storage.local.get(["enabled"]).then((result) => {
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

    // Per-site setup.
    if (enabled && window.location.href.startsWith(WCA_MAIN_URL)) {
        await setUpWCAMain();
        setup_done = true;
    }
}

setUp();
