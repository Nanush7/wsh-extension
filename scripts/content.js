// --- Constants --- //

// -- URLs -- //
const WCA_MAIN_URL = "https://www.worldcubeassociation.org/";
const WCAREGS_URL = "https://wcaregs.netlify.app/";
const WCA_FORUM_URL = "https://forum.worldcubeassociation.org/";
const GMAIL_URL = "https://mail.google.com/";
const GOOGLE_SAFE_REDIRECT_URL = "https://www.google.com/url?q=";
const REGULATIONS_RELATIVE_URL = "regulations/";
const PERSON_RELATIVE_URL = "persons/";
const INCIDENT_LOG_RELATIVE_URL = "incidents/";

// -- Internal commands -- //
const COMMANDS = ["short-replace", "long-replace", "stop-error"];

// -- Regex -- //
const REGULATION_REGEX = /(([1-9][0-9]?[a-z]([1-9][0-9]?[a-z]?)?)|([a-z][1-9][0-9]?([a-z]([1-9][0-9]?)?)?))\b\+{0,10}/i;
const PERSON_REGEX = /\b[1-9]\d{3}[a-z]{4}\d{2}\b/i
const INCIDENT_LOG_REGEX = /\bil#[1-9]\d{0,5}\b/i
const CATCH_LINKS_REGEX = new RegExp(`(${WCA_MAIN_URL}${REGULATIONS_RELATIVE_URL}(guidelines.html)?|${WCAREGS_URL})(#|%23)`, "i");

// -- Styles -- //
const BOX_NODE_STYLE = `
    display: none;
    position: fixed;
    top: 10%;
    left: 50%;
    transform: translate(-50%, -10%);
    z-index: 1000;
    padding: 20px;
    font-family: 'DejaVu Sans', 'Open Sans', sans-serif;
    font-size: 16px;
    color: black;
    background-color: white;
    border: 4px solid;
    border-color: #3d9c46 #e7762a #304a96 #e02826;
    box-shadow: 0 0 20px;
    overflow: auto;
    overflow-wrap: break-word;
    max-height: 25%;
    max-width: 50%;
`;

// --- Global variables --- //
let regulations = null;
let documents = null;
let stop_error = false;
let setup_done = false;
let regulation_box = {
    div_node: null,
    p_node: null,
    pin_node: null,
    active: false,
    timer: null,
    pinned: false,
    justified: false
};
let enabled = false;
let link_catching_enabled = false;

// --- Utils --- //

