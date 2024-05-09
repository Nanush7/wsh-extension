
const cm_array = document.querySelectorAll(".CodeMirror");
if (cm_array.length > 0) {
    let cmId = 0;
    for (let cm_elem of cm_array) {
        // Following recommendation from:
        // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts
        const cm = cm_elem.CodeMirror;

        document.addEventListener("WSHSelectionRequestEvent", () => {
            // Do not proceed if the current CodeMirror instance is not the one that the event is intended for.
            if (!cm.hasFocus()) return;

            const detail = {
                text: cm.getSelection(),
                line: cm.getCursor().line,
                rangeStart: cm.getCursor("from"),
                rangeEnd: cm.getCursor("to"),
                cmInstanceId: cmId
            };

            const event = new CustomEvent("WSHSelectionResponseEvent", {detail: detail});
            document.dispatchEvent(event);
        });

        document.addEventListener("WSHReplaceEvent", function(e) {
            // Do not proceed if the current CodeMirror instance is not the one that the event is intended for.
            if (cm.hasFocus() && e.detail.cmInstanceId === cmId &&
                e.detail.rangeStart === cm.getCursor("from") && e.detail.rangeEnd === cm.getCursor("to") &&
                e.detail.line === cm.getCursor().line) {

                cm.replaceSelection(DOMPurify.sanitize(e.detail.text, {ALLOWED_TAGS: []}));
            }
        });

        // Increment the ID for the next CodeMirror instance.
        cmId++;
    }
} else {
    console.error("Could not install WSHReplaceEvent listener. CodeMirror not found.");
}
