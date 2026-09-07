import {OpenAiChatModel, OpenAiClientLike} from "@nodeboot/ai-openai";
import {DmrChatOptions} from "./DmrChatOptions";

/**
 * Dmr exposes an OpenAI-compatible Chat Completions API, so this model simply
 * configures {@link OpenAiChatModel} with Dmr-specific defaults (base URL and model).
 */
export class DmrChatModel extends OpenAiChatModel {
    constructor(client: OpenAiClientLike, defaultOptions?: DmrChatOptions) {
        super(client, {
            model: "ai/smollm2",
            ...defaultOptions,
        });
    }
}
