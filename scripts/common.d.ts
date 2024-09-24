
declare namespace wcadocs {
    /*
     * Types related to WCA Documents.
     */
    type TRegulation = {
        "class": string,
        "id": string,
        "content_html": string,
        "url": string,
        "guideline_label"?: string
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

declare namespace allowed_options {
    /*
     * Types related to allowed options.
     */
    type OReplaceMode = "short-replace" | "long-replace";
    type OCommand = OReplaceMode | "get-internal-url" | "display-regulation" | "inject-wsh-event" | "stop-error" | "enable" | "disable";
    type OBrowser = "chrome" | "firefox";
    type OStoredValue = "regulations" | "documents" | "display-config" | "regulations-version" | "enabled" | "catch-links" | "justify-box-text" | "box-font-size" | "box-timeout";
}

declare namespace communication {
    /*
     * Types related to communication between content scripts and background scripts.
     */
    type TSelectionResponse = {
        text: string,
        rangeStart: CodeMirror.Position,
        rangeEnd: CodeMirror.Position,
        cmInstanceId: number
    };
    type TBasicSelection = {
        text: string,
        range?: [number, number] | null,
        extraFields?: any;
    }
}

// DOMPurify.
declare class DOMPurify {
    static sanitize(text: string, options: any): string;
}
// Firefox XPCNativeWrapper.
declare function XPCNativeWrapper(obj: any): any;
declare interface CMElement extends Element {
    CodeMirror: CodeMirror.Editor;
    // Firefox-specific.
    wrappedJSObject: CMElement;
}
