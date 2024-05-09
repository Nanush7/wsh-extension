// -- Custom events -- //
const SELECTION_REQUEST_EVENT = "WSHSelectionRequestEvent";
const SELECTION_RESPONSE_EVENT = "WSHSelectionResponseEvent";
const REPLACE_EVENT = "WSHReplaceEvent";

// -- Constants -- //
const SELECTION_PENDING_FAIL = "A selection is already pending";
const SELECTION_TIMEOUT_FAIL = "WSHSelectionTimeoutFail";
const SELECTION_TIMEOUT = 1000;

class ContentModule extends BaseContentModule {

    // Private fields.
    #pendingSelection;

    constructor(regulations, documents) {
        super(regulations, documents, "WCA Website", "https://www.worldcubeassociation.org/");

    }

    setUp() {
        if (document.getElementsByClassName("EasyMDEContainer").length === 0) return false;

        this.#pendingSelection = false;

        BaseContentModule.sendCommand("inject-wsh-event")
            .then((response) => {
                if (response && response.status !== 0) {
                    console.error("Could not inject WSHReplaceEvent");
                    return false;
                }
                return true;
            })
            .catch((error) => {
                console.error("Could not inject WSHReplaceEvent: " + error);
                return false;
            });
    }

    getPageSelection() {
        return new Promise((resolve, reject) => {
            if (this.#pendingSelection) {
                reject(SELECTION_PENDING_FAIL);
                return;
            }

            this.#pendingSelection = true;

            // If we never get a response, reject the promise.
            const timeout = setTimeout(() => {
                this.#pendingSelection = false;
                reject(SELECTION_TIMEOUT_FAIL);
            }, SELECTION_TIMEOUT);

            // Add event listener for selection response.
            document.addEventListener(SELECTION_RESPONSE_EVENT, (e) => {
                this.#pendingSelection = false;
                clearTimeout(timeout);
                resolve({text: e.detail.text, extraFields: e.detail});
            }, {once: true});

            // Request selection from the page to CodeMirror 5.
            const request = new CustomEvent(SELECTION_REQUEST_EVENT);
            document.dispatchEvent(request);
        });
    }

    replace(link_text, link_url, extraFields) {
        let detail = extraFields;
        detail["text"] = `[${link_text}](${link_url})`;
        const e = new CustomEvent(REPLACE_EVENT, {detail: detail});
        document.dispatchEvent(e);
    }
}
