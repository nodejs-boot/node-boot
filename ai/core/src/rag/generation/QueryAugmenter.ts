import {Document} from "../../document";
import {Query} from "../query";

export interface QueryAugmenter {
    augment(query: Query, documents: Document[]): Promise<Query>;
}
