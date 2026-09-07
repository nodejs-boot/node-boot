import {Document} from "../../document";
import {Query} from "../query";

export const FILTER_EXPRESSION = "FILTER_EXPRESSION";

export interface DocumentRetriever {
    retrieve(query: Query): Promise<Document[]>;
}
