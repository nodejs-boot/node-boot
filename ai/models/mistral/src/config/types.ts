import {ModerationOptions} from "@nodeboot/ai-core";
import {MistralChatOptions} from "../MistralChatOptions";

export interface MistralModelConfigProperties {
    apiKey?: string;
    baseURL?: string;
    chat?: {
        options?: MistralChatOptions;
    };
    embedding?: {
        options?: {
            model?: string;
            dimensions?: number;
        };
    };
    moderation?: {
        options?: ModerationOptions;
    };
}
