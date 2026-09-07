import {DeepSeekChatOptions} from "../DeepSeekChatOptions";

export interface DeepSeekModelConfigProperties {
    apiKey?: string;
    /** Defaults to "https://api.deepseek.com/v1" */
    baseURL?: string;
    chat?: {
        options?: DeepSeekChatOptions;
    };
}
