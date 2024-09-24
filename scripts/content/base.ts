
interface ContentModule {
    setUp(): Promise<boolean>;
    getPageSelection(): Promise<communication.TBasicSelection>;
    replace(link_text: string, link_url: string, selection: communication.TBasicSelection): void;
    getLinkData(text: string, mode: allowed_options.OReplaceMode): [string, string] | [null, null];
    log(message: string): void;
    regulations: wcadocs.TRegulationsDict;
    documents: wcadocs.TDocumentList;
}

abstract class BaseContentModule implements ContentModule {
    // -- URLs -- //
    static WCA_MAIN_URL = "https://www.worldcubeassociation.org/";
    static WCAREGS_URL = "https://wcaregs.netlify.app/";
    static WCA_SHORT_URL = "https://wca.link/";
    static GOOGLE_SAFE_REDIRECT_URL = "https://www.google.com/url?q=";
    static REGULATIONS_RELATIVE_URL = "regulations/";
    static PERSON_RELATIVE_URL = "persons/";
    static INCIDENT_LOG_RELATIVE_URL = "incidents/";

    // -- Regex -- //
    static REGULATION_REGEX = /(([1-9][0-9]?[a-z]([1-9][0-9]?[a-z]?)?)|([a-z][1-9][0-9]?([a-z]([1-9][0-9]?)?)?))\b\+{0,10}/i;
    static PERSON_REGEX = /\b[1-9]\d{3}[a-z]{4}\d{2}\b/i
    static INCIDENT_LOG_REGEX = /\bil#[1-9]\d{0,5}\b/i
    static CATCH_LINKS_REGEX = new RegExp(`((${this.WCA_MAIN_URL}|${this.WCA_SHORT_URL})${this.REGULATIONS_RELATIVE_URL}((full|guidelines.html)/?)?|${this.WCAREGS_URL})(#|%23)`, "i");

    // -- Properties -- //
    protected readonly _regulations: wcadocs.TRegulationsDict;
    protected readonly _documents: wcadocs.TDocumentList;
    protected readonly _siteName: string;
    protected readonly _siteURL: string;
    protected readonly _documentFunctions: Array<Function>;

    protected constructor(regulations: wcadocs.TRegulationsDict, documents: wcadocs.TDocumentList, siteName: string, siteURL: string) {
        this._regulations = regulations;
        this._documents = documents;
        this._siteName = siteName;
        this._siteURL = siteURL;
        this._documentFunctions = [
            this._getWCADocument,
            this._getRegulationOrGuideline,
            this._getPerson,
            this._getIncidentLog
        ];
    }

    abstract setUp(): Promise<boolean>;

    abstract getPageSelection(): Promise<communication.TBasicSelection>;

    abstract replace(link_text: string, link_url: string, selection: communication.TBasicSelection): void;

    log(message: string) {
        console.log(`[WCA Staff Helper][${this._siteName}] ${message}`);
    }

    get regulations() {
        return this._regulations;
    }

    get documents() {
        return this._documents;
    }

    protected _getWCADocument(text: string, mode: allowed_options.OReplaceMode) {
        "use strict";
        for (let doc of this._documents) {
            if (text === doc.short_name.toLowerCase()) {
                let link_text;
                if (mode === "short-replace") {
                    link_text = doc.short_name;
                } else {
                    link_text = doc["long_name"];
                }
                return [link_text, doc.url];
            }
        }
        return [null, null];
    }

    protected _getRegulationOrGuideline(text: string, mode: allowed_options.OReplaceMode) {
        "use strict";
        const reg_num = text.match(BaseContentModule.REGULATION_REGEX);
        if (!reg_num || text.length !== reg_num[0].length || !this._regulations[reg_num[0]]) return [null, null];
        const reg_num_str = reg_num[0];
        const type = text.includes("+") ? "Guideline" : "Regulation";
        const link_text = mode === "short-replace" ? this._regulations[reg_num_str].id : `${type} ${this._regulations[reg_num_str].id}`;
        const link_url = `${BaseContentModule.WCA_MAIN_URL}${BaseContentModule.REGULATIONS_RELATIVE_URL}full/#${this._regulations[reg_num_str].id}`;
        return [link_text, link_url];
    }

    protected _getPerson(text: string) {
        "use strict";
        const person = text.match(BaseContentModule.PERSON_REGEX);
        if (!person || text.length !== person[0].length) return [null, null];
        const link_text = person[0].toUpperCase();
        const link_url = `${BaseContentModule.WCA_MAIN_URL}${BaseContentModule.PERSON_RELATIVE_URL}${link_text}`;
        return [link_text, link_url];
    }

    protected _getIncidentLog(text: string, mode: allowed_options.OReplaceMode) {
        "use strict";
        const incident_log = text.match(BaseContentModule.INCIDENT_LOG_REGEX);
        if (!incident_log || text.length !== incident_log[0].length) return [null, null];
        const incident_log_str = incident_log[0].split("#")[1];
        const link_text = mode === "short-replace" ? `#${incident_log_str}` : `Incident Log #${incident_log_str}`;
        const link_url = `${BaseContentModule.WCA_MAIN_URL}${BaseContentModule.INCIDENT_LOG_RELATIVE_URL}${incident_log_str}`;
        return [link_text, link_url];
    }

    getLinkData(text: string, mode: allowed_options.OReplaceMode): [string, string] | [null, null] {
        /*
         * Returns [link_text, link_url] if the text is a valid link.
         */
        "use strict";
        let link_text: string;
        let link_url: string;
        const doc_string = text.toLowerCase();

        for (let func of this._documentFunctions) {
            [link_text, link_url] = func.call(this, doc_string, mode);
            if (link_text && link_url) return [link_text, link_url];
        }
        return [null, null];
    }

    static async getOptionsFromStorage(options: allowed_options.OStoredValue[]) {
        /* Returns undefined on exception. */
        try {
            return await chrome.storage.local.get(options);
        }
        catch (error) {
            console.error(`Could not read option/s [${options}] from storage. ${error}`);
        }
        return undefined;
    }

    static async sendCommand(command: allowed_options.OCommand, params={}) {
        /* Send command and get response */
        return await chrome.runtime.sendMessage({command: command, params: params});
    }
}
