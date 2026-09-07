import {OpenAiChatModel, OpenAiClientLike} from "@nodeboot/ai-openai";
import {PerplexityChatOptions} from "./PerplexityChatOptions";

/**
 * Perplexity exposes an OpenAI-compatible Chat Completions API, so this model simply
 * configures {@link OpenAiChatModel} with Perplexity-specific defaults (base URL and model).
 */
export class PerplexityChatModel extends OpenAiChatModel {
    constructor(client: OpenAiClientLike, defaultOptions?: PerplexityChatOptions) {
        super(client, {
            model: "sonar",
            ...defaultOptions,
        });
    }
}
