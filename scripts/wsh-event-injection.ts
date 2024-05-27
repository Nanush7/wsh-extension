import {communication, allowed_options, XPCNativeWrapper, CMElement} from "./common";
import * as DOMPurify from "./purify.min.js";
import * as CodeMirror from "codemirror";

const BROWSER: allowed_options.OBrowser = "chrome";

function add_listeners(cm: CodeMirror.Editor, cmId: number) {
    document.addEventListener("WSHSelectionRequestEvent", () => {
        // Do not proceed if the current CodeMirror instance is not the one that the event is intended for.
        if (!cm.hasFocus()) return;

        const detail: communication.TSelectionResponse = {
            text: cm.getSelection(),
            rangeStart: cm.getCursor("from"),
            rangeEnd: cm.getCursor("to"),
            cmInstanceId: cmId
        };

        const event = new CustomEvent("WSHSelectionResponseEvent", {detail: detail});
        document.dispatchEvent(event);
    });

    document.addEventListener("WSHReplaceEvent", function(e: CustomEvent) {
        // Do not proceed if the current CodeMirror instance is not the one that the event is intended for.
        const detail = e.detail as communication.TSelectionResponse;
        const rs = cm.getCursor("from");
        const re = cm.getCursor("to");
        if (cm.hasFocus() && detail.cmInstanceId === cmId &&
            detail.rangeStart.line === rs.line && detail.rangeEnd.line === re.line &&
            detail.rangeStart.ch === rs.ch && detail.rangeEnd.ch === re.ch) {

            cm.replaceSelection(DOMPurify.sanitize(detail.text, {ALLOWED_TAGS: []}));
        }
    });
}

const cm_array: NodeListOf<CMElement> = document.querySelectorAll(".CodeMirror");
if (cm_array.length > 0) {
    let cmId = 0;
    for (const cm_elem of Array.from(cm_array)) {
        let cm: CodeMirror.Editor | undefined;
        // @ts-ignore
        if (BROWSER === "firefox") {
            cm = cm_elem.wrappedJSObject.CodeMirror;
            // Following recommendation from:
            // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts
            XPCNativeWrapper(cm);  // TODO: Test.
        } else {
            cm = cm_elem.CodeMirror;
        }
        if (!cm) continue;

        add_listeners(cm, cmId);
        // Increment the ID for the next CodeMirror instance.
        cmId++;
    }
} else {
    console.error("Could not install WSHReplaceEvent listener. CodeMirror not found.");
}
