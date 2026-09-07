import {Document} from "../../document";
import {Query} from "../query";
import {DocumentJoiner} from "./DocumentJoiner";

export class ConcatenationDocumentJoiner implements DocumentJoiner {
    async join(documentsForQuery: Map<Query, Document[][]> | Document[][]): Promise<Document[]> {
        const result: Document[] = [];
        const seenIds = new Set<string>();

        const appendDoc = (doc: Document) => {
            if (!seenIds.has(doc.id)) {
                seenIds.add(doc.id);
                result.push(doc);
            }
        };

        if (documentsForQuery instanceof Map) {
            for (const docLists of documentsForQuery.values()) {
                for (const list of docLists) {
                    for (const doc of list) {
                        appendDoc(doc);
                    }
                }
            }
        } else if (Array.isArray(documentsForQuery)) {
            for (const list of documentsForQuery) {
                for (const doc of list) {
                    appendDoc(doc);
                }
            }
        }

        return result;
    }
}
