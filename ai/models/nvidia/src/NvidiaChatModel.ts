import {OpenAiChatModel, OpenAiClientLike} from "@nodeboot/ai-openai";
import {NvidiaChatOptions} from "./NvidiaChatOptions";

/**
 * Nvidia exposes an OpenAI-compatible Chat Completions API, so this model simply
 * configures {@link OpenAiChatModel} with Nvidia-specific defaults (base URL and model).
 */
export class NvidiaChatModel extends OpenAiChatModel {
    constructor(client: OpenAiClientLike, defaultOptions?: NvidiaChatOptions) {
        super(client, {
            model: "meta/llama-3.1-8b-instruct",
            ...defaultOptions,
        });
    }
}
