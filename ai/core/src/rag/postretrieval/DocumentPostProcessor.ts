import {Document} from "../../document";
import {Query} from "../query";

export interface DocumentPostProcessor {
    process(query: Query, documents: Document[]): Promise<Document[]>;
}
