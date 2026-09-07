import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {AssistantMessage, Prompt, SystemMessage, ToolResponseMessage, UserMessage} from "@nodeboot/ai-core";
import {OllamaChatModel, OllamaEmbeddingModel} from "../src";

describe("OllamaChatModel", () => {
    it("should format messages and call chat API", async () => {
        let sentParams: any;
        const mockOllamaClient = {
            chat: async (params: any) => {
                sentParams = params;
                return {
                    model: "llama3.2",
                    message: {
                        role: "assistant",
                        content: "Ollama response text",
                        tool_calls: [
                            {
                                function: {
                                    name: "get_weather",
                                    arguments: {city: "Lisbon"},
                                },
                            },
                        ],
                    },
                    done_reason: "stop",
                    prompt_eval_count: 10,
                    eval_count: 5,
                };
            },
        };

        const chatModel = new OllamaChatModel(mockOllamaClient, {temperature: 0.4});
        const prompt = new Prompt(
            [
                new SystemMessage("You are helpful"),
                new UserMessage({
                    text: "Explain Ollama",
                    media: [{mimeType: "image/png", data: Buffer.from("image-bytes")}],
                }),
                new AssistantMessage({
                    text: "Previous answer",
                    toolCalls: [
                        {
                            id: "call-1",
                            name: "lookup_docs",
                            arguments: {query: "ollama"},
                        },
                    ],
                }),
                new ToolResponseMessage({
                    toolCallId: "call-1",
                    name: "lookup_docs",
                    responseData: {result: "docs"},
                }),
            ],
            {
                model: "llama3.2",
                topP: 0.9,
                topK: 20,
                numPredict: 128,
                stopSequences: ["STOP"],
                tools: [
                    {
                        name: "get_weather",
                        description: "Gets the weather",
                        inputSchema: {
                            type: "object",
                            properties: {
                                city: {type: "string"},
                            },
                        },
                    },
                ],
            },
        );
        const response = await chatModel.call(prompt);

        assert.equal(response.result.message.text, "Ollama response text");
        assert.equal(response.result.metadata?.finishReason, "stop");
        assert.equal(response.metadata?.usage?.totalTokens, 15);
        assert.equal(response.metadata?.model, "llama3.2");
        assert.equal(sentParams.model, "llama3.2");
        assert.equal(sentParams.messages[0].role, "system");
        assert.equal(sentParams.messages[1].role, "user");
        assert.equal(sentParams.messages[1].content, "Explain Ollama");
        assert.deepEqual(sentParams.messages[1].images, [Buffer.from("image-bytes").toString("base64")]);
        assert.equal(sentParams.messages[2].tool_calls[0].function.name, "lookup_docs");
        assert.equal(sentParams.messages[3].role, "tool");
        assert.equal(sentParams.options.temperature, 0.4);
        assert.equal(sentParams.options.top_p, 0.9);
        assert.equal(sentParams.options.top_k, 20);
        assert.equal(sentParams.options.num_predict, 128);
        assert.deepEqual(sentParams.options.stop, ["STOP"]);
        assert.equal(sentParams.tools[0].function.name, "get_weather");
        assert.equal((response.result.message as AssistantMessage).toolCalls?.[0]?.name, "get_weather");
    });
});

describe("OllamaEmbeddingModel", () => {
    it("should call embed API and return vectors", async () => {
        let sentParams: any;
        const mockOllamaClient = {
            embed: async (params: any) => {
                sentParams = params;
                return {
                    embeddings: [[0.1, 0.2, 0.3]],
                };
            },
        };

        const embeddingModel = new OllamaEmbeddingModel(mockOllamaClient);
        const vectors = await embeddingModel.embed("Hello embeddings");

        assert.equal(sentParams.model, "nomic-embed-text");
        assert.deepEqual(sentParams.input, ["Hello embeddings"]);
        assert.equal(vectors.length, 1);
        assert.deepEqual(vectors[0], [0.1, 0.2, 0.3]);
        assert.equal(embeddingModel.dimensions(), 768);
    });
});
