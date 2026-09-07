import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {Prompt} from "@nodeboot/ai-core";
import {NvidiaChatModel} from "../src/NvidiaChatModel";

describe("NvidiaChatModel", () => {
    it("should default to the Nvidia model and call the OpenAI-compatible completions API", async () => {
        let sentParams: any;
        const mockClient = {
            chat: {
                completions: {
                    create: async (params: any) => {
                        sentParams = params;
                        return {
                            id: "cmpl-123",
                            model: "meta/llama-3.1-8b-instruct",
                            choices: [
                                {
                                    finish_reason: "stop",
                                    message: {role: "assistant", content: "Nvidia response text"},
                                },
                            ],
                            usage: {prompt_tokens: 10, completion_tokens: 5, total_tokens: 15},
                        };
                    },
                },
            },
        };

        const chatModel = new NvidiaChatModel(mockClient);
        const prompt = new Prompt("Explain TypeScript");
        const response = await chatModel.call(prompt);

        assert.equal(response.result.message.text, "Nvidia response text");
        assert.equal(sentParams.model, "meta/llama-3.1-8b-instruct");
        assert.equal(sentParams.messages[0].content, "Explain TypeScript");
    });
});
