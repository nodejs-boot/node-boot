import {ChatOptions} from "@nodeboot/ai-core";

export interface BedrockChatOptions extends ChatOptions {
    modelId?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    stopSequences?: string[];
}
