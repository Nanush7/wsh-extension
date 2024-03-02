const cm_array = document.querySelectorAll(".CodeMirror");
if (cm_array.length > 0) {
    for (let cm_elem of cm_array) {
        const cm = cm_elem.CodeMirror;
        document.addEventListener("WSHReplaceEvent", function(e) {
            const selection = document.getSelection();
            // We assume that there is a selection, otherwise WSHReplaceEvent would not have been fired.
            if (cm_elem.contains(selection.anchorNode) && cm_elem.contains(selection.focusNode)) {
                cm.replaceSelection(e.detail.text);
            }
        });
    }
} else {
    console.error("Could not install WSHReplaceEvent listener. CodeMirror not found.");
}
