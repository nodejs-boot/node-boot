import {NvidiaChatOptions} from "../NvidiaChatOptions";

export interface NvidiaModelConfigProperties {
    apiKey?: string;
    /** Defaults to "https://integrate.api.nvidia.com/v1" */
    baseURL?: string;
    chat?: {
        options?: NvidiaChatOptions;
    };
}
