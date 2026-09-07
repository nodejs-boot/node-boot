import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {AssistantMessage, Prompt, SystemMessage, ToolResponseMessage, UserMessage} from "@nodeboot/ai-core";
import {GoogleGenAiChatModel} from "../src/GoogleGenAiChatModel";
import {GoogleGenAiEmbeddingModel} from "../src/GoogleGenAiEmbeddingModel";
import {GoogleGenAiImageModel} from "../src/GoogleGenAiImageModel";

describe("GoogleGenAiChatModel", () => {
    it("should format messages and call generateContent API", async () => {
        let sentParams: any;
        const mockClient = {
            models: {
                generateContent: async (params: any) => {
                    sentParams = params;
                    return {
                        candidates: [
                            {
                                finishReason: "STOP",
                                content: {
                                    parts: [
                                        {text: "Gemini response "},
                                        {text: "text"},
                                        {functionCall: {name: "lookupWeather", args: {city: "London"}}},
                                    ],
                                },
                            },
                        ],
                        usageMetadata: {
                            promptTokenCount: 12,
                            candidatesTokenCount: 8,
                            totalTokenCount: 20,
                        },
                    };
                },
            },
        };

        const chatModel = new GoogleGenAiChatModel(mockClient);
        const prompt = new Prompt(
            [
                new SystemMessage("Be concise"),
                new UserMessage({
                    text: "Describe this image",
                    media: [{mimeType: "image/png", data: Buffer.from("img-bytes")}],
                }),
                new AssistantMessage({
                    toolCalls: [{id: "call-1", name: "getWeather", arguments: '{"city":"Lisbon"}'}],
                }),
                new ToolResponseMessage({
                    toolCallId: "call-1",
                    name: "getWeather",
                    responseData: {temperature: 24},
                }),
            ],
            {
                temperature: 0.3,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 256,
                stopSequences: ["END"],
                tools: [
                    {
                        name: "lookupWeather",
                        description: "Lookup weather information",
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

        assert.equal(sentParams.model, "gemini-2.0-flash");
        assert.equal(sentParams.config.systemInstruction, "Be concise");
        assert.equal(sentParams.contents[0].role, "user");
        assert.equal(sentParams.contents[0].parts[0].text, "Describe this image");
        assert.equal(sentParams.contents[0].parts[1].inlineData.mimeType, "image/png");
        assert.equal(sentParams.contents[0].parts[1].inlineData.data, Buffer.from("img-bytes").toString("base64"));
        assert.equal(sentParams.contents[1].role, "model");
        assert.equal(sentParams.contents[1].parts[0].functionCall.name, "getWeather");
        assert.deepEqual(sentParams.contents[1].parts[0].functionCall.args, {city: "Lisbon"});
        assert.equal(sentParams.contents[2].role, "user");
        assert.equal(sentParams.contents[2].parts[0].functionResponse.name, "getWeather");
        assert.equal(sentParams.config.tools[0].functionDeclarations[0].name, "lookupWeather");
        assert.equal(response.result.message.text, "Gemini response text");
        assert.equal(response.result.message.toolCalls?.[0]?.name, "lookupWeather");
        assert.equal(response.result.message.toolCalls?.[0]?.arguments, '{"city":"London"}');
        assert.equal(response.metadata?.usage?.totalTokens, 20);
    });
});

describe("GoogleGenAiEmbeddingModel", () => {
    it("should call embedContent API and return vectors", async () => {
        let sentParams: any;
        const mockClient = {
            models: {
                embedContent: async (params: any) => {
                    sentParams = params;
                    return {
                        embeddings: [{values: [0.1, 0.2, 0.3]}],
                    };
                },
            },
        };

        const embeddingModel = new GoogleGenAiEmbeddingModel(mockClient);
        const vectors = await embeddingModel.embed("Hello embeddings");

        assert.equal(sentParams.model, "text-embedding-004");
        assert.equal(sentParams.contents[0].parts[0].text, "Hello embeddings");
        assert.equal(vectors.length, 1);
        assert.deepEqual(vectors[0], [0.1, 0.2, 0.3]);
    });
});

describe("GoogleGenAiImageModel", () => {
    it("should call generateImages API and return generations", async () => {
        let sentParams: any;
        const mockClient = {
            models: {
                generateImages: async (params: any) => {
                    sentParams = params;
                    return {
                        generatedImages: [{image: {imageBytes: "base64-image-data"}}],
                    };
                },
            },
        };

        const imageModel = new GoogleGenAiImageModel(mockClient);
        const response = await imageModel.call("Draw a cat");

        assert.equal(sentParams.model, "imagen-3.0-generate-002");
        assert.equal(sentParams.prompt, "Draw a cat");
        assert.equal(sentParams.config.numberOfImages, 1);
        assert.equal(response.result.image.b64Json, "base64-image-data");
        assert.equal(response.results.length, 1);
    });
});
