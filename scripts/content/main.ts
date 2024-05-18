// --- Global variables --- //
const REPLACE_COMMANDS = ["short-replace", "long-replace"];
let stop_error = false;
let setup_done = false;
let regulation_box = {
    box_node: null,
    p_node: null,
    pin_img: null,
    active: false,
    timer: null,
    pinned: false,
    timeout: null,
    justified: false,
    font_size: null
};
let enabled = false;
let link_catching_enabled = false;
let content_class;

async function fetchDocuments() {
    /* Gets regulations and documents from storage. */
    let regulations = null;
    let documents = null;
    const result = await BaseContentModule.getOptionsFromStorage(["regulations", "documents"]);
    if (result !== undefined && result.regulations !== undefined && result.documents !== undefined) {
        regulations = result.regulations;
        documents = result.documents;
    } else {
        alert("Regulations and document data not found. Try restarting your browser.");
        stop_error = true;
    }
    return [regulations, documents];
}

async function getPageSelection() {
    // Get selected text.
    let response;
    let selection = "";
    try {
        response = await content_class.getPageSelection();
        selection = response.text.trim();
    } catch (e) {
        console.log(`Could not get selected text: ${e}`);
    }
    // Try the native way to get the selection.
    if (!response || selection === "") {
        selection = document.getSelection().toString().trim();
    }
    return selection;
}

function getRegulationFromString(string) {
    const reg_num = string.toLowerCase().match(BaseContentModule.REGULATION_REGEX);
    if (!reg_num) {
        return undefined;
    }
    return content_class.regulations[reg_num[0]];  // Returns undefined if the regulation doesn't exist.
}

function getRegulationFromUrl(original_url) {
    // We need to deal with Google's safe redirect urls:
    let url = original_url;
    if (original_url.startsWith(BaseContentModule.GOOGLE_SAFE_REDIRECT_URL)) {
        // The Google safe redirect url feature changes "#" to "%23" and "+" to "%2B",
        // which breaks the regex.
        url = original_url.split("%23")[1].replaceAll("%2B", "+");
    }
    return getRegulationFromString(url);
}

async function displayRegulationBox(regulation, original_url="") {
    /* Display the regulation in a box/popup. */

    let div_node = regulation_box.box_node;
    let p_node = regulation_box.p_node;
    let unsafe_HTML;

    if (regulation !== undefined) {
        const guideline_label = regulation["guideline_label"] === undefined ? "" : `<b>${regulation["guideline_label"]}</b>`;
        unsafe_HTML = `<a id="reg-num" href="${BaseContentModule.WCA_MAIN_URL}${regulation["url"].substring(1)}">${regulation["id"]}</a>) ${guideline_label} ${regulation["content_html"]}`;
    } else if (original_url !== "") {
        // If the regulation is not found, display the original link.
        unsafe_HTML = `Something went wrong. If you want to open the link, disable the link catching option (safer, requires tab reload) or follow the original link (be careful!): <a href="${original_url}">${original_url}</a>`;
    } else {
        // If the regulation is not found, display an error message.
        unsafe_HTML = "Selected text not recognized as a valid WCA regulation.";
    }

    // Now we display the regulation.
    p_node.innerHTML = DOMPurify.sanitize(unsafe_HTML, {ALLOWED_TAGS: ['a', 'b']});
    div_node.querySelectorAll('a').forEach(link => {
        // Add target="_blank" to all links.
        // Also add rel="noreferrer" for privacy and security reasons.
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noreferrer');
        link.style.color = "#e64503";
    });

    // Clear the timer if already active.
    if (regulation_box.active && !regulation_box.pinned) {
        clearTimeout(regulation_box.timer);
    }
    div_node.style.display = "flex";
    regulation_box.active = true;
    // If the box is pinned, we don't set a timer to close it.
    if (!regulation_box.pinned) {
        regulation_box.timer = setTimeout(() => {
            div_node.style.display = "none";
            regulation_box.active = false;
            regulation_box.timer = null;
        }, regulation_box.timeout * 1000);
    }
}

