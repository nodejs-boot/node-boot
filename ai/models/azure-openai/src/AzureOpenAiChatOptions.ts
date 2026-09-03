import {ChatOptions} from "@nodeboot/ai-core";

export interface AzureOpenAiChatOptions extends ChatOptions {
    model?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    stopSequences?: string[];
    seed?: number;
    user?: string;
    responseFormat?: {type: "text" | "json_object" | "json_schema"; json_schema?: any};
}
