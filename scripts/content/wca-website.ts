// -- Custom events -- //
const SELECTION_REQUEST_EVENT = "WSHSelectionRequestEvent";
const SELECTION_RESPONSE_EVENT = "WSHSelectionResponseEvent";
const REPLACE_EVENT = "WSHReplaceEvent";

// -- Constants -- //
const SELECTION_PENDING_FAIL = "A selection is already pending";
const SELECTION_TIMEOUT_FAIL = "WSHSelectionTimeoutFail";
const SELECTION_TIMEOUT = 1000;

class WCAWebsiteContent extends BaseContentModule {

    // Private fields.
    static #instance: WCAWebsiteContent;
    #pendingSelection: boolean;

    private constructor(regulations: wcadocs.TRegulationsDict, documents: wcadocs.TDocumentList) {
        super(regulations, documents, "WCA Website", "https://www.worldcubeassociation.org/");
        this.#pendingSelection = false;
    }

    static getInstance(regulations: wcadocs.TRegulationsDict, documents: wcadocs.TDocumentList) {
        if (!WCAWebsiteContent.#instance) {
            WCAWebsiteContent.#instance = new WCAWebsiteContent(regulations, documents);
        }
        return WCAWebsiteContent.#instance;
    }

    async setUp(): Promise<boolean> {
        if (document.getElementsByClassName("EasyMDEContainer").length === 0) return false;

        this.#pendingSelection = false;

        try {
            const response = await BaseContentModule.sendCommand("inject-wsh-event");
            if (response && response.status !== 0) {
                console.error("Could not inject WSHReplaceEvent");
                return false;
            }
        } catch (error) {
            console.error("Could not inject WSHReplaceEvent: " + error);
            return false;
        }
        return true;
    }

    getPageSelection(targetReplacement?: boolean): Promise<communication.TBasicSelection> {
        /*
         * The selection is only editable if it came from CodeMirror.
         * If the caller wants to use the selection to replace, we only return selections from CodeMirror.
         */
        return new Promise((resolve: (value: communication.TBasicSelection) => void, reject: (reason?: String) => void): void => {
            if (this.#pendingSelection) {
                reject(SELECTION_PENDING_FAIL);
                return;
            }

            const documentSelection = document.getSelection();
            if (!targetReplacement && documentSelection && documentSelection.rangeCount > 0) {
                const text = documentSelection.toString();
                if (text !== "") {
                    resolve({text: text})
                    return;
                }
            }

            this.#pendingSelection = true;
            // If we never get a response, reject the promise.
            const timeout = setTimeout(() => {
                this.#pendingSelection = false;
                reject(SELECTION_TIMEOUT_FAIL);
            }, SELECTION_TIMEOUT);

            // Add event listener for selection response.
            document.addEventListener(SELECTION_RESPONSE_EVENT, (custom_event: CustomEvent<communication.TSelectionResponse>): void => {
                clearTimeout(timeout);
                this.#pendingSelection = false;
                resolve({text: custom_event.detail.text, extraFields: custom_event.detail});
            }, {once: true});

            // Request selection from the page to CodeMirror 5.
            const request = new CustomEvent(SELECTION_REQUEST_EVENT, {bubbles: false});
            document.dispatchEvent(request);
        });
    }

    replace(link_text: string, link_url: string, extraFields: communication.TBasicSelection["extraFields"]) {
        let detail = extraFields;
        detail["text"] = `[${link_text}](${link_url})`;
        const e = new CustomEvent(REPLACE_EVENT, {bubbles: false, detail: detail});
        document.dispatchEvent(e);
        return true;
    }
}
