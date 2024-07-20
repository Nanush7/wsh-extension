import {WCAWebsiteContent} from "content/wca-website";
import {GmailContent} from "./content/gmail";
import {WCAForumContent} from "./content/wca-forum";
import {wcadocs} from "./common";
import TRegulationsDict = wcadocs.TRegulationsDict;
import TDocumentList = wcadocs.TDocumentList;

/*
 * Factory class for creating instances of BaseContentModule subclasses.
 */
export class Factory {
    private static readonly mappedSites = {
        "https://www.worldcubeassociation.org/": WCAWebsiteContent,
        "https://forum.worldcubeassociation.org/": WCAForumContent,
        "https://mail.google.com/": GmailContent
    };
    /*
     * Get the class for the content script based on the site.
     */
    static getContentClass(regulations: TRegulationsDict, documents: TDocumentList, site: string) {
        for (let [siteURL, contentClass] of Object.entries(Factory.mappedSites)) {
            if (site.startsWith(siteURL)) {
                return contentClass.getInstance(regulations, documents);
            }
        }
        throw new Error(`No content class found for site: ${site}`);
    }
}
