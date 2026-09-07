import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {Prompt} from "@nodeboot/ai-core";
import {PerplexityChatModel} from "../src";

describe("PerplexityChatModel", () => {
    it("should default to the Perplexity model and call the OpenAI-compatible completions API", async () => {
        let sentParams: any;
        const mockClient = {
            chat: {
                completions: {
                    create: async (params: any) => {
                        sentParams = params;
                        return {
                            id: "cmpl-123",
                            model: "sonar",
                            choices: [
                                {
                                    finish_reason: "stop",
                                    message: {
                                        role: "assistant",
                                        content: "Perplexity response text",
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

        const chatModel = new PerplexityChatModel(mockClient);
        const prompt = new Prompt("Explain TypeScript");
        const response = await chatModel.call(prompt);

        assert.equal(response.result.message.text, "Perplexity response text");
        assert.equal(sentParams.model, "sonar");
        assert.equal(sentParams.messages[0].content, "Explain TypeScript");
    });
});
