import {OpenAiChatModel, OpenAiClientLike} from "@nodeboot/ai-openai";
import {DeepSeekChatOptions} from "./DeepSeekChatOptions";

/**
 * DeepSeek exposes an OpenAI-compatible Chat Completions API, so this model simply
 * configures {@link OpenAiChatModel} with DeepSeek-specific defaults (base URL and model).
 */
export class DeepSeekChatModel extends OpenAiChatModel {
    constructor(client: OpenAiClientLike, defaultOptions?: DeepSeekChatOptions) {
        super(client, {
            model: "deepseek-chat",
            ...defaultOptions,
        });
    }
}
