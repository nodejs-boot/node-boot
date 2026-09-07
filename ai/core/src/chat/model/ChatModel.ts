import {AssistantMessage, Message} from "../messages";
import {ToolCallback, ToolDefinition} from "../../tool";

export interface ChatOptions {
    model?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    stopSequences?: string[];
    tools?: Array<ToolDefinition | ToolCallback>;
    toolChoice?: "auto" | "none" | "required" | {type: "function"; function: {name: string}} | string;
    responseFormat?: {type: "text" | "json_object" | "json_schema"; json_schema?: any};
    [key: string]: any;
}

export interface Usage {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
}

export interface Generation {
    message: AssistantMessage;
    metadata?: {
        finishReason?: string;
        [key: string]: any;
    };
}

export interface ChatResponseMetadata {
    id?: string;
    model?: string;
    usage?: Usage;
    rateLimit?: Record<string, any>;
    [key: string]: any;
}

export interface ChatResponse {
    result: Generation;
    results?: Generation[];
    metadata?: ChatResponseMetadata;
}

export interface PromptOptions {
    options?: ChatOptions;
}

export interface PromptLike {
    getInstructions(): Message[];
    getOptions?(): ChatOptions | undefined;
}

export interface ChatModel {
    call(prompt: PromptLike): Promise<ChatResponse>;
    stream?(prompt: PromptLike): AsyncIterable<ChatResponse>;
    getDefaultOptions?(): ChatOptions;
}
