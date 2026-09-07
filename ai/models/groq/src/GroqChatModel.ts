import {OpenAiChatModel, OpenAiClientLike} from "@nodeboot/ai-openai";
import {GroqChatOptions} from "./GroqChatOptions";

/**
 * Groq exposes an OpenAI-compatible Chat Completions API, so this model simply
 * configures {@link OpenAiChatModel} with Groq-specific defaults (base URL and model).
 */
export class GroqChatModel extends OpenAiChatModel {
    constructor(client: OpenAiClientLike, defaultOptions?: GroqChatOptions) {
        super(client, {
            model: "llama-3.3-70b-versatile",
            ...defaultOptions,
        });
    }
}
