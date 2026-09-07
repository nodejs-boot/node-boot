import {Document, EmbeddingModel, EmbeddingOptions} from "@nodeboot/ai-core";

export interface GoogleGenAiEmbeddingClientLike {
    models: {
        embedContent(params: any): Promise<any>;
    };
}

export class GoogleGenAiEmbeddingModel implements EmbeddingModel {
    private readonly client: GoogleGenAiEmbeddingClientLike;
    private readonly options: EmbeddingOptions;

    constructor(client: GoogleGenAiEmbeddingClientLike, options?: EmbeddingOptions) {
        this.client = client;
        this.options = {
            model: "text-embedding-004",
            ...options,
        };
    }

    async embed(texts: string[] | string): Promise<number[][]> {
        const input = Array.isArray(texts) ? texts : [texts];
        if (input.length === 0) return [];

        const res = await this.client.models.embedContent({
            model: this.options.model ?? "text-embedding-004",
            contents: input.map(text => ({parts: [{text}]})),
        });

        return (res.embeddings ?? []).map((item: any) => item.values);
    }

    async embedDocument(document: Document): Promise<Document> {
        const [embedding] = await this.embed(document.text);
        document.embedding = embedding;
        return document;
    }

    async embedDocuments(documents: Document[]): Promise<Document[]> {
        if (documents.length === 0) return [];
        const texts = documents.map(d => d.text);
        const embeddings = await this.embed(texts);
        for (let i = 0; i < documents.length; i++) {
            const doc = documents[i];
            if (doc) {
                doc.embedding = embeddings[i];
            }
        }
        return documents;
    }

    dimensions(): number {
        return this.options.dimensions ?? 1536;
    }
}
