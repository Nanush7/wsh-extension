
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
    type TDocument = {
        "short_name": string,
        "long_name": string,
        "url": string
    };
}

export namespace options {
    /*
     * Types related to allowed options.
     */
    type TCommand = "short-replace" | "long-replace" | "display-regulation" | "stop-error" | "enable" | "disable";
    type TBrowser = "chrome" | "firefox";
    type TStoredValue = "regulations" | "documents" | "display_config" | "regulations_version" | "enabled" | "catch_links" | "justify_box_text" | "box_font_size" | "box_timeout";
}
