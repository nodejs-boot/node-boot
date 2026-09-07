import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {
    AssistantMessage,
    ChatClient,
    ChatModel,
    ChatOptions,
    ChatResponse,
    CompressionQueryTransformer,
    ConcatenationDocumentJoiner,
    ContextualQueryAugmenter,
    Document,
    Message,
    MultiQueryExpander,
    Prompt,
    PromptTemplate,
    Query,
    QuestionAnswerAdvisor,
    RetrievalAugmentationAdvisor,
    RewriteQueryTransformer,
    SimpleVectorStore,
    TranslationQueryTransformer,
    UserMessage,
    VectorStoreDocumentRetriever,
} from "../src";

class MockChatModel implements ChatModel {
    public lastPrompt?: Prompt;
    public mockResponseGenerator?: (prompt: Prompt) => ChatResponse;

    async call(prompt: {getInstructions(): Message[]; getOptions?(): ChatOptions}): Promise<ChatResponse> {
        this.lastPrompt = prompt as Prompt;
        if (this.mockResponseGenerator) {
            return this.mockResponseGenerator(prompt as Prompt);
        }
        return {
            result: {
                message: new AssistantMessage("Default mock answer"),
            },
        };
    }
}

describe("RAG Query Transformers", () => {
    it("RewriteQueryTransformer should rewrite user query", async () => {
        const mockModel = new MockChatModel();
        mockModel.mockResponseGenerator = () => ({
            result: {
                message: new AssistantMessage("Node-Boot dependency injection guide"),
            },
        });

        const transformer = RewriteQueryTransformer.builder().chatClient(ChatClient.create(mockModel)).build();

        const transformed = await transformer.transform(new Query("How do I use DI in nodeboot?"));
        assert.equal(transformed.text, "Node-Boot dependency injection guide");
    });

    it("CompressionQueryTransformer should compress conversation history into standalone query", async () => {
        const mockModel = new MockChatModel();
        mockModel.mockResponseGenerator = () => ({
            result: {
                message: new AssistantMessage("What is the capital of Denmark?"),
            },
        });

        const transformer = CompressionQueryTransformer.builder().chatClient(ChatClient.create(mockModel)).build();

        const query = Query.builder()
            .text("And what is its second largest city?")
            .history(
                new UserMessage("Tell me about Denmark"),
                new AssistantMessage("Denmark is a Nordic country in northern Europe."),
            )
            .build();

        const transformed = await transformer.transform(query);
        assert.equal(transformed.text, "What is the capital of Denmark?");
    });

    it("TranslationQueryTransformer should translate query to target language", async () => {
        const mockModel = new MockChatModel();
        mockModel.mockResponseGenerator = () => ({
            result: {
                message: new AssistantMessage("What is the capital of Denmark?"),
            },
        });

        const transformer = TranslationQueryTransformer.builder()
            .chatClient(ChatClient.create(mockModel))
            .targetLanguage("english")
            .build();

        const transformed = await transformer.transform(new Query("Hvad er Danmarks hovedstad?"));
        assert.equal(transformed.text, "What is the capital of Denmark?");
    });

    it("MultiQueryExpander should generate multiple variations", async () => {
        const mockModel = new MockChatModel();
        mockModel.mockResponseGenerator = () => ({
            result: {
                message: new AssistantMessage('["Spring Boot in Node.js", "NodeBoot overview tutorial"]'),
            },
        });

        const expander = MultiQueryExpander.builder()
            .chatClient(ChatClient.create(mockModel))
            .numberOfQueries(2)
            .includeOriginal(true)
            .build();

        const expanded = await expander.expand(new Query("How does Node-Boot work?"));
        assert.equal(expanded.length, 3);
        assert.equal(expanded[0]!.text, "How does Node-Boot work?");
        assert.equal(expanded[1]!.text, "Spring Boot in Node.js");
        assert.equal(expanded[2]!.text, "NodeBoot overview tutorial");
    });
});

