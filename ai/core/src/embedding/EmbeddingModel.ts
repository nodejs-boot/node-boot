import {Document} from "../document";

export interface EmbeddingOptions {
    model?: string;
    dimensions?: number;
    [key: string]: any;
}

export interface EmbeddingResponse {
    results: number[][];
    metadata?: Record<string, any>;
}

export interface EmbeddingModel {
    embed(texts: string[] | string): Promise<number[][]>;
    embedDocument(document: Document): Promise<Document>;
    embedDocuments(documents: Document[]): Promise<Document[]>;
    dimensions?(): number;
}
