import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {Document, EmbeddingModel, SimpleTextSplitter, SimpleVectorStore} from "../src";

class DummyEmbeddingModel implements EmbeddingModel {
    async embed(texts: string[] | string): Promise<number[][]> {
        const arr = Array.isArray(texts) ? texts : [texts];
        return arr.map(t => {
            if (t.toLowerCase().includes("cat") || t.toLowerCase().includes("kitten")) {
                return [1, 0, 0];
            }
            if (t.toLowerCase().includes("dog") || t.toLowerCase().includes("puppy")) {
                return [0, 1, 0];
            }
            return [0, 0, 1];
        });
    }

    async embedDocument(doc: Document): Promise<Document> {
        const [emb] = await this.embed(doc.text);
        doc.embedding = emb;
        return doc;
    }

    async embedDocuments(docs: Document[]): Promise<Document[]> {
        for (const doc of docs) {
            await this.embedDocument(doc);
        }
        return docs;
    }
}

describe("SimpleTextSplitter", () => {
    it("should split long text into smaller overlapping chunks", () => {
        const splitter = new SimpleTextSplitter({chunkSize: 20, chunkOverlap: 5});
        const text = "Spring AI provides portable abstractions for Java and TypeScript developers.";
        const chunks = splitter.split(text);
        assert.ok(chunks.length > 1);
        for (const chunk of chunks) {
            assert.ok(chunk.length <= 25);
        }
    });
});

describe("SimpleVectorStore", () => {
    it("should index documents and perform similarity search", async () => {
        const embeddingModel = new DummyEmbeddingModel();
        const store = new SimpleVectorStore(embeddingModel);

        const doc1 = new Document("I love my cat mittens", {category: "pet"});
        const doc2 = new Document("My dog rover loves playing fetch", {category: "pet"});
        const doc3 = new Document("Quantum computing is fascinating", {category: "science"});

        await store.add([doc1, doc2, doc3]);

        // Search for cats
        const catResults = await store.similaritySearch("cute little kitten");
        assert.equal(catResults.length >= 1, true);
        assert.equal(catResults[0]!.text, "I love my cat mittens");

        // Search for dogs with metadata filter
        const dogResults = await store.similaritySearch({
            query: "puppy barking",
            filter: {category: "pet"},
            topK: 1,
        });
        assert.equal(dogResults.length, 1);
        assert.equal(dogResults[0]!.text, "My dog rover loves playing fetch");
    });
});
