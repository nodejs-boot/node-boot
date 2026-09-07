import {GroqChatOptions} from "../GroqChatOptions";

export interface GroqModelConfigProperties {
    apiKey?: string;
    /** Defaults to "https://api.groq.com/openai/v1" */
    baseURL?: string;
    chat?: {
        options?: GroqChatOptions;
    };
}
