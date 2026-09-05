import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {AssistantMessage, Document, Prompt, SystemMessage, ToolResponseMessage, UserMessage} from "@nodeboot/ai-core";
import {BedrockChatModel, BedrockEmbeddingModel} from "../src";

describe("BedrockChatModel", () => {
    it("should map prompt messages into Converse API parameters and parse the response", async () => {
        let sentParams: any;
        const mockBedrockClient = {
            converse: async (params: any) => {
                sentParams = params;
                return {
                    modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
                    output: {
                        message: {
                            role: "assistant",
                            content: [{text: "Bedrock response text"}],
                        },
                    },
                    stopReason: "end_turn",
                    usage: {
                        inputTokens: 11,
                        outputTokens: 7,
                        totalTokens: 18,
                    },
                };
            },
        };

        const chatModel = new BedrockChatModel(mockBedrockClient);
        const prompt = new Prompt(
            [
                new SystemMessage("You are helpful."),
                new UserMessage("Hello"),
                new AssistantMessage("Hi there"),
                new ToolResponseMessage({
                    toolCallId: "tool-1",
                    name: "lookup",
                    responseData: {status: "ok"},
                }),
                new UserMessage("Summarize the result"),
            ],
            {
                modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
                temperature: 0.2,
                topP: 0.9,
                maxTokens: 256,
                stopSequences: ["END"],
            },
        );

        const response = await chatModel.call(prompt);

        assert.equal(response.result.message.text, "Bedrock response text");
        assert.equal(response.result.metadata?.finishReason, "end_turn");
        assert.equal(response.metadata?.usage?.promptTokens, 11);
        assert.equal(response.metadata?.usage?.completionTokens, 7);
        assert.equal(response.metadata?.usage?.totalTokens, 18);
        assert.equal(sentParams.modelId, "anthropic.claude-3-5-sonnet-20241022-v2:0");
        assert.deepEqual(sentParams.system, [{text: "You are helpful."}]);
        assert.deepEqual(sentParams.inferenceConfig, {
            temperature: 0.2,
            topP: 0.9,
            maxTokens: 256,
            stopSequences: ["END"],
        });
        assert.deepEqual(sentParams.messages, [
            {role: "user", content: [{text: "Hello"}]},
            {role: "assistant", content: [{text: "Hi there"}]},
            {role: "user", content: [{text: '{"status":"ok"}'}]},
            {role: "user", content: [{text: "Summarize the result"}]},
        ]);
    });
});

describe("BedrockEmbeddingModel", () => {
    it("should call Titan embedding models and update documents", async () => {
        const sentParams: any[] = [];
        const mockEmbeddingClient = {
            invokeModel: async (params: any) => {
                sentParams.push(params);
                return {
                    body: JSON.stringify({embedding: [0.1, 0.2, 0.3]}),
                };
            },
        };

        const embeddingModel = new BedrockEmbeddingModel(mockEmbeddingClient, {
            model: "amazon.titan-embed-text-v2:0",
            provider: "titan",
            dimensions: 256,
        });

        const document = new Document("Hello embeddings");
        const embeddedDocument = await embeddingModel.embedDocument(document);

        assert.deepEqual(embeddedDocument.embedding, [0.1, 0.2, 0.3]);
        assert.equal(sentParams.length, 1);
        assert.equal(sentParams[0].modelId, "amazon.titan-embed-text-v2:0");
        assert.deepEqual(JSON.parse(sentParams[0].body), {
            inputText: "Hello embeddings",
            dimensions: 256,
        });
        assert.equal(embeddingModel.dimensions(), 256);
    });

    it("should call Cohere embedding models and return vectors", async () => {
        let sentParams: any;
        const mockEmbeddingClient = {
            invokeModel: async (params: any) => {
                sentParams = params;
                return {
                    body: Buffer.from(
                        JSON.stringify({
                            embeddings: [
                                [0.4, 0.5],
                                [0.6, 0.7],
                            ],
                        }),
                        "utf-8",
                    ),
                };
            },
        };

        const embeddingModel = new BedrockEmbeddingModel(mockEmbeddingClient, {
            model: "cohere.embed-english-v3",
            provider: "cohere",
        });

        const vectors = await embeddingModel.embed(["first", "second"]);

        assert.deepEqual(vectors, [
            [0.4, 0.5],
            [0.6, 0.7],
        ]);
        assert.equal(sentParams.modelId, "cohere.embed-english-v3");
        assert.deepEqual(JSON.parse(sentParams.body), {
            texts: ["first", "second"],
            input_type: "search_document",
        });
    });
});
