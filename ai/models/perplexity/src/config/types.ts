import {PerplexityChatOptions} from "../PerplexityChatOptions";

export interface PerplexityModelConfigProperties {
    apiKey?: string;
    /** Defaults to "https://api.perplexity.ai" */
    baseURL?: string;
    chat?: {
        options?: PerplexityChatOptions;
    };
}
