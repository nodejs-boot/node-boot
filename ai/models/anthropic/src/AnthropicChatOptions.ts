import {ChatOptions} from "@nodeboot/ai-core";

export interface AnthropicChatOptions extends ChatOptions {
    model?: string;
    temperature?: number;
    topP?: number;
    topK?: number;
    maxTokens?: number;
    stopSequences?: string[];
}