describe("RAG Retrieval and Joining", () => {
    it("VectorStoreDocumentRetriever should filter by metadata and dynamic filter", async () => {
        const mockEmbedding = {
            embed: async () => [[1, 0]],
            embedDocument: async (d: Document) => {
                d.embedding = [1, 0];
                return d;
            },
            embedDocuments: async (docs: Document[]) => {
                docs.forEach(d => (d.embedding = [1, 0]));
                return docs;
            },
        };

        const store = new SimpleVectorStore(mockEmbedding as any);
        await store.add([
            new Document("Spring Boot docs", {type: "Spring"}),
            new Document("Node.js docs", {type: "Node"}),
        ]);

        const retriever = VectorStoreDocumentRetriever.builder()
            .vectorStore(store)
            .filterExpression({type: "Spring"})
            .build();

        const docs = await retriever.retrieve(new Query("Tell me about docs"));
        assert.equal(docs.length, 1);
        assert.equal(docs[0]!.text, "Spring Boot docs");

        // Dynamic runtime override
        const dynamicDocs = await retriever.retrieve(
            Query.builder()
                .text("Tell me about docs")
                .context({[VectorStoreDocumentRetriever.FILTER_EXPRESSION]: {type: "Node"}})
                .build(),
        );
        assert.equal(dynamicDocs.length, 1);
        assert.equal(dynamicDocs[0]!.text, "Node.js docs");
    });

    it("ConcatenationDocumentJoiner should combine and deduplicate documents", async () => {
        const joiner = new ConcatenationDocumentJoiner();
        const docA = new Document({id: "1", text: "Doc 1"});
        const docB = new Document({id: "2", text: "Doc 2"});
        const docADup = new Document({id: "1", text: "Doc 1 duplicate"});

        const joined = await joiner.join([[docA, docB], [docADup]]);
        assert.equal(joined.length, 2);
        assert.equal(joined[0]!.id, "1");
        assert.equal(joined[1]!.id, "2");
    });
});

describe("ContextualQueryAugmenter and RetrievalAugmentationAdvisor", () => {
    it("ContextualQueryAugmenter should augment query with document context", async () => {
        const augmenter = ContextualQueryAugmenter.builder().allowEmptyContext(false).build();

        const query = new Query("What is Node-Boot?");
        const docs = [new Document("Node-Boot is a TypeScript framework.")];

        const augmented = await augmenter.augment(query, docs);
        assert.ok(augmented.text.includes("Context information is below."));
        assert.ok(augmented.text.includes("Node-Boot is a TypeScript framework."));
        assert.ok(augmented.text.includes("Query: What is Node-Boot?"));
    });

    it("RetrievalAugmentationAdvisor should execute full modular RAG flow with ChatClient", async () => {
        const mockModel = new MockChatModel();
        mockModel.mockResponseGenerator = () => ({
            result: {
                message: new AssistantMessage("Node-Boot provides Spring Boot architecture on TypeScript."),
            },
        });

        const mockEmbedding = {
            embed: async () => [[1, 0]],
            embedDocument: async (d: Document) => {
                d.embedding = [1, 0];
                return d;
            },
            embedDocuments: async (docs: Document[]) => {
                docs.forEach(d => (d.embedding = [1, 0]));
                return docs;
            },
        };

        const store = new SimpleVectorStore(mockEmbedding as any);
        await store.add([new Document("Node-Boot architecture reference doc.", {category: "docs"})]);

        const ragAdvisor = RetrievalAugmentationAdvisor.builder()
            .documentRetriever(VectorStoreDocumentRetriever.builder().vectorStore(store).topK(2).build())
            .queryAugmenter(ContextualQueryAugmenter.builder().allowEmptyContext(true).build())
            .build();

        const client = ChatClient.builder(mockModel).defaultAdvisors(ragAdvisor).build();

        const answer = await client.prompt().user("How does Node-Boot work?").call().content();

        assert.equal(answer, "Node-Boot provides Spring Boot architecture on TypeScript.");
        const instructions = mockModel.lastPrompt!.getInstructions();
        assert.ok(instructions[0]!.text.includes("Node-Boot architecture reference doc."));
    });

    it("QuestionAnswerAdvisor should support custom promptTemplate and dynamic filter", async () => {
        const mockModel = new MockChatModel();
        mockModel.mockResponseGenerator = () => ({
            result: {
                message: new AssistantMessage("Answer based on custom prompt."),
            },
        });

        const mockEmbedding = {
            embed: async () => [[1, 0]],
            embedDocument: async (d: Document) => {
                d.embedding = [1, 0];
                return d;
            },
            embedDocuments: async (docs: Document[]) => {
                docs.forEach(d => (d.embedding = [1, 0]));
                return docs;
            },
        };

        const store = new SimpleVectorStore(mockEmbedding as any);
        await store.add([
            new Document("Alpha secret data", {type: "Alpha"}),
            new Document("Beta secret data", {type: "Beta"}),
        ]);

        const customTemplate = new PromptTemplate(
            "{query}\n{question_answer_context}\nGiven above info, answer question.",
        );

        const qaAdvisor = QuestionAnswerAdvisor.builder(store).promptTemplate(customTemplate).build();

        const client = ChatClient.builder(mockModel).defaultAdvisors(qaAdvisor).build();

        await client
            .prompt()
            .user("Give me secrets")
            .param(QuestionAnswerAdvisor.FILTER_EXPRESSION, {type: "Beta"})
            .call()
            .content();

        const instructions = mockModel.lastPrompt!.getInstructions();
        assert.ok(instructions[0]!.text.includes("Beta secret data"));
        assert.ok(!instructions[0]!.text.includes("Alpha secret data"));
    });
});
