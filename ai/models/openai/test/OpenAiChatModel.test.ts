import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {Prompt} from "@nodeboot/ai-core";
import {OpenAiChatModel, OpenAiEmbeddingModel} from "../src";

describe("OpenAiChatModel", () => {
    it("should format messages and call completions API", async () => {
        let sentParams: any;
        const mockOpenAiClient = {
            chat: {
                completions: {
                    create: async (params: any) => {
                        sentParams = params;
                        return {
                            id: "chatcmpl-123",
                            model: "gpt-4o",
                            choices: [
                                {
                                    finish_reason: "stop",
                                    message: {
                                        role: "assistant",
                                        content: "OpenAI response text",
                                    },
                                },
                            ],
                            usage: {
                                prompt_tokens: 10,
                                completion_tokens: 5,
                                total_tokens: 15,
                            },
                        };
                    },
                },
            },
        };

        const chatModel = new OpenAiChatModel(mockOpenAiClient);
        const prompt = new Prompt("Explain TypeScript");
        const response = await chatModel.call(prompt);

        assert.equal(response.result.message.text, "OpenAI response text");
        assert.equal(response.metadata?.usage?.totalTokens, 15);
        assert.equal(sentParams.model, "gpt-4o");
        assert.equal(sentParams.messages[0].role, "user");
        assert.equal(sentParams.messages[0].content, "Explain TypeScript");
    });
});

describe("OpenAiEmbeddingModel", () => {
    it("should call embeddings API and return vectors", async () => {
        const mockOpenAiClient = {
            embeddings: {
                create: async (_params: any) => {
                    return {
                        data: [{embedding: [0.1, 0.2, 0.3]}],
                    };
                },
            },
        };

        const embeddingModel = new OpenAiEmbeddingModel(mockOpenAiClient);
        const vectors = await embeddingModel.embed("Hello embeddings");

        assert.equal(vectors.length, 1);
        assert.deepEqual(vectors[0], [0.1, 0.2, 0.3]);
    });
});
