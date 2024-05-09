
class BaseContentModule {
    // -- URLs -- //
    static WCA_MAIN_URL = "https://www.worldcubeassociation.org/";
    static WCAREGS_URL = "https://wcaregs.netlify.app/";
    static GOOGLE_SAFE_REDIRECT_URL = "https://www.google.com/url?q=";
    static REGULATIONS_RELATIVE_URL = "regulations/";
    static PERSON_RELATIVE_URL = "persons/";
    static INCIDENT_LOG_RELATIVE_URL = "incidents/";

    // -- Regex -- //
    static REGULATION_REGEX = /(([1-9][0-9]?[a-z]([1-9][0-9]?[a-z]?)?)|([a-z][1-9][0-9]?([a-z]([1-9][0-9]?)?)?))\b\+{0,10}/i;
    static PERSON_REGEX = /\b[1-9]\d{3}[a-z]{4}\d{2}\b/i
    static INCIDENT_LOG_REGEX = /\bil#[1-9]\d{0,5}\b/i
    static CATCH_LINKS_REGEX = new RegExp(`(${this.WCA_MAIN_URL}${this.REGULATIONS_RELATIVE_URL}(guidelines.html)?|${this.WCAREGS_URL})(#|%23)`, "i");

    constructor(regulations, documents, siteName, siteURL) {
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

    get regulations() {
        return this._regulations;
    }

    get documents() {
        return this._documents;
    }

    get siteName() {
        return this._siteName;
    }

    get siteURL() {
        return this._siteURL;
    }

    setUp() {
        return true;
    }

    getPageSelection() {
        /*
        returns:
        {
            text: selected text,
            range: (selected range | null)
        }
        */
        throw new Error("getPageSelection() not implemented.");
    }

    replace(link_text, link_url, selection) {
        throw new Error("replace() not implemented.");
    }

    log(message) {
        console.log(`[WCA Staff Helper][${this.siteName}] ${message}`);
    }

    _getWCADocument(text, mode) {
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

    _getRegulationOrGuideline(text, mode) {
        "use strict";
        let reg_num = text.match(BaseContentModule.REGULATION_REGEX);
        if (!reg_num || text.length !== reg_num[0].length || !this._regulations[reg_num[0]]) return [null, null];
        reg_num = reg_num[0];
        const type = text.includes("+") ? "Guideline" : "Regulation";
        const link_text = mode === "short-replace" ? this._regulations[reg_num].id : `${type} ${this._regulations[reg_num].id}`;
        const link_url = `${BaseContentModule.WCA_MAIN_URL}${this._regulations[reg_num].url.substring(1)}`;
        return [link_text, link_url];
    }

    _getPerson(text) {
        "use strict";
        let person = text.match(BaseContentModule.PERSON_REGEX);
        if (!person || text.length !== person[0].length) return [null, null];
        const link_text = person[0].toUpperCase();
        const link_url = `${BaseContentModule.WCA_MAIN_URL}${BaseContentModule.PERSON_RELATIVE_URL}${link_text}`;
        return [link_text, link_url];
    }

    _getIncidentLog(text, mode) {
        "use strict";
        let incident_log = text.match(BaseContentModule.INCIDENT_LOG_REGEX);
        if (!incident_log || text.length !== incident_log[0].length) return [null, null];
        incident_log = incident_log[0].split("#")[1];
        const link_text = mode === "short-replace" ? `#${incident_log}` : `Incident Log #${incident_log}`;
        const link_url = `${BaseContentModule.WCA_MAIN_URL}${BaseContentModule.INCIDENT_LOG_RELATIVE_URL}${incident_log}`;
        return [link_text, link_url];
    }

    getLinkData(text, mode) {
        "use strict";
        let link_text, link_url;

        for (let func of this._documentFunctions) {
            [link_text, link_url] = func.call(this, text, mode);
            if (link_text && link_url) return [link_text, link_url];
        }
        return [null, null];
    }

    static async getOptionsFromStorage(options) {
        /* Returns undefined on exception. */
        try {
            return await chrome.storage.local.get(options);
        }
        catch (error) {
            console.error(`Could not read option/s [${options}] from storage. ${error}`);
        }
        return undefined;
    }

    static async sendCommand(command, params={}) {
        /* Send command and get response */
        return await chrome.runtime.sendMessage({command: command, params: params});
    }
}
