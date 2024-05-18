const BROWSER = "chrome";

function add_listeners(cm, cmId) {
    document.addEventListener("WSHSelectionRequestEvent", () => {
        // Do not proceed if the current CodeMirror instance is not the one that the event is intended for.
        if (!cm.hasFocus()) return;

        const detail = {
            text: cm.getSelection(),
            rangeStart: cm.getCursor("from"),
            rangeEnd: cm.getCursor("to"),
            cmInstanceId: cmId
        };

        const event = new CustomEvent("WSHSelectionResponseEvent", {detail: detail});
        document.dispatchEvent(event);
    });

    document.addEventListener("WSHReplaceEvent", function(e) {
        // Do not proceed if the current CodeMirror instance is not the one that the event is intended for.
        const rs = cm.getCursor("from");
        const re = cm.getCursor("to");
        if (cm.hasFocus() && e.detail.cmInstanceId === cmId &&
            e.detail.rangeStart.line === rs.line && e.detail.rangeEnd.line === re.line &&
            e.detail.rangeStart.ch === rs.ch && e.detail.rangeEnd.ch === re.ch) {

            cm.replaceSelection(DOMPurify.sanitize(e.detail.text, {ALLOWED_TAGS: []}));
        }
    });
}

const cm_array = document.querySelectorAll(".CodeMirror");
if (cm_array.length > 0) {
    let cmId = 0;
    for (let cm_elem of cm_array) {
        let cm;
        if (BROWSER === "firefox") {
            cm = cm_elem.wrappedJSObject.CodeMirror;
            // Following recommendation from:
            // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts
            XPCNativeWrapper(cm);  // TODO: Test.
        } else {
            cm = cm_elem.CodeMirror;
        }

        add_listeners(cm, cmId);

        // Increment the ID for the next CodeMirror instance.
        cmId++;
    }
} else {
    console.error("Could not install WSHReplaceEvent listener. CodeMirror not found.");
}
