import {Document} from "../document";

export interface SearchRequest {
    query: string;
    topK?: number;
    similarityThreshold?: number;
    filter?: ((doc: Document) => boolean) | Record<string, any>;
}

export interface VectorStore {
    add(documents: Document[]): Promise<void>;
    delete(ids: string[]): Promise<void>;
    similaritySearch(request: SearchRequest | string): Promise<Document[]>;
}
