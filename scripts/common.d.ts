
export namespace wcadocs {
    /*
     * Types related to WCA Documents.
     */
    type TRegulation = {
        "class": string,
        "id": string,
        "content_html": string,
        "url": string,
    };
    type TRegulationsDict = {
        [id: string]: TRegulation
    }
    type TDocument = {
        "short_name": string,
        "long_name": string,
        "url": string
    };
    type TDocumentList = TDocument[];
}

export namespace allowed_options {
    /*
     * Types related to allowed options.
     */
    type OCommand = "short-replace" | "long-replace" | "display-regulation" | "stop-error" | "enable" | "disable";
    type OBrowser = "chrome" | "firefox";
    type OStoredValue = "regulations" | "documents" | "display_config" | "regulations_version" | "enabled" | "catch_links" | "justify_box_text" | "box_font_size" | "box_timeout";
    // type OSite = "WCA Website" | "WCA Forum" | "Gmail";
}

export namespace communication {
    /*
    * Types related to communication between content scripts and background scripts.
    */
    type TSelectionResponse = {
        text: string,
        rangeStart: CodeMirror.Position,
        rangeEnd: CodeMirror.Position,
        cmInstanceId: number
    };
}

// Firefox XPCNativeWrapper.
declare function XPCNativeWrapper(obj: any): any;
declare interface CMElement extends Element {
    CodeMirror: CodeMirror.Editor;
    // Firefox-specific.
    wrappedJSObject: CMElement;
}
