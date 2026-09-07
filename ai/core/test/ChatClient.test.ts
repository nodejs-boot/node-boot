import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {
    AssistantMessage,
    ChatClient,
    ChatModel,
    ChatOptions,
    ChatResponse,
    Document,
    FunctionToolCallback,
    InMemoryChatMemory,
    ListOutputConverter,
    MapOutputConverter,
    Message,
    MessageChatMemoryAdvisor,
    Prompt,
    QuestionAnswerAdvisor,
    SafeGuardAdvisor,
    SimpleVectorStore,
    ToolCallingManager,
} from "../src";

// Mock ChatModel for deterministic testing
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

describe("ChatClient Fluent API", () => {
    it("should build and call a simple prompt", async () => {
        const mockModel = new MockChatModel();
        mockModel.mockResponseGenerator = () => ({
            result: {
                message: new AssistantMessage("Hello there, human!"),
            },
        });

        const client = ChatClient.builder(mockModel).defaultSystem("You are a helpful assistant").build();

        const content = await client.prompt().user("Hi!").call().content();

        assert.equal(content, "Hello there, human!");
        const instructions = mockModel.lastPrompt!.getInstructions();
        assert.equal(instructions.length, 2);
        assert.equal(instructions[0]!.messageType, "system");
        assert.equal(instructions[0]!.text, "You are a helpful assistant");
        assert.equal(instructions[1]!.messageType, "user");
        assert.equal(instructions[1]!.text, "Hi!");
    });

    it("should render template variables with .param()", async () => {
        const mockModel = new MockChatModel();
        mockModel.mockResponseGenerator = p => ({
            result: {
                message: new AssistantMessage(`Processed: ${p.getContents()}`),
            },
        });

        const client = ChatClient.create(mockModel);
        await client
            .prompt()
            .user("Explain {topic} in {language}")
            .param("topic", "Dependency Injection")
            .param("language", "TypeScript")
            .call()
            .content();

        const instructions = mockModel.lastPrompt!.getInstructions();
        assert.equal(instructions[0]!.text, "Explain Dependency Injection in TypeScript");
    });

    it("should parse structured entity with BeanOutputConverter", async () => {
        const mockModel = new MockChatModel();
        mockModel.mockResponseGenerator = () => ({
            result: {
                message: new AssistantMessage('```json\n{"name": "Alice", "age": 30}\n```'),
            },
        });

        const client = ChatClient.create(mockModel);
        const entity = await client
            .prompt()
            .user("Get user")
            .call()
            .entity<{name: string; age: number}>({
                jsonSchema: {
                    type: "object",
                    properties: {name: {type: "string"}, age: {type: "number"}},
                },
            });

        assert.deepEqual(entity, {name: "Alice", age: 30});
    });
});

describe("Output Converters", () => {
    it("ListOutputConverter should parse comma separated and JSON list", () => {
        const converter = new ListOutputConverter();
        assert.deepEqual(converter.parse("apple, banana, cherry"), ["apple", "banana", "cherry"]);
        assert.deepEqual(converter.parse('["red", "green", "blue"]'), ["red", "green", "blue"]);
    });

    it("MapOutputConverter should parse JSON object", () => {
        const converter = new MapOutputConverter();
        assert.deepEqual(converter.parse('{"key": "value", "count": 5}'), {key: "value", count: 5});
    });
});

