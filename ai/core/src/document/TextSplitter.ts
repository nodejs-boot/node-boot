import {Document} from "./Document";

export interface TextSplitter {
    split(text: string): string[];
    splitDocuments(documents: Document[]): Document[];
}

export class SimpleTextSplitter implements TextSplitter {
    private readonly chunkSize: number;
    private readonly chunkOverlap: number;

    constructor(options?: {chunkSize?: number; chunkOverlap?: number}) {
        this.chunkSize = options?.chunkSize ?? 800;
        this.chunkOverlap = options?.chunkOverlap ?? 100;
    }

    split(text: string): string[] {
        if (!text || text.length === 0) return [];
        const chunks: string[] = [];
        let startIndex = 0;

        while (startIndex < text.length) {
            let endIndex = startIndex + this.chunkSize;
            if (endIndex < text.length) {
                // Try to find natural word boundary
                const lastSpace = text.lastIndexOf(" ", endIndex);
                if (lastSpace > startIndex) {
                    endIndex = lastSpace;
                }
            } else {
                endIndex = text.length;
            }

            const chunk = text.slice(startIndex, endIndex).trim();
            if (chunk.length > 0) {
                chunks.push(chunk);
            }

            if (endIndex >= text.length) break;
            startIndex = Math.max(startIndex + 1, endIndex - this.chunkOverlap);
        }

        return chunks;
    }

    splitDocuments(documents: Document[]): Document[] {
        const result: Document[] = [];
        for (const doc of documents) {
            const chunks = this.split(doc.text);
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i] ?? "";
                result.push(
                    new Document({
                        text: chunk,
                        metadata: {
                            ...doc.metadata,
                            chunkIndex: i,
                            parentDocumentId: doc.id,
                        },
                    }),
                );
            }
        }
        return result;
    }
}
