import {AnthropicChatOptions} from "../AnthropicChatOptions";

export interface AnthropicModelConfigProperties {
    apiKey?: string;
    baseURL?: string;
    chat?: {
        options?: AnthropicChatOptions;
    };
}
