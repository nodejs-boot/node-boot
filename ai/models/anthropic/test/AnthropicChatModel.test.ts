import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {Prompt, SystemMessage, UserMessage} from "@nodeboot/ai-core";
import {AnthropicChatModel} from "../src";

describe("AnthropicChatModel", () => {
    it("should extract system messages and call the messages API", async () => {
        let sentParams: any;
        const mockAnthropicClient = {
            messages: {
                create: async (params: any) => {
                    sentParams = params;
                    return {
                        id: "msg_123",
                        model: "claude-3-5-sonnet-20241022",
                        stop_reason: "end_turn",
                        content: [{type: "text", text: "Anthropic response text"}],
                        usage: {
                            input_tokens: 12,
                            output_tokens: 8,
                        },
                    };
                },
            },
        };

        const chatModel = new AnthropicChatModel(mockAnthropicClient);
        const prompt = new Prompt([new SystemMessage("You are helpful"), new UserMessage("Explain TypeScript")]);
        const response = await chatModel.call(prompt);

        assert.equal(response.result.message.text, "Anthropic response text");
        assert.equal(response.metadata?.usage?.promptTokens, 12);
        assert.equal(response.metadata?.usage?.completionTokens, 8);
        assert.equal(response.metadata?.usage?.totalTokens, 20);
        assert.equal(sentParams.system, "You are helpful");
        assert.equal(sentParams.model, "claude-3-5-sonnet-20241022");
        assert.equal(sentParams.max_tokens, 4096);
        assert.equal(sentParams.messages.length, 1);
        assert.equal(sentParams.messages[0].role, "user");
        assert.equal(sentParams.messages[0].content, "Explain TypeScript");
    });

    it("should capture tool_use blocks from the response", async () => {
        const mockAnthropicClient = {
            messages: {
                create: async (_params: any) => {
                    return {
                        id: "msg_456",
                        model: "claude-3-5-sonnet-20241022",
                        stop_reason: "tool_use",
                        content: [
                            {type: "text", text: "Let me check that."},
                            {
                                type: "tool_use",
                                id: "toolu_123",
                                name: "lookupWeather",
                                input: {city: "Lisbon"},
                            },
                        ],
                        usage: {
                            input_tokens: 20,
                            output_tokens: 10,
                        },
                    };
                },
            },
        };

        const chatModel = new AnthropicChatModel(mockAnthropicClient);
        const response = await chatModel.call(new Prompt("What's the weather?"));

        assert.equal(response.result.message.text, "Let me check that.");
        assert.deepEqual(response.result.message.toolCalls, [
            {
                id: "toolu_123",
                name: "lookupWeather",
                arguments: JSON.stringify({city: "Lisbon"}),
                type: "tool_use",
            },
        ]);
        assert.equal(response.result.metadata?.finishReason, "tool_use");
    });
});
