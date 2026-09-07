import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {
    AssistantMessage,
    Document,
    ModerationPrompt,
    Prompt,
    SystemMessage,
    ToolDefinition,
    ToolResponseMessage,
    UserMessage,
} from "@nodeboot/ai-core";
import {MistralChatModel} from "../src/MistralChatModel";
import {MistralEmbeddingModel} from "../src/MistralEmbeddingModel";
import {MistralModerationModel} from "../src/MistralModerationModel";

describe("MistralChatModel", () => {
    it("should format messages and call chat API", async () => {
        let sentParams: any;
        const mockClient = {
            chat: {
                complete: async (params: any) => {
                    sentParams = params;
                    return {
                        id: "chatcmpl-mistral-123",
                        model: "mistral-large-latest",
                        choices: [
                            {
                                finish_reason: "tool_calls",
                                message: {
                                    role: "assistant",
                                    content: "Mistral response text",
                                    tool_calls: [
                                        {
                                            id: "call-1",
                                            type: "function",
                                            function: {
                                                name: "lookupWeather",
                                                arguments: '{"city":"Paris"}',
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                        usage: {
                            prompt_tokens: 12,
                            completion_tokens: 6,
                            total_tokens: 18,
                        },
                    };
                },
            },
        };

        const toolDefinition: ToolDefinition = {
            name: "lookupWeather",
            description: "Looks up weather",
            inputSchema: {
                type: "object",
                properties: {
                    city: {
                        type: "string",
                    },
                },
                required: ["city"],
            },
        };

        const chatModel = new MistralChatModel(mockClient);
        const prompt = new Prompt(
            [
                new SystemMessage("You are helpful."),
                new UserMessage("What is the weather?"),
                new AssistantMessage({
                    text: "",
                    toolCalls: [
                        {
                            id: "call-0",
                            name: "lookupWeather",
                            arguments: {city: "London"},
                        },
                    ],
                }),
                new ToolResponseMessage({
                    toolCallId: "call-0",
                    name: "lookupWeather",
                    responseData: {temperature: "18C"},
                }),
            ],
            {
                topP: 0.8,
                maxTokens: 256,
                stopSequences: ["END"],
                randomSeed: 42,
                tools: [toolDefinition],
                toolChoice: "auto",
                responseFormat: {type: "json_object"},
            },
        );
        const response = await chatModel.call(prompt);

        assert.equal(response.result.message.text, "Mistral response text");
        assert.equal(response.metadata?.usage?.totalTokens, 18);
        assert.equal(response.result.metadata?.finishReason, "tool_calls");
        assert.equal(response.result.message.toolCalls?.[0]?.name, "lookupWeather");
        assert.equal(sentParams.model, "mistral-large-latest");
        assert.equal(sentParams.messages[0].role, "system");
        assert.equal(sentParams.messages[1].role, "user");
        assert.equal(sentParams.messages[2].tool_calls[0].function.arguments, '{"city":"London"}');
        assert.equal(sentParams.messages[3].role, "tool");
        assert.equal(sentParams.messages[3].tool_call_id, "call-0");
        assert.equal(sentParams.top_p, 0.8);
        assert.equal(sentParams.max_tokens, 256);
        assert.deepEqual(sentParams.stop, ["END"]);
        assert.equal(sentParams.random_seed, 42);
        assert.equal(sentParams.tools[0].function.name, "lookupWeather");
        assert.equal(sentParams.tool_choice, "auto");
        assert.deepEqual(sentParams.response_format, {type: "json_object"});
    });
});

describe("MistralEmbeddingModel", () => {
    it("should call embeddings API and return vectors", async () => {
        let sentParams: any;
        const mockClient = {
            embeddings: {
                create: async (params: any) => {
                    sentParams = params;
                    return {
                        data: [{embedding: [0.1, 0.2, 0.3]}, {embedding: [0.4, 0.5, 0.6]}],
                    };
                },
            },
        };

        const embeddingModel = new MistralEmbeddingModel(mockClient);
        const vectors = await embeddingModel.embed(["Hello embeddings", "Hello again"]);
        const documents = await embeddingModel.embedDocuments([new Document("Doc one"), new Document("Doc two")]);

        assert.equal(vectors.length, 2);
        assert.deepEqual(vectors[0], [0.1, 0.2, 0.3]);
        assert.deepEqual(documents[1]?.embedding, [0.4, 0.5, 0.6]);
        assert.equal(sentParams.model, "mistral-embed");
        assert.deepEqual(sentParams.inputs, ["Doc one", "Doc two"]);
        assert.equal(embeddingModel.dimensions(), 1024);
    });
});

describe("MistralModerationModel", () => {
    it("should call moderation API and compute flagged status", async () => {
        let sentParams: any;
        const mockClient = {
            classifiers: {
                moderate: async (params: any) => {
                    sentParams = params;
                    return {
                        id: "modr-mistral-1",
                        model: "mistral-moderation-latest",
                        results: [
                            {
                                categories: {
                                    violence: true,
                                    self_harm: false,
                                },
                                category_scores: {
                                    violence: 0.92,
                                    self_harm: 0.01,
                                },
                            },
                        ],
                    };
                },
            },
        };

        const moderationModel = new MistralModerationModel(mockClient);
        const response = await moderationModel.call(new ModerationPrompt("some text"));

        assert.equal(response.result.flagged, true);
        assert.equal(response.result.categories?.["violence"], true);
        assert.equal(response.result.categoryScores?.["violence"], 0.92);
        assert.equal(response.metadata?.id, "modr-mistral-1");
        assert.equal(sentParams.model, "mistral-moderation-latest");
        assert.deepEqual(sentParams.inputs, ["some text"]);
    });
});
