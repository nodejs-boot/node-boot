import {OllamaChatOptions} from "../OllamaChatOptions";

export interface OllamaModelConfigProperties {
    baseURL?: string;
    chat?: {
        options?: OllamaChatOptions;
    };
    embedding?: {
        options?: {
            model?: string;
            dimensions?: number;
        };
    };
}
