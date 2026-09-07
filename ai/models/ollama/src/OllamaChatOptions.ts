import {ChatOptions} from "@nodeboot/ai-core";

export interface OllamaChatOptions extends ChatOptions {
    model?: string;
    temperature?: number;
    topP?: number;
    topK?: number;
    numPredict?: number;
    stopSequences?: string[];
}
