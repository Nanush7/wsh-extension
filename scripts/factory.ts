/*
 * Factory class for creating instances of BaseContentModule subclasses.
 */
class Factory {
    private static readonly mappedSites = {
        wca_main: "https://www.worldcubeassociation.org/",
        wca_forum: "https://forum.worldcubeassociation.org/",
        gmail: "https://mail.google.com/"
    };

    private static async fetchDocumentsFromStorage() {
        /* Gets regulations and documents from storage. */
        let regulations = null;
        let documents = null;
        const result = await BaseContentModule.getOptionsFromStorage(["regulations", "documents"]);
        if (result && result.regulations && result.documents) {
            regulations = result.regulations;
            documents = result.documents;
        } else {
            alert("Regulations and document data not found. Try restarting your browser.");
            stop_error = true;
        }
        return [regulations, documents];
    }

    /*
     * Get the class for the content script based on the site.
     */
    static async getContentClass(site: string) {
        let contentClass;
        if (site.startsWith(this.mappedSites.wca_main)) {
            contentClass = WCAWebsiteContent;
        } else if (site.startsWith(this.mappedSites.wca_forum)) {
            contentClass = WCAForumContent;
        } else if (site.startsWith(this.mappedSites.gmail)) {
            contentClass = GmailContent;
        } else {
            throw new Error(`No content class found for site: ${site}`);
        }
        let regulations, documents;
        [regulations, documents] = await Factory.fetchDocumentsFromStorage();
        if (!regulations || !documents) {
            throw new Error("Could not retrieve WCA documents from storage.")
        }
        return contentClass.getInstance(regulations, documents);
    }
}
