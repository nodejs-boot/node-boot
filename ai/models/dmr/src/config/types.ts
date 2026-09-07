import {DmrChatOptions} from "../DmrChatOptions";

export interface DmrModelConfigProperties {
    apiKey?: string;
    /** Defaults to "http://localhost:12434/engines/llama.cpp/v1" */
    baseURL?: string;
    chat?: {
        options?: DmrChatOptions;
    };
}
