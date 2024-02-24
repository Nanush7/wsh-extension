const WCA_MAIN_URL = "https://www.worldcubeassociation.org/";
const WCA_FORUM_URL = "https://forum.worldcubeassociation.org/";
const GMAIL_URL = "https://mail.google.com/";

async function getRegulations() {
    return;
    const response = await fetch('/data/wca-regulations.json');
    const jsonData = await response.json();
}

function getRegulationOrGuideline(text) {
    if (!regulations && !getRegulations()) {
        return false;
    }
    let type = "regulation";
    if (text.includes("+")) type = "guideline";
}

function binarySearch(target) {
    let left = 0;
    let right = regulations.length - 1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);

        if (regulations[mid] === target) {
            return mid;
        }
        if (regulations[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return -1;
}

function replaceInGmail() {
    // Get selected text.
    const selected_text = document.getSelection();
    if (selected_text.rangeCount === 0) {
        console.log("No text selected.");
        return;
    }
    const selected_range = selected_text.getRangeAt(0);
    // Get Gmail composition window.
    const mail_element = document.getElementsByClassName("editable")[0];
    // Check: Is the selected text in the compose element?
    if (!(mail_element && mail_element.contains(selected_text.anchorNode) && mail_element.contains(selected_text.focusNode))) {
        // TODO: Warn the user.
        console.warn("Selected text is not in the gmail composition element.");
        return;
    }
    // We check that the range start and end are in the same div.
    if (selected_range.startContainer.parentElement.nodeName !== "DIV"
        || selected_range.startContainer.parentElement !== selected_range.endContainer.parentElement) {
        console.warn("Cannot replace text in the selection.");
        return;
    }
    getRegulationOrGuideline(selected_text.toString());
}

chrome.runtime.onMessage.addListener(
    function (message, sender) {
        // check if the sender is the service worker of the extension
        if (sender.id === chrome.runtime.id) {
            if (message.url.includes(GMAIL_URL)) {
                console.log("Replacing in Gmail");
                replaceInGmail();
            }
        }
    }
);

// Define global variable to store the WCA regulations.
let regulations = null;
