import {Document} from "../../document";
import {Query} from "../query";

export interface DocumentJoiner {
    join(documentsForQuery: Map<Query, Document[][]> | Document[][]): Promise<Document[]>;
}