const consoleLog = console.log
console.log = function (message) {
    consoleLog("[WCA Staff Helper] " + message);
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

async function fetchDocuments() {
    /* Gets regulations and documents from storage. */
    if (regulations !== null && documents !== null) return true;

    const result = await getOptionsFromStorage(["regulations", "documents"]);
    if (result !== undefined && result.regulations !== undefined && result.documents !== undefined) {
        regulations = result.regulations;
        documents = result.documents;
    } else {
        alert("Regulations and document data not found. Try restaring your browser.");
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
    let link_text, link_url;

    for (let func of [getWCADocument, getRegulationOrGuideline, getPerson, getIncidentLog]) {
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

async function displayRegulationBox(original_url) {
    /* Display the regulation in a box/popup. */
    // First we get the regulation data.

    // We need to deal with Google's safe redirect urls:
    let url = original_url;
    if (original_url.startsWith(GOOGLE_SAFE_REDIRECT_URL)) {
        // The Google safe redirect url feature changes "#" to "%23" and "+" to "%2B",
        // which breaks the regex.
        url = original_url.split("%23")[1].replaceAll("%2B", "+");
    }
    
    let div_node = regulation_box.div_node;
    let p_node = regulation_box.p_node;
    let unsafe_HTML;

    const reg_num = url.match(REGULATION_REGEX);
    let regulation = undefined;
    if (reg_num !== undefined && reg_num !== null) {
        regulation = regulations[reg_num[0].toLowerCase()];
    }
    
    if (regulation !== undefined) {
        const guideline_label = regulation.guideline_label === undefined ? "" : `<b>${regulation.guideline_label}</b>`;
        unsafe_HTML = `<a id="reg-num" href="${WCA_MAIN_URL}${regulation.url.substring(1)}">${regulation.id}</a>) ${guideline_label} ${regulation.content_html}`;
    } else {
        // If the regulation is not found, display the original link.
        unsafe_HTML = `Something went wrong. If you want to open the link, disable the link catching option (safer, requires tab reload) or follow the original link (be careful!): <a href="${original_url}">${original_url}</a>`;
    }

    // Now we display the regulation.
    p_node.innerHTML = DOMPurify.sanitize(unsafe_HTML, {ALLOWED_TAGS: ['a', 'b']});
    div_node.querySelectorAll('a').forEach(link => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noreferrer');
        link.style.color = "#e64503";
    });

    // Clear the timer if already active.
    if (regulation_box.active && !regulation_box.pinned) {
        clearTimeout(regulation_box.timer);
    }
    div_node.style.display = "block";
    regulation_box.active = true;
    // If the box is pinned, we don't set a timer to close it.
    if (!regulation_box.pinned) {
        regulation_box.timer = setTimeout(() => {
            div_node.style.display = "none";
            regulation_box.active = false;
            regulation_box.timer = null;
        }, 15000);
    }
}

// --- Setup and message handling --- //

async function sendCommand(command, params={}) {
    /* Send command and get response */
    return await chrome.runtime.sendMessage({command: command, params: params});
}

chrome.runtime.onMessage.addListener(
    async function (message, sender, sendResponse) {
        // Check if the message came from the extension itself.
        if (sender.id !== chrome.runtime.id || stop_error) return;

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
                if (!setup_done) {
                    await lazySetUp();
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
    const response = await sendCommand("inject-wsh-event");
    if (response && response.status !== 0) {
        console.error("Could not inject WSHReplaceEvent");
        stop_error = true;
    }
}

async function setUpLinkCatching() {
    // First we create the DOM elements.
    // Create the box node.
    let box_node = document.createElement("div");
    box_node.style.cssText = BOX_NODE_STYLE;

    // Create the node that will display the regulation.
    let p_node = document.createElement("p");
    p_node.style.cssText = `margin: 0; text-align: ${regulation_box.justified ? "justify" : "unset"}`;
    box_node.appendChild(p_node);

    // Create the close button.
    let x_node = document.createElement("span");
    let x_img = document.createElement("img");
    const close_icon = await sendCommand("get-internal-url", {path: "img/close.svg"});
    x_img.src = close_icon.url;
    x_img.alt = "Close";
    x_img.style.cssText = "width: 28px; height: 28px; cursor: pointer; float: inline-end;";
    x_node.appendChild(x_img);
    x_node.addEventListener("click", () => {
        box_node.style.display = "none";
        regulation_box.active = false;
        clearTimeout(regulation_box.timer);
        regulation_box.timer = null;
        regulation_box.pinned = false;
        regulation_box.pin_node.style.display = "block";
    });
    box_node.appendChild(x_node);

    // Create the pin button.
    let pin_node = document.createElement("span");
    let pin_img = document.createElement("img");
    const pin_icon = await sendCommand("get-internal-url", {path: "img/pin.svg"});
    pin_img.src = pin_icon.url;
    pin_img.alt = "Pin";
    pin_img.style.cssText = "width: 28px; height: 28px; cursor: pointer; float: inline-end;";
    pin_node.appendChild(pin_img);
    pin_node.style.display = "block";
    pin_node.addEventListener("click", () => {
        clearTimeout(regulation_box.timer);
        regulation_box.timer = null;
        regulation_box.pinned = true;
        pin_node.style.display = "none";
    });
    box_node.appendChild(pin_node);

    regulation_box.div_node = box_node;
    regulation_box.p_node = p_node;
    regulation_box.pin_node = pin_node;
    document.body.appendChild(box_node);

    // Catch links to regulations.
    document.addEventListener("click", async (click_event) => {
        const clicked_element = click_event.target;
        const wl = window.location.href;

        // We want to open the link normally if:
        // - The extension is disabled.
        // - There was an error.
        // - The link catching option is disabled.
        // - The clicked element is not a link.
        // - We are already in the regulations/wcaregs page.
        // - The clicked element is the regulation number in the box.
        // - The link does not point to the regulations/wcaregs page with a "#" (covered in the next if).
        if (!enabled || stop_error || !link_catching_enabled || clicked_element.tagName !== "A" ||
        wl.startsWith(WCA_MAIN_URL + REGULATIONS_RELATIVE_URL) || wl.startsWith(WCAREGS_URL) ||
        (regulation_box.div_node.contains(clicked_element) && clicked_element.id === "reg-num")) {
            return;
        }

        if (CATCH_LINKS_REGEX.test(clicked_element.href)) {
            // Do not follow the link.
            click_event.preventDefault();
            await displayRegulationBox(clicked_element.href);
        }
    });
}

async function lazySetUp() {
    await fetchDocuments();
    if (window.location.href.startsWith(WCA_MAIN_URL)) {
        setUpWCAMain();
    }
    setUpLinkCatching();
}

async function setUp() {
    // Check if the extension is enabled.
    enabled = false;
    link_catching_enabled = false;
    const stored_options = await getOptionsFromStorage(["enabled", "catch-links", "justify-box-text"]);
    if (stored_options === undefined) {
        stop_error = true;
        return;
    }

    if (stored_options["enabled"] === undefined) {
        stop_error = true;
        console.error("Could not get the enabled option from storage.")
        return;
    }
    enabled = stored_options["enabled"];

    if (stored_options["catch-links"] !== undefined) {
        link_catching_enabled = stored_options["catch-links"];
    }

    if (stored_options["justify-box-text"] !== undefined) {
        regulation_box.justified = stored_options["justify-box-text"];
    }

    // Lazy setup.
    if (enabled) {
        await lazySetUp();
        setup_done = true;
    }
}

setUp();