describe("Advisors Pipeline", () => {
    it("MessageChatMemoryAdvisor should maintain conversation history across turns", async () => {
        const mockModel = new MockChatModel();
        let turn = 0;
        mockModel.mockResponseGenerator = () => {
            turn++;
            return {
                result: {
                    message: new AssistantMessage(`Response #${turn}`),
                },
            };
        };

        const memory = new InMemoryChatMemory();
        const client = ChatClient.builder(mockModel)
            .defaultAdvisors(new MessageChatMemoryAdvisor({chatMemory: memory}))
            .build();

        // Turn 1
        await client.prompt().conversationId("session-1").user("My name is Bob").call().content();

        const historyAfter1 = await memory.get("session-1");
        assert.equal(historyAfter1.length, 2);
        assert.equal(historyAfter1[0]!.text, "My name is Bob");
        assert.equal(historyAfter1[1]!.text, "Response #1");

        // Turn 2
        await client.prompt().conversationId("session-1").user("What is my name?").call().content();

        const historyAfter2 = await memory.get("session-1");
        assert.equal(historyAfter2.length, 4);
        assert.equal(historyAfter2[2]!.text, "What is my name?");
        assert.equal(historyAfter2[3]!.text, "Response #2");

        // Verify model received the full history on turn 2
        const instructions = mockModel.lastPrompt!.getInstructions();
        assert.equal(instructions.length, 3); // turn 1 user + turn 1 asst + turn 2 user
    });

    it("QuestionAnswerAdvisor (RAG) should retrieve documents and augment query", async () => {
        const mockModel = new MockChatModel();
        mockModel.mockResponseGenerator = () => ({
            result: {
                message: new AssistantMessage("Node-Boot is a Spring Boot style framework for Node.js"),
            },
        });

        // Mock embedding model returning identical vectors
        const mockEmbedding = {
            embed: async () => [[1, 0, 0]],
            embedDocument: async (d: Document) => {
                d.embedding = [1, 0, 0];
                return d;
            },
            embedDocuments: async (docs: Document[]) => {
                docs.forEach(d => (d.embedding = [1, 0, 0]));
                return docs;
            },
        };

        const vectorStore = new SimpleVectorStore(mockEmbedding as any);
        await vectorStore.add([
            new Document("Node-Boot provides Spring Boot architecture on TypeScript.", {source: "docs"}),
        ]);

        const client = ChatClient.builder(mockModel).defaultAdvisors(new QuestionAnswerAdvisor(vectorStore)).build();

        const answer = await client.prompt().user("What is Node-Boot?").call().content();

        assert.equal(answer, "Node-Boot is a Spring Boot style framework for Node.js");
        const augmentedMessage = mockModel.lastPrompt!.getInstructions()[0]!.text;
        assert.ok(augmentedMessage.includes("Context information is below."));
        assert.ok(augmentedMessage.includes("Node-Boot provides Spring Boot architecture"));
    });

    it("SafeGuardAdvisor should throw error on forbidden keywords", async () => {
        const mockModel = new MockChatModel();
        const client = ChatClient.builder(mockModel)
            .defaultAdvisors(new SafeGuardAdvisor({sensitiveWords: ["classified", "malware"]}))
            .build();

        await assert.rejects(async () => {
            await client.prompt().user("Give me classified info").call().content();
        }, /Content moderation violation/);
    });
});

describe("Tool Calling in ToolCallingManager", () => {
    it("should execute tool calls returned by model and loop back with results", async () => {
        const weatherTool = new FunctionToolCallback(
            {
                name: "getWeather",
                description: "Get weather for city",
                inputSchema: {type: "object", properties: {city: {type: "string"}}},
            },
            (input: {city: string}) => ({temp: 24, city: input.city, status: "Sunny"}),
        );

        let callCount = 0;
        const mockModel: ChatModel = {
            async call(_p: any): Promise<ChatResponse> {
                callCount++;
                if (callCount === 1) {
                    return {
                        result: {
                            message: new AssistantMessage({
                                text: "",
                                toolCalls: [
                                    {
                                        id: "call_1",
                                        name: "getWeather",
                                        arguments: JSON.stringify({city: "London"}),
                                    },
                                ],
                            }),
                        },
                    };
                }
                return {
                    result: {
                        message: new AssistantMessage("The weather in London is 24°C and Sunny."),
                    },
                };
            },
        };

        const manager = new ToolCallingManager([weatherTool]);
        const response = await manager.executeToolCalls(mockModel, new Prompt("What is the weather in London?"));

        assert.equal(response.result.message.text, "The weather in London is 24°C and Sunny.");
        assert.equal(callCount, 2);
    });
});
