import {describe, it} from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import {Prompt} from "@nodeboot/ai-core";
import {
    AzureOpenAiAudioTranscriptionModel,
    AzureOpenAiChatModel,
    AzureOpenAiEmbeddingModel,
    AzureOpenAiImageModel,
} from "../src";

describe("AzureOpenAiChatModel", () => {
    it("should format messages and call completions API", async () => {
        let sentParams: any;
        const mockClient = {
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
                                        content: "Azure OpenAI response text",
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

        const chatModel = new AzureOpenAiChatModel(mockClient);
        const prompt = new Prompt("Explain TypeScript");
        const response = await chatModel.call(prompt);

        assert.equal(response.result.message.text, "Azure OpenAI response text");
        assert.equal(response.metadata?.usage?.totalTokens, 15);
        assert.equal(sentParams.model, "gpt-4o");
        assert.equal(sentParams.messages[0].role, "user");
        assert.equal(sentParams.messages[0].content, "Explain TypeScript");
    });
});

describe("AzureOpenAiEmbeddingModel", () => {
    it("should call embeddings API and return vectors", async () => {
        const mockClient = {
            embeddings: {
                create: async (_params: any) => {
                    return {
                        data: [{embedding: [0.1, 0.2, 0.3]}],
                    };
                },
            },
        };

        const embeddingModel = new AzureOpenAiEmbeddingModel(mockClient);
        const vectors = await embeddingModel.embed("Hello embeddings");

        assert.equal(vectors.length, 1);
        assert.deepEqual(vectors[0], [0.1, 0.2, 0.3]);
    });
});

describe("AzureOpenAiImageModel", () => {
    it("should call images API and return generations", async () => {
        let sentParams: any;
        const mockClient = {
            images: {
                generate: async (params: any) => {
                    sentParams = params;
                    return {
                        created: 123,
                        data: [{url: "https://example.com/image.png", revised_prompt: "a cat"}],
                    };
                },
            },
        };

        const imageModel = new AzureOpenAiImageModel(mockClient);
        const response = await imageModel.call("Draw a cat");

        assert.equal(sentParams.prompt, "Draw a cat");
        assert.equal(response.result.image.url, "https://example.com/image.png");
        assert.equal(response.results.length, 1);
        assert.equal(response.metadata?.created, 123);
    });
});

describe("AzureOpenAiAudioTranscriptionModel", () => {
    it("should call transcriptions API and return text", async () => {
        let sentParams: any;
        const originalCreateReadStream = fs.createReadStream;
        const fakeStream = {kind: "read-stream"};
        (fs as any).createReadStream = (filePath: string) => {
            assert.equal(filePath, "fixtures/audio.mp3");
            return fakeStream;
        };

        try {
            const mockClient = {
                audio: {
                    transcriptions: {
                        create: async (params: any) => {
                            sentParams = params;
                            return {text: "Hello world"};
                        },
                    },
                },
            };

            const transcriptionModel = new AzureOpenAiAudioTranscriptionModel(mockClient);
            const response = await transcriptionModel.call({
                getAudio: () => "fixtures/audio.mp3",
            });

            assert.equal(sentParams.file, fakeStream);
            assert.equal(response.result.text, "Hello world");
        } finally {
            (fs as any).createReadStream = originalCreateReadStream;
        }
    });
});
