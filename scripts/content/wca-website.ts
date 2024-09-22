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

    getPageSelection(): Promise<communication.TBasicSelection> {
        return new Promise((resolve, reject) => {
            if (this.#pendingSelection) {
                reject(SELECTION_PENDING_FAIL);
                return;
            }

            this.#pendingSelection = true;
            // TODO: Que detecte si CodeMirror está en modo preview.
            // O sea, si no hay ningún CM con foco y el texto está en el div correspondiente.

            // If we never get a response, reject the promise.
            const timeout = setTimeout(() => {
                this.#pendingSelection = false;
                reject(SELECTION_TIMEOUT_FAIL);
            }, SELECTION_TIMEOUT);

            // Add event listener for selection response.
            document.addEventListener(SELECTION_RESPONSE_EVENT, (e) => {
                const custom_event = e as CustomEvent<communication.TSelectionResponse>
                clearTimeout(timeout);
                this.#pendingSelection = false;
                resolve({text: custom_event.detail.text, extraFields: custom_event.detail});
            }, {once: true});

            // Request selection from the page to CodeMirror 5.
            const request = new CustomEvent(SELECTION_REQUEST_EVENT);
            document.dispatchEvent(request);
        });
    }

    replace(link_text: string, link_url: string, extraFields: any) {
        let detail = extraFields;
        detail["text"] = `[${link_text}](${link_url})`;
        const e = new CustomEvent(REPLACE_EVENT, {detail: detail});
        document.dispatchEvent(e);
    }
}
