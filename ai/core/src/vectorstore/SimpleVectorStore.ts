import {Document} from "../document";
import {EmbeddingModel} from "../embedding";
import {SearchRequest, VectorStore} from "./VectorStore";

function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error(`Embedding dimensions do not match: ${a.length} vs ${b.length}`);
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        const valA = a[i] ?? 0;
        const valB = b[i] ?? 0;
        dotProduct += valA * valB;
        normA += valA * valA;
        normB += valB * valB;
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class SimpleVectorStore implements VectorStore {
    private readonly embeddingModel: EmbeddingModel;
    private readonly documents = new Map<string, Document>();

    constructor(embeddingModel: EmbeddingModel) {
        this.embeddingModel = embeddingModel;
    }

    async add(documents: Document[]): Promise<void> {
        const docsWithoutEmbedding: Document[] = [];
        for (const doc of documents) {
            if (!doc.embedding) {
                docsWithoutEmbedding.push(doc);
            } else {
                this.documents.set(doc.id, doc);
            }
        }

        if (docsWithoutEmbedding.length > 0) {
            const embedded = await this.embeddingModel.embedDocuments(docsWithoutEmbedding);
            for (const doc of embedded) {
                this.documents.set(doc.id, doc);
            }
        }
    }

    async delete(ids: string[]): Promise<void> {
        for (const id of ids) {
            this.documents.delete(id);
        }
    }

    async similaritySearch(requestOrQuery: SearchRequest | string): Promise<Document[]> {
        const request: SearchRequest = typeof requestOrQuery === "string" ? {query: requestOrQuery} : requestOrQuery;

        const topK = request.topK ?? 4;
        const threshold = request.similarityThreshold ?? 0.0;

        const [queryEmbedding] = await this.embeddingModel.embed(request.query);
        if (!queryEmbedding) return [];

        const scored: Array<{doc: Document; score: number}> = [];

        for (const doc of this.documents.values()) {
            if (!doc.embedding) continue;

            if (request.filter) {
                if (typeof request.filter === "function") {
                    if (!request.filter(doc)) continue;
                } else if (typeof request.filter === "object") {
                    let matches = true;
                    for (const [k, v] of Object.entries(request.filter)) {
                        if (doc.metadata[k] !== v) {
                            matches = false;
                            break;
                        }
                    }
                    if (!matches) continue;
                }
            }

            const score = cosineSimilarity(queryEmbedding, doc.embedding);
            if (score >= threshold) {
                scored.push({doc, score});
            }
        }

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, topK).map(s => s.doc);
    }
}
