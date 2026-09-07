import {MiniMaxChatOptions} from "../MiniMaxChatOptions";

export interface MiniMaxModelConfigProperties {
    apiKey?: string;
    /** Defaults to "https://api.minimax.io/v1" */
    baseURL?: string;
    chat?: {
        options?: MiniMaxChatOptions;
    };
}
