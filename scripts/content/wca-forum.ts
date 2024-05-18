
class ContentModule extends BaseContentModule {
    constructor(regulations, documents) {
        super(regulations, documents, "WCA Forum", "https://forum.worldcubeassociation.org/");
    }

    getPageSelection() {
        return new Promise((resolve) => {
            const editor_elem = document.querySelector(".d-editor-input");
            const range = [editor_elem.selectionStart, editor_elem.selectionEnd];
            const text = editor_elem.value.slice(range[0], range[1]);
            const detail = {
                range: range,
                editorElement: editor_elem
            };
            resolve({text: text, extraFields: detail});
        });
    }

    replace(link_text, link_url, extraFields) {
        const safe_text = DOMPurify.sanitize(`[${link_text}](${link_url})`, {ALLOWED_TAGS: []})
        extraFields.editorElement.setRangeText(safe_text, extraFields.range[0], extraFields.range[1], "end");
    }
}