async function setUpLinkCatching() {
    // Load CSS.
    const css_url = await BaseContentModule.sendCommand("get-internal-url", {path: "css/regulations_box.css"});
    let link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = css_url.url;
    document.head.appendChild(link);

    // Create DOM elements.
    // Create the box node.
    let box_node = document.createElement("div");
    box_node.id = "wsh-rb-div";
    let btn_div_node = document.createElement("div");
    let text_div_node = document.createElement("div");
    text_div_node.id = "wsh-rb-div-text";
    box_node.appendChild(btn_div_node);
    box_node.appendChild(text_div_node);

    // Create the node to display the regulation.
    let p_node = document.createElement("p");
    p_node.id = "wsh-rb-p";
    p_node.style.fontSize = `${regulation_box.font_size}px`;
    if (regulation_box.justified) p_node.style.textAlign = "justify";
    text_div_node.appendChild(p_node);

    // Create the close button.
    let close_img = document.createElement("img");
    close_img.className = "wsh-rb-img"
    const close_icon = await BaseContentModule.sendCommand("get-internal-url", {path: "img/close.svg"});
    close_img.src = close_icon.url;
    close_img.alt = "Close";
    btn_div_node.appendChild(close_img);
    close_img.addEventListener("click", () => {
        box_node.style.display = "none";
        regulation_box.active = false;
        clearTimeout(regulation_box.timer);
        regulation_box.timer = null;
        regulation_box.pinned = false;
        regulation_box.pin_img.style.display = "block";
    });

    // Create the pin button.
    let pin_img = document.createElement("img");
    pin_img.className = "wsh-rb-img"
    const pin_icon = await BaseContentModule.sendCommand("get-internal-url", {path: "img/pin.svg"});
    pin_img.src = pin_icon.url;
    pin_img.alt = "Pin";
    pin_img.style.display = "block";
    btn_div_node.appendChild(pin_img);
    pin_img.addEventListener("click", () => {
        clearTimeout(regulation_box.timer);
        regulation_box.timer = null;
        regulation_box.pinned = true;
        pin_img.style.display = "none";
    });

    regulation_box.box_node = box_node;
    regulation_box.p_node = p_node;
    regulation_box.pin_img = pin_img;
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
        if (!enabled || stop_error || !link_catching_enabled || clicked_element["tagName"] !== "A" ||
        wl.startsWith(BaseContentModule.WCA_MAIN_URL + BaseContentModule.REGULATIONS_RELATIVE_URL) || wl.startsWith(BaseContentModule.WCAREGS_URL) ||
        (regulation_box.box_node.contains(clicked_element) && clicked_element["id"] === "reg-num")) {
            return;
        }

        if (BaseContentModule.CATCH_LINKS_REGEX.test(clicked_element["href"])) {
            // Do not follow the link.
            click_event.preventDefault();
            await displayRegulationBox(getRegulationFromUrl(clicked_element["href"]));
        }
    });
}

async function lazySetUp() {
    let regulations, documents;
    [regulations, documents] = await fetchDocuments();
    content_class  = new ContentModule(regulations, documents);
    if (content_class.setUp() === false) {
        stop_error = true;
        return;
    }
    await setUpLinkCatching();
    setup_done = true;
}

async function setUp() {
    // Check if the extension is enabled.
    enabled = false;
    link_catching_enabled = false;
    const stored_options = await BaseContentModule.getOptionsFromStorage(["enabled", "catch-links", "justify-box-text", "box-font-size", "box-timeout"]);
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

    if (stored_options["catch-links"] !== undefined) link_catching_enabled = stored_options["catch-links"];
    if (stored_options["justify-box-text"] !== undefined) regulation_box.justified = stored_options["justify-box-text"];
    if (stored_options["box-font-size"] !== undefined) regulation_box.font_size = stored_options["box-font-size"];
    if (stored_options["box-timeout"] !== undefined) regulation_box.timeout = stored_options["box-timeout"];

    // Lazy setup.
    if (enabled) {
        await lazySetUp();
        setup_done = true;
    }
}

async function replace(command) {
    /* Execute the text replacement flow using the content class. */

    content_class.getPageSelection()
        .then((response) => {
            const selected_text = response.text.trim().toLowerCase();
            if (selected_text === "") return;
            let link_text, link_url;
            [link_text, link_url] = content_class.getLinkData(selected_text, command);
            if (link_text === null || link_url === null) {
                window.alert("Selected text not recognized as a valid WCA document, regulation, guideline, person, or incident log.");
                return;
            }
            content_class.replace(link_text, link_url, response.extraFields);
        })
        .catch((error) => {
            console.log(`Could not get the selected text: ${error}`);
        });
}

chrome.runtime.onMessage.addListener(
    async function (message, sender) {
        // Check if the message came from the extension itself.
        if (sender.id !== chrome.runtime.id || stop_error) return;

        switch (message.command) {
            case "display-regulation":
                if (enabled) {
                    const selection = await getPageSelection();
                    if (selection !== "") {
                        await displayRegulationBox(getRegulationFromString(selection));
                    }
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
                if (enabled && REPLACE_COMMANDS.includes(message.command)) {
                    await replace(message.command);
                }
                break;
        }
    }
);

setUp();
