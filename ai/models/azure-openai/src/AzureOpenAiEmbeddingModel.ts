import {Document, EmbeddingModel, EmbeddingOptions} from "@nodeboot/ai-core";

export interface AzureOpenAiEmbeddingClientLike {
    embeddings: {
        create(params: any): Promise<any>;
    };
}

export class AzureOpenAiEmbeddingModel implements EmbeddingModel {
    private readonly client: AzureOpenAiEmbeddingClientLike;
    private readonly options: EmbeddingOptions;

    constructor(client: AzureOpenAiEmbeddingClientLike, options?: EmbeddingOptions) {
        this.client = client;
        this.options = {
            model: "text-embedding-3-small",
            ...options,
        };
    }

    async embed(texts: string[] | string): Promise<number[][]> {
        const input = Array.isArray(texts) ? texts : [texts];
        if (input.length === 0) return [];

        const res = await this.client.embeddings.create({
            model: this.options.model ?? "text-embedding-3-small",
            input,
            dimensions: this.options.dimensions,
        });

        return res.data.map((item: any) => item.embedding);
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
