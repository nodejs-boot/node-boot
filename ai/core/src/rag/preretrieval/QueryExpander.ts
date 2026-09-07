import {Query} from "../query";

export interface QueryExpander {
    expand(query: Query): Promise<Query[]>;
}
