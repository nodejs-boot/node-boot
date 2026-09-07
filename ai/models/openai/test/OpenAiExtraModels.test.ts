import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {OpenAiAudioTranscriptionModel, OpenAiImageModel, OpenAiModerationModel, OpenAiSpeechModel} from "../src";

describe("OpenAiImageModel", () => {
    it("should call images API and return generations", async () => {
        let sentParams: any;
        const mockClient = {
            images: {
                generate: async (params: any) => {
                    sentParams = params;
                    return {
                        created: 123,
                        data: [
                            {
                                url: "https://example.com/image.png",
                                revised_prompt: "a cat",
                            },
                        ],
                    };
                },
            },
        };

        const imageModel = new OpenAiImageModel(mockClient);
        const response = await imageModel.call("Draw a cat");

        assert.equal(sentParams.prompt, "Draw a cat");
        assert.equal(response.result.image.url, "https://example.com/image.png");
        assert.equal(response.results.length, 1);
        assert.equal(response.metadata?.created, 123);
    });
});

describe("OpenAiAudioTranscriptionModel", () => {
    it("should call transcriptions API and return text", async () => {
        const mockClient = {
            audio: {
                transcriptions: {
                    create: async (_params: any) => ({text: "Hello world"}),
                },
                speech: {
                    create: async (_params: any) => Buffer.from("audio-bytes"),
                },
            },
        };

        const transcriptionModel = new OpenAiAudioTranscriptionModel(mockClient);
        const response = await transcriptionModel.call({
            getAudio: () => Buffer.from("fake-audio"),
        });

        assert.equal(response.result.text, "Hello world");
    });
});

describe("OpenAiSpeechModel", () => {
    it("should call speech API and return audio buffer", async () => {
        let sentParams: any;
        const mockClient = {
            audio: {
                transcriptions: {create: async (_p: any) => ({text: ""})},
                speech: {
                    create: async (params: any) => {
                        sentParams = params;
                        return Buffer.from("audio-bytes");
                    },
                },
            },
        };

        const speechModel = new OpenAiSpeechModel(mockClient);
        const response = await speechModel.call("Hello there");

        assert.equal(sentParams.input, "Hello there");
        assert.equal(response.result.audio.toString(), "audio-bytes");
    });
});

describe("OpenAiModerationModel", () => {
    it("should call moderations API and flag content", async () => {
        const mockClient = {
            moderations: {
                create: async (_params: any) => ({
                    id: "modr-1",
                    model: "omni-moderation-latest",
                    results: [{flagged: true, categories: {violence: true}, category_scores: {violence: 0.9}}],
                }),
            },
        };

        const moderationModel = new OpenAiModerationModel(mockClient);
        const response = await moderationModel.call("some text");

        assert.equal(response.result.flagged, true);
        assert.equal(response.result.categories?.["violence"], true);
        assert.equal(response.metadata?.id, "modr-1");
    });
});
