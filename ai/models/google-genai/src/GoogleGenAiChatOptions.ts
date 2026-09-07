import {ChatOptions} from "@nodeboot/ai-core";

export interface GoogleGenAiChatOptions extends ChatOptions {
    model?: string;
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
}
