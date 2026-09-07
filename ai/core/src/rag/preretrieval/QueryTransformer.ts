import {Query} from "../query";

export interface QueryTransformer {
    transform(query: Query): Promise<Query>;
}
