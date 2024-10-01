
class GmailContent extends BaseContentModule {

    static #instance: GmailContent;

    private constructor(regulations: wcadocs.TRegulationsDict, documents: wcadocs.TDocumentList) {
        super(regulations, documents, "Gmail", "https://mail.google.com/");
    }

    static getInstance(regulations: wcadocs.TRegulationsDict, documents: wcadocs.TDocumentList) {
        if (!GmailContent.#instance) {
            GmailContent.#instance = new GmailContent(regulations, documents);
        }
        return GmailContent.#instance;
    }

    async setUp(): Promise<boolean> {
        return true;
    }

    getPageSelection(): Promise<communication.TBasicSelection> {
        return new Promise((resolve: (value: communication.TBasicSelection) => void): void => {
            const s = document.getSelection();
            if (!s || s.rangeCount === 0) {
                resolve({text: ""});
            } else {
                resolve({text: s.toString(), extraFields: {range: s.getRangeAt(0)}});
            }
        });
    }

    replace(link_text: string, link_url: string, selection: any) {
        // Get Gmail composition windows.
        const editable_elements = document.getElementsByClassName("editable");
        // Check: Is the selected text in a compose element?
        let selection_has_editable_parent = false;
        for (let e_elem of editable_elements) {
            if (e_elem.contains(selection.range.startContainer) && e_elem.contains(selection.range.endContainer)) {
                selection_has_editable_parent = true;
                break;
            }
        }
        if (!selection_has_editable_parent) {
            console.log("Selected text is not in the gmail composition element.");
            return false;
        }

        // We check that the range start and end are in the same div.
        if (selection.range.startContainer.parentElement.nodeName !== "DIV"
            || selection.range.startContainer.parentElement !== selection.range.endContainer.parentElement) {
            console.log("Cannot replace text in the selection.");
            return false;
        }

        selection.range.deleteContents();
        const link = document.createElement("a");
        link.href = link_url;
        link.textContent = link_text;
        link.rel = "noreferrer";
        selection.range.insertNode(link);
        return true;
    }
}
