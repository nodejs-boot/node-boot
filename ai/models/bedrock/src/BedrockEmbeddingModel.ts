import {Document, EmbeddingModel, EmbeddingOptions} from "@nodeboot/ai-core";

export interface BedrockEmbeddingOptions extends EmbeddingOptions {
    provider?: "titan" | "cohere";
}

export interface BedrockEmbeddingClientLike {
    invokeModel(params: any): Promise<any>;
}

export class BedrockEmbeddingModel implements EmbeddingModel {
    private readonly client: BedrockEmbeddingClientLike;
    private readonly options: BedrockEmbeddingOptions;

    constructor(client: BedrockEmbeddingClientLike, options?: BedrockEmbeddingOptions) {
        this.client = client;
        this.options = {
            provider: "titan",
            model: "amazon.titan-embed-text-v2:0",
            ...options,
        };
    }

    async embed(texts: string[] | string): Promise<number[][]> {
        const input = Array.isArray(texts) ? texts : [texts];
        if (input.length === 0) return [];

        if (this.options.provider === "cohere") {
            const response = await this.client.invokeModel({
                modelId: this.options.model ?? "cohere.embed-english-v3",
                body: JSON.stringify({
                    texts: input,
                    input_type: "search_document",
                }),
                contentType: "application/json",
                accept: "application/json",
            });

            const payload = await this.parsePayload(response.body);
            return payload.embeddings ?? [];
        }

        const embeddings = await Promise.all(
            input.map(async text => {
                const response = await this.client.invokeModel({
                    modelId: this.options.model ?? "amazon.titan-embed-text-v2:0",
                    body: JSON.stringify({
                        inputText: text,
                        ...(this.options.dimensions !== undefined ? {dimensions: this.options.dimensions} : {}),
                    }),
                    contentType: "application/json",
                    accept: "application/json",
                });

                const payload = await this.parsePayload(response.body);
                return payload.embedding ?? [];
            }),
        );

        return embeddings;
    }

    async embedDocument(document: Document): Promise<Document> {
        const [embedding] = await this.embed(document.text);
        document.embedding = embedding;
        return document;
    }

    async embedDocuments(documents: Document[]): Promise<Document[]> {
        if (documents.length === 0) return [];
        const texts = documents.map(document => document.text);
        const embeddings = await this.embed(texts);
        for (let i = 0; i < documents.length; i++) {
            const document = documents[i];
            if (document) {
                document.embedding = embeddings[i];
            }
        }
        return documents;
    }

    dimensions(): number {
        return this.options.dimensions ?? 1024;
    }

    private async parsePayload(body: any): Promise<any> {
        if (body === undefined || body === null) {
            return {};
        }

        if (typeof body === "string") {
            return JSON.parse(body);
        }

        if (Buffer.isBuffer(body)) {
            return JSON.parse(body.toString("utf-8"));
        }

        if (body instanceof Uint8Array) {
            return JSON.parse(Buffer.from(body).toString("utf-8"));
        }

        if (typeof body.transformToString === "function") {
            return JSON.parse(await body.transformToString());
        }

        return body;
    }
}
