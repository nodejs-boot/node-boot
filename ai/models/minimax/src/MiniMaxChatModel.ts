import {OpenAiChatModel, OpenAiClientLike} from "@nodeboot/ai-openai";
import {MiniMaxChatOptions} from "./MiniMaxChatOptions";

/**
 * MiniMax exposes an OpenAI-compatible Chat Completions API, so this model simply
 * configures {@link OpenAiChatModel} with MiniMax-specific defaults (base URL and model).
 */
export class MiniMaxChatModel extends OpenAiChatModel {
    constructor(client: OpenAiClientLike, defaultOptions?: MiniMaxChatOptions) {
        super(client, {
            model: "MiniMax-Text-01",
            ...defaultOptions,
        });
    }
}
