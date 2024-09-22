/*
 * Factory class for creating instances of BaseContentModule subclasses.
 */
class Factory {
    private static readonly mappedSites = {
        wca_main: "https://www.worldcubeassociation.org/",
        wca_forum: "https://forum.worldcubeassociation.org/",
        gmail: "https://mail.google.com/"
    };
    /*
     * Get the class for the content script based on the site.
     */
    static getContentClass(regulations: wcadocs.TRegulationsDict, documents: wcadocs.TDocumentList, site: string) {
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
        return contentClass.getInstance(regulations, documents);
    }
}
