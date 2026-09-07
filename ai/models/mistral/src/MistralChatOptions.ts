import {ChatOptions} from "@nodeboot/ai-core";

export interface MistralChatOptions extends ChatOptions {
    model?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    stopSequences?: string[];
    randomSeed?: number;
    responseFormat?: {type: "text" | "json_object" | "json_schema"; json_schema?: any};
}
