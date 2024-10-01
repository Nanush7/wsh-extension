
class WCAForumContent extends BaseContentModule {

    static #instance: WCAForumContent;

    private constructor(regulations: wcadocs.TRegulationsDict, documents: wcadocs.TDocumentList) {
        super(regulations, documents, "WCA Forum", "https://forum.worldcubeassociation.org/");
    }

    static getInstance(regulations: wcadocs.TRegulationsDict, documents: wcadocs.TDocumentList) {
        if (!WCAForumContent.#instance) {
            WCAForumContent.#instance = new WCAForumContent(regulations, documents);
        }
        return WCAForumContent.#instance;
    }

    async setUp() {
        return true;
    }

    getPageSelection(targetReplacement: boolean): Promise<communication.TBasicSelection> {
        return new Promise((resolve: (value: communication.TBasicSelection) => void): void => {
            if (!targetReplacement) {
                const selection = document.getSelection();
                if (selection !== null)
                    resolve({text: selection.toString()})
            }
            const editor_elem = document.querySelector(".d-editor-input") as HTMLInputElement;
            if (!editor_elem || editor_elem.selectionStart === null || editor_elem.selectionEnd === null
            || editor_elem.selectionStart === editor_elem.selectionEnd) {
                resolve({text: ""});
                return;
            }
            const range = [editor_elem.selectionStart, editor_elem.selectionEnd];
            const text = editor_elem.value.slice(range[0], range[1]);
            const detail = {
                range: range,
                editorElement: editor_elem
            };
            resolve({text: text, extraFields: detail});
        });
    }

    replace(link_text: string, link_url: string, extraFields: any) {
        const safe_text = DOMPurify.sanitize(`[${link_text}](${link_url})`, {ALLOWED_TAGS: []})
        extraFields.editorElement.setRangeText(safe_text, extraFields.range[0], extraFields.range[1], "end");
        return true;
    }
}
